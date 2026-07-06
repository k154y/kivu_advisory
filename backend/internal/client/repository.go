package client

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

const clientSelectColumns = `
	id,
	user_id,
	COALESCE(company_name, ''),
	COALESCE(tin, ''),
	COALESCE(business_type, ''),
	COALESCE(address, ''),
	COALESCE(city, ''),
	COALESCE(country, ''),
	COALESCE(website, ''),
	COALESCE(notes, ''),
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateClientInput) (*Client, error)
	FindByID(ctx context.Context, id string) (*Client, error)
	FindByUserID(ctx context.Context, userID string) (*Client, error)
	List(ctx context.Context, filter ListClientsFilter) ([]Client, int, error)
	Update(ctx context.Context, id string, input UpdateClientInput) (*Client, error)
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateClientInput) (*Client, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client repository is not initialized")
	}

	input = NormalizeInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO clients (
			user_id,
			company_name,
			tin,
			business_type,
			address,
			city,
			country,
			website,
			notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING %s
	`, clientSelectColumns)

	createdClient, err := scanClient(r.pool.QueryRow(
		ctx,
		query,
		input.UserID,
		input.CompanyName,
		input.TIN,
		input.BusinessType,
		input.Address,
		input.City,
		input.Country,
		input.Website,
		input.Notes,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdClient, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Client, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("client id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM clients
		WHERE id = $1
		LIMIT 1
	`, clientSelectColumns)

	foundClient, err := scanClient(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundClient, nil
}

func (r *PostgresRepository) FindByUserID(ctx context.Context, userID string) (*Client, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client repository is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, apperrors.InvalidInput("user id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM clients
		WHERE user_id = $1
		LIMIT 1
	`, clientSelectColumns)

	foundClient, err := scanClient(r.pool.QueryRow(ctx, query, userID))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundClient, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListClientsFilter) ([]Client, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("client repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				COALESCE(company_name, '') ILIKE $%d
				OR COALESCE(tin, '') ILIKE $%d
				OR COALESCE(business_type, '') ILIKE $%d
				OR COALESCE(city, '') ILIKE $%d
				OR COALESCE(country, '') ILIKE $%d
			)
		`, placeholder, placeholder, placeholder, placeholder, placeholder))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM clients
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count clients")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM clients
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, clientSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list clients")
	}
	defer rows.Close()

	clients := make([]Client, 0)

	for rows.Next() {
		item, err := scanClient(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		clients = append(clients, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read clients")
	}

	return clients, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateClientInput) (*Client, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("client repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("client id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE clients
		SET
			company_name = $1,
			tin = $2,
			business_type = $3,
			address = $4,
			city = $5,
			country = $6,
			website = $7,
			notes = $8,
			updated_at = NOW()
		WHERE id = $9
		RETURNING %s
	`, clientSelectColumns)

	updatedClient, err := scanClient(r.pool.QueryRow(
		ctx,
		query,
		input.CompanyName,
		input.TIN,
		input.BusinessType,
		input.Address,
		input.City,
		input.Country,
		input.Website,
		input.Notes,
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedClient, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("client repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("client id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM clients
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("client profile not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanClient(row rowScanner) (*Client, error) {
	var item Client

	err := row.Scan(
		&item.ID,
		&item.UserID,
		&item.CompanyName,
		&item.TIN,
		&item.BusinessType,
		&item.Address,
		&item.City,
		&item.Country,
		&item.Website,
		&item.Notes,
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
		return apperrors.NotFound("client profile not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return apperrors.Conflict("client profile already exists")
		case "23503":
			return apperrors.Conflict("related user does not exist")
		case "23514":
			return apperrors.InvalidInput("invalid client profile data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
