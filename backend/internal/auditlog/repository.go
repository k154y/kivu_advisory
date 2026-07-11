package auditlog

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const auditLogSelectColumns = `
	id,
	COALESCE(actor_user_id, ''),
	COALESCE(actor_role, ''),
	action,
	entity_type,
	COALESCE(entity_id, ''),
	COALESCE(description, ''),
	metadata,
	created_at
`

type Repository interface {
	Create(ctx context.Context, input RecordInput) error
	List(ctx context.Context, filter ListAuditLogsFilter) ([]AuditLog, int, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{
		pool: pool,
	}
}

func (r *PostgresRepository) Create(ctx context.Context, input RecordInput) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("audit log repository is not initialized")
	}

	var metadataJSON []byte

	if input.Metadata != nil {
		encoded, err := json.Marshal(input.Metadata)
		if err != nil {
			return apperrors.InternalWrap(err, "failed to encode audit log metadata")
		}

		metadataJSON = encoded
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO audit_logs (
			actor_user_id,
			actor_role,
			action,
			entity_type,
			entity_id,
			description,
			metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`,
		nullableString(input.ActorUserID),
		nullableString(input.ActorRole),
		input.Action,
		input.EntityType,
		nullableString(input.EntityID),
		nullableString(input.Description),
		metadataJSON,
	)
	if err != nil {
		return apperrors.InternalWrap(err, "failed to record audit log entry")
	}

	return nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListAuditLogsFilter) ([]AuditLog, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("audit log repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.EntityType != "" {
		args = append(args, filter.EntityType)
		conditions = append(conditions, fmt.Sprintf("entity_type = $%d", len(args)))
	}

	if filter.ActorUserID != "" {
		args = append(args, filter.ActorUserID)
		conditions = append(conditions, fmt.Sprintf("actor_user_id = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM audit_logs
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count audit logs")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM audit_logs
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, auditLogSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list audit logs")
	}
	defer rows.Close()

	items := make([]AuditLog, 0)

	for rows.Next() {
		var item AuditLog
		var metadataJSON []byte

		if err := rows.Scan(
			&item.ID,
			&item.ActorUserID,
			&item.ActorRole,
			&item.Action,
			&item.EntityType,
			&item.EntityID,
			&item.Description,
			&metadataJSON,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, apperrors.InternalWrap(err, "failed to read audit log entry")
		}

		if len(metadataJSON) > 0 {
			var metadata map[string]any
			if err := json.Unmarshal(metadataJSON, &metadata); err == nil {
				item.Metadata = metadata
			}
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read audit logs")
	}

	return items, totalItems, nil
}

func nullableString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}

	return value
}
