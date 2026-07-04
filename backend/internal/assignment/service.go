package assignment

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

func (s *Service) CreateAdmin(ctx context.Context, input CreateAssignmentInput) (*PublicAssignment, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("assignment service is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdAssignment, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	publicAssignment := createdAssignment.Public()

	return &publicAssignment, nil
}

func (s *Service) GetAdminByID(ctx context.Context, id string) (*PublicAssignment, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("assignment service is not initialized")
	}

	foundAssignment, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	publicAssignment := foundAssignment.Public()

	return &publicAssignment, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListAssignmentsFilter) ([]PublicAssignment, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("assignment service is not initialized")
	}

	filter = filter.Normalize()

	assignments, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicAssignments(assignments), totalItems, nil
}

func (s *Service) UpdateAdmin(ctx context.Context, id string, input UpdateAssignmentInput) (*PublicAssignment, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("assignment service is not initialized")
	}

	input = NormalizeUpdateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedAssignment, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, err
	}

	publicAssignment := updatedAssignment.Public()

	return &publicAssignment, nil
}

func (s *Service) UpdateStatusAdmin(ctx context.Context, id string, input UpdateStatusInput) (*PublicAssignment, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("assignment service is not initialized")
	}

	input.Status = NormalizeStatus(input.Status)
	input.Notes = strings.TrimSpace(input.Notes)
	input.InternalNotes = strings.TrimSpace(input.InternalNotes)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	updatedAssignment, err := s.repo.UpdateStatus(ctx, id, input)
	if err != nil {
		return nil, err
	}

	publicAssignment := updatedAssignment.Public()

	return &publicAssignment, nil
}

func (s *Service) DeleteAdmin(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("assignment service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("assignment id is required")
	}

	return s.repo.Delete(ctx, id)
}

func (s *Service) ListAccountant(ctx context.Context, accountantUserID string, filter ListAssignmentsFilter) ([]PublicAssignment, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("assignment service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	if accountantUserID == "" {
		return nil, 0, apperrors.InvalidInput("accountant user id is required")
	}

	filter = filter.Normalize()
	filter.AccountantUserID = accountantUserID

	assignments, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicAssignments(assignments), totalItems, nil
}

func (s *Service) GetAccountantByID(ctx context.Context, accountantUserID string, assignmentID string) (*PublicAssignment, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("assignment service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	assignmentID = strings.TrimSpace(assignmentID)

	if accountantUserID == "" {
		return nil, apperrors.InvalidInput("accountant user id is required")
	}

	if assignmentID == "" {
		return nil, apperrors.InvalidInput("assignment id is required")
	}

	foundAssignment, err := s.repo.FindByID(ctx, assignmentID)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(foundAssignment.AccountantUserID) != accountantUserID {
		return nil, apperrors.Forbidden("you do not have permission to access this assignment")
	}

	publicAssignment := foundAssignment.Public()

	return &publicAssignment, nil
}

func (s *Service) UpdateStatusAccountant(ctx context.Context, accountantUserID string, assignmentID string, input UpdateStatusInput) (*PublicAssignment, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("assignment service is not initialized")
	}

	accountantUserID = strings.TrimSpace(accountantUserID)
	assignmentID = strings.TrimSpace(assignmentID)

	if accountantUserID == "" {
		return nil, apperrors.InvalidInput("accountant user id is required")
	}

	if assignmentID == "" {
		return nil, apperrors.InvalidInput("assignment id is required")
	}

	input.Status = NormalizeStatus(input.Status)
	input.Notes = strings.TrimSpace(input.Notes)
	input.InternalNotes = strings.TrimSpace(input.InternalNotes)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	if !isAccountantAllowedStatus(input.Status) {
		return nil, apperrors.Forbidden("accountant cannot set this assignment status")
	}

	foundAssignment, err := s.repo.FindByID(ctx, assignmentID)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(foundAssignment.AccountantUserID) != accountantUserID {
		return nil, apperrors.Forbidden("you do not have permission to update this assignment")
	}

	updatedAssignment, err := s.repo.UpdateStatus(ctx, assignmentID, input)
	if err != nil {
		return nil, err
	}

	publicAssignment := updatedAssignment.Public()

	return &publicAssignment, nil
}

func isAccountantAllowedStatus(status string) bool {
	switch NormalizeStatus(status) {
	case StatusAccepted, StatusInProgress, StatusCompleted:
		return true
	default:
		return false
	}
}