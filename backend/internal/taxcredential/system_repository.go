package taxcredential

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const credentialSystemSelectColumns = `
	id,
	system_name,
	login_url,
	COALESCE(description, ''),
	display_order,
	is_active,
	COALESCE(created_by_user_id, ''),
	COALESCE(updated_by_user_id, ''),
	created_at,
	updated_at
`

type SystemRepository interface {
	CreateSystem(ctx context.Context, input CreateCredentialSystemInput) (*CredentialSystem, error)
	FindSystemByID(ctx context.Context, id string) (*CredentialSystem, error)
	ListSystems(ctx context.Context, filter ListCredentialSystemsFilter) ([]CredentialSystem, int, error)
	UpdateSystem(ctx context.Context, id string, input UpdateCredentialSystemInput) (*CredentialSystem, error)
	UpdateSystemStatus(ctx context.Context, id string, input UpdateSystemStatusInput) (*CredentialSystem, error)
	DeleteSystem(ctx context.Context, id string) error
}

type PostgresSystemRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresSystemRepository(pool *pgxpool.Pool) *PostgresSystemRepository {
	return &PostgresSystemRepository{
		pool: pool,
	}
}

func (r *PostgresSystemRepository) CreateSystem(ctx context.Context, input CreateCredentialSystemInput) (*CredentialSystem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("tax credential system repository is not initialized")
	}

	input = NormalizeCreateSystemInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO tax_credential_systems (
			system_name,
			login_url,
			description,
			display_order,
			is_active,
			created_by_user_id,
			updated_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
		RETURNING %s
	`, credentialSystemSelectColumns)

	item, err := scanCredentialSystem(r.pool.QueryRow(
		ctx,
		query,
		input.SystemName,
		input.LoginURL,
		nullableString(input.Description),
		input.DisplayOrder,
		input.IsActive,
		nullableString(input.CreatedByUserID),
	))
	if err != nil {
		return nil, mapPostgresError(err, "tax credential system not found", "tax credential system already exists")
	}

	return item, nil
}

func (r *PostgresSystemRepository) FindSystemByID(ctx context.Context, id string) (*CredentialSystem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("tax credential system repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("tax credential system id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM tax_credential_systems
		WHERE id = $1
		LIMIT 1
	`, credentialSystemSelectColumns)

	item, err := scanCredentialSystem(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err, "tax credential system not found", "tax credential system already exists")
	}

	return item, nil
}

func (r *PostgresSystemRepository) ListSystems(ctx context.Context, filter ListCredentialSystemsFilter) ([]CredentialSystem, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("tax credential system repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				system_name ILIKE $%d
				OR login_url ILIKE $%d
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
		FROM tax_credential_systems
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count tax credential systems")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM tax_credential_systems
		WHERE %s
		ORDER BY display_order ASC, created_at ASC
		LIMIT $%d OFFSET $%d
	`, credentialSystemSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list tax credential systems")
	}
	defer rows.Close()

	items := make([]CredentialSystem, 0)

	for rows.Next() {
		item, err := scanCredentialSystem(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err, "tax credential system not found", "tax credential system already exists")
		}

		items = append(items, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read tax credential systems")
	}

	return items, totalItems, nil
}

func (r *PostgresSystemRepository) UpdateSystem(ctx context.Context, id string, input UpdateCredentialSystemInput) (*CredentialSystem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("tax credential system repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("tax credential system id is required")
	}

	input = NormalizeUpdateSystemInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE tax_credential_systems
		SET
			system_name = $1,
			login_url = $2,
			description = $3,
			display_order = $4,
			is_active = $5,
			updated_by_user_id = $6,
			updated_at = NOW()
		WHERE id = $7
		RETURNING %s
	`, credentialSystemSelectColumns)

	item, err := scanCredentialSystem(r.pool.QueryRow(
		ctx,
		query,
		input.SystemName,
		input.LoginURL,
		nullableString(input.Description),
		input.DisplayOrder,
		input.IsActive,
		nullableString(input.UpdatedByUserID),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err, "tax credential system not found", "tax credential system already exists")
	}

	return item, nil
}

func (r *PostgresSystemRepository) UpdateSystemStatus(ctx context.Context, id string, input UpdateSystemStatusInput) (*CredentialSystem, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("tax credential system repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("tax credential system id is required")
	}

	query := fmt.Sprintf(`
		UPDATE tax_credential_systems
		SET
			is_active = $1,
			updated_at = NOW()
		WHERE id = $2
		RETURNING %s
	`, credentialSystemSelectColumns)

	item, err := scanCredentialSystem(r.pool.QueryRow(ctx, query, input.IsActive, id))
	if err != nil {
		return nil, mapPostgresError(err, "tax credential system not found", "tax credential system already exists")
	}

	return item, nil
}

func (r *PostgresSystemRepository) DeleteSystem(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("tax credential system repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("tax credential system id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM tax_credential_systems
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err, "tax credential system not found", "tax credential system already exists")
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("tax credential system not found")
	}

	return nil
}

func scanCredentialSystem(row rowScanner) (*CredentialSystem, error) {
	var item CredentialSystem

	err := row.Scan(
		&item.ID,
		&item.SystemName,
		&item.LoginURL,
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