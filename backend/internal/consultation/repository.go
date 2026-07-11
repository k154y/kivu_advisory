package consultation

import (
	"context"
	stderrors "errors"
	"fmt"
	"strings"
	"time"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const consultationSelectColumns = `
	id,
	full_name,
	COALESCE(email, ''),
	COALESCE(phone, ''),
	COALESCE(whatsapp, ''),
	COALESCE(company_name, ''),
	subject,
	message,
	consultation_type,
	preferred_contact_method,
	preferred_date,
	COALESCE(preferred_time, ''),
	status,
	priority,
	COALESCE(assigned_to_user_id, ''),
	COALESCE(handled_by_user_id, ''),
	COALESCE(admin_notes, ''),
	COALESCE(follow_up_notes, ''),
	contacted_at,
	closed_at,
	created_at,
	updated_at
`

type Repository interface {
	Create(ctx context.Context, input CreateConsultationInput) (*Consultation, error)
	FindByID(ctx context.Context, id string) (*Consultation, error)
	List(ctx context.Context, filter ListConsultationsFilter) ([]Consultation, int, error)
	Update(ctx context.Context, id string, input UpdateConsultationInput) (*Consultation, error)
	UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*Consultation, error)
	Delete(ctx context.Context, id string) error
	CountByStatus(ctx context.Context) (map[string]int, error)
}

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{
		pool: pool,
	}
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateConsultationInput) (*Consultation, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("consultation repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO consultations (
			full_name,
			email,
			phone,
			whatsapp,
			company_name,
			subject,
			message,
			consultation_type,
			preferred_contact_method,
			preferred_date,
			preferred_time,
			priority
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING %s
	`, consultationSelectColumns)

	createdConsultation, err := scanConsultation(r.pool.QueryRow(
		ctx,
		query,
		input.FullName,
		nullableString(input.Email),
		nullableString(input.Phone),
		nullableString(input.WhatsApp),
		nullableString(input.CompanyName),
		input.Subject,
		input.Message,
		input.ConsultationType,
		input.PreferredContactMethod,
		nullableDate(input.PreferredDate),
		nullableString(input.PreferredTime),
		input.Priority,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdConsultation, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Consultation, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("consultation repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("consultation id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM consultations
		WHERE id = $1
		LIMIT 1
	`, consultationSelectColumns)

	foundConsultation, err := scanConsultation(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundConsultation, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListConsultationsFilter) ([]Consultation, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("consultation repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.Status != "" {
		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}

	if filter.Priority != "" {
		args = append(args, filter.Priority)
		conditions = append(conditions, fmt.Sprintf("priority = $%d", len(args)))
	}

	if filter.ConsultationType != "" {
		args = append(args, filter.ConsultationType)
		conditions = append(conditions, fmt.Sprintf("consultation_type = $%d", len(args)))
	}

	if filter.AssignedToUserID != "" {
		args = append(args, filter.AssignedToUserID)
		conditions = append(conditions, fmt.Sprintf("assigned_to_user_id = $%d", len(args)))
	}

	if filter.HandledByUserID != "" {
		args = append(args, filter.HandledByUserID)
		conditions = append(conditions, fmt.Sprintf("handled_by_user_id = $%d", len(args)))
	}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%")
		placeholder := len(args)

		conditions = append(conditions, fmt.Sprintf(`
			(
				full_name ILIKE $%d
				OR COALESCE(email, '') ILIKE $%d
				OR COALESCE(phone, '') ILIKE $%d
				OR COALESCE(whatsapp, '') ILIKE $%d
				OR COALESCE(company_name, '') ILIKE $%d
				OR subject ILIKE $%d
				OR message ILIKE $%d
			)
		`, placeholder, placeholder, placeholder, placeholder, placeholder, placeholder, placeholder))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM consultations
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count consultations")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM consultations
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, consultationSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list consultations")
	}
	defer rows.Close()

	consultations := make([]Consultation, 0)

	for rows.Next() {
		item, err := scanConsultation(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		consultations = append(consultations, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read consultations")
	}

	return consultations, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateConsultationInput) (*Consultation, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("consultation repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("consultation id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE consultations
		SET
			full_name = $1,
			email = $2,
			phone = $3,
			whatsapp = $4,
			company_name = $5,
			subject = $6,
			message = $7,
			consultation_type = $8,
			preferred_contact_method = $9,
			preferred_date = $10,
			preferred_time = $11,
			priority = $12,
			assigned_to_user_id = $13,
			handled_by_user_id = $14,
			admin_notes = $15,
			follow_up_notes = $16,
			updated_at = NOW()
		WHERE id = $17
		RETURNING %s
	`, consultationSelectColumns)

	updatedConsultation, err := scanConsultation(r.pool.QueryRow(
		ctx,
		query,
		input.FullName,
		nullableString(input.Email),
		nullableString(input.Phone),
		nullableString(input.WhatsApp),
		nullableString(input.CompanyName),
		input.Subject,
		input.Message,
		input.ConsultationType,
		input.PreferredContactMethod,
		nullableDate(input.PreferredDate),
		nullableString(input.PreferredTime),
		input.Priority,
		nullableString(input.AssignedToUserID),
		nullableString(input.HandledByUserID),
		nullableString(input.AdminNotes),
		nullableString(input.FollowUpNotes),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedConsultation, nil
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*Consultation, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("consultation repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("consultation id is required")
	}

	input.Status = NormalizeStatus(input.Status)
	input.AdminNotes = strings.TrimSpace(input.AdminNotes)
	input.FollowUpNotes = strings.TrimSpace(input.FollowUpNotes)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	commandTag, err := r.pool.Exec(
	ctx,
	`
	UPDATE consultations
	SET
		status = $1::varchar,
		admin_notes = COALESCE(NULLIF($2::text, ''), admin_notes),
		follow_up_notes = COALESCE(NULLIF($3::text, ''), follow_up_notes),
		contacted_at = CASE
			WHEN $1::varchar IN ('contacted', 'scheduled', 'in_progress', 'closed') AND contacted_at IS NULL
				THEN NOW()
			ELSE contacted_at
		END,
		closed_at = CASE
			WHEN $1::varchar IN ('closed', 'cancelled')
				THEN COALESCE(closed_at, NOW())
			ELSE NULL
		END,
		updated_at = NOW()
	WHERE id = $4
	`,
		input.Status,
		input.AdminNotes,
		input.FollowUpNotes,
		id,
	)
	if err != nil {
		return nil, mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return nil, apperrors.NotFound("consultation not found")
	}

	return r.FindByID(ctx, id)
}
func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("consultation repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("consultation id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		DELETE FROM consultations
		WHERE id = $1
	`, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("consultation not found")
	}

	return nil
}

func (r *PostgresRepository) CountByStatus(ctx context.Context) (map[string]int, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("consultation repository is not initialized")
	}

	rows, err := r.pool.Query(ctx, `
		SELECT status, COUNT(*)
		FROM consultations
		GROUP BY status
	`)
	if err != nil {
		return nil, apperrors.InternalWrap(err, "failed to count consultations by status")
	}
	defer rows.Close()

	counts := make(map[string]int)

	for rows.Next() {
		var status string
		var count int

		if err := rows.Scan(&status, &count); err != nil {
			return nil, apperrors.InternalWrap(err, "failed to read consultation status counts")
		}

		counts[status] = count
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.InternalWrap(err, "failed to read consultation status counts")
	}

	return counts, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanConsultation(row rowScanner) (*Consultation, error) {
	var item Consultation
	var preferredDate pgtype.Date
	var contactedAt pgtype.Timestamptz
	var closedAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.FullName,
		&item.Email,
		&item.Phone,
		&item.WhatsApp,
		&item.CompanyName,
		&item.Subject,
		&item.Message,
		&item.ConsultationType,
		&item.PreferredContactMethod,
		&preferredDate,
		&item.PreferredTime,
		&item.Status,
		&item.Priority,
		&item.AssignedToUserID,
		&item.HandledByUserID,
		&item.AdminNotes,
		&item.FollowUpNotes,
		&contactedAt,
		&closedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if preferredDate.Valid {
		value := preferredDate.Time
		item.PreferredDate = &value
	}

	if contactedAt.Valid {
		value := contactedAt.Time
		item.ContactedAt = &value
	}

	if closedAt.Valid {
		value := closedAt.Time
		item.ClosedAt = &value
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
		return apperrors.NotFound("consultation not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		log.Printf(
			"consultation postgres error: code=%s message=%s detail=%s constraint=%s table=%s column=%s",
			pgErr.Code,
			pgErr.Message,
			pgErr.Detail,
			pgErr.ConstraintName,
			pgErr.TableName,
			pgErr.ColumnName,
		)

		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related assigned or handled user does not exist")
		case "23505":
			return apperrors.Conflict("consultation already exists")
		case "23514":
			return apperrors.InvalidInput("invalid consultation data")
		}
	}

	log.Printf("consultation database error: %T: %v", err, err)

	return apperrors.InternalWrap(err, "database operation failed")
}