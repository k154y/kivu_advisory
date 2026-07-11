package blog

import (
	"context"
	stderrors "errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const postSelectColumns = `
	id,
	title,
	slug,
	COALESCE(excerpt, ''),
	body,
	COALESCE(category, ''),
	tags,
	COALESCE(featured_image_url, ''),
	status,
	is_featured,
	COALESCE(meta_title, ''),
	COALESCE(meta_description, ''),
	COALESCE(author_user_id, ''),
	published_at,
	view_count,
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreatePostInput) (*Post, error)
	FindByID(ctx context.Context, id string) (*Post, error)
	FindBySlug(ctx context.Context, slug string) (*Post, error)
	List(ctx context.Context, filter ListPostsFilter) ([]Post, int, error)
	Update(ctx context.Context, id string, input UpdatePostInput) (*Post, error)
	UpdateStatus(ctx context.Context, id string, status string) (*Post, error)
	Delete(ctx context.Context, id string) error
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, input CreatePostInput) (*Post, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("blog repository is not initialized")
	}

	input = NormalizeCreateInput(input)
	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO blog_posts (
			title,
			slug,
			excerpt,
			body,
			category,
			tags,
			featured_image_url,
			status,
			is_featured,
			meta_title,
			meta_description,
			author_user_id,
			published_at
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			$6::text[],
			$7,
			$8::varchar,
			$9,
			$10,
			$11,
			$12,
			CASE WHEN $8::text = 'published' THEN NOW() ELSE NULL END
		)
		RETURNING %s
	`, postSelectColumns)

	item, err := scanPost(r.pool.QueryRow(
		ctx,
		query,
		input.Title,
		input.Slug,
		nullableString(input.Excerpt),
		input.Body,
		nullableString(input.Category),
		input.Tags,
		nullableString(input.FeaturedImageURL),
		input.Status,
		input.IsFeatured,
		nullableString(input.MetaTitle),
		nullableString(input.MetaDescription),
		nullableString(input.AuthorUserID),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Post, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("blog repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("blog id is required")
	}

	query := fmt.Sprintf(`SELECT %s FROM blog_posts WHERE id = $1 LIMIT 1`, postSelectColumns)
	item, err := scanPost(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindBySlug(ctx context.Context, slug string) (*Post, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("blog repository is not initialized")
	}

	slug = strings.TrimSpace(strings.ToLower(slug))
	if slug == "" {
		return nil, apperrors.InvalidInput("blog slug is required")
	}

	query := fmt.Sprintf(`SELECT %s FROM blog_posts WHERE slug = $1 LIMIT 1`, postSelectColumns)
	item, err := scanPost(r.pool.QueryRow(ctx, query, slug))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListPostsFilter) ([]Post, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("blog repository is not initialized")
	}

	filter = filter.Normalize()
	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Status != "" {
		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}
	if filter.Category != "" {
		args = append(args, filter.Category)
		conditions = append(conditions, fmt.Sprintf("category = $%d", len(args)))
	}
	if filter.IsFeatured != nil {
		args = append(args, *filter.IsFeatured)
		conditions = append(conditions, fmt.Sprintf("is_featured = $%d", len(args)))
	}
	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)
		conditions = append(conditions, fmt.Sprintf(`(
			title ILIKE $%d
			OR slug ILIKE $%d
			OR COALESCE(excerpt, '') ILIKE $%d
			OR body ILIKE $%d
			OR COALESCE(category, '') ILIKE $%d
		)`, placeholder, placeholder, placeholder, placeholder, placeholder))
	}

	whereClause := strings.Join(conditions, " AND ")
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM blog_posts WHERE %s`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count blog posts")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM blog_posts
		WHERE %s
		ORDER BY published_at DESC NULLS LAST, created_at DESC
		LIMIT $%d OFFSET $%d
	`, postSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list blog posts")
	}
	defer rows.Close()

	items := make([]Post, 0)
	for rows.Next() {
		item, scanErr := scanPost(rows)
		if scanErr != nil {
			return nil, 0, mapPostgresError(scanErr)
		}
		items = append(items, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read blog posts")
	}

	return items, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdatePostInput) (*Post, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("blog repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("blog id is required")
	}

	input = NormalizeUpdateInput(input)
	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE blog_posts
		SET
			title = $1,
			slug = $2,
			excerpt = $3,
			body = $4,
			category = $5,
			tags = $6::text[],
			featured_image_url = $7,
			status = $8::varchar,
			is_featured = $9,
			meta_title = $10,
			meta_description = $11,
			author_user_id = $12,
			published_at = CASE
				WHEN $8::text = 'published' AND published_at IS NULL THEN NOW()
				WHEN $8::text <> 'published' THEN NULL
				ELSE published_at
			END,
			updated_at = NOW()
		WHERE id = $13
		RETURNING %s
	`, postSelectColumns)

	item, err := scanPost(r.pool.QueryRow(
		ctx,
		query,
		input.Title,
		input.Slug,
		nullableString(input.Excerpt),
		input.Body,
		nullableString(input.Category),
		input.Tags,
		nullableString(input.FeaturedImageURL),
		input.Status,
		input.IsFeatured,
		nullableString(input.MetaTitle),
		nullableString(input.MetaDescription),
		nullableString(input.AuthorUserID),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, status string) (*Post, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("blog repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("blog id is required")
	}

	status = NormalizeStatus(status)
	if !IsValidStatus(status) {
		return nil, apperrors.InvalidInput("invalid blog status")
	}

	query := fmt.Sprintf(`
		UPDATE blog_posts
		SET
			status = $1::varchar,
			published_at = CASE
				WHEN $1::text = 'published' AND published_at IS NULL THEN NOW()
				WHEN $1::text <> 'published' THEN NULL
				ELSE published_at
			END,
			updated_at = NOW()
		WHERE id = $2
		RETURNING %s
	`, postSelectColumns)

	item, err := scanPost(r.pool.QueryRow(ctx, query, status, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("blog repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("blog id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `DELETE FROM blog_posts WHERE id = $1`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("blog post not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanPost(row rowScanner) (*Post, error) {
	var item Post
	var publishedAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.Title,
		&item.Slug,
		&item.Excerpt,
		&item.Body,
		&item.Category,
		&item.Tags,
		&item.FeaturedImageURL,
		&item.Status,
		&item.IsFeatured,
		&item.MetaTitle,
		&item.MetaDescription,
		&item.AuthorUserID,
		&publishedAt,
		&item.ViewCount,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if publishedAt.Valid {
		value := publishedAt.Time
		item.PublishedAt = &value
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
		return apperrors.NotFound("blog post not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related author user does not exist")
		case "23505":
			return apperrors.Conflict("blog slug already exists")
		case "23514":
			return apperrors.InvalidInput("invalid blog post data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed: "+err.Error())
}

var _ = time.Time{}
