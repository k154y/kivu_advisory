package message

import (
	"context"
	"net/http"
	"strings"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type PermissionChecker interface {
	ClientCanAccessServiceRequest(ctx context.Context, clientID string, serviceRequestID string) (bool, error)
	AccountantCanAccessServiceRequest(ctx context.Context, accountantUserID string, serviceRequestID string) (bool, error)
}

type Actor struct {
	UserID   string
	Role     string
	ClientID string
}

type Service struct {
	repo              Repository
	permissionChecker PermissionChecker
}

func NewService(repo Repository, permissionChecker PermissionChecker) *Service {
	return &Service{
		repo:              repo,
		permissionChecker: permissionChecker,
	}
}

func (s *Service) Create(ctx context.Context, actor Actor, input CreateMessageInput) (*PublicMessage, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("message service is not initialized")
	}

	actor = normalizeActor(actor)
	if actor.UserID == "" || actor.Role == "" {
		return nil, apperrors.InvalidInput("authenticated user is required")
	}

	input = NormalizeCreateInput(input)
	input.SenderUserID = actor.UserID

	input = s.applyActorRules(actor, input)

	if err := s.canAccessServiceRequest(ctx, actor, input.ServiceRequestID, input.Visibility); err != nil {
		return nil, err
	}

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdMessage, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	publicMessage := createdMessage.Public()

	return &publicMessage, nil
}

func (s *Service) GetByID(ctx context.Context, actor Actor, id string) (*PublicMessage, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("message service is not initialized")
	}

	actor = normalizeActor(actor)
	if actor.UserID == "" || actor.Role == "" {
		return nil, apperrors.InvalidInput("authenticated user is required")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("message id is required")
	}

	foundMessage, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := s.canAccessServiceRequest(ctx, actor, foundMessage.ServiceRequestID, foundMessage.Visibility); err != nil {
		return nil, err
	}

	publicMessage := foundMessage.Public()

	return &publicMessage, nil
}

func (s *Service) List(ctx context.Context, actor Actor, filter ListMessagesFilter) ([]PublicMessage, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("message service is not initialized")
	}

	actor = normalizeActor(actor)
	if actor.UserID == "" || actor.Role == "" {
		return nil, 0, apperrors.InvalidInput("authenticated user is required")
	}

	filter = filter.Normalize()

	if actor.Role != middleware.RoleAdmin && filter.ServiceRequestID == "" {
		return nil, 0, apperrors.InvalidInput("service_request_id is required")
	}

	if filter.ServiceRequestID != "" {
		if err := s.canAccessServiceRequest(ctx, actor, filter.ServiceRequestID, VisibilityConversation); err != nil {
			return nil, 0, err
		}
	}

	switch actor.Role {
	case middleware.RoleClient:
		filter.IncludeInternal = false
		filter.ExcludeAdminVisibility = true

	case middleware.RoleAccountant:
		filter.IncludeInternal = true
		filter.ExcludeAdminVisibility = true

		if filter.Visibility == VisibilityAdmin {
			return nil, 0, forbidden("you do not have permission to access admin-only messages")
		}

	case middleware.RoleAdmin:
		filter.IncludeInternal = true

	default:
		return nil, 0, forbidden("you do not have permission to access messages")
	}

	messages, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicMessages(messages), totalItems, nil
}

func (s *Service) MarkRead(ctx context.Context, actor Actor, id string) (*PublicMessage, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("message service is not initialized")
	}

	actor = normalizeActor(actor)
	if actor.UserID == "" || actor.Role == "" {
		return nil, apperrors.InvalidInput("authenticated user is required")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return nil, apperrors.InvalidInput("message id is required")
	}

	foundMessage, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := s.canAccessServiceRequest(ctx, actor, foundMessage.ServiceRequestID, foundMessage.Visibility); err != nil {
		return nil, err
	}

	updatedMessage, err := s.repo.MarkRead(ctx, id)
	if err != nil {
		return nil, err
	}

	publicMessage := updatedMessage.Public()

	return &publicMessage, nil
}

func (s *Service) DeleteAdmin(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("message service is not initialized")
	}

	id = strings.TrimSpace(id)
	if id == "" {
		return apperrors.InvalidInput("message id is required")
	}

	return s.repo.Delete(ctx, id)
}

func (s *Service) applyActorRules(actor Actor, input CreateMessageInput) CreateMessageInput {
	switch actor.Role {
	case middleware.RoleClient:
		input.MessageType = MessageTypeMessage
		input.Visibility = VisibilityConversation
		input.IsInternal = false

	case middleware.RoleAccountant:
		if input.Visibility == VisibilityAdmin {
			input.Visibility = VisibilityStaff
		}

		if input.Visibility == VisibilityStaff {
			input.IsInternal = true
		}

		if input.Visibility == "" {
			input.Visibility = VisibilityConversation
			input.IsInternal = false
		}

	case middleware.RoleAdmin:
		if input.Visibility == "" {
			input.Visibility = VisibilityConversation
		}

		if input.Visibility == VisibilityStaff || input.Visibility == VisibilityAdmin {
			input.IsInternal = true
		}

		if input.Visibility == VisibilityConversation {
			input.IsInternal = false
		}
	}

	return NormalizeCreateInput(input)
}

func (s *Service) canAccessServiceRequest(ctx context.Context, actor Actor, serviceRequestID string, visibility string) error {
	serviceRequestID = strings.TrimSpace(serviceRequestID)
	visibility = NormalizeVisibility(visibility)

	if serviceRequestID == "" {
		if actor.Role == middleware.RoleAdmin {
			return nil
		}

		return apperrors.InvalidInput("service_request_id is required")
	}

	switch actor.Role {
	case middleware.RoleAdmin:
		return nil

	case middleware.RoleClient:
		if visibility != VisibilityConversation {
			return forbidden("you do not have permission to access this message")
		}

		if actor.ClientID == "" {
			return forbidden("client profile is required")
		}

		if s.permissionChecker == nil {
			return apperrors.Internal("message permission checker is not initialized")
		}

		allowed, err := s.permissionChecker.ClientCanAccessServiceRequest(ctx, actor.ClientID, serviceRequestID)
		if err != nil {
			return err
		}

		if !allowed {
			return forbidden("you do not have permission to access this service request")
		}

		return nil

	case middleware.RoleAccountant:
		if visibility == VisibilityAdmin {
			return forbidden("you do not have permission to access admin-only messages")
		}

		if s.permissionChecker == nil {
			return apperrors.Internal("message permission checker is not initialized")
		}

		allowed, err := s.permissionChecker.AccountantCanAccessServiceRequest(ctx, actor.UserID, serviceRequestID)
		if err != nil {
			return err
		}

		if !allowed {
			return forbidden("you do not have permission to access this service request")
		}

		return nil

	default:
		return forbidden("you do not have permission to access this message")
	}
}

func normalizeActor(actor Actor) Actor {
	actor.UserID = strings.TrimSpace(actor.UserID)
	actor.Role = strings.TrimSpace(strings.ToLower(actor.Role))
	actor.ClientID = strings.TrimSpace(actor.ClientID)

	return actor
}

func forbidden(message string) error {
	return &apperrors.AppError{
		Code:       "forbidden",
		Message:    message,
		StatusCode: http.StatusForbidden,
	}
}
