package document

import (
	"path/filepath"
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	StorageDriverLocal = "local"
	StorageDriverR2    = "r2"

	VisibilityClient = "client"
	VisibilityStaff  = "staff"
	VisibilityAdmin  = "admin"

	// Legacy input aliases. These are normalized before validation/database insert.
	VisibilityAccountant = "accountant"
	VisibilityInternal   = "internal"
	VisibilityShared     = "shared"

	DocumentTypeClientUpload     = "client_upload"
	DocumentTypeAdminUpload      = "admin_upload"
	DocumentTypeAccountantUpload = "accountant_upload"
	DocumentTypeFinalDeliverable = "final_deliverable"
	DocumentTypeInternalFile     = "internal_file"

	// Legacy input alias. This is normalized to internal_file.
	DocumentTypeInternal = "internal"

	StatusUploaded    = "uploaded"
	StatusUnderReview = "under_review"
	StatusApproved    = "approved"
	StatusRejected    = "rejected"
	StatusArchived    = "archived"

	// Backward-compatible aliases for older code.
	StatusActive  = StatusUploaded
	StatusDeleted = StatusArchived
)

type Document struct {
	ID               string
	ServiceRequestID string
	UploadedByUserID string
	FileName         string
	OriginalFileName string
	MimeType         string
	FileSizeBytes    int64
	StorageDriver    string
	StorageBucket    string
	StorageKey       string
	Visibility       string
	DocumentType     string
	Status           string
	IsFinal          bool
	Description      string
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        *time.Time
}

type PublicDocument struct {
	ID               string     `json:"id"`
	ServiceRequestID string     `json:"service_request_id,omitempty"`
	UploadedByUserID string     `json:"uploaded_by_user_id,omitempty"`
	FileName         string     `json:"file_name"`
	OriginalFileName string     `json:"original_file_name"`
	MimeType         string     `json:"mime_type"`
	FileSizeBytes    int64      `json:"file_size_bytes"`
	StorageDriver    string     `json:"storage_driver,omitempty"`
	Visibility       string     `json:"visibility"`
	DocumentType     string     `json:"document_type"`
	Status           string     `json:"status"`
	IsFinal          bool       `json:"is_final"`
	Description      string     `json:"description,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `json:"deleted_at,omitempty"`
}

type CreateDocumentInput struct {
	ServiceRequestID string
	UploadedByUserID string
	FileName         string
	OriginalFileName string
	MimeType         string
	FileSizeBytes    int64
	StorageDriver    string
	StorageBucket    string
	StorageKey       string
	Visibility       string
	DocumentType     string
	IsFinal          bool
	Description      string
}

type UpdateDocumentInput struct {
	Visibility   string
	DocumentType string
	IsFinal      bool
	Description  string
}

type ListDocumentsFilter struct {
	ServiceRequestID string
	UploadedByUserID string
	Visibility       string
	DocumentType     string
	Status           string
	IsFinal          *bool
	Page             int
	PageSize         int
}

func (d Document) Public() PublicDocument {
	return PublicDocument{
		ID:               d.ID,
		ServiceRequestID: d.ServiceRequestID,
		UploadedByUserID: d.UploadedByUserID,
		FileName:         d.FileName,
		OriginalFileName: d.OriginalFileName,
		MimeType:         d.MimeType,
		FileSizeBytes:    d.FileSizeBytes,
		StorageDriver:    d.StorageDriver,
		Visibility:       d.Visibility,
		DocumentType:     d.DocumentType,
		Status:           d.Status,
		IsFinal:          d.IsFinal,
		Description:      d.Description,
		CreatedAt:        d.CreatedAt,
		UpdatedAt:        d.UpdatedAt,
		DeletedAt:        d.DeletedAt,
	}
}

func PublicDocuments(documents []Document) []PublicDocument {
	result := make([]PublicDocument, 0, len(documents))

	for _, item := range documents {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateDocumentInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "service_request_id", i.ServiceRequestID, 1, 100, true)
	validator.ValidateStringLength(v, "uploaded_by_user_id", i.UploadedByUserID, 1, 100, true)
	validator.ValidateStringLength(v, "file_name", i.FileName, 1, 255, true)
	validator.ValidateStringLength(v, "original_file_name", i.OriginalFileName, 1, 255, true)
	validator.ValidateStringLength(v, "mime_type", i.MimeType, 1, 150, true)
	validator.ValidateStringLength(v, "storage_driver", i.StorageDriver, 1, 30, true)
	validator.ValidateStringLength(v, "storage_key", i.StorageKey, 1, 1000, true)
	validator.ValidateStringLength(v, "visibility", i.Visibility, 1, 30, true)
	validator.ValidateStringLength(v, "document_type", i.DocumentType, 1, 50, true)
	validator.ValidateStringLength(v, "description", i.Description, 0, 1000, false)

	v.Check(i.FileSizeBytes > 0, "file_size_bytes", "file size must be greater than zero")
	v.Check(IsValidStorageDriver(i.StorageDriver), "storage_driver", "storage driver must be local or r2")
	v.Check(IsValidVisibility(i.Visibility), "visibility", "visibility is invalid")
	v.Check(IsValidDocumentType(i.DocumentType), "document_type", "document type is invalid")

	return v.Errors()
}

func (i UpdateDocumentInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "visibility", i.Visibility, 1, 30, true)
	validator.ValidateStringLength(v, "document_type", i.DocumentType, 1, 50, true)
	validator.ValidateStringLength(v, "description", i.Description, 0, 1000, false)

	v.Check(IsValidVisibility(i.Visibility), "visibility", "visibility is invalid")
	v.Check(IsValidDocumentType(i.DocumentType), "document_type", "document type is invalid")

	return v.Errors()
}

func (f ListDocumentsFilter) Normalize() ListDocumentsFilter {
	f.ServiceRequestID = strings.TrimSpace(f.ServiceRequestID)
	f.UploadedByUserID = strings.TrimSpace(f.UploadedByUserID)
	f.Visibility = NormalizeVisibility(f.Visibility)
	f.DocumentType = NormalizeDocumentType(f.DocumentType)
	f.Status = NormalizeStatus(f.Status)

	if f.Page <= 0 {
		f.Page = 1
	}

	if f.PageSize <= 0 {
		f.PageSize = 20
	}

	if f.PageSize > 100 {
		f.PageSize = 100
	}

	return f
}

func (f ListDocumentsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreateDocumentInput) CreateDocumentInput {
	input.ServiceRequestID = strings.TrimSpace(input.ServiceRequestID)
	input.UploadedByUserID = strings.TrimSpace(input.UploadedByUserID)
	input.FileName = cleanFileName(input.FileName)
	input.OriginalFileName = cleanFileName(input.OriginalFileName)
	input.MimeType = strings.TrimSpace(strings.ToLower(input.MimeType))
	input.StorageDriver = NormalizeStorageDriver(input.StorageDriver)
	input.StorageBucket = strings.TrimSpace(input.StorageBucket)
	input.StorageKey = strings.TrimSpace(input.StorageKey)
	input.Visibility = NormalizeVisibility(input.Visibility)
	input.DocumentType = NormalizeDocumentType(input.DocumentType)
	input.Description = strings.TrimSpace(input.Description)

	if input.StorageDriver == "" {
		input.StorageDriver = StorageDriverLocal
	}

	if input.Visibility == "" {
		input.Visibility = VisibilityStaff
	}

	if input.DocumentType == "" {
		input.DocumentType = DocumentTypeClientUpload
	}

	return input
}

func NormalizeUpdateInput(input UpdateDocumentInput) UpdateDocumentInput {
	input.Visibility = NormalizeVisibility(input.Visibility)
	input.DocumentType = NormalizeDocumentType(input.DocumentType)
	input.Description = strings.TrimSpace(input.Description)

	if input.Visibility == "" {
		input.Visibility = VisibilityStaff
	}

	if input.DocumentType == "" {
		input.DocumentType = DocumentTypeClientUpload
	}

	return input
}

func NormalizeStorageDriver(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func NormalizeVisibility(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))

	switch value {
	case "":
		return ""
	case VisibilityClient:
		return VisibilityClient
	case VisibilityAdmin, VisibilityInternal:
		return VisibilityAdmin
	case VisibilityStaff, VisibilityShared, VisibilityAccountant:
		return VisibilityStaff
	default:
		return value
	}
}

func NormalizeDocumentType(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))

	switch value {
	case "":
		return ""
	case DocumentTypeInternal, DocumentTypeInternalFile:
		return DocumentTypeInternalFile
	default:
		return value
	}
}

func NormalizeStatus(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))

	switch value {
	case "active":
		return StatusUploaded
	case "deleted":
		return StatusArchived
	default:
		return value
	}
}

func IsValidStorageDriver(value string) bool {
	switch NormalizeStorageDriver(value) {
	case StorageDriverLocal, StorageDriverR2:
		return true
	default:
		return false
	}
}

func IsValidVisibility(value string) bool {
	switch NormalizeVisibility(value) {
	case VisibilityClient, VisibilityStaff, VisibilityAdmin:
		return true
	default:
		return false
	}
}

func IsValidDocumentType(value string) bool {
	switch NormalizeDocumentType(value) {
	case DocumentTypeClientUpload,
		DocumentTypeAdminUpload,
		DocumentTypeAccountantUpload,
		DocumentTypeFinalDeliverable,
		DocumentTypeInternalFile:
		return true
	default:
		return false
	}
}

func IsValidStatus(value string) bool {
	switch NormalizeStatus(value) {
	case StatusUploaded,
		StatusUnderReview,
		StatusApproved,
		StatusRejected,
		StatusArchived:
		return true
	default:
		return false
	}
}

func cleanFileName(value string) string {
	value = strings.TrimSpace(value)
	value = filepath.Base(value)

	value = strings.ReplaceAll(value, "\\", "")
	value = strings.ReplaceAll(value, "/", "")

	return value
}
