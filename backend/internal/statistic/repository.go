package statistic

import (
	"context"
	stderrors "errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const statisticSelectColumns = `
	id,
	value,
	label,
	COALESCE(description, ''),
	display_order,
	is_active,
	COALESCE(created_by_user_id, ''),
	COALESCE(updated_by_user_id, ''),
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateStatisticInput) (*Statistic, error)
	FindByID(ctx context.Context, id string) (*Statistic, error)
	List(ctx context.Context, filter ListStatisticsFilter) ([]Statistic, int, error)
	Update(ctx context.Context, id string, input UpdateStatisticInput) (*Statistic, error)
	UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*Statistic, error)
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateStatisticInput) (*Statistic, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("statistic repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO statistics (
			value,
			label,
			description,
			display_order,
			is_active,
			created_by_user_id,
			updated_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
		RETURNING %s
	`, statisticSelectColumns)

	item, err := scanStatistic(r.pool.QueryRow(
		ctx,
		query,
		input.Value,
		input.Label,
		nullableString(input.Description),
		input.DisplayOrder,
		input.IsActive,
		nullableString(input.CreatedByUserID),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Statistic, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("statistic repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("statistic id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM statistics
		WHERE id = $1
		LIMIT 1
	`, statisticSelectColumns)

	item, err := scanStatistic(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListStatisticsFilter) ([]Statistic, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("statistic repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				value ILIKE $%d
				OR label ILIKE $%d
				OR COALESCE(description, '') ILIKE $%d
			)
		`, placeholder, placeholder, placeholder))
	}

	if filter.IsActive != nil {
		args = append(args, *filter.IsActive)
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM statistics
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count statistics")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM statistics
		WHERE %s
		ORDER BY display_order ASC, created_at ASC
		LIMIT $%d OFFSET $%d
	`, statisticSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list statistics")
	}
	defer rows.Close()

	items := make([]Statistic, 0)

	for rows.Next() {
		item, err := scanStatistic(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		items = append(items, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read statistics")
	}

	return items, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateStatisticInput) (*Statistic, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("statistic repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("statistic id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE statistics
		SET
			value = $1,
			label = $2,
			description = $3,
			display_order = $4,
			is_active = $5,
			updated_by_user_id = $6,
			updated_at = NOW()
		WHERE id = $7
		RETURNING %s
	`, statisticSelectColumns)

	item, err := scanStatistic(r.pool.QueryRow(
		ctx,
		query,
		input.Value,
		input.Label,
		nullableString(input.Description),
		input.DisplayOrder,
		input.IsActive,
		nullableString(input.UpdatedByUserID),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*Statistic, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("statistic repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("statistic id is required")
	}

	query := fmt.Sprintf(`
		UPDATE statistics
		SET
			is_active = $1,
			updated_at = NOW()
		WHERE id = $2
		RETURNING %s
	`, statisticSelectColumns)

	item, err := scanStatistic(r.pool.QueryRow(ctx, query, input.IsActive, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("statistic repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("statistic id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM statistics
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("statistic not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanStatistic(row rowScanner) (*Statistic, error) {
	var item Statistic

	err := row.Scan(
		&item.ID,
		&item.Value,
		&item.Label,
		&item.Description,
		&item.DisplayOrder,
		&item.IsActive,
		&item.CreatedByUserID,
		&item.UpdatedByUserID,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
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
		return apperrors.NotFound("statistic not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related user does not exist")
		case "23514":
			return apperrors.InvalidInput("invalid statistic data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}