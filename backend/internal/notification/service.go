package notification

import (
	"context"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type Service struct {
	repo          Repository
	deliveryRepo  DeliveryRepository
	recipientRepo RecipientRepository
	emailSender   EmailSender
	smsSender     SMSSender
}

func NewService(repo Repository) *Service {
	return &Service{
		repo: repo,
	}
}

func NewServiceWithDelivery(
	repo Repository,
	deliveryRepo DeliveryRepository,
	emailSender EmailSender,
	smsSender SMSSender,
) *Service {
	return &Service{
		repo:         repo,
		deliveryRepo: deliveryRepo,
		emailSender:  emailSender,
		smsSender:    smsSender,
	}
}

func NewServiceWithDeliveryAndRecipients(
	repo Repository,
	deliveryRepo DeliveryRepository,
	recipientRepo RecipientRepository,
	emailSender EmailSender,
	smsSender SMSSender,
) *Service {
	return &Service{
		repo:          repo,
		deliveryRepo:  deliveryRepo,
		recipientRepo: recipientRepo,
		emailSender:   emailSender,
		smsSender:     smsSender,
	}
}

func (s *Service) SetDelivery(
	deliveryRepo DeliveryRepository,
	emailSender EmailSender,
	smsSender SMSSender,
) {
	if s == nil {
		return
	}

	s.deliveryRepo = deliveryRepo
	s.emailSender = emailSender
	s.smsSender = smsSender
}

func (s *Service) SetRecipientRepository(recipientRepo RecipientRepository) {
	if s == nil {
		return
	}

	s.recipientRepo = recipientRepo
}

func (s *Service) Create(ctx context.Context, input CreateNotificationInput) (*PublicNotification, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("notification service is not initialized")
	}

	input = NormalizeCreateInput(input)

	if validationErrors := input.Validate(); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	createdNotification, err := s.repo.Create(ctx, input)
	if err != nil {
		return nil, err
	}

	publicNotification := createdNotification.Public()

	return &publicNotification, nil
}

func (s *Service) CreateMany(ctx context.Context, inputs []CreateNotificationInput) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("notification service is not initialized")
	}

	if len(inputs) == 0 {
		return nil
	}

	normalizedInputs := make([]CreateNotificationInput, 0, len(inputs))

	for _, input := range inputs {
		input = NormalizeCreateInput(input)

		if validationErrors := input.Validate(); len(validationErrors) > 0 {
			return apperrors.Validation(validationErrors)
		}

		normalizedInputs = append(normalizedInputs, input)
	}

	return s.repo.CreateMany(ctx, normalizedInputs)
}

func (s *Service) ListForUser(ctx context.Context, userID string, filter ListNotificationsFilter) ([]PublicNotification, int, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, 0, apperrors.Internal("notification service is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, 0, 0, apperrors.InvalidInput("user id is required")
	}

	filter = filter.Normalize()
	filter.UserID = userID

	notifications, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, 0, err
	}

	unreadCount, err := s.repo.CountUnread(ctx, userID)
	if err != nil {
		return nil, 0, 0, err
	}

	return PublicNotifications(notifications), totalItems, unreadCount, nil
}

func (s *Service) CountUnreadForUser(ctx context.Context, userID string) (int, error) {
	if s == nil || s.repo == nil {
		return 0, apperrors.Internal("notification service is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return 0, apperrors.InvalidInput("user id is required")
	}

	return s.repo.CountUnread(ctx, userID)
}

func (s *Service) MarkReadForUser(ctx context.Context, id string, userID string) (*PublicNotification, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("notification service is not initialized")
	}

	id = strings.TrimSpace(id)
	userID = strings.TrimSpace(userID)

	if id == "" {
		return nil, apperrors.InvalidInput("notification id is required")
	}

	if userID == "" {
		return nil, apperrors.InvalidInput("user id is required")
	}

	updatedNotification, err := s.repo.MarkRead(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	publicNotification := updatedNotification.Public()

	return &publicNotification, nil
}

func (s *Service) MarkAllReadForUser(ctx context.Context, userID string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("notification service is not initialized")
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return apperrors.InvalidInput("user id is required")
	}

	return s.repo.MarkAllRead(ctx, userID)
}

func (s *Service) DeleteForUser(ctx context.Context, id string, userID string) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("notification service is not initialized")
	}

	id = strings.TrimSpace(id)
	userID = strings.TrimSpace(userID)

	if id == "" {
		return apperrors.InvalidInput("notification id is required")
	}

	if userID == "" {
		return apperrors.InvalidInput("user id is required")
	}

	return s.repo.Delete(ctx, id, userID)
}