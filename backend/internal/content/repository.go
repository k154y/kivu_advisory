package content

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

const contentSelectColumns = `
	id,
	content_key,
	COALESCE(title, ''),
	COALESCE(slug, ''),
	content_type,
	COALESCE(body, ''),
	COALESCE(summary, ''),
	COALESCE(meta_title, ''),
	COALESCE(meta_description, ''),
	COALESCE(image_url, ''),
	COALESCE(button_label, ''),
	COALESCE(button_url, ''),
	is_active,
	display_order,
	COALESCE(created_by_user_id, ''),
	COALESCE(updated_by_user_id, ''),
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateContentInput) (*ContentItem, error)
	FindByID(ctx context.Context, id string) (*ContentItem, error)
	FindBySlug(ctx context.Context, slug string) (*ContentItem, error)
	List(ctx context.Context, filter ListContentFilter) ([]ContentItem, int, error)
	Update(ctx context.Context, id string, input UpdateContentInput) (*ContentItem, error)
	SetActive(ctx context.Context, id string, isActive bool, updatedByUserID string) error
	Delete(ctx context.Context, id string) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateContentInput) (*ContentItem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("content repository is not initialized")
	}

	input = NormalizeCreateInput(input)
	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO content (
			content_key,
			title,
			slug,
			content_type,
			body,
			summary,
			meta_title,
			meta_description,
			image_url,
			button_label,
			button_url,
			is_active,
			display_order,
			created_by_user_id,
			updated_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING %s
	`, contentSelectColumns)

	item, err := scanContentItem(r.pool.QueryRow(
		ctx,
		query,
		input.ContentKey,
		nullableString(input.Title),
		nullableString(input.Slug),
		input.ContentType,
		nullableString(input.Body),
		nullableString(input.Summary),
		nullableString(input.MetaTitle),
		nullableString(input.MetaDescription),
		nullableString(input.ImageURL),
		nullableString(input.ButtonLabel),
		nullableString(input.ButtonURL),
		input.IsActive,
		input.DisplayOrder,
		nullableString(input.CreatedByUserID),
		nullableString(input.UpdatedByUserID),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*ContentItem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("content repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("content id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM content
		WHERE id = $1
		LIMIT 1
	`, contentSelectColumns)

	item, err := scanContentItem(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindBySlug(ctx context.Context, slug string) (*ContentItem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("content repository is not initialized")
	}

	slug = strings.TrimSpace(strings.ToLower(slug))
	if slug == "" {
		return nil, apperrors.InvalidInput("content slug is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM content
		WHERE slug = $1
		LIMIT 1
	`, contentSelectColumns)

	item, err := scanContentItem(r.pool.QueryRow(ctx, query, slug))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListContentFilter) ([]ContentItem, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("content repository is not initialized")
	}

	filter = filter.Normalize()
	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.ContentType != "" {
		args = append(args, filter.ContentType)
		conditions = append(conditions, fmt.Sprintf("content_type = $%d", len(args)))
	}

	if filter.IsActive != nil {
		args = append(args, *filter.IsActive)
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", len(args)))
	}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)
		conditions = append(conditions, fmt.Sprintf(`(
			content_key ILIKE $%d
			OR COALESCE(title, '') ILIKE $%d
			OR COALESCE(slug, '') ILIKE $%d
			OR COALESCE(summary, '') ILIKE $%d
			OR COALESCE(body, '') ILIKE $%d
		)`, placeholder, placeholder, placeholder, placeholder, placeholder))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM content WHERE %s`, whereClause)
	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count content")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM content
		WHERE %s
		ORDER BY display_order ASC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, contentSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list content")
	}
	defer rows.Close()

	items := make([]ContentItem, 0)
	for rows.Next() {
		item, scanErr := scanContentItem(rows)
		if scanErr != nil {
			return nil, 0, mapPostgresError(scanErr)
		}
		items = append(items, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read content")
	}

	return items, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateContentInput) (*ContentItem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("content repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("content id is required")
	}

	input = NormalizeUpdateInput(input)
	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE content
		SET
			content_key = $1,
			title = $2,
			slug = $3,
			content_type = $4,
			body = $5,
			summary = $6,
			meta_title = $7,
			meta_description = $8,
			image_url = $9,
			button_label = $10,
			button_url = $11,
			is_active = $12,
			display_order = $13,
			updated_by_user_id = $14,
			updated_at = NOW()
		WHERE id = $15
		RETURNING %s
	`, contentSelectColumns)

	item, err := scanContentItem(r.pool.QueryRow(
		ctx,
		query,
		input.ContentKey,
		nullableString(input.Title),
		nullableString(input.Slug),
		input.ContentType,
		nullableString(input.Body),
		nullableString(input.Summary),
		nullableString(input.MetaTitle),
		nullableString(input.MetaDescription),
		nullableString(input.ImageURL),
		nullableString(input.ButtonLabel),
		nullableString(input.ButtonURL),
		input.IsActive,
		input.DisplayOrder,
		nullableString(input.UpdatedByUserID),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) SetActive(ctx context.Context, id string, isActive bool, updatedByUserID string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("content repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("content id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		UPDATE content
		SET
			is_active = $1,
			updated_by_user_id = $2,
			updated_at = NOW()
		WHERE id = $3
	`, isActive, nullableString(updatedByUserID), id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("content not found")
	}

	return nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("content repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("content id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `DELETE FROM content WHERE id = $1`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("content not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanContentItem(row rowScanner) (*ContentItem, error) {
	var item ContentItem
	err := row.Scan(
		&item.ID,
		&item.ContentKey,
		&item.Title,
		&item.Slug,
		&item.ContentType,
		&item.Body,
		&item.Summary,
		&item.MetaTitle,
		&item.MetaDescription,
		&item.ImageURL,
		&item.ButtonLabel,
		&item.ButtonURL,
		&item.IsActive,
		&item.DisplayOrder,
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
		return apperrors.NotFound("content not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related user does not exist")
		case "23505":
			return apperrors.Conflict("content key or slug already exists")
		case "23514":
			return apperrors.InvalidInput("invalid content data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
