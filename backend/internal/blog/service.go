package blog

import (
	"context"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, input CreatePostInput) (*AdminPost, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("blog service is not initialized")
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

func (s *Service) GetAdminByID(ctx context.Context, id string) (*AdminPost, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("blog service is not initialized")
	}

	item, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()
	return &adminItem, nil
}

func (s *Service) GetPublicBySlug(ctx context.Context, slug string) (*PublicPost, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("blog service is not initialized")
	}

	item, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if item.Status != StatusPublished {
		return nil, apperrors.NotFound("blog post not found")
	}

	publicItem := item.Public()
	return &publicItem, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListPostsFilter) ([]AdminPost, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("blog service is not initialized")
	}

	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return AdminPosts(items), totalItems, nil
}

func (s *Service) ListPublic(ctx context.Context, filter ListPostsFilter) ([]PublicPost, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("blog service is not initialized")
	}

	filter.Status = StatusPublished
	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return PublicPosts(items), totalItems, nil
}

func (s *Service) Update(ctx context.Context, id string, input UpdatePostInput) (*AdminPost, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("blog service is not initialized")
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

func (s *Service) UpdateStatus(ctx context.Context, id string, status string) (*AdminPost, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("blog service is not initialized")
	}

	item, err := s.repo.UpdateStatus(ctx, id, status)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()
	return &adminItem, nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("blog service is not initialized")
	}

	return s.repo.Delete(ctx, id)
}
