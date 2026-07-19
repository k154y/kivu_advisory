package document

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

const documentSelectColumns = `
	id,
	COALESCE(service_request_id, ''),
	COALESCE(uploaded_by_user_id, ''),
	file_name,
	original_file_name,
	mime_type,
	file_size_bytes,
	storage_driver,
	COALESCE(storage_bucket, ''),
	storage_key,
	visibility,
	document_type,
	status,
	is_final,
	COALESCE(description, ''),
	created_at,
	updated_at,
	deleted_at
`

type Repository interface {
	Create(ctx context.Context, input CreateDocumentInput) (*Document, error)
	FindByID(ctx context.Context, id string) (*Document, error)
	List(ctx context.Context, filter ListDocumentsFilter) ([]Document, int, error)
	Update(ctx context.Context, id string, input UpdateDocumentInput) (*Document, error)
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

func (r *PostgresRepository) Create(ctx context.Context, input CreateDocumentInput) (*Document, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("document repository is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		INSERT INTO documents (
			service_request_id,
			uploaded_by_user_id,
			file_name,
			original_file_name,
			mime_type,
			file_size_bytes,
			storage_driver,
			storage_bucket,
			storage_key,
			visibility,
			document_type,
			is_final,
			description
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING %s
	`, documentSelectColumns)

	createdDocument, err := scanDocument(r.pool.QueryRow(
		ctx,
		query,
		input.ServiceRequestID,
		input.UploadedByUserID,
		input.FileName,
		input.OriginalFileName,
		input.MimeType,
		input.FileSizeBytes,
		input.StorageDriver,
		nullableString(input.StorageBucket),
		input.StorageKey,
		input.Visibility,
		input.DocumentType,
		input.IsFinal,
		nullableString(input.Description),
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return createdDocument, nil
}

func (r *PostgresRepository) FindByID(ctx context.Context, id string) (*Document, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("document repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("document id is required")
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM documents
		WHERE id = $1
		LIMIT 1
	`, documentSelectColumns)

	foundDocument, err := scanDocument(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return foundDocument, nil
}

func (r *PostgresRepository) List(ctx context.Context, filter ListDocumentsFilter) ([]Document, int, error) {
	if r == nil || r.pool == nil {
		return nil, 0, apperrors.Internal("document repository is not initialized")
	}

	filter = filter.Normalize()

	conditions := []string{"1 = 1"}
	args := make([]any, 0)

	if filter.ServiceRequestID != "" {
		args = append(args, filter.ServiceRequestID)
		conditions = append(conditions, fmt.Sprintf("service_request_id = $%d", len(args)))
	}

	if filter.UploadedByUserID != "" {
		args = append(args, filter.UploadedByUserID)
		conditions = append(conditions, fmt.Sprintf("uploaded_by_user_id = $%d", len(args)))
	}

	if filter.Visibility != "" {
		args = append(args, filter.Visibility)
		conditions = append(conditions, fmt.Sprintf("visibility = $%d", len(args)))
	}

	if filter.DocumentType != "" {
		args = append(args, filter.DocumentType)
		conditions = append(conditions, fmt.Sprintf("document_type = $%d", len(args)))
	}

	if filter.Status != "" {
		args = append(args, filter.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}

	if filter.IsFinal != nil {
		args = append(args, *filter.IsFinal)
		conditions = append(conditions, fmt.Sprintf("is_final = $%d", len(args)))
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM documents
		WHERE %s
	`, whereClause)

	var totalItems int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&totalItems); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to count documents")
	}

	args = append(args, filter.PageSize, filter.Offset())
	limitPlaceholder := len(args) - 1
	offsetPlaceholder := len(args)

	listQuery := fmt.Sprintf(`
		SELECT %s
		FROM documents
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, documentSelectColumns, whereClause, limitPlaceholder, offsetPlaceholder)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to list documents")
	}
	defer rows.Close()

	documents := make([]Document, 0)

	for rows.Next() {
		item, err := scanDocument(rows)
		if err != nil {
			return nil, 0, mapPostgresError(err)
		}

		documents = append(documents, *item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, apperrors.InternalWrap(err, "failed to read documents")
	}

	return documents, totalItems, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateDocumentInput) (*Document, error) {
	if r == nil || r.pool == nil {
		return nil, apperrors.Internal("document repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("document id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	query := fmt.Sprintf(`
		UPDATE documents
		SET
			visibility = $1,
			document_type = $2,
			is_final = $3,
			description = $4,
			updated_at = NOW()
		WHERE id = $5
		RETURNING %s
	`, documentSelectColumns)

	updatedDocument, err := scanDocument(r.pool.QueryRow(
		ctx,
		query,
		input.Visibility,
		input.DocumentType,
		input.IsFinal,
		nullableString(input.Description),
		id,
	))
	if err != nil {
		return nil, mapPostgresError(err)
	}

	return updatedDocument, nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.pool == nil {
		return apperrors.Internal("document repository is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("document id is required")
	}

	commandTag, err := r.pool.Exec(ctx, `
		UPDATE documents
		SET
			status = $1,
			deleted_at = NOW(),
			updated_at = NOW()
		WHERE id = $2 AND status <> $1
	`, StatusDeleted, id)
	if err != nil {
		return mapPostgresError(err)
	}

	if commandTag.RowsAffected() == 0 {
		return apperrors.NotFound("document not found")
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanDocument(row rowScanner) (*Document, error) {
	var item Document
	var deletedAt pgtype.Timestamptz

	err := row.Scan(
		&item.ID,
		&item.ServiceRequestID,
		&item.UploadedByUserID,
		&item.FileName,
		&item.OriginalFileName,
		&item.MimeType,
		&item.FileSizeBytes,
		&item.StorageDriver,
		&item.StorageBucket,
		&item.StorageKey,
		&item.Visibility,
		&item.DocumentType,
		&item.Status,
		&item.IsFinal,
		&item.Description,
		&item.CreatedAt,
		&item.UpdatedAt,
		&deletedAt,
	)
	if err != nil {
		return nil, err
	}

	if deletedAt.Valid {
		value := deletedAt.Time
		item.DeletedAt = &value
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
		return apperrors.NotFound("document not found")
	}

	var pgErr *pgconn.PgError
	if stderrors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503":
			return apperrors.Conflict("related service request or user does not exist")
		case "23505":
			return apperrors.Conflict("document already exists")
		case "23514":
			return apperrors.InvalidInput("invalid document data")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}
