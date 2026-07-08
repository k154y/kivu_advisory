package staff

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

func (s *Service) ListPublic(ctx context.Context, filter ListStaffMembersFilter) ([]PublicStaffMember, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("staff service is not initialized")
	}

	trueValue := true
	filter.ShowOnWebsite = &trueValue
	filter.IsActive = &trueValue

	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return PublicStaffMembers(items), totalItems, nil
}

func (s *Service) ListHomepage(ctx context.Context, filter ListStaffMembersFilter) ([]PublicStaffMember, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("staff service is not initialized")
	}

	trueValue := true
	filter.ShowOnWebsite = &trueValue
	filter.ShowOnHomepage = &trueValue
	filter.IsActive = &trueValue

	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return PublicStaffMembers(items), totalItems, nil
}

func (s *Service) GetPublicBySlug(ctx context.Context, slug string) (*PublicStaffMember, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("staff service is not initialized")
	}

	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, apperrors.InvalidInput("staff member slug is required")
	}

	item, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	if !item.IsActive || !item.ShowOnWebsite {
		return nil, apperrors.NotFound("staff member not found")
	}

	publicItem := item.Public()

	return &publicItem, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListStaffMembersFilter) ([]AdminStaffMember, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("staff service is not initialized")
	}

	items, totalItems, err := s.repo.List(ctx, filter.Normalize())
	if err != nil {
		return nil, 0, err
	}

	return AdminStaffMembers(items), totalItems, nil
}

func (s *Service) GetAdminByID(ctx context.Context, id string) (*AdminStaffMember, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("staff service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("staff member id is required")
	}

	item, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	adminItem := item.Admin()

	return &adminItem, nil
}

func (s *Service) CreateAdmin(ctx context.Context, input CreateStaffMemberInput) (*AdminStaffMember, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("staff service is not initialized")
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

func (s *Service) UpdateAdmin(ctx context.Context, id string, input UpdateStaffMemberInput) (*AdminStaffMember, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("staff service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("staff member id is required")
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

func (s *Service) UpdateStatusAdmin(ctx context.Context, id string, input UpdateStatusInput) (*AdminStaffMember, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("staff service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("staff member id is required")
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
		return apperrors.Internal("staff service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("staff member id is required")
	}

	return s.repo.Delete(ctx, id)
}
