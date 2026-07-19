package accountant

import (
	"context"
	stderrors "errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const accountantSelectColumns = `
	id,
	full_name,
	email,
	COALESCE(phone, ''),
	is_active,
	last_login_at,
	created_at,
	updated_at
`

type Repository interface {
	FindByID(ctx context.Context, id string) (*Accountant, error)
	List(ctx context.Context, filter ListAccountantsFilter) ([]Accountant, int, error)
	SetActive(ctx context.Context, id string, isActive bool) (*Accountant, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{
		pool: pool,
	}
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Accountant, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("accountant repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("accountant id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM users
		WHERE id = $1
		  AND role = 'accountant'
		LIMIT 1
	`, accountantSelectColumns)

	foundAccountant, err := scanAccountant(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundAccountant, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListAccountantsFilter) ([]Accountant, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("accountant repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"role = 'accountant'"}
	args := make([]any, 0)

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				full_name ILIKE $%d
				OR email ILIKE $%d
				OR COALESCE(phone, '') ILIKE $%d
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
		FROM users
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count accountants")
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
	`, accountantSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list accountants")
	}
	defer rows.Close()

	accountants := make([]Accountant, 0)

	for rows.Next() {
		item, err := scanAccountant(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		accountants = append(accountants, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read accountants")
	}

	return accountants, totalItems, nil
}

func (r *PostgresRepository) SetActive(ctx context.Context, id string, isActive bool) (*Accountant, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("accountant repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("accountant id is required")
	}

	query := fmt.Sprintf(`
		UPDATE users
		SET
			is_active = $1,
			updated_at = NOW()
		WHERE id = $2
		  AND role = 'accountant'
		RETURNING %s
	`, accountantSelectColumns)

	updatedAccountant, err := scanAccountant(r.pool.QueryRow(ctx, query, isActive, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedAccountant, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanAccountant(row rowScanner) (*Accountant, error) {
	var item Accountant
	var lastLoginAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.FullName,
		&item.Email,
		&item.Phone,
		&item.IsActive,
		&lastLoginAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if lastLoginAt.Valid {
		value := lastLoginAt.Time
		item.LastLoginAt = &value
	}

	return &item, nil
}

func mapPostgresError(err error) error {
	if err == nil {
		return nil
	}

	if stderrors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound("accountant not found")
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
