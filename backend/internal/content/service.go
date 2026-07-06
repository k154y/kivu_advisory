package content

import (
	"context"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, input CreateContentInput) (*AdminContentItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("content service is not initialized")
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

func (s *Service) GetAdminByID(ctx context.Context, id string) (*AdminContentItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("content service is not initialized")
	}

	item, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()
	return &adminItem, nil
}

func (s *Service) GetPublicBySlug(ctx context.Context, slug string) (*PublicContentItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("content service is not initialized")
	}

	item, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if !item.IsActive {
		return nil, apperrors.NotFound("content not found")
	}

	publicItem := item.Public()
	return &publicItem, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListContentFilter) ([]AdminContentItem, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("content service is not initialized")
	}

	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return AdminContentItems(items), totalItems, nil
}

func (s *Service) ListPublic(ctx context.Context, filter ListContentFilter) ([]PublicContentItem, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("content service is not initialized")
	}

	activeOnly := true
	filter.IsActive = &activeOnly
	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return PublicContentItems(items), totalItems, nil
}

func (s *Service) Update(ctx context.Context, id string, input UpdateContentInput) (*AdminContentItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("content service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("content id is required")
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

func (s *Service) SetActive(ctx context.Context, id string, isActive bool, updatedByUserID string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("content service is not initialized")
	}

	return s.repo.SetActive(ctx, id, isActive, updatedByUserID)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("content service is not initialized")
	}

	return s.repo.Delete(ctx, id)
}
