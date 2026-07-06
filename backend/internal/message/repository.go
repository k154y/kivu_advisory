package message

import (
	"context"
	stderrors "errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const messageSelectColumns = `
	id,
	COALESCE(service_request_id, ''),
	COALESCE(sender_user_id, ''),
	COALESCE(recipient_user_id, ''),
	COALESCE(subject, ''),
	body,
	message_type,
	visibility,
	is_internal,
	is_read,
	read_at,
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateMessageInput) (*Message, error)
	FindByID(ctx context.Context, id string) (*Message, error)
	List(ctx context.Context, filter ListMessagesFilter) ([]Message, int, error)
	MarkRead(ctx context.Context, id string) (*Message, error)
	Delete(ctx context.Context, id string) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{
		pool: pool,
	}
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateMessageInput) (*Message, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("message repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO messages (
			service_request_id,
			sender_user_id,
			recipient_user_id,
			subject,
			body,
			message_type,
			visibility,
			is_internal
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING %s
	`, messageSelectColumns)

	createdMessage, err := scanMessage(r.pool.QueryRow(
		ctx,
		query,
		nullableString(input.ServiceRequestID),
		nullableString(input.SenderUserID),
		nullableString(input.RecipientUserID),
		nullableString(input.Subject),
		input.Body,
		input.MessageType,
		input.Visibility,
		input.IsInternal,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdMessage, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Message, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("message repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("message id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM messages
		WHERE id = $1
		LIMIT 1
	`, messageSelectColumns)

	foundMessage, err := scanMessage(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundMessage, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListMessagesFilter) ([]Message, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("message repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.ServiceRequestID != "" {
		args = append(args, filter.ServiceRequestID)
		conditions = append(conditions, fmt.Sprintf("service_request_id = $%d", len(args)))
	}

	if filter.SenderUserID != "" {
		args = append(args, filter.SenderUserID)
		conditions = append(conditions, fmt.Sprintf("sender_user_id = $%d", len(args)))
	}

	if filter.RecipientUserID != "" {
		args = append(args, filter.RecipientUserID)
		conditions = append(conditions, fmt.Sprintf("recipient_user_id = $%d", len(args)))
	}

	if filter.MessageType != "" {
		args = append(args, filter.MessageType)
		conditions = append(conditions, fmt.Sprintf("message_type = $%d", len(args)))
	}

	if filter.Visibility != "" {
		args = append(args, filter.Visibility)
		conditions = append(conditions, fmt.Sprintf("visibility = $%d", len(args)))
	}

	if !filter.IncludeInternal {
		conditions = append(conditions, "is_internal = FALSE")
		conditions = append(conditions, "visibility = 'conversation'")
	}

	if filter.ExcludeAdminVisibility {
		conditions = append(conditions, "visibility <> 'admin'")
	}

	if filter.UnreadOnly {
		conditions = append(conditions, "is_read = FALSE")
	}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				COALESCE(subject, '') ILIKE $%d
				OR body ILIKE $%d
			)
		`, placeholder, placeholder))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM messages
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count messages")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM messages
		WHERE %s
		ORDER BY created_at ASC
		LIMIT $%d OFFSET $%d
	`, messageSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list messages")
	}
	defer rows.Close()

	messages := make([]Message, 0)

	for rows.Next() {
		item, err := scanMessage(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		messages = append(messages, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read messages")
	}

	return messages, totalItems, nil
}

func (r *PostgresRepository) MarkRead(ctx context.Context, id string) (*Message, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("message repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("message id is required")
	}

	query := fmt.Sprintf(`
		UPDATE messages
		SET
			is_read = TRUE,
			read_at = COALESCE(read_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
		RETURNING %s
	`, messageSelectColumns)

	updatedMessage, err := scanMessage(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedMessage, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("message repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("message id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM messages
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("message not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanMessage(row rowScanner) (*Message, error) {
	var item Message
	var readAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.ServiceRequestID,
		&item.SenderUserID,
		&item.RecipientUserID,
		&item.Subject,
		&item.Body,
		&item.MessageType,
		&item.Visibility,
		&item.IsInternal,
		&item.IsRead,
		&readAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if readAt.Valid {
		value := readAt.Time
		item.ReadAt = &value
	}

	return &item, nil
}

func nullableString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}

	return value
}

func mapPostgresError(err error) error {
	if err == nil {
		return nil
	}

	if stderrors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound("message not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related service request or user does not exist")
		case "23505":
			return apperrors.Conflict("message already exists")
		case "23514":
			return apperrors.InvalidInput("invalid message data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
