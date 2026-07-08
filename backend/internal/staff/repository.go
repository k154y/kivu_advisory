package staff

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

const staffSelectColumns = `
	id,
	full_name,
	slug,
	role_title,
	COALESCE(short_description, ''),
	COALESCE(bio, ''),
	COALESCE(education_background, ''),
	COALESCE(work_experience, ''),
	COALESCE(professional_certifications, ''),
	COALESCE(email, ''),
	COALESCE(phone, ''),
	COALESCE(photo_url, ''),
	show_on_website,
	show_on_homepage,
	show_bio,
	show_education,
	show_work_experience,
	show_certifications,
	show_contact,
	display_order,
	is_active,
	COALESCE(created_by_user_id, ''),
	COALESCE(updated_by_user_id, ''),
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateStaffMemberInput) (*StaffMember, error)
	FindByID(ctx context.Context, id string) (*StaffMember, error)
	FindBySlug(ctx context.Context, slug string) (*StaffMember, error)
	List(ctx context.Context, filter ListStaffMembersFilter) ([]StaffMember, int, error)
	Update(ctx context.Context, id string, input UpdateStaffMemberInput) (*StaffMember, error)
	UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*StaffMember, error)
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateStaffMemberInput) (*StaffMember, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("staff repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO staff_members (
			full_name,
			slug,
			role_title,
			short_description,
			bio,
			education_background,
			work_experience,
			professional_certifications,
			email,
			phone,
			photo_url,
			show_on_website,
			show_on_homepage,
			show_bio,
			show_education,
			show_work_experience,
			show_certifications,
			show_contact,
			display_order,
			is_active,
			created_by_user_id,
			updated_by_user_id
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $21
		)
		RETURNING %s
	`, staffSelectColumns)

	item, err := scanStaffMember(r.pool.QueryRow(
		ctx,
		query,
		input.FullName,
		input.Slug,
		input.RoleTitle,
		nullableString(input.ShortDescription),
		nullableString(input.Bio),
		nullableString(input.EducationBackground),
		nullableString(input.WorkExperience),
		nullableString(input.ProfessionalCertifications),
		nullableString(input.Email),
		nullableString(input.Phone),
		nullableString(input.PhotoURL),
		input.ShowOnWebsite,
		input.ShowOnHomepage,
		input.ShowBio,
		input.ShowEducation,
		input.ShowWorkExperience,
		input.ShowCertifications,
		input.ShowContact,
		input.DisplayOrder,
		input.IsActive,
		nullableString(input.CreatedByUserID),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*StaffMember, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("staff repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("staff member id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM staff_members
		WHERE id = $1
		LIMIT 1
	`, staffSelectColumns)

	item, err := scanStaffMember(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) FindBySlug(ctx context.Context, slug string) (*StaffMember, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("staff repository is not initialized")
	}

	slug = strings.TrimSpace(strings.ToLower(slug))
	if slug == "" {
		return nil, apperrors.InvalidInput("staff member slug is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM staff_members
		WHERE slug = $1
		LIMIT 1
	`, staffSelectColumns)

	item, err := scanStaffMember(r.pool.QueryRow(ctx, query, slug))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListStaffMembersFilter) ([]StaffMember, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("staff repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)
		conditions = append(conditions, fmt.Sprintf(`(
			full_name ILIKE $%d
			OR slug ILIKE $%d
			OR role_title ILIKE $%d
			OR COALESCE(short_description, '') ILIKE $%d
			OR COALESCE(bio, '') ILIKE $%d
		)`, placeholder, placeholder, placeholder, placeholder, placeholder))
	}

	if filter.ShowOnWebsite != nil {
		args = append(args, *filter.ShowOnWebsite)
		conditions = append(conditions, fmt.Sprintf("show_on_website = $%d", len(args)))
	}

	if filter.ShowOnHomepage != nil {
		args = append(args, *filter.ShowOnHomepage)
		conditions = append(conditions, fmt.Sprintf("show_on_homepage = $%d", len(args)))
	}

	if filter.IsActive != nil {
		args = append(args, *filter.IsActive)
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM staff_members
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count staff members")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM staff_members
		WHERE %s
		ORDER BY display_order ASC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, staffSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list staff members")
	}
	defer rows.Close()

	items := make([]StaffMember, 0)

	for rows.Next() {
		item, err := scanStaffMember(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		items = append(items, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read staff members")
	}

	return items, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateStaffMemberInput) (*StaffMember, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("staff repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("staff member id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE staff_members
		SET
			full_name = $1,
			slug = $2,
			role_title = $3,
			short_description = $4,
			bio = $5,
			education_background = $6,
			work_experience = $7,
			professional_certifications = $8,
			email = $9,
			phone = $10,
			photo_url = $11,
			show_on_website = $12,
			show_on_homepage = $13,
			show_bio = $14,
			show_education = $15,
			show_work_experience = $16,
			show_certifications = $17,
			show_contact = $18,
			display_order = $19,
			is_active = $20,
			updated_by_user_id = $21,
			updated_at = NOW()
		WHERE id = $22
		RETURNING %s
	`, staffSelectColumns)

	item, err := scanStaffMember(r.pool.QueryRow(
		ctx,
		query,
		input.FullName,
		input.Slug,
		input.RoleTitle,
		nullableString(input.ShortDescription),
		nullableString(input.Bio),
		nullableString(input.EducationBackground),
		nullableString(input.WorkExperience),
		nullableString(input.ProfessionalCertifications),
		nullableString(input.Email),
		nullableString(input.Phone),
		nullableString(input.PhotoURL),
		input.ShowOnWebsite,
		input.ShowOnHomepage,
		input.ShowBio,
		input.ShowEducation,
		input.ShowWorkExperience,
		input.ShowCertifications,
		input.ShowContact,
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

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*StaffMember, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("staff repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("staff member id is required")
	}

	query := fmt.Sprintf(`
		UPDATE staff_members
		SET
			is_active = $1,
			show_on_website = $2,
			show_on_homepage = $3,
			updated_at = NOW()
		WHERE id = $4
		RETURNING %s
	`, staffSelectColumns)

	item, err := scanStaffMember(r.pool.QueryRow(
		ctx,
		query,
		input.IsActive,
		input.ShowOnWebsite,
		input.ShowOnHomepage,
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return item, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("staff repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("staff member id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM staff_members
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("staff member not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanStaffMember(row rowScanner) (*StaffMember, error) {
	var item StaffMember

	err := row.Scan(
		&item.ID,
		&item.FullName,
		&item.Slug,
		&item.RoleTitle,
		&item.ShortDescription,
		&item.Bio,
		&item.EducationBackground,
		&item.WorkExperience,
		&item.ProfessionalCertifications,
		&item.Email,
		&item.Phone,
		&item.PhotoURL,
		&item.ShowOnWebsite,
		&item.ShowOnHomepage,
		&item.ShowBio,
		&item.ShowEducation,
		&item.ShowWorkExperience,
		&item.ShowCertifications,
		&item.ShowContact,
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
		return apperrors.NotFound("staff member not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related user does not exist")
		case "23505":
			return apperrors.Conflict("staff member slug already exists")
		case "23514":
			return apperrors.InvalidInput("invalid staff member data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}