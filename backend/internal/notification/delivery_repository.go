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

const deliverySelectColumns = `
	id,
	notification_id,
	user_id,
	channel,
	recipient,
	COALESCE(subject, ''),
	message,
	COALESCE(provider, ''),
	COALESCE(provider_message_id, ''),
	status,
	attempt_count,
	COALESCE(error_message, ''),
	sent_at,
	created_at,
	updated_at
`

type DeliveryRepository interface {
	CreateDelivery(ctx context.Context, input CreateDeliveryInput) (*Delivery, error)
	CreateDeliveries(ctx context.Context, inputs []CreateDeliveryInput) error
	ListDeliveries(ctx context.Context, filter ListDeliveriesFilter) ([]Delivery, int, error)
	MarkDeliverySent(ctx context.Context, id string, input MarkDeliverySentInput) (*Delivery, error)
	MarkDeliveryFailed(ctx context.Context, id string, input MarkDeliveryFailedInput) (*Delivery, error)
	MarkDeliverySkipped(ctx context.Context, id string, reason string) (*Delivery, error)
}

type PostgresDeliveryRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresDeliveryRepository(pool *pgxpool.Pool) *PostgresDeliveryRepository {
	return &PostgresDeliveryRepository{
		pool: pool,
	}
}

func (r *PostgresDeliveryRepository) CreateDelivery(ctx context.Context, input CreateDeliveryInput) (*Delivery, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("notification delivery repository is not initialized")
	}

	input = NormalizeCreateDeliveryInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO notification_deliveries (
			notification_id,
			user_id,
			channel,
			recipient,
			subject,
			message,
			provider
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING %s
	`, deliverySelectColumns)

	createdDelivery, err := scanDelivery(r.pool.QueryRow(
		ctx,
		query,
		input.NotificationID,
		input.UserID,
		input.Channel,
		input.Recipient,
		nullableDeliveryString(input.Subject),
		input.Message,
		nullableDeliveryString(input.Provider),
	))
	if err != nil {
		return nil, mapDeliveryPostgresError(err)
	}

	return createdDelivery, nil
}

func (r *PostgresDeliveryRepository) CreateDeliveries(ctx context.Context, inputs []CreateDeliveryInput) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("notification delivery repository is not initialized")
	}

	if len(inputs) == 0 {
		return nil
	}

	batch := &pgx.Batch{}

	for _, input := range inputs {
		input = NormalizeCreateDeliveryInput(input)

		if validationErrors := input.Validate(); len(validationErrors) > 0 {
			return apperrors.Validation(validationErrors)
		}

		batch.Queue(`
			INSERT INTO notification_deliveries (
				notification_id,
				user_id,
				channel,
				recipient,
				subject,
				message,
				provider
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`,
			input.NotificationID,
			input.UserID,
			input.Channel,
			input.Recipient,
			nullableDeliveryString(input.Subject),
			input.Message,
			nullableDeliveryString(input.Provider),
		)
	}

	results := r.pool.SendBatch(ctx, batch)
	defer results.Close()

	for range inputs {
		if _, err := results.Exec(); err != nil {
			return mapDeliveryPostgresError(err)
		}
	}

	return nil
}

func (r *PostgresDeliveryRepository) ListDeliveries(ctx context.Context, filter ListDeliveriesFilter) ([]Delivery, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("notification delivery repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := make([]string, 0)
	args := make([]any, 0)

	if filter.NotificationID != "" {
		args = append(args, filter.NotificationID)
		conditions = append(conditions, fmt.Sprintf("notification_id = $%d", len(args)))
	}

	if filter.UserID != "" {
		args = append(args, filter.UserID)
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", len(args)))
	}

	if filter.Channel != "" {
		if !IsValidChannel(filter.Channel) {
			return nil, 0, apperrors.InvalidInput("delivery channel is invalid")
		}

		args = append(args, filter.Channel)
		conditions = append(conditions, fmt.Sprintf("channel = $%d", len(args)))
	}

	if filter.Status != "" {
		if !IsValidDeliveryStatus(filter.Status) {
			return nil, 0, apperrors.InvalidInput("delivery status is invalid")
		}

		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}

	whereClause := "TRUE"
	if len(conditions) > 0 {
		whereClause = strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM notification_deliveries
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count notification deliveries")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM notification_deliveries
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, deliverySelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list notification deliveries")
	}
	defer rows.Close()

	deliveries := make([]Delivery, 0)

	for rows.Next() {
		item, err := scanDelivery(rows)
		if err != nil {
			return nil, 0, mapDeliveryPostgresError(err)
		}

		deliveries = append(deliveries, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read notification deliveries")
	}

	return deliveries, totalItems, nil
}

func (r *PostgresDeliveryRepository) MarkDeliverySent(ctx context.Context, id string, input MarkDeliverySentInput) (*Delivery, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("notification delivery repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("delivery id is required")
	}

	input.Provider = strings.TrimSpace(strings.ToLower(input.Provider))
	input.ProviderMessageID = strings.TrimSpace(input.ProviderMessageID)

	query := fmt.Sprintf(`
		UPDATE notification_deliveries
		SET
			status = 'sent',
			provider = COALESCE(NULLIF($1, ''), provider),
			provider_message_id = COALESCE(NULLIF($2, ''), provider_message_id),
			attempt_count = attempt_count + 1,
			error_message = NULL,
			sent_at = NOW(),
			updated_at = NOW()
		WHERE id = $3
		RETURNING %s
	`, deliverySelectColumns)

	updatedDelivery, err := scanDelivery(r.pool.QueryRow(
		ctx,
		query,
		input.Provider,
		input.ProviderMessageID,
		id,
	))
	if err != nil {
		return nil, mapDeliveryPostgresError(err)
	}

	return updatedDelivery, nil
}

func (r *PostgresDeliveryRepository) MarkDeliveryFailed(ctx context.Context, id string, input MarkDeliveryFailedInput) (*Delivery, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("notification delivery repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("delivery id is required")
	}

	input.Provider = strings.TrimSpace(strings.ToLower(input.Provider))
	input.ErrorMessage = strings.TrimSpace(input.ErrorMessage)

	if input.ErrorMessage == "" {
		input.ErrorMessage = "delivery failed"
	}

	query := fmt.Sprintf(`
		UPDATE notification_deliveries
		SET
			status = 'failed',
			provider = COALESCE(NULLIF($1, ''), provider),
			attempt_count = attempt_count + 1,
			error_message = $2,
			updated_at = NOW()
		WHERE id = $3
		RETURNING %s
	`, deliverySelectColumns)

	updatedDelivery, err := scanDelivery(r.pool.QueryRow(
		ctx,
		query,
		input.Provider,
		input.ErrorMessage,
		id,
	))
	if err != nil {
		return nil, mapDeliveryPostgresError(err)
	}

	return updatedDelivery, nil
}

func (r *PostgresDeliveryRepository) MarkDeliverySkipped(ctx context.Context, id string, reason string) (*Delivery, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("notification delivery repository is not initialized")
	}

	id = strings.TrimSpace(id)
	reason = strings.TrimSpace(reason)

	if id == "" {
		return nil, apperrors.InvalidInput("delivery id is required")
	}

	if reason == "" {
		reason = "delivery skipped"
	}

	query := fmt.Sprintf(`
		UPDATE notification_deliveries
		SET
			status = 'skipped',
			error_message = $1,
			updated_at = NOW()
		WHERE id = $2
		RETURNING %s
	`, deliverySelectColumns)

	updatedDelivery, err := scanDelivery(r.pool.QueryRow(ctx, query, reason, id))
	if err != nil {
		return nil, mapDeliveryPostgresError(err)
	}

	return updatedDelivery, nil
}

func scanDelivery(row interface {
	Scan(dest ...any) error
}) (*Delivery, error) {
	var item Delivery
	var sentAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.NotificationID,
		&item.UserID,
		&item.Channel,
		&item.Recipient,
		&item.Subject,
		&item.Message,
		&item.Provider,
		&item.ProviderMessageID,
		&item.Status,
		&item.AttemptCount,
		&item.ErrorMessage,
		&sentAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if sentAt.Valid {
		value := sentAt.Time
		item.SentAt = &value
	}

	return &item, nil
}

func nullableDeliveryString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}

	return value
}

func mapDeliveryPostgresError(err error) error {
	if err == nil {
		return nil
	}

	if stderrors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound("notification delivery not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related notification or user does not exist")
		case "23505":
			return apperrors.Conflict("notification delivery already exists")
		case "23514":
			return apperrors.InvalidInput("invalid notification delivery data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
