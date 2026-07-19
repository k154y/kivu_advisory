package accountant

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

func (s *Service) GetProfile(ctx context.Context, userID string) (*PublicAccountant, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("accountant service is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, apperrors.InvalidInput("accountant user id is required")
	}

	foundAccountant, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	publicAccountant := foundAccountant.Public()

	return &publicAccountant, nil
}

func (s *Service) GetAdminByID(ctx context.Context, id string) (*PublicAccountant, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("accountant service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("accountant id is required")
	}

	foundAccountant, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	publicAccountant := foundAccountant.Public()

	return &publicAccountant, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListAccountantsFilter) ([]PublicAccountant, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("accountant service is not initialized")
	}

	filter = filter.Normalize()

	accountants, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicAccountants(accountants), totalItems, nil
}

func (s *Service) SetActiveAdmin(ctx context.Context, id string, input UpdateStatusInput) (*PublicAccountant, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("accountant service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("accountant id is required")
	}

	updatedAccountant, err := s.repo.SetActive(ctx, id, input.IsActive)
	if err != nil {
		return nil, err
	}

	publicAccountant := updatedAccountant.Public()

	return &publicAccountant, nil
}
