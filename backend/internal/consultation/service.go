package consultation

import (
	"context"
	"strings"
	"net/http"

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

func (s *Service) CreateWebsite(ctx context.Context, input CreateConsultationInput) (*PublicConsultation, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("consultation service is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdConsultation, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	publicConsultation := publicConsultationForVisitor(createdConsultation)

	return &publicConsultation, nil
}

func (s *Service) GetAdminByID(ctx context.Context, id string) (*PublicConsultation, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("consultation service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("consultation id is required")
	}

	foundConsultation, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	adminConsultation := foundConsultation.Public()

	return &adminConsultation, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListConsultationsFilter) ([]PublicConsultation, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("consultation service is not initialized")
	}

	filter = filter.Normalize()

	consultations, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicConsultations(consultations), totalItems, nil
}

func (s *Service) CountByStatus(ctx context.Context) (map[string]int, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("consultation service is not initialized")
	}

	return s.repo.CountByStatus(ctx)
}

func (s *Service) UpdateAdmin(ctx context.Context, id string, input UpdateConsultationInput) (*PublicConsultation, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("consultation service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("consultation id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedConsultation, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminConsultation := updatedConsultation.Public()

	return &adminConsultation, nil
}

func (s *Service) UpdateStatusAdmin(ctx context.Context, id string, input UpdateStatusInput) (*PublicConsultation, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("consultation service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("consultation id is required")
	}

	input.Status = NormalizeStatus(input.Status)
	input.AssignedToUserID = strings.TrimSpace(input.AssignedToUserID)
	input.HandledByUserID = strings.TrimSpace(input.HandledByUserID)
	input.AdminNotes = strings.TrimSpace(input.AdminNotes)
	input.FollowUpNotes = strings.TrimSpace(input.FollowUpNotes)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedConsultation, err := s.repo.UpdateStatus(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminConsultation := updatedConsultation.Public()

	return &adminConsultation, nil
}

func (s *Service) DeleteAdmin(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("consultation service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("consultation id is required")
	}

	return s.repo.Delete(ctx, id)
}

func (s *Service) ListAccountant(ctx context.Context, accountantUserID string, filter ListConsultationsFilter) ([]PublicConsultation, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("consultation service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	if accountantUserID == "" {
		return nil, 0, apperrors.InvalidInput("accountant user id is required")
	}

	filter = filter.Normalize()
	filter.AssignedToUserID = accountantUserID

	consultations, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicConsultations(consultations), totalItems, nil
}

func (s *Service) GetAccountantByID(ctx context.Context, accountantUserID string, id string) (*PublicConsultation, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("consultation service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	id = strings.TrimSpace(id)

	if accountantUserID == "" {
		return nil, apperrors.InvalidInput("accountant user id is required")
	}

	if id == "" {
		return nil, apperrors.InvalidInput("consultation id is required")
	}

	consultation, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(consultation.AssignedToUserID) != accountantUserID {
		return nil, apperrors.Forbidden("you do not have permission to access this consultation")
	}

	publicConsultation := consultation.Public()

	return &publicConsultation, nil
}

func (s *Service) UpdateStatusAccountant(ctx context.Context, accountantUserID string, id string, status string) (*PublicConsultation, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("consultation service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	id = strings.TrimSpace(id)
	status = NormalizeStatus(status)

	if accountantUserID == "" {
		return nil, apperrors.InvalidInput("accountant user id is required")
	}

	if id == "" {
		return nil, apperrors.InvalidInput("consultation id is required")
	}

	if !IsValidStatus(status) {
		return nil, apperrors.InvalidInput("invalid consultation status")
	}

	existingConsultation, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(existingConsultation.AssignedToUserID) != accountantUserID {
		return nil, apperrors.Forbidden("you do not have permission to update this consultation")
	}

	updatedConsultation, err := s.repo.UpdateStatus(ctx, id, UpdateStatusInput{
		Status:          status,
		HandledByUserID: accountantUserID,
	})
	if err != nil {
		return nil, err
	}

	publicConsultation := updatedConsultation.Public()

	return &publicConsultation, nil
}

func publicConsultationForVisitor(item *Consultation) PublicConsultation {
	if item == nil {
		return PublicConsultation{}
	}

	publicConsultation := item.Public()

	publicConsultation.AssignedToUserID = ""
	publicConsultation.HandledByUserID = ""
	publicConsultation.AdminNotes = ""
	publicConsultation.FollowUpNotes = ""
	publicConsultation.ContactedAt = nil
	publicConsultation.ClosedAt = nil

	return publicConsultation
}

func forbidden(message string) error {
	return &apperrors.AppError{
		Code:       "forbidden",
		Message:    message,
		StatusCode: http.StatusForbidden,
	}
}