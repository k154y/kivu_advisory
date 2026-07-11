package sociallink

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

const socialLinkSelectColumns = `
	id,
	platform,
	label,
	url,
	COALESCE(icon_name, ''),
	display_order,
	is_active,
	show_in_footer,
	show_in_contact_page,
	COALESCE(created_by_user_id, ''),
	COALESCE(updated_by_user_id, ''),
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateSocialLinkInput) (*SocialLink, error)
	FindByID(ctx context.Context, id string) (*SocialLink, error)
	List(ctx context.Context, filter ListSocialLinksFilter) ([]SocialLink, int, error)
	Update(ctx context.Context, id string, input UpdateSocialLinkInput) (*SocialLink, error)
	UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*SocialLink, error)
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateSocialLinkInput) (*SocialLink, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("social link repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO social_links (
			platform,
			label,
			url,
			icon_name,
			display_order,
			is_active,
			show_in_footer,
			show_in_contact_page,
			created_by_user_id,
			updated_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
		RETURNING %s
	`, socialLinkSelectColumns)

	item, err := scanSocialLink(r.pool.QueryRow(
		ctx,
		query,
		input.Platform,
		input.Label,
		input.URL,
		nullableString(input.IconName),
		input.DisplayOrder,
		input.IsActive,
		input.ShowInFooter,
		input.ShowInContactPage,
		nullableString(input.CreatedByUserID),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*SocialLink, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("social link repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("social link id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM social_links
		WHERE id = $1
		LIMIT 1
	`, socialLinkSelectColumns)

	item, err := scanSocialLink(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListSocialLinksFilter) ([]SocialLink, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("social link repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				platform ILIKE $%d
				OR label ILIKE $%d
				OR url ILIKE $%d
				OR COALESCE(icon_name, '') ILIKE $%d
			)
		`, placeholder, placeholder, placeholder, placeholder))
	}

	if filter.IsActive != nil {
		args = append(args, *filter.IsActive)
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", len(args)))
	}

	if filter.ShowInFooter != nil {
		args = append(args, *filter.ShowInFooter)
		conditions = append(conditions, fmt.Sprintf("show_in_footer = $%d", len(args)))
	}

	if filter.ShowInContactPage != nil {
		args = append(args, *filter.ShowInContactPage)
		conditions = append(conditions, fmt.Sprintf("show_in_contact_page = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM social_links
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count social links")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM social_links
		WHERE %s
		ORDER BY display_order ASC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, socialLinkSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list social links")
	}
	defer rows.Close()

	items := make([]SocialLink, 0)

	for rows.Next() {
		item, err := scanSocialLink(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		items = append(items, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read social links")
	}

	return items, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateSocialLinkInput) (*SocialLink, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("social link repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("social link id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE social_links
		SET
			platform = $1,
			label = $2,
			url = $3,
			icon_name = $4,
			display_order = $5,
			is_active = $6,
			show_in_footer = $7,
			show_in_contact_page = $8,
			updated_by_user_id = $9,
			updated_at = NOW()
		WHERE id = $10
		RETURNING %s
	`, socialLinkSelectColumns)

	item, err := scanSocialLink(r.pool.QueryRow(
		ctx,
		query,
		input.Platform,
		input.Label,
		input.URL,
		nullableString(input.IconName),
		input.DisplayOrder,
		input.IsActive,
		input.ShowInFooter,
		input.ShowInContactPage,
		nullableString(input.UpdatedByUserID),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*SocialLink, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("social link repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("social link id is required")
	}

	query := fmt.Sprintf(`
		UPDATE social_links
		SET
			is_active = $1,
			show_in_footer = $2,
			show_in_contact_page = $3,
			updated_at = NOW()
		WHERE id = $4
		RETURNING %s
	`, socialLinkSelectColumns)

	item, err := scanSocialLink(r.pool.QueryRow(
		ctx,
		query,
		input.IsActive,
		input.ShowInFooter,
		input.ShowInContactPage,
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("social link repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("social link id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM social_links
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("social link not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanSocialLink(row rowScanner) (*SocialLink, error) {
	var item SocialLink

	err := row.Scan(
		&item.ID,
		&item.Platform,
		&item.Label,
		&item.URL,
		&item.IconName,
		&item.DisplayOrder,
		&item.IsActive,
		&item.ShowInFooter,
		&item.ShowInContactPage,
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
		return apperrors.NotFound("social link not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related user does not exist")
		case "23505":
			return apperrors.Conflict("social link platform already exists")
		case "23514":
			return apperrors.InvalidInput("invalid social link data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}