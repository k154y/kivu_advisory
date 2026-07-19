package taxcredential

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	notificationpkg "github.com/kyves/kivu-advisory/backend/internal/notification"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const clientCredentialSelectColumns = `
	c.id,
	c.client_id,
	c.system_id,
	s.system_name,
	s.login_url,
	c.username,
	c.encrypted_password,
	COALESCE(c.notes, ''),
	c.is_active,
	COALESCE(c.created_by_user_id, ''),
	COALESCE(c.updated_by_user_id, ''),
	c.last_revealed_at,
	COALESCE(c.last_revealed_by_user_id, ''),
	c.created_at,
	c.updated_at
`

type CredentialRepository interface {
	FindClientIDByUserID(ctx context.Context, userID string) (string, error)
	FindClientRecipientByClientID(ctx context.Context, clientID string) (*notificationpkg.Recipient, error)
	AccountantCanAccessClient(ctx context.Context, accountantUserID string, clientID string) (bool, error)

	CreateCredential(ctx context.Context, input CreateClientCredentialInput, encryptedPassword string) (*ClientTaxCredential, error)
	FindCredentialByID(ctx context.Context, id string) (*ClientTaxCredential, error)
	ListCredentials(ctx context.Context, filter ListClientCredentialsFilter) ([]ClientTaxCredential, int, error)
	UpdateCredential(ctx context.Context, id string, input UpdateClientCredentialInput, encryptedPassword string) (*ClientTaxCredential, error)
	UpdateCredentialStatus(ctx context.Context, id string, isActive bool) (*ClientTaxCredential, error)
	DeleteCredential(ctx context.Context, id string) error
	MarkCredentialRevealed(ctx context.Context, id string, revealedByUserID string) error
}

type PostgresCredentialRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresCredentialRepository(pool *pgxpool.Pool) *PostgresCredentialRepository {
	return &PostgresCredentialRepository{
		pool: pool,
	}
}

func (r *PostgresCredentialRepository) FindClientIDByUserID(ctx context.Context, userID string) (string, error) {
	if r == nil || r.pool == nil {
		return "", apperrors.Internal("client tax credential repository is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return "", apperrors.InvalidInput("user id is required")
	}

	var clientID string
	err := r.pool.QueryRow(ctx, `
		SELECT id
		FROM clients
		WHERE user_id = $1
		LIMIT 1
	`, userID).Scan(&clientID)
	if err != nil {
		return "", mapPostgresError(err, "client profile not found", "client credential already exists")
	}

	return clientID, nil
}

func (r *PostgresCredentialRepository) FindClientRecipientByClientID(ctx context.Context, clientID string) (*notificationpkg.Recipient, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client tax credential repository is not initialized")
	}

	clientID = strings.TrimSpace(clientID)
	if clientID == "" {
		return nil, apperrors.InvalidInput("client id is required")
	}

	var recipient notificationpkg.Recipient

	err := r.pool.QueryRow(ctx, `
		SELECT
			u.id,
			COALESCE(u.full_name, ''),
			COALESCE(u.email, ''),
			COALESCE(u.phone, ''),
			COALESCE(u.role, '')
		FROM clients c
		INNER JOIN users u
			ON u.id = c.user_id
		WHERE c.id = $1
		LIMIT 1
	`, clientID).Scan(
		&recipient.UserID,
		&recipient.FullName,
		&recipient.Email,
		&recipient.Phone,
		&recipient.Role,
	)
	if err != nil {
		return nil, mapPostgresError(err, "client recipient not found", "client credential already exists")
	}

	normalizedRecipient := recipient.Normalize()

	return &normalizedRecipient, nil
}

func (r *PostgresCredentialRepository) AccountantCanAccessClient(ctx context.Context, accountantUserID string, clientID string) (bool, error) {
	if r == nil || r.pool == nil {
		return false, apperrors.Internal("client tax credential repository is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	clientID = strings.TrimSpace(clientID)

	if accountantUserID == "" {
		return false, apperrors.InvalidInput("accountant user id is required")
	}

	if clientID == "" {
		return false, apperrors.InvalidInput("client id is required")
	}

	var allowed bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM service_requests sr
			INNER JOIN assignments a
				ON a.service_request_id = sr.id
			WHERE sr.client_id = $1
				AND a.accountant_user_id = $2
				AND a.status <> 'cancelled'
			LIMIT 1
		)
	`, clientID, accountantUserID).Scan(&allowed)
	if err != nil {
		return false, apperrors.InternalWrap(err, "failed to check accountant client access")
	}

	return allowed, nil
}

func (r *PostgresCredentialRepository) CreateCredential(ctx context.Context, input CreateClientCredentialInput, encryptedPassword string) (*ClientTaxCredential, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client tax credential repository is not initialized")
	}

	input = NormalizeCreateCredentialInput(input)
	encryptedPassword = strings.TrimSpace(encryptedPassword)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	if encryptedPassword == "" {
		return nil, apperrors.InvalidInput("encrypted password is required")
	}

	query := fmt.Sprintf(`
		WITH inserted AS (
			INSERT INTO client_tax_credentials (
				client_id,
				system_id,
				username,
				encrypted_password,
				notes,
				is_active,
				created_by_user_id,
				updated_by_user_id
			)
			VALUES ($1, $2, $3, $4, $5, TRUE, $6, $6)
			RETURNING *
		)
		SELECT %s
		FROM inserted c
		INNER JOIN tax_credential_systems s
			ON s.id = c.system_id
	`, clientCredentialSelectColumns)

	item, err := scanClientTaxCredential(r.pool.QueryRow(
		ctx,
		query,
		input.ClientID,
		input.SystemID,
		input.Username,
		encryptedPassword,
		nullableString(input.Notes),
		nullableString(input.CreatedByUserID),
	))
	if err != nil {
		return nil, mapPostgresError(err, "client tax credential not found", "client credential already exists for this system")
	}

	return item, nil
}

func (r *PostgresCredentialRepository) FindCredentialByID(ctx context.Context, id string) (*ClientTaxCredential, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client tax credential repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("client tax credential id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM client_tax_credentials c
		INNER JOIN tax_credential_systems s
			ON s.id = c.system_id
		WHERE c.id = $1
		LIMIT 1
	`, clientCredentialSelectColumns)

	item, err := scanClientTaxCredential(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err, "client tax credential not found", "client credential already exists for this system")
	}

	return item, nil
}

func (r *PostgresCredentialRepository) ListCredentials(ctx context.Context, filter ListClientCredentialsFilter) ([]ClientTaxCredential, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("client tax credential repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.ClientID != "" {
		args = append(args, filter.ClientID)
		conditions = append(conditions, fmt.Sprintf("c.client_id = $%d", len(args)))
	}

	if filter.SystemID != "" {
		args = append(args, filter.SystemID)
		conditions = append(conditions, fmt.Sprintf("c.system_id = $%d", len(args)))
	}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				c.username ILIKE $%d
				OR COALESCE(c.notes, '') ILIKE $%d
				OR s.system_name ILIKE $%d
				OR s.login_url ILIKE $%d
			)
		`, placeholder, placeholder, placeholder, placeholder))
	}

	if filter.IsActive != nil {
		args = append(args, *filter.IsActive)
		conditions = append(conditions, fmt.Sprintf("c.is_active = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM client_tax_credentials c
		INNER JOIN tax_credential_systems s
			ON s.id = c.system_id
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count client tax credentials")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	query := fmt.Sprintf(`
		SELECT %s
		FROM client_tax_credentials c
		INNER JOIN tax_credential_systems s
			ON s.id = c.system_id
		WHERE %s
		ORDER BY s.display_order ASC, c.created_at ASC
		LIMIT $%d OFFSET $%d
	`, clientCredentialSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list client tax credentials")
	}
	defer rows.Close()

	items := make([]ClientTaxCredential, 0)

	for rows.Next() {
		item, err := scanClientTaxCredential(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err, "client tax credential not found", "client credential already exists for this system")
		}

		items = append(items, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read client tax credentials")
	}

	return items, totalItems, nil
}

func (r *PostgresCredentialRepository) UpdateCredential(ctx context.Context, id string, input UpdateClientCredentialInput, encryptedPassword string) (*ClientTaxCredential, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client tax credential repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("client tax credential id is required")
	}

	input = NormalizeUpdateCredentialInput(input)
	encryptedPassword = strings.TrimSpace(encryptedPassword)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		WITH updated AS (
			UPDATE client_tax_credentials
			SET
				username = $1,
				encrypted_password = CASE
					WHEN $2 = '' THEN encrypted_password
					ELSE $2
				END,
				notes = $3,
				is_active = $4,
				updated_by_user_id = $5,
				updated_at = NOW()
			WHERE id = $6
			RETURNING *
		)
		SELECT %s
		FROM updated c
		INNER JOIN tax_credential_systems s
			ON s.id = c.system_id
	`, clientCredentialSelectColumns)

	item, err := scanClientTaxCredential(r.pool.QueryRow(
		ctx,
		query,
		input.Username,
		encryptedPassword,
		nullableString(input.Notes),
		input.IsActive,
		nullableString(input.UpdatedByUserID),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err, "client tax credential not found", "client credential already exists for this system")
	}

	return item, nil
}

func (r *PostgresCredentialRepository) UpdateCredentialStatus(ctx context.Context, id string, isActive bool) (*ClientTaxCredential, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client tax credential repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("client tax credential id is required")
	}

	query := fmt.Sprintf(`
		WITH updated AS (
			UPDATE client_tax_credentials
			SET
				is_active = $1,
				updated_at = NOW()
			WHERE id = $2
			RETURNING *
		)
		SELECT %s
		FROM updated c
		INNER JOIN tax_credential_systems s
			ON s.id = c.system_id
	`, clientCredentialSelectColumns)

	item, err := scanClientTaxCredential(r.pool.QueryRow(ctx, query, isActive, id))
	if err != nil {
		return nil, mapPostgresError(err, "client tax credential not found", "client credential already exists for this system")
	}

	return item, nil
}

func (r *PostgresCredentialRepository) DeleteCredential(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("client tax credential repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("client tax credential id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM client_tax_credentials
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err, "client tax credential not found", "client credential already exists for this system")
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("client tax credential not found")
	}

	return nil
}

func (r *PostgresCredentialRepository) MarkCredentialRevealed(ctx context.Context, id string, revealedByUserID string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("client tax credential repository is not initialized")
	}

	id = strings.TrimSpace(id)
	revealedByUserID = strings.TrimSpace(revealedByUserID)

	if id == "" {
		return apperrors.InvalidInput("client tax credential id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		UPDATE client_tax_credentials
		SET
			last_revealed_at = NOW(),
			last_revealed_by_user_id = NULLIF($2, ''),
			updated_at = NOW()
		WHERE id = $1
	`, id, revealedByUserID)
	if err != nil {
		return mapPostgresError(err, "client tax credential not found", "client credential already exists for this system")
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("client tax credential not found")
	}

	return nil
}

func scanClientTaxCredential(row rowScanner) (*ClientTaxCredential, error) {
	var item ClientTaxCredential

	err := row.Scan(
		&item.ID,
		&item.ClientID,
		&item.SystemID,
		&item.SystemName,
		&item.LoginURL,
		&item.Username,
		&item.EncryptedPassword,
		&item.Notes,
		&item.IsActive,
		&item.CreatedByUserID,
		&item.UpdatedByUserID,
		&item.LastRevealedAt,
		&item.LastRevealedByUserID,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &item, nil
}
