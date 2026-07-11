package testimonial

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

const testimonialSelectColumns = `
	id,
	client_name,
	COALESCE(client_role, ''),
	COALESCE(company_name, ''),
	content,
	rating,
	COALESCE(photo_url, ''),
	is_featured,
	display_order,
	is_active,
	COALESCE(created_by_user_id, ''),
	COALESCE(updated_by_user_id, ''),
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateTestimonialInput) (*Testimonial, error)
	FindByID(ctx context.Context, id string) (*Testimonial, error)
	List(ctx context.Context, filter ListTestimonialsFilter) ([]Testimonial, int, error)
	Update(ctx context.Context, id string, input UpdateTestimonialInput) (*Testimonial, error)
	UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*Testimonial, error)
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateTestimonialInput) (*Testimonial, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("testimonial repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO testimonials (
			client_name,
			client_role,
			company_name,
			content,
			rating,
			photo_url,
			is_featured,
			display_order,
			is_active,
			created_by_user_id,
			updated_by_user_id
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10
		)
		RETURNING %s
	`, testimonialSelectColumns)

	item, err := scanTestimonial(r.pool.QueryRow(
		ctx,
		query,
		input.ClientName,
		nullableString(input.ClientRole),
		nullableString(input.CompanyName),
		input.Content,
		input.Rating,
		nullableString(input.PhotoURL),
		input.IsFeatured,
		input.DisplayOrder,
		input.IsActive,
		nullableString(input.CreatedByUserID),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Testimonial, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("testimonial repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("testimonial id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM testimonials
		WHERE id = $1
		LIMIT 1
	`, testimonialSelectColumns)

	item, err := scanTestimonial(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListTestimonialsFilter) ([]Testimonial, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("testimonial repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)
		conditions = append(conditions, fmt.Sprintf(`(
			client_name ILIKE $%d
			OR COALESCE(company_name, '') ILIKE $%d
			OR content ILIKE $%d
		)`, placeholder, placeholder, placeholder))
	}

	if filter.IsFeatured != nil {
		args = append(args, *filter.IsFeatured)
		conditions = append(conditions, fmt.Sprintf("is_featured = $%d", len(args)))
	}

	if filter.IsActive != nil {
		args = append(args, *filter.IsActive)
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM testimonials
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count testimonials")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM testimonials
		WHERE %s
		ORDER BY display_order ASC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, testimonialSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list testimonials")
	}
	defer rows.Close()

	items := make([]Testimonial, 0)

	for rows.Next() {
		item, err := scanTestimonial(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		items = append(items, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read testimonials")
	}

	return items, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateTestimonialInput) (*Testimonial, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("testimonial repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("testimonial id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE testimonials
		SET
			client_name = $1,
			client_role = $2,
			company_name = $3,
			content = $4,
			rating = $5,
			photo_url = $6,
			is_featured = $7,
			display_order = $8,
			is_active = $9,
			updated_by_user_id = $10,
			updated_at = NOW()
		WHERE id = $11
		RETURNING %s
	`, testimonialSelectColumns)

	item, err := scanTestimonial(r.pool.QueryRow(
		ctx,
		query,
		input.ClientName,
		nullableString(input.ClientRole),
		nullableString(input.CompanyName),
		input.Content,
		input.Rating,
		nullableString(input.PhotoURL),
		input.IsFeatured,
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

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*Testimonial, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("testimonial repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("testimonial id is required")
	}

	query := fmt.Sprintf(`
		UPDATE testimonials
		SET
			is_active = $1,
			is_featured = $2,
			updated_at = NOW()
		WHERE id = $3
		RETURNING %s
	`, testimonialSelectColumns)

	item, err := scanTestimonial(r.pool.QueryRow(
		ctx,
		query,
		input.IsActive,
		input.IsFeatured,
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("testimonial repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("testimonial id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM testimonials
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("testimonial not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanTestimonial(row rowScanner) (*Testimonial, error) {
	var item Testimonial

	err := row.Scan(
		&item.ID,
		&item.ClientName,
		&item.ClientRole,
		&item.CompanyName,
		&item.Content,
		&item.Rating,
		&item.PhotoURL,
		&item.IsFeatured,
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
		return apperrors.NotFound("testimonial not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related user does not exist")
		case "23514":
			return apperrors.InvalidInput("invalid testimonial data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
