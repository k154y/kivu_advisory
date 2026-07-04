package assignment

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

const assignmentSelectColumns = `
	id,
	service_request_id,
	accountant_user_id,
	COALESCE(assigned_by_user_id, ''),
	status,
	priority,
	due_date,
	started_at,
	completed_at,
	COALESCE(notes, ''),
	COALESCE(internal_notes, ''),
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateAssignmentInput) (*Assignment, error)
	FindByID(ctx context.Context, id string) (*Assignment, error)
	List(ctx context.Context, filter ListAssignmentsFilter) ([]Assignment, int, error)
	Update(ctx context.Context, id string, input UpdateAssignmentInput) (*Assignment, error)
	UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*Assignment, error)
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateAssignmentInput) (*Assignment, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("assignment repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO assignments (
			service_request_id,
			accountant_user_id,
			assigned_by_user_id,
			priority,
			due_date,
			notes,
			internal_notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING %s
	`, assignmentSelectColumns)

	createdAssignment, err := scanAssignment(r.pool.QueryRow(
		ctx,
		query,
		input.ServiceRequestID,
		input.AccountantUserID,
		input.AssignedByUserID,
		input.Priority,
		nullableDate(input.DueDate),
		nullableString(input.Notes),
		nullableString(input.InternalNotes),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdAssignment, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Assignment, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("assignment repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("assignment id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM assignments
		WHERE id = $1
		LIMIT 1
	`, assignmentSelectColumns)

	foundAssignment, err := scanAssignment(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundAssignment, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListAssignmentsFilter) ([]Assignment, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("assignment repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.ServiceRequestID != "" {
		args = append(args, filter.ServiceRequestID)
		conditions = append(conditions, fmt.Sprintf("service_request_id = $%d", len(args)))
	}

	if filter.AccountantUserID != "" {
		args = append(args, filter.AccountantUserID)
		conditions = append(conditions, fmt.Sprintf("accountant_user_id = $%d", len(args)))
	}

	if filter.AssignedByUserID != "" {
		args = append(args, filter.AssignedByUserID)
		conditions = append(conditions, fmt.Sprintf("assigned_by_user_id = $%d", len(args)))
	}

	if filter.Status != "" {
		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}

	if filter.Priority != "" {
		args = append(args, filter.Priority)
		conditions = append(conditions, fmt.Sprintf("priority = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM assignments
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count assignments")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM assignments
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, assignmentSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list assignments")
	}
	defer rows.Close()

	assignments := make([]Assignment, 0)

	for rows.Next() {
		item, err := scanAssignment(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		assignments = append(assignments, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read assignments")
	}

	return assignments, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateAssignmentInput) (*Assignment, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("assignment repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("assignment id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE assignments
		SET
			accountant_user_id = $1,
			priority = $2,
			due_date = $3,
			notes = $4,
			internal_notes = $5,
			updated_at = NOW()
		WHERE id = $6
		RETURNING %s
	`, assignmentSelectColumns)

	updatedAssignment, err := scanAssignment(r.pool.QueryRow(
		ctx,
		query,
		input.AccountantUserID,
		input.Priority,
		nullableDate(input.DueDate),
		nullableString(input.Notes),
		nullableString(input.InternalNotes),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedAssignment, nil
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*Assignment, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("assignment repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("assignment id is required")
	}

	input.Status = NormalizeStatus(input.Status)
	input.Notes = strings.TrimSpace(input.Notes)
	input.InternalNotes = strings.TrimSpace(input.InternalNotes)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE assignments
		SET
			status = $1,
			notes = COALESCE(NULLIF($2, ''), notes),
			internal_notes = COALESCE(NULLIF($3, ''), internal_notes),
			started_at = CASE
				WHEN $1 IN ('accepted', 'in_progress') AND started_at IS NULL THEN NOW()
				ELSE started_at
			END,
			completed_at = CASE
				WHEN $1 = 'completed' THEN NOW()
				WHEN $1 <> 'completed' THEN NULL
				ELSE completed_at
			END,
			updated_at = NOW()
		WHERE id = $4
		RETURNING %s
	`, assignmentSelectColumns)

	updatedAssignment, err := scanAssignment(r.pool.QueryRow(
		ctx,
		query,
		input.Status,
		input.Notes,
		input.InternalNotes,
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedAssignment, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("assignment repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("assignment id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM assignments
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("assignment not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanAssignment(row rowScanner) (*Assignment, error) {
	var item Assignment
	var dueDate pgtype.Date
	var startedAt pgtype.Timestamptz
	var completedAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.ServiceRequestID,
		&item.AccountantUserID,
		&item.AssignedByUserID,
		&item.Status,
		&item.Priority,
		&dueDate,
		&startedAt,
		&completedAt,
		&item.Notes,
		&item.InternalNotes,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if dueDate.Valid {
		value := dueDate.Time
		item.DueDate = &value
	}

	if startedAt.Valid {
		value := startedAt.Time
		item.StartedAt = &value
	}

	if completedAt.Valid {
		value := completedAt.Time
		item.CompletedAt = &value
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
		return apperrors.NotFound("assignment not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related service request, accountant, or admin user does not exist")
		case "23505":
			return apperrors.Conflict("this service request is already assigned to this accountant")
		case "23514":
			return apperrors.InvalidInput("invalid assignment data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}