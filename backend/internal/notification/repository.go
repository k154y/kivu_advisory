package notification

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

const notificationSelectColumns = `
	id,
	user_id,
	title,
	body,
	notification_type,
	COALESCE(entity_type, ''),
	COALESCE(entity_id, ''),
	COALESCE(action_url, ''),
	is_read,
	read_at,
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateNotificationInput) (*Notification, error)
	CreateMany(ctx context.Context, inputs []CreateNotificationInput) error
	List(ctx context.Context, filter ListNotificationsFilter) ([]Notification, int, error)
	CountUnread(ctx context.Context, userID string) (int, error)
	FindByID(ctx context.Context, id string) (*Notification, error)
	MarkRead(ctx context.Context, id string, userID string) (*Notification, error)
	MarkAllRead(ctx context.Context, userID string) error
	Delete(ctx context.Context, id string, userID string) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{
		pool: pool,
	}
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateNotificationInput) (*Notification, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("notification repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO notifications (
			user_id,
			title,
			body,
			notification_type,
			entity_type,
			entity_id,
			action_url
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING %s
	`, notificationSelectColumns)

	createdNotification, err := scanNotification(r.pool.QueryRow(
		ctx,
		query,
		input.UserID,
		input.Title,
		input.Body,
		input.NotificationType,
		nullableString(input.EntityType),
		nullableString(input.EntityID),
		nullableString(input.ActionURL),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdNotification, nil
}

func (r *PostgresRepository) CreateMany(ctx context.Context, inputs []CreateNotificationInput) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("notification repository is not initialized")
	}

	if len(inputs) == 0 {
		return nil
	}

	batch := &pgx.Batch{}

	for _, input := range inputs {
		input = NormalizeCreateInput(input)

		if validationErrors := input.Validate(); len(validationErrors) > 0 {
			return apperrors.Validation(validationErrors)
		}

		batch.Queue(`
			INSERT INTO notifications (
				user_id,
				title,
				body,
				notification_type,
				entity_type,
				entity_id,
				action_url
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`,
			input.UserID,
			input.Title,
			input.Body,
			input.NotificationType,
			nullableString(input.EntityType),
			nullableString(input.EntityID),
			nullableString(input.ActionURL),
		)
	}

	results := r.pool.SendBatch(ctx, batch)
	defer results.Close()

	for range inputs {
		if _, err := results.Exec(); err != nil {
			return mapPostgresError(err)
		}
	}

	return nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListNotificationsFilter) ([]Notification, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("notification repository is not initialized")
	}

	filter = filter.Normalize()

	if filter.UserID == "" {
		return nil, 0, apperrors.InvalidInput("user id is required")
	}

	conditions := []string{"user_id = $1"}
	args := []any{filter.UserID}

	if filter.NotificationType != "" {
		args = append(args, filter.NotificationType)
		conditions = append(conditions, fmt.Sprintf("notification_type = $%d", len(args)))
	}

	if filter.IsRead != nil {
		args = append(args, *filter.IsRead)
		conditions = append(conditions, fmt.Sprintf("is_read = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM notifications
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count notifications")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM notifications
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, notificationSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list notifications")
	}
	defer rows.Close()

	notifications := make([]Notification, 0)

	for rows.Next() {
		item, err := scanNotification(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		notifications = append(notifications, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read notifications")
	}

	return notifications, totalItems, nil
}

func (r *PostgresRepository) CountUnread(ctx context.Context, userID string) (int, error) {
	if r == nil || r.pool == nil {
		return 0, apperrors.Internal("notification repository is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return 0, apperrors.InvalidInput("user id is required")
	}

	var total int
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = $1
		  AND is_read = FALSE
	`, userID).Scan(&total); err != nil {
		return 0, apperrors.InternalWrap(err, "failed to count unread notifications")
	}

	return total, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Notification, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("notification repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("notification id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM notifications
		WHERE id = $1
		LIMIT 1
	`, notificationSelectColumns)

	foundNotification, err := scanNotification(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundNotification, nil
}

func (r *PostgresRepository) MarkRead(ctx context.Context, id string, userID string) (*Notification, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("notification repository is not initialized")
	}

	id = strings.TrimSpace(id)
	userID = strings.TrimSpace(userID)

	if id == "" {
		return nil, apperrors.InvalidInput("notification id is required")
	}

	if userID == "" {
		return nil, apperrors.InvalidInput("user id is required")
	}

	query := fmt.Sprintf(`
		UPDATE notifications
		SET
			is_read = TRUE,
			read_at = COALESCE(read_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
		  AND user_id = $2
		RETURNING %s
	`, notificationSelectColumns)

	updatedNotification, err := scanNotification(r.pool.QueryRow(ctx, query, id, userID))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedNotification, nil
}

func (r *PostgresRepository) MarkAllRead(ctx context.Context, userID string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("notification repository is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return apperrors.InvalidInput("user id is required")
	}

	_, err := r.pool.Exec(ctx, `
		UPDATE notifications
		SET
			is_read = TRUE,
			read_at = COALESCE(read_at, NOW()),
			updated_at = NOW()
		WHERE user_id = $1
		  AND is_read = FALSE
	`, userID)
	if err != nil {
		return mapPostgresError(err)
	}

	return nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string, userID string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("notification repository is not initialized")
	}

	id = strings.TrimSpace(id)
	userID = strings.TrimSpace(userID)

	if id == "" {
		return apperrors.InvalidInput("notification id is required")
	}

	if userID == "" {
		return apperrors.InvalidInput("user id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM notifications
		WHERE id = $1
		  AND user_id = $2
	`, id, userID)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("notification not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanNotification(row rowScanner) (*Notification, error) {
	var item Notification
	var readAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.UserID,
		&item.Title,
		&item.Body,
		&item.NotificationType,
		&item.EntityType,
		&item.EntityID,
		&item.ActionURL,
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
		return apperrors.NotFound("notification not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related user does not exist")
		case "23505":
			return apperrors.Conflict("notification already exists")
		case "23514":
			return apperrors.InvalidInput("invalid notification data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
