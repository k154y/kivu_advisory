package servicecatalog

import (
	"context"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type Service struct {
	repo Repository
}

type AdminServiceItem struct {
	ID                string `json:"id"`
	Title             string `json:"title"`
	Slug              string `json:"slug"`
	ShortDescription  string `json:"short_description,omitempty"`
	Description       string `json:"description,omitempty"`
	Category          string `json:"category,omitempty"`
	PriceLabel        string `json:"price_label,omitempty"`
	ShowPriceLabel    bool   `json:"show_price_label"`
	EstimatedDuration string `json:"estimated_duration,omitempty"`
	IsFeatured        bool   `json:"is_featured"`
	IsActive          bool   `json:"is_active"`
	DisplayOrder      int    `json:"display_order"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
}

func NewService(repo Repository) *Service {
	return &Service{
		repo: repo,
	}
}

func (s *Service) Create(ctx context.Context, input CreateServiceInput) (*AdminServiceItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service catalog service is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdService, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	adminItem := adminServiceItemFrom(createdService)

	return &adminItem, nil
}

func (s *Service) Update(ctx context.Context, id string, input UpdateServiceInput) (*AdminServiceItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service catalog service is not initialized")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedService, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	adminItem := adminServiceItemFrom(updatedService)

	return &adminItem, nil
}

func (s *Service) GetAdminByID(ctx context.Context, id string) (*AdminServiceItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service catalog service is not initialized")
	}

	foundService, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	adminItem := adminServiceItemFrom(foundService)

	return &adminItem, nil
}

func (s *Service) GetAdminBySlug(ctx context.Context, slug string) (*AdminServiceItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service catalog service is not initialized")
	}

	foundService, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	adminItem := adminServiceItemFrom(foundService)

	return &adminItem, nil
}

func (s *Service) GetPublicBySlug(ctx context.Context, slug string) (*PublicServiceItem, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("service catalog service is not initialized")
	}

	foundService, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	if !foundService.IsActive {
		return nil, apperrors.NotFound("service not found")
	}

	publicItem := foundService.Public()

	return &publicItem, nil
}

func (s *Service) ListPublic(ctx context.Context, filter ListServicesFilter) ([]PublicServiceItem, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("service catalog service is not initialized")
	}

	activeOnly := true
	filter.IsActive = &activeOnly
	filter = filter.Normalize()

	services, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicServiceItems(services), totalItems, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListServicesFilter) ([]AdminServiceItem, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("service catalog service is not initialized")
	}

	filter = filter.Normalize()

	services, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return adminServiceItemsFrom(services), totalItems, nil
}

func (s *Service) SetActive(ctx context.Context, id string, isActive bool) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("service catalog service is not initialized")
	}

	return s.repo.SetActive(ctx, id, isActive)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("service catalog service is not initialized")
	}

	return s.repo.Delete(ctx, id)
}

func adminServiceItemsFrom(items []ServiceItem) []AdminServiceItem {
	result := make([]AdminServiceItem, 0, len(items))

	for _, item := range items {
		adminItem := adminServiceItemFrom(&item)
		result = append(result, adminItem)
	}

	return result
}

func adminServiceItemFrom(item *ServiceItem) AdminServiceItem {
	if item == nil {
		return AdminServiceItem{}
	}

	return AdminServiceItem{
		ID:                item.ID,
		Title:             item.Title,
		Slug:              item.Slug,
		ShortDescription:  item.ShortDescription,
		Description:       item.Description,
		Category:          item.Category,
		PriceLabel:        item.PriceLabel,
		ShowPriceLabel:    item.ShowPriceLabel,
		EstimatedDuration: item.EstimatedDuration,
		IsFeatured:        item.IsFeatured,
		IsActive:          item.IsActive,
		DisplayOrder:      item.DisplayOrder,
		CreatedAt:         item.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:         item.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
