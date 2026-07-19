package client

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

func (s *Service) Create(ctx context.Context, input CreateClientInput) (*PublicClient, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("client service is not initialized")
	}

	input = NormalizeInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdClient, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	publicClient := createdClient.Public()

	return &publicClient, nil
}

func (s *Service) CreateForUser(ctx context.Context, userID string, companyName string) (*PublicClient, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("client service is not initialized")
	}

	input := CreateClientInput{
		UserID:      strings.TrimSpace(userID),
		CompanyName: strings.TrimSpace(companyName),
		Country:     "Rwanda",
	}

	return s.Create(ctx, input)
}

func (s *Service) GetByID(ctx context.Context, id string) (*PublicClient, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("client service is not initialized")
	}

	foundClient, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	publicClient := foundClient.Public()

	return &publicClient, nil
}

func (s *Service) GetByUserID(ctx context.Context, userID string) (*PublicClient, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("client service is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, apperrors.InvalidInput("user id is required")
	}

	foundClient, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	publicClient := foundClient.Public()

	return &publicClient, nil
}

func (s *Service) List(ctx context.Context, filter ListClientsFilter) ([]PublicClient, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("client service is not initialized")
	}

	filter = filter.Normalize()

	clients, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicClients(clients), totalItems, nil
}

func (s *Service) Update(ctx context.Context, id string, input UpdateClientInput) (*PublicClient, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("client service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("client id is required")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedClient, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	publicClient := updatedClient.Public()

	return &publicClient, nil
}

func (s *Service) UpdateByUserID(ctx context.Context, userID string, input UpdateClientInput) (*PublicClient, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("client service is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, apperrors.InvalidInput("user id is required")
	}

	foundClient, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.Update(ctx, foundClient.ID, input)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("client service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("client id is required")
	}

	return s.repo.Delete(ctx, id)
}
