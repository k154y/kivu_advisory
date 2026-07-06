package user

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

const userSelectColumns = `
	id,
	full_name,
	COALESCE(company_name, ''),
	email,
	COALESCE(phone, ''),
	COALESCE(whatsapp, ''),
	COALESCE(location, ''),
	role,
	password_hash,
	is_active,
	created_at,
	updated_at,
	last_login_at
`

type Repository interface {
	Create(ctx context.Context, input CreateUserInput) (*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	List(ctx context.Context, filter ListUsersFilter) ([]User, int, error)
	Update(ctx context.Context, id string, input UpdateUserInput) (*User, error)
	UpdatePassword(ctx context.Context, id string, passwordHash string) error
	UpdateLastLogin(ctx context.Context, id string) error
	SetActive(ctx context.Context, id string, isActive bool) error
	EmailExists(ctx context.Context, email string, excludeUserID string) (bool, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{
		pool: pool,
	}
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateUserInput) (*User, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("user repository is not initialized")
	}

	input.Email = NormalizeEmail(input.Email)
	input.Role = NormalizeRole(input.Role)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO users (
			full_name,
			company_name,
			email,
			phone,
			whatsapp,
			location,
			role,
			password_hash,
			is_active
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING %s
	`, userSelectColumns)

	createdUser, err := scanUser(r.pool.QueryRow(
		ctx,
		query,
		strings.TrimSpace(input.FullName),
		strings.TrimSpace(input.CompanyName),
		input.Email,
		strings.TrimSpace(input.Phone),
		strings.TrimSpace(input.WhatsApp),
		strings.TrimSpace(input.Location),
		input.Role,
		input.PasswordHash,
		input.IsActive,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdUser, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*User, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("user repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("user id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM users
		WHERE id = $1
		LIMIT 1
	`, userSelectColumns)

	foundUser, err := scanUser(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundUser, nil
}

func (r *PostgresRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("user repository is not initialized")
	}

	email = NormalizeEmail(email)
	if email == "" {
		return nil, apperrors.InvalidInput("email is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM users
		WHERE email = $1
		LIMIT 1
	`, userSelectColumns)

	foundUser, err := scanUser(r.pool.QueryRow(ctx, query, email))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundUser, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListUsersFilter) ([]User, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("user repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Role != "" {
		args = append(args, filter.Role)
		conditions = append(conditions, fmt.Sprintf("role = $%d", len(args)))
	}

	if filter.IsActive != nil {
		args = append(args, *filter.IsActive)
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", len(args)))
	}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				full_name ILIKE $%d
				OR company_name ILIKE $%d
				OR email ILIKE $%d
				OR phone ILIKE $%d
			)
		`, placeholder, placeholder, placeholder, placeholder))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM users
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count users")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM users
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, userSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list users")
	}
	defer rows.Close()

	users := make([]User, 0)

	for rows.Next() {
		item, err := scanUser(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		users = append(users, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read users")
	}

	return users, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateUserInput) (*User, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("user repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("user id is required")
	}

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	args := []any{
		strings.TrimSpace(input.FullName),
		strings.TrimSpace(input.CompanyName),
		strings.TrimSpace(input.Phone),
		strings.TrimSpace(input.WhatsApp),
		strings.TrimSpace(input.Location),
		id,
	}

	setActiveSQL := ""
	if input.IsActive != nil {
		args = append(args, *input.IsActive)
		setActiveSQL = fmt.Sprintf(", is_active = $%d", len(args))
	}

	query := fmt.Sprintf(`
		UPDATE users
		SET
			full_name = $1,
			company_name = $2,
			phone = $3,
			whatsapp = $4,
			location = $5,
			updated_at = NOW()
			%s
		WHERE id = $6
		RETURNING %s
	`, setActiveSQL, userSelectColumns)

	updatedUser, err := scanUser(r.pool.QueryRow(ctx, query, args...))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedUser, nil
}

func (r *PostgresRepository) UpdatePassword(ctx context.Context, id string, passwordHash string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("user repository is not initialized")
	}

	id = strings.TrimSpace(id)
	passwordHash = strings.TrimSpace(passwordHash)

	if id == "" {
		return apperrors.InvalidInput("user id is required")
	}

	if passwordHash == "" {
		return apperrors.InvalidInput("password hash is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET password_hash = $1, updated_at = NOW()
		WHERE id = $2
	`, passwordHash, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("user not found")
	}

	return nil
}

func (r *PostgresRepository) UpdateLastLogin(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("user repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("user id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET last_login_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("user not found")
	}

	return nil
}

func (r *PostgresRepository) SetActive(ctx context.Context, id string, isActive bool) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("user repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("user id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET is_active = $1, updated_at = NOW()
		WHERE id = $2
	`, isActive, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("user not found")
	}

	return nil
}

func (r *PostgresRepository) EmailExists(ctx context.Context, email string, excludeUserID string) (bool, error) {
	if r == nil || r.pool == nil {
		return false, apperrors.Internal("user repository is not initialized")
	}

	email = NormalizeEmail(email)
	excludeUserID = strings.TrimSpace(excludeUserID)

	if email == "" {
		return false, apperrors.InvalidInput("email is required")
	}

	query := `
		SELECT EXISTS (
			SELECT 1
			FROM users
			WHERE email = $1
			AND ($2 = '' OR id <> $2)
		)
	`

	var exists bool
	if err := r.pool.QueryRow(ctx, query, email, excludeUserID).Scan(&exists); err != nil {
		return false, apperrors.InternalWrap(err, "failed to check email")
	}

	return exists, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (*User, error) {
	var item User
	var lastLoginAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.FullName,
		&item.CompanyName,
		&item.Email,
		&item.Phone,
		&item.WhatsApp,
		&item.Location,
		&item.Role,
		&item.PasswordHash,
		&item.IsActive,
		&item.CreatedAt,
		&item.UpdatedAt,
		&lastLoginAt,
	)
	if err != nil {
		return nil, err
	}

	if lastLoginAt.Valid {
		loginTime := lastLoginAt.Time
		item.LastLoginAt = &loginTime
	}

	return &item, nil
}

func mapPostgresError(err error) error {
	if err == nil {
		return nil
	}

	if stderrors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound("user not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return apperrors.Conflict("email is already used")
		case "23503":
			return apperrors.Conflict("related record does not exist")
		case "23514":
			return apperrors.InvalidInput("invalid user data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
