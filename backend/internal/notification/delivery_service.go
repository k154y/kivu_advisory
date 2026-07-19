package notification

import (
	"context"
	"errors"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type NotifyUserInput struct {
	UserID           string
	UserEmail        string
	UserPhone        string
	Title            string
	Body             string
	NotificationType string
	EntityType       string
	EntityID         string
	ActionURL        string

	Channels []string

	EmailSubject string
	EmailBody    string
	SMSBody      string
}

func (s *Service) NotifyUser(ctx context.Context, input NotifyUserInput) (*PublicNotification, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("notification service is not initialized")
	}

	input = NormalizeNotifyUserInput(input)

	if err := validateNotifyUserInput(input); err != nil {
		return nil, err
	}

	createdNotification, err := s.repo.Create(ctx, CreateNotificationInput{
		UserID:           input.UserID,
		Title:            input.Title,
		Body:             input.Body,
		NotificationType: input.NotificationType,
		EntityType:       input.EntityType,
		EntityID:         input.EntityID,
		ActionURL:        input.ActionURL,
	})
	if err != nil {
		return nil, err
	}

	if s.deliveryRepo != nil {
		if err := s.createAndProcessDeliveries(ctx, *createdNotification, input); err != nil {
			return nil, err
		}
	}

	publicNotification := createdNotification.Public()

	return &publicNotification, nil
}

func (s *Service) NotifyUsers(ctx context.Context, inputs []NotifyUserInput) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("notification service is not initialized")
	}

	for _, input := range inputs {
		if _, err := s.NotifyUser(ctx, input); err != nil {
			return err
		}
	}

	return nil
}

