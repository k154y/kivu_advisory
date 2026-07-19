package sociallink

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

func (s *Service) ListPublic(ctx context.Context, filter ListSocialLinksFilter) ([]PublicSocialLink, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("social link service is not initialized")
	}

	trueValue := true
	filter.IsActive = &trueValue

	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return PublicSocialLinks(items), totalItems, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListSocialLinksFilter) ([]AdminSocialLink, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("social link service is not initialized")
	}

	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return AdminSocialLinks(items), totalItems, nil
}

func (s *Service) GetAdminByID(ctx context.Context, id string) (*AdminSocialLink, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("social link service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("social link id is required")
	}

	item, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) CreateAdmin(ctx context.Context, input CreateSocialLinkInput) (*AdminSocialLink, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("social link service is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	item, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) UpdateAdmin(ctx context.Context, id string, input UpdateSocialLinkInput) (*AdminSocialLink, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("social link service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("social link id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	item, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) UpdateStatusAdmin(ctx context.Context, id string, input UpdateStatusInput) (*AdminSocialLink, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("social link service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("social link id is required")
	}

	item, err := s.repo.UpdateStatus(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) DeleteAdmin(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("social link service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("social link id is required")
	}

	return s.repo.Delete(ctx, id)
}