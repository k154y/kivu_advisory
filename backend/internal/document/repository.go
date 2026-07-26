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
	service_request_id,
	COALESCE(uploaded_by_user_id, ''),
	COALESCE(stored_file_name, ''),
	COALESCE(original_file_name, ''),
	COALESCE(content_type, ''),
	file_size_bytes,
	storage_driver,
	COALESCE(storage_bucket, ''),
	storage_key,
	visibility,
	document_type,
	status,
	is_final_deliverable,
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
			original_file_name,
			stored_file_name,
			storage_driver,
			storage_bucket,
			storage_key,
			content_type,
			file_size_bytes,
			document_type,
			visibility,
			status,
			description,
			is_final_deliverable
		)
		VALUES (
			$1,
			NULLIF($2, ''),
			$3,
			$4,
			$5,
			NULLIF($6, ''),
			$7,
			NULLIF($8, ''),
			$9,
			$10,
			$11,
			$12,
			NULLIF($13, ''),
			$14
		)
		RETURNING %s
	`, documentSelectColumns)

	createdDocument, err := scanDocument(r.pool.QueryRow(
		ctx,
		query,
		input.ServiceRequestID,
		input.UploadedByUserID,
		input.OriginalFileName,
		input.FileName,
		input.StorageDriver,
		input.StorageBucket,
		input.StorageKey,
		input.MimeType,
		input.FileSizeBytes,
		input.DocumentType,
		input.Visibility,
		StatusUploaded,
		input.Description,
		input.IsFinal,
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
			AND is_deleted = FALSE
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

	conditions := []string{"is_deleted = FALSE"}
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
		conditions = append(conditions, fmt.Sprintf("is_final_deliverable = $%d", len(args)))
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
		ORDER BY created_at DESC, id DESC
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
			is_final_deliverable = $3,
			description = $4,
			updated_at = NOW()
		WHERE id = $5
			AND is_deleted = FALSE
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
			is_deleted = TRUE,
			status = $1,
			deleted_at = NOW(),
			updated_at = NOW()
		WHERE id = $2
			AND is_deleted = FALSE
	`, StatusArchived, id)
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
		fmt.Printf(
			"document postgres error: code=%s constraint=%s column=%s detail=%s message=%s\n",
			pgErr.Code,
			pgErr.ConstraintName,
			pgErr.ColumnName,
			pgErr.Detail,
			pgErr.Message,
		)

		switch pgErr.Code {
		case "23503":
			switch pgErr.ConstraintName {
			case "documents_service_request_id_fk":
				return apperrors.InvalidInput("related service request does not exist")
			case "documents_uploaded_by_user_id_fk":
				return apperrors.InvalidInput("uploading user does not exist")
			default:
				return apperrors.InvalidInput("related record does not exist")
			}

		case "23502":
			switch pgErr.ColumnName {
			case "service_request_id":
				return apperrors.InvalidInput("service request id is required")
			case "original_file_name":
				return apperrors.InvalidInput("original file name is required")
			case "stored_file_name":
				return apperrors.InvalidInput("stored file name is required")
			case "storage_key":
				return apperrors.InvalidInput("storage key is required")
			default:
				if pgErr.ColumnName != "" {
					return apperrors.InvalidInput("required document field is missing: " + pgErr.ColumnName)
				}

				return apperrors.InvalidInput("required document field is missing")
			}

		case "23514":
			switch pgErr.ConstraintName {
			case "documents_document_type_check":
				return apperrors.InvalidInput("invalid document type")
			case "documents_visibility_check":
				return apperrors.InvalidInput("invalid document visibility")
			case "documents_status_check":
				return apperrors.InvalidInput("invalid document status")
			case "documents_storage_driver_check":
				return apperrors.InvalidInput("invalid document storage driver")
			case "documents_file_size_check":
				return apperrors.InvalidInput("invalid document file size")
			default:
				return apperrors.InvalidInput("invalid document data")
			}

		case "23505":
			return apperrors.Conflict("document storage key already exists")

		case "22P02":
			return apperrors.InvalidInput("invalid document or related id format")

		case "42703":
			return apperrors.Internal("document database schema does not match repository code")
		}
	}

	return apperrors.InternalWrap(err, "database operation failed")
}