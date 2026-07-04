package servicerequest


import (
	"context"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{
		repo: repo,
	}
}

func (s *Service) CreateVisitorRequest(ctx context.Context, input CreateServiceRequestInput) (*PublicServiceRequest, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service request service is not initialized")
	}

	input = NormalizeCreateInput(input)
	input.ClientID = ""
	input.Source = SourceWebsite

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdRequest, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	publicRequest := publicRequestForClient(createdRequest)

	return &publicRequest, nil
}

func (s *Service) CreateClientRequest(ctx context.Context, clientID string, input CreateServiceRequestInput) (*PublicServiceRequest, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service request service is not initialized")
	}

	clientID = strings.TrimSpace(clientID)
	if clientID == "" {
		return nil, apperrors.InvalidInput("client id is required")
	}

	input = NormalizeCreateInput(input)
	input.ClientID = clientID
	input.Source = SourceClientPortal

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdRequest, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	publicRequest := publicRequestForClient(createdRequest)

	return &publicRequest, nil
}

func (s *Service) CreateAdminRequest(ctx context.Context, input CreateServiceRequestInput) (*PublicServiceRequest, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service request service is not initialized")
	}

	input = NormalizeCreateInput(input)
	input.Source = SourceAdmin

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdRequest, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	adminRequest := createdRequest.Public()

	return &adminRequest, nil
}

func (s *Service) GetAdminByID(ctx context.Context, id string) (*PublicServiceRequest, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service request service is not initialized")
	}

	foundRequest, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	adminRequest := foundRequest.Public()

	return &adminRequest, nil
}

func (s *Service) GetAdminByReferenceNumber(ctx context.Context, referenceNumber string) (*PublicServiceRequest, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service request service is not initialized")
	}

	foundRequest, err := s.repo.FindByReferenceNumber(ctx, referenceNumber)
	if err != nil {
		return nil, err
	}

	adminRequest := foundRequest.Public()

	return &adminRequest, nil
}

func (s *Service) GetClientByID(ctx context.Context, clientID string, requestID string) (*PublicServiceRequest, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service request service is not initialized")
	}

	clientID = strings.TrimSpace(clientID)
	requestID = strings.TrimSpace(requestID)

	if clientID == "" {
		return nil, apperrors.InvalidInput("client id is required")
	}

	if requestID == "" {
		return nil, apperrors.InvalidInput("service request id is required")
	}

	foundRequest, err := s.repo.FindByID(ctx, requestID)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(foundRequest.ClientID) != clientID {
		return nil, apperrors.Forbidden("you do not have permission to access this service request")
	}

	publicRequest := publicRequestForClient(foundRequest)

	return &publicRequest, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListServiceRequestsFilter) ([]PublicServiceRequest, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("service request service is not initialized")
	}

	filter = filter.Normalize()

	requests, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicServiceRequests(requests), totalItems, nil
}

func (s *Service) ListClient(ctx context.Context, clientID string, filter ListServiceRequestsFilter) ([]PublicServiceRequest, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("service request service is not initialized")
	}

	clientID = strings.TrimSpace(clientID)
	if clientID == "" {
		return nil, 0, apperrors.InvalidInput("client id is required")
	}

	filter = filter.Normalize()
	filter.ClientID = clientID

	requests, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return publicRequestsForClient(requests), totalItems, nil
}

func (s *Service) UpdateAdmin(ctx context.Context, id string, input UpdateServiceRequestInput) (*PublicServiceRequest, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service request service is not initialized")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedRequest, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminRequest := updatedRequest.Public()

	return &adminRequest, nil
}

func (s *Service) UpdateStatus(ctx context.Context, id string, input UpdateStatusInput) (*PublicServiceRequest, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service request service is not initialized")
	}

	input.Status = NormalizeStatus(input.Status)
	input.AdminNotes = strings.TrimSpace(input.AdminNotes)
	input.InternalNotes = strings.TrimSpace(input.InternalNotes)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedRequest, err := s.repo.UpdateStatus(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminRequest := updatedRequest.Public()

	return &adminRequest, nil
}

func (s *Service) DeleteAdmin(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("service request service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("service request id is required")
	}

	return s.repo.Delete(ctx, id)
}

func publicRequestsForClient(requests []ServiceRequest) []PublicServiceRequest {
	result := make([]PublicServiceRequest, 0, len(requests))

	for _, item := range requests {
		publicItem := publicRequestForClient(&item)
		result = append(result, publicItem)
	}

	return result
}

func publicRequestForClient(request *ServiceRequest) PublicServiceRequest {
	if request == nil {
		return PublicServiceRequest{}
	}

	publicRequest := request.Public()

	publicRequest.AdminNotes = ""
	publicRequest.InternalNotes = ""

	return publicRequest
}