package consultation

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
