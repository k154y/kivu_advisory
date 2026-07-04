package servicerequest

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

const serviceRequestSelectColumns = `
	id,
	reference_number,
	COALESCE(client_id, ''),
	COALESCE(service_id, ''),
	COALESCE(requester_name, ''),
	COALESCE(requester_email, ''),
	COALESCE(requester_phone, ''),
	COALESCE(requester_company, ''),
	title,
	description,
	status,
	priority,
	COALESCE(preferred_contact_method, ''),
	expected_deadline,
	source,
	COALESCE(admin_notes, ''),
	COALESCE(internal_notes, ''),
	created_at,
	updated_at,
	submitted_at
`

type Repository interface {
	Create(ctx context.Context, input CreateServiceRequestInput) (*ServiceRequest, error)
	FindByID(ctx context.Context, id string) (*ServiceRequest, error)
	FindByReferenceNumber(ctx context.Context, referenceNumber string) (*ServiceRequest, error)
	List(ctx context.Context, filter ListServiceRequestsFilter) ([]ServiceRequest, int, error)
	Update(ctx context.Context, id string, input UpdateServiceRequestInput) (*ServiceRequest, error)
	UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*ServiceRequest, error)
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateServiceRequestInput) (*ServiceRequest, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service request repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO service_requests (
			client_id,
			service_id,
			requester_name,
			requester_email,
			requester_phone,
			requester_company,
			title,
			description,
			priority,
			preferred_contact_method,
			expected_deadline,
			source
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING %s
	`, serviceRequestSelectColumns)

	createdRequest, err := scanServiceRequest(r.pool.QueryRow(
		ctx,
		query,
		nullableString(input.ClientID),
		nullableString(input.ServiceID),
		nullableString(input.RequesterName),
		nullableString(input.RequesterEmail),
		nullableString(input.RequesterPhone),
		nullableString(input.RequesterCompany),
		input.Title,
		input.Description,
		input.Priority,
		nullableString(input.PreferredContactMethod),
		nullableDate(input.ExpectedDeadline),
		input.Source,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdRequest, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*ServiceRequest, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service request repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("service request id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM service_requests
		WHERE id = $1
		LIMIT 1
	`, serviceRequestSelectColumns)

	foundRequest, err := scanServiceRequest(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundRequest, nil
}

func (r *PostgresRepository) FindByReferenceNumber(ctx context.Context, referenceNumber string) (*ServiceRequest, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service request repository is not initialized")
	}

	referenceNumber = strings.TrimSpace(referenceNumber)
	if referenceNumber == "" {
		return nil, apperrors.InvalidInput("reference number is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM service_requests
		WHERE reference_number = $1
		LIMIT 1
	`, serviceRequestSelectColumns)

	foundRequest, err := scanServiceRequest(r.pool.QueryRow(ctx, query, referenceNumber))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundRequest, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListServiceRequestsFilter) ([]ServiceRequest, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("service request repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.ClientID != "" {
		args = append(args, filter.ClientID)
		conditions = append(conditions, fmt.Sprintf("client_id = $%d", len(args)))
	}

	if filter.ServiceID != "" {
		args = append(args, filter.ServiceID)
		conditions = append(conditions, fmt.Sprintf("service_id = $%d", len(args)))
	}

	if filter.Status != "" {
		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}

	if filter.Priority != "" {
		args = append(args, filter.Priority)
		conditions = append(conditions, fmt.Sprintf("priority = $%d", len(args)))
	}

	if filter.Source != "" {
		args = append(args, filter.Source)
		conditions = append(conditions, fmt.Sprintf("source = $%d", len(args)))
	}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				reference_number ILIKE $%d
				OR title ILIKE $%d
				OR description ILIKE $%d
				OR COALESCE(requester_name, '') ILIKE $%d
				OR COALESCE(requester_email, '') ILIKE $%d
				OR COALESCE(requester_phone, '') ILIKE $%d
				OR COALESCE(requester_company, '') ILIKE $%d
			)
		`, placeholder, placeholder, placeholder, placeholder, placeholder, placeholder, placeholder))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM service_requests
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count service requests")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM service_requests
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, serviceRequestSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list service requests")
	}
	defer rows.Close()

	requests := make([]ServiceRequest, 0)

	for rows.Next() {
		item, err := scanServiceRequest(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		requests = append(requests, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read service requests")
	}

	return requests, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateServiceRequestInput) (*ServiceRequest, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service request repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("service request id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE service_requests
		SET
			service_id = $1,
			requester_name = $2,
			requester_email = $3,
			requester_phone = $4,
			requester_company = $5,
			title = $6,
			description = $7,
			priority = $8,
			preferred_contact_method = $9,
			expected_deadline = $10,
			admin_notes = $11,
			internal_notes = $12,
			updated_at = NOW()
		WHERE id = $13
		RETURNING %s
	`, serviceRequestSelectColumns)

	updatedRequest, err := scanServiceRequest(r.pool.QueryRow(
		ctx,
		query,
		nullableString(input.ServiceID),
		nullableString(input.RequesterName),
		nullableString(input.RequesterEmail),
		nullableString(input.RequesterPhone),
		nullableString(input.RequesterCompany),
		input.Title,
		input.Description,
		input.Priority,
		nullableString(input.PreferredContactMethod),
		nullableDate(input.ExpectedDeadline),
		nullableString(input.AdminNotes),
		nullableString(input.InternalNotes),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedRequest, nil
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*ServiceRequest, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("service request repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("service request id is required")
	}

	input.Status = NormalizeStatus(input.Status)
	input.AdminNotes = strings.TrimSpace(input.AdminNotes)
	input.InternalNotes = strings.TrimSpace(input.InternalNotes)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE service_requests
		SET
			status = $1,
			admin_notes = COALESCE(NULLIF($2, ''), admin_notes),
			internal_notes = COALESCE(NULLIF($3, ''), internal_notes),
			updated_at = NOW()
		WHERE id = $4
		RETURNING %s
	`, serviceRequestSelectColumns)

	updatedRequest, err := scanServiceRequest(r.pool.QueryRow(
		ctx,
		query,
		input.Status,
		input.AdminNotes,
		input.InternalNotes,
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedRequest, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("service request repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("service request id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM service_requests
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("service request not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanServiceRequest(row rowScanner) (*ServiceRequest, error) {
	var item ServiceRequest
	var expectedDeadline pgtype.Date

	err := row.Scan(
		&item.ID,
		&item.ReferenceNumber,
		&item.ClientID,
		&item.ServiceID,
		&item.RequesterName,
		&item.RequesterEmail,
		&item.RequesterPhone,
		&item.RequesterCompany,
		&item.Title,
		&item.Description,
		&item.Status,
		&item.Priority,
		&item.PreferredContactMethod,
		&expectedDeadline,
		&item.Source,
		&item.AdminNotes,
		&item.InternalNotes,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.SubmittedAt,
	)
	if err != nil {
		return nil, err
	}

	if expectedDeadline.Valid {
		deadline := expectedDeadline.Time
		item.ExpectedDeadline = &deadline
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

func nullableDate(value *time.Time) any {
	if value == nil {
		return nil
	}

	return value.Format("2006-01-02")
}

func mapPostgresError(err error) error {
	if err == nil {
		return nil
	}

	if stderrors.Is(err, pgx.ErrNoRows) {
		return apperrors.NotFound("service request not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related client or service does not exist")
		case "23505":
			return apperrors.Conflict("service request already exists")
		case "23514":
			return apperrors.InvalidInput("invalid service request data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}