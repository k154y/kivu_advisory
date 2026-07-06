package servicecatalog

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

const serviceSelectColumns = `
	id,
	title,
	slug,
	COALESCE(short_description, ''),
	COALESCE(description, ''),
	COALESCE(category, ''),
	COALESCE(price_label, ''),
	show_price_label,
	COALESCE(estimated_duration, ''),
	is_featured,
	is_active,
	display_order,
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateServiceInput) (*ServiceItem, error)
	FindByID(ctx context.Context, id string) (*ServiceItem, error)
	FindBySlug(ctx context.Context, slug string) (*ServiceItem, error)
	List(ctx context.Context, filter ListServicesFilter) ([]ServiceItem, int, error)
	Update(ctx context.Context, id string, input UpdateServiceInput) (*ServiceItem, error)
	SetActive(ctx context.Context, id string, isActive bool) error
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateServiceInput) (*ServiceItem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO services (
			title,
			slug,
			short_description,
			description,
			category,
			price_label,
			show_price_label,
			estimated_duration,
			is_featured,
			is_active,
			display_order
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING %s
	`, serviceSelectColumns)

	createdService, err := scanServiceItem(r.pool.QueryRow(
		ctx,
		query,
		input.Title,
		input.Slug,
		input.ShortDescription,
		input.Description,
		input.Category,
		input.PriceLabel,
		input.ShowPriceLabel,
		input.EstimatedDuration,
		input.IsFeatured,
		input.IsActive,
		input.DisplayOrder,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdService, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*ServiceItem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("service id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM services
		WHERE id = $1
		LIMIT 1
	`, serviceSelectColumns)

	foundService, err := scanServiceItem(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundService, nil
}

func (r *PostgresRepository) FindBySlug(ctx context.Context, slug string) (*ServiceItem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service repository is not initialized")
	}

	slug = strings.TrimSpace(strings.ToLower(slug))
	if slug == "" {
		return nil, apperrors.InvalidInput("service slug is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM services
		WHERE slug = $1
		LIMIT 1
	`, serviceSelectColumns)

	foundService, err := scanServiceItem(r.pool.QueryRow(ctx, query, slug))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundService, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListServicesFilter) ([]ServiceItem, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("service repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Category != "" {
		args = append(args, filter.Category)
		conditions = append(conditions, fmt.Sprintf("category = $%d", len(args)))
	}

	if filter.IsActive != nil {
		args = append(args, *filter.IsActive)
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", len(args)))
	}

	if filter.IsFeatured != nil {
		args = append(args, *filter.IsFeatured)
		conditions = append(conditions, fmt.Sprintf("is_featured = $%d", len(args)))
	}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				title ILIKE $%d
				OR slug ILIKE $%d
				OR COALESCE(short_description, '') ILIKE $%d
				OR COALESCE(description, '') ILIKE $%d
				OR COALESCE(category, '') ILIKE $%d
			)
		`, placeholder, placeholder, placeholder, placeholder, placeholder))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM services
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count services")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM services
		WHERE %s
		ORDER BY display_order ASC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, serviceSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list services")
	}
	defer rows.Close()

	services := make([]ServiceItem, 0)

	for rows.Next() {
		item, err := scanServiceItem(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		services = append(services, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read services")
	}

	return services, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateServiceInput) (*ServiceItem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("service id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE services
		SET
			title = $1,
			slug = $2,
			short_description = $3,
			description = $4,
			category = $5,
			price_label = $6,
			show_price_label = $7,
			estimated_duration = $8,
			is_featured = $9,
			is_active = $10,
			display_order = $11,
			updated_at = NOW()
		WHERE id = $12
		RETURNING %s
	`, serviceSelectColumns)

	updatedService, err := scanServiceItem(r.pool.QueryRow(
		ctx,
		query,
		input.Title,
		input.Slug,
		input.ShortDescription,
		input.Description,
		input.Category,
		input.PriceLabel,
		input.ShowPriceLabel,
		input.EstimatedDuration,
		input.IsFeatured,
		input.IsActive,
		input.DisplayOrder,
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedService, nil
}

func (r *PostgresRepository) SetActive(ctx context.Context, id string, isActive bool) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("service repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("service id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		UPDATE services
		SET is_active = $1, updated_at = NOW()
		WHERE id = $2
	`, isActive, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("service not found")
	}

	return nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("service repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("service id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM services
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("service not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanServiceItem(row rowScanner) (*ServiceItem, error) {
	var item ServiceItem

	err := row.Scan(
		&item.ID,
		&item.Title,
		&item.Slug,
		&item.ShortDescription,
		&item.Description,
		&item.Category,
		&item.PriceLabel,
		&item.ShowPriceLabel,
		&item.EstimatedDuration,
		&item.IsFeatured,
		&item.IsActive,
		&item.DisplayOrder,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &item, nil
}

func mapPostgresError(err error) error {
	if err == nil {
		return nil
	}

	if stderrors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound("service not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return apperrors.Conflict("service slug already exists")
		case "23503":
			return apperrors.Conflict("related record does not exist")
		case "23514":
			return apperrors.InvalidInput("invalid service data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