func (s *Service) createAndProcessDeliveries(ctx context.Context, createdNotification Notification, input NotifyUserInput) error {
	for _, channel := range input.Channels {
		switch channel {
		case ChannelInApp:
			if err := s.createInAppDelivery(ctx, createdNotification, input); err != nil {
				return err
			}

		case ChannelEmail:
			if err := s.createEmailDelivery(ctx, createdNotification, input); err != nil {
				return err
			}

		case ChannelSMS:
			if err := s.createSMSDelivery(ctx, createdNotification, input); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *Service) createInAppDelivery(ctx context.Context, createdNotification Notification, input NotifyUserInput) error {
	delivery, err := s.deliveryRepo.CreateDelivery(ctx, CreateDeliveryInput{
		NotificationID: createdNotification.ID,
		UserID:         input.UserID,
		Channel:        ChannelInApp,
		Recipient:      input.UserID,
		Subject:        input.Title,
		Message:        input.Body,
		Provider:       "system",
	})
	if err != nil {
		return err
	}

	_, err = s.deliveryRepo.MarkDeliverySent(ctx, delivery.ID, MarkDeliverySentInput{
		Provider:          "system",
		ProviderMessageID: createdNotification.ID,
	})

	return err
}

func (s *Service) createEmailDelivery(ctx context.Context, createdNotification Notification, input NotifyUserInput) error {
	if input.UserEmail == "" {
		return nil
	}

	delivery, err := s.deliveryRepo.CreateDelivery(ctx, CreateDeliveryInput{
		NotificationID: createdNotification.ID,
		UserID:         input.UserID,
		Channel:        ChannelEmail,
		Recipient:      input.UserEmail,
		Subject:        input.EmailSubject,
		Message:        input.EmailBody,
		Provider:       "",
	})
	if err != nil {
		return err
	}

	if s.emailSender == nil {
		_, err := s.deliveryRepo.MarkDeliverySkipped(ctx, delivery.ID, "email sender is not configured")
		return err
	}

	result, err := s.emailSender.SendEmail(ctx, EmailMessage{
		To:      input.UserEmail,
		Subject: input.EmailSubject,
		Body:    input.EmailBody,
	})
	if err != nil {
		statusErr := markSendFailure(ctx, s.deliveryRepo, delivery.ID, result, err, ChannelEmail)
		if statusErr != nil {
			return statusErr
		}

		return nil
	}

	_, err = s.deliveryRepo.MarkDeliverySent(ctx, delivery.ID, MarkDeliverySentInput{
		Provider:          resultValue(result).Provider,
		ProviderMessageID: resultValue(result).ProviderMessageID,
	})

	return err
}

func (s *Service) createSMSDelivery(ctx context.Context, createdNotification Notification, input NotifyUserInput) error {
	if input.UserPhone == "" {
		return nil
	}

	delivery, err := s.deliveryRepo.CreateDelivery(ctx, CreateDeliveryInput{
		NotificationID: createdNotification.ID,
		UserID:         input.UserID,
		Channel:        ChannelSMS,
		Recipient:      input.UserPhone,
		Subject:        "",
		Message:        input.SMSBody,
		Provider:       "",
	})
	if err != nil {
		return err
	}

	if s.smsSender == nil {
		_, err := s.deliveryRepo.MarkDeliverySkipped(ctx, delivery.ID, "sms sender is not configured")
		return err
	}

	result, err := s.smsSender.SendSMS(ctx, SMSMessage{
		To:   input.UserPhone,
		Body: input.SMSBody,
	})
	if err != nil {
		statusErr := markSendFailure(ctx, s.deliveryRepo, delivery.ID, result, err, ChannelSMS)
		if statusErr != nil {
			return statusErr
		}

		return nil
	}

	_, err = s.deliveryRepo.MarkDeliverySent(ctx, delivery.ID, MarkDeliverySentInput{
		Provider:          resultValue(result).Provider,
		ProviderMessageID: resultValue(result).ProviderMessageID,
	})

	return err
}

func markSendFailure(
	ctx context.Context,
	deliveryRepo DeliveryRepository,
	deliveryID string,
	result *SendResult,
	sendErr error,
	channel string,
) error {
	if deliveryRepo == nil {
		return apperrors.Internal("notification delivery repository is not initialized")
	}

	if errors.Is(sendErr, ErrSenderNotConfigured) {
		_, err := deliveryRepo.MarkDeliverySkipped(ctx, deliveryID, channel+" sender is not configured")
		return err
	}

	errorMessage := strings.TrimSpace(sendErr.Error())
	if errorMessage == "" {
		errorMessage = channel + " delivery failed"
	}

	_, err := deliveryRepo.MarkDeliveryFailed(ctx, deliveryID, MarkDeliveryFailedInput{
		Provider:     resultValue(result).Provider,
		ErrorMessage: errorMessage,
	})

	return err
}

func NormalizeNotifyUserInput(input NotifyUserInput) NotifyUserInput {
	input.UserID = strings.TrimSpace(input.UserID)
	input.UserEmail = strings.TrimSpace(strings.ToLower(input.UserEmail))
	input.UserPhone = strings.TrimSpace(input.UserPhone)
	input.Title = strings.TrimSpace(input.Title)
	input.Body = strings.TrimSpace(input.Body)
	input.NotificationType = NormalizeType(input.NotificationType)
	input.EntityType = strings.TrimSpace(strings.ToLower(input.EntityType))
	input.EntityID = strings.TrimSpace(input.EntityID)
	input.ActionURL = strings.TrimSpace(input.ActionURL)
	input.EmailSubject = strings.TrimSpace(input.EmailSubject)
	input.EmailBody = strings.TrimSpace(input.EmailBody)
	input.SMSBody = strings.TrimSpace(input.SMSBody)
	input.Channels = NormalizeChannels(input.Channels)

	if input.NotificationType == "" {
		input.NotificationType = TypeGeneral
	}

	if input.EmailSubject == "" {
		input.EmailSubject = input.Title
	}

	if input.EmailBody == "" {
		input.EmailBody = input.Body
	}

	if input.SMSBody == "" {
		input.SMSBody = input.Body
	}

	return input
}

func NormalizeChannels(channels []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(channels))

	for _, channel := range channels {
		channel = NormalizeChannel(channel)
		if channel == "" {
			continue
		}

		if seen[channel] {
			continue
		}

		seen[channel] = true
		result = append(result, channel)
	}

	if len(result) == 0 {
		result = append(result, ChannelInApp)
	}

	return result
}

func validateNotifyUserInput(input NotifyUserInput) error {
	if input.UserID == "" {
		return apperrors.InvalidInput("user id is required")
	}

	if input.Title == "" {
		return apperrors.InvalidInput("notification title is required")
	}

	if input.Body == "" {
		return apperrors.InvalidInput("notification body is required")
	}

	if !IsValidType(input.NotificationType) {
		return apperrors.InvalidInput("notification type is invalid")
	}

	for _, channel := range input.Channels {
		if !IsValidChannel(channel) {
			return apperrors.InvalidInput("notification channel is invalid")
		}
	}

	return nil
}

func resultValue(result *SendResult) SendResult {
	if result == nil {
		return SendResult{}
	}

	return *result
}
