package document

import (
	"context"
	"io"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const (
	roleAdmin      = "admin"
	roleClient     = "client"
	roleAccountant = "accountant"
)

type PermissionChecker interface {
	ClientCanAccessServiceRequest(ctx context.Context, clientID string, serviceRequestID string) (bool, error)
	AccountantCanAccessServiceRequest(ctx context.Context, accountantUserID string, serviceRequestID string) (bool, error)
}

type Service struct {
	repo              Repository
	storage           Storage
	permissionChecker PermissionChecker
}

type Actor struct {
	UserID   string
	Role     string
	ClientID string
}

type UploadDocumentInput struct {
	ServiceRequestID string
	OriginalFileName string
	MimeType         string
	SizeBytes        int64
	Reader           io.Reader
	Visibility       string
	DocumentType     string
	IsFinal          bool
	Description      string
}

type DownloadedDocument struct {
	Metadata PublicDocument
	File     *OpenedFile
}

func NewService(repo Repository, storage Storage, permissionChecker PermissionChecker) *Service {
	return &Service{
		repo:              repo,
		storage:           storage,
		permissionChecker: permissionChecker,
	}
}

func (s *Service) Upload(ctx context.Context, actor Actor, input UploadDocumentInput) (*PublicDocument, error) {
	if s == nil || s.repo == nil || s.storage == nil {
		return nil, apperrors.Internal("document service is not initialized")
	}

	actor = normalizeActor(actor)

	if err := validateActor(actor); err != nil {
		return nil, err
	}

	input = normalizeUploadInput(actor, input)

	if err := s.canAccessServiceRequest(ctx, actor, input.ServiceRequestID); err != nil {
		return nil, err
	}

	saveInput := SaveFileInput{
		Reader:           input.Reader,
		ServiceRequestID: input.ServiceRequestID,
		UploadedByUserID: actor.UserID,
		OriginalFileName: input.OriginalFileName,
		MimeType:         input.MimeType,
		SizeBytes:        input.SizeBytes,
	}

	savedFile, err := s.storage.Save(ctx, saveInput)
	if err != nil {
		return nil, err
	}

	createInput := CreateDocumentInput{
		ServiceRequestID: input.ServiceRequestID,
		UploadedByUserID: actor.UserID,
		FileName:         savedFile.FileName,
		OriginalFileName: savedFile.OriginalFileName,
		MimeType:         savedFile.MimeType,
		FileSizeBytes:    savedFile.FileSizeBytes,
		StorageDriver:    savedFile.StorageDriver,
		StorageBucket:    savedFile.StorageBucket,
		StorageKey:       savedFile.StorageKey,
		Visibility:       input.Visibility,
		DocumentType:     input.DocumentType,
		IsFinal:          input.IsFinal,
		Description:      input.Description,
	}

	createdDocument, err := s.repo.Create(ctx, createInput)
	if err != nil {
		_ = s.storage.Delete(ctx, savedFile.StorageKey)
		return nil, err
	}

	publicDocument := createdDocument.Public()

	return &publicDocument, nil
}

func (s *Service) GetByID(ctx context.Context, actor Actor, id string) (*PublicDocument, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("document service is not initialized")
	}

	actor = normalizeActor(actor)

	if err := validateActor(actor); err != nil {
		return nil, err
	}

	document, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := s.canViewDocument(ctx, actor, document); err != nil {
		return nil, err
	}

	publicDocument := document.Public()

	return &publicDocument, nil
}

func (s *Service) Download(ctx context.Context, actor Actor, id string) (*DownloadedDocument, error) {
	if s == nil || s.repo == nil || s.storage == nil {
		return nil, apperrors.Internal("document service is not initialized")
	}

	actor = normalizeActor(actor)

	if err := validateActor(actor); err != nil {
		return nil, err
	}

	document, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := s.canViewDocument(ctx, actor, document); err != nil {
		return nil, err
	}

	openedFile, err := s.storage.Open(ctx, document.StorageKey)
	if err != nil {
		return nil, err
	}

	openedFile.FileName = document.OriginalFileName
	openedFile.MimeType = document.MimeType
	openedFile.SizeBytes = document.FileSizeBytes

	return &DownloadedDocument{
		Metadata: document.Public(),
		File:     openedFile,
	}, nil
}

func (s *Service) List(ctx context.Context, actor Actor, filter ListDocumentsFilter) ([]PublicDocument, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("document service is not initialized")
	}

	actor = normalizeActor(actor)

	if err := validateActor(actor); err != nil {
		return nil, 0, err
	}

	filter = filter.Normalize()

	if actor.Role != roleAdmin {
		if strings.TrimSpace(filter.ServiceRequestID) == "" {
			return nil, 0, apperrors.InvalidInput("service request id is required")
		}

		if err := s.canAccessServiceRequest(ctx, actor, filter.ServiceRequestID); err != nil {
			return nil, 0, err
		}

		filter.Status = StatusActive
	}

	documents, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if actor.Role == roleAdmin {
		return PublicDocuments(documents), totalItems, nil
	}

	visibleDocuments := make([]Document, 0, len(documents))

	for _, item := range documents {
		if s.canViewDocument(ctx, actor, &item) == nil {
			visibleDocuments = append(visibleDocuments, item)
		}
	}

	return PublicDocuments(visibleDocuments), len(visibleDocuments), nil
}

func (s *Service) UpdateMetadata(ctx context.Context, actor Actor, id string, input UpdateDocumentInput) (*PublicDocument, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("document service is not initialized")
	}

	actor = normalizeActor(actor)

	if err := validateActor(actor); err != nil {
		return nil, err
	}

	if actor.Role != roleAdmin {
		return nil, apperrors.Forbidden("only admin can update document metadata")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedDocument, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	publicDocument := updatedDocument.Public()

	return &publicDocument, nil
}

func (s *Service) Delete(ctx context.Context, actor Actor, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("document service is not initialized")
	}

	actor = normalizeActor(actor)

	if err := validateActor(actor); err != nil {
		return err
	}

	if actor.Role != roleAdmin {
		return apperrors.Forbidden("only admin can delete documents")
	}

	return s.repo.Delete(ctx, id)
}

func (s *Service) canViewDocument(ctx context.Context, actor Actor, item *Document) error {
	if item == nil {
		return apperrors.NotFound("document not found")
	}

	if item.Status == StatusDeleted {
		return apperrors.NotFound("document not found")
	}

	if actor.Role == roleAdmin {
		return nil
	}

	if strings.TrimSpace(item.UploadedByUserID) == actor.UserID {
		return nil
	}

	if err := s.canAccessServiceRequest(ctx, actor, item.ServiceRequestID); err != nil {
		return err
	}

	switch actor.Role {
	case roleClient:
		switch item.Visibility {
		case VisibilityShared, VisibilityClient:
			return nil
		default:
			return apperrors.Forbidden("you do not have permission to access this document")
		}

	case roleAccountant:
		switch item.Visibility {
		case VisibilityShared, VisibilityAccountant:
			return nil
		default:
			return apperrors.Forbidden("you do not have permission to access this document")
		}

	default:
		return apperrors.Forbidden("you do not have permission to access this document")
	}
}

func (s *Service) canAccessServiceRequest(ctx context.Context, actor Actor, serviceRequestID string) error {
	serviceRequestID = strings.TrimSpace(serviceRequestID)

	if serviceRequestID == "" {
		return apperrors.InvalidInput("service request id is required")
	}

	switch actor.Role {
	case roleAdmin:
		return nil

	case roleClient:
		if actor.ClientID == "" {
			return apperrors.Forbidden("client profile is required")
		}

		if s.permissionChecker == nil {
			return apperrors.Internal("document permission checker is not initialized")
		}

		allowed, err := s.permissionChecker.ClientCanAccessServiceRequest(ctx, actor.ClientID, serviceRequestID)
		if err != nil {
			return err
		}

		if !allowed {
			return apperrors.Forbidden("you do not have permission to access documents for this request")
		}

		return nil

	case roleAccountant:
		if s.permissionChecker == nil {
			return apperrors.Internal("document permission checker is not initialized")
		}

		allowed, err := s.permissionChecker.AccountantCanAccessServiceRequest(ctx, actor.UserID, serviceRequestID)
		if err != nil {
			return err
		}

		if !allowed {
			return apperrors.Forbidden("you do not have permission to access documents for this request")
		}

		return nil

	default:
		return apperrors.Forbidden("you do not have permission to access documents")
	}
}

func normalizeUploadInput(actor Actor, input UploadDocumentInput) UploadDocumentInput {
	input.ServiceRequestID = strings.TrimSpace(input.ServiceRequestID)
	input.OriginalFileName = cleanFileName(input.OriginalFileName)
	input.MimeType = strings.TrimSpace(strings.ToLower(input.MimeType))
	input.Visibility = NormalizeVisibility(input.Visibility)
	input.DocumentType = NormalizeDocumentType(input.DocumentType)
	input.Description = strings.TrimSpace(input.Description)

	switch actor.Role {
	case roleClient:
		input.Visibility = VisibilityShared
		input.DocumentType = DocumentTypeClientUpload
		input.IsFinal = false

	case roleAccountant:
		if input.Visibility == "" || input.Visibility == VisibilityClient || input.Visibility == VisibilityAdmin || input.Visibility == VisibilityInternal {
			input.Visibility = VisibilityShared
		}

		input.DocumentType = DocumentTypeAccountantUpload
		input.IsFinal = false

	case roleAdmin:
		if input.Visibility == "" {
			input.Visibility = VisibilityInternal
		}

		if input.DocumentType == "" {
			input.DocumentType = DocumentTypeAdminUpload
		}

		if input.IsFinal {
			input.Visibility = VisibilityShared
			input.DocumentType = DocumentTypeFinalDeliverable
		}
	}

	return input
}

func normalizeActor(actor Actor) Actor {
	actor.UserID = strings.TrimSpace(actor.UserID)
	actor.Role = strings.TrimSpace(strings.ToLower(actor.Role))
	actor.ClientID = strings.TrimSpace(actor.ClientID)

	return actor
}

func validateActor(actor Actor) error {
	if actor.UserID == "" {
		return apperrors.Forbidden("authenticated user id is required")
	}

	switch actor.Role {
	case roleAdmin, roleClient, roleAccountant:
		return nil
	default:
		return apperrors.Forbidden("invalid authenticated user role")
	}
}
