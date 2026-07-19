package taxcredential

import (
	"context"
	"fmt"
	"log"
	"strings"

	notificationpkg "github.com/kyves/kivu-advisory/backend/internal/notification"
)

type NotificationService interface {
	NotifyUser(ctx context.Context, input notificationpkg.NotifyUserInput) (*notificationpkg.PublicNotification, error)
}

func (s *Service) SetNotificationService(notificationService NotificationService) {
	if s == nil {
		return
	}

	s.notificationService = notificationService
}

func (s *Service) notifyCredentialRevealed(ctx context.Context, item *ClientTaxCredential, revealedByUserID string, actorRole string) {
	if err := s.sendTaxCredentialNotification(ctx, item, taxCredentialNotificationInput{
		Title:        "Tax credential revealed",
		Body:         fmt.Sprintf("Your %s credential was revealed by %s for service support.", item.SystemName, taxCredentialActorLabel(actorRole)),
		EmailSubject: "Security alert: tax credential revealed",
		EmailBody: fmt.Sprintf(
			"Your %s credential was revealed by %s for service support.\n\nIf you did not expect this action, please contact Kivu Advisory immediately.",
			item.SystemName,
			taxCredentialActorLabel(actorRole),
		),
		SMSBody: fmt.Sprintf(
			"Kivu Advisory security alert: your %s credential was revealed by %s.",
			item.SystemName,
			taxCredentialActorLabel(actorRole),
		),
		Channels: []string{
			notificationpkg.ChannelInApp,
			notificationpkg.ChannelEmail,
			notificationpkg.ChannelSMS,
		},
		ActorUserID: revealedByUserID,
	}); err != nil {
		log.Printf("failed to send tax credential revealed notification: %v", err)
	}
}

func (s *Service) notifyCredentialUpdated(ctx context.Context, item *ClientTaxCredential, updatedByUserID string, actorRole string) {
	channels := []string{
		notificationpkg.ChannelInApp,
		notificationpkg.ChannelEmail,
	}

	if actorRole != "client" {
		channels = append(channels, notificationpkg.ChannelSMS)
	}

	if err := s.sendTaxCredentialNotification(ctx, item, taxCredentialNotificationInput{
		Title: "Tax credential updated",
		Body: fmt.Sprintf(
			"Your %s credential information was updated by %s.",
			item.SystemName,
			taxCredentialActorLabel(actorRole),
		),
		EmailSubject: "Security alert: tax credential updated",
		EmailBody: fmt.Sprintf(
			"Your %s credential information was updated by %s.\n\nIf you did not expect this action, please contact Kivu Advisory immediately.",
			item.SystemName,
			taxCredentialActorLabel(actorRole),
		),
		SMSBody: fmt.Sprintf(
			"Kivu Advisory security alert: your %s credential was updated by %s.",
			item.SystemName,
			taxCredentialActorLabel(actorRole),
		),
		Channels:    channels,
		ActorUserID: updatedByUserID,
	}); err != nil {
		log.Printf("failed to send tax credential updated notification: %v", err)
	}
}

type taxCredentialNotificationInput struct {
	Title        string
	Body         string
	EmailSubject string
	EmailBody    string
	SMSBody      string
	Channels     []string
	ActorUserID  string
}

func (s *Service) sendTaxCredentialNotification(ctx context.Context, item *ClientTaxCredential, input taxCredentialNotificationInput) error {
	if s == nil || s.notificationService == nil || s.credentialRepo == nil {
		return nil
	}

	if item == nil {
		return nil
	}

	recipient, err := s.credentialRepo.FindClientRecipientByClientID(ctx, item.ClientID)
	if err != nil {
		return err
	}

	if recipient == nil || strings.TrimSpace(recipient.UserID) == "" {
		return nil
	}

	_, err = s.notificationService.NotifyUser(ctx, notificationpkg.NotifyUserInput{
		UserID:           recipient.UserID,
		UserEmail:        recipient.Email,
		UserPhone:        recipient.Phone,
		Title:            input.Title,
		Body:             input.Body,
		NotificationType: "system",
		EntityType:       "tax_credential",
		EntityID:         item.ID,
		ActionURL:        "/client/tax-credentials",
		Channels:         input.Channels,
		EmailSubject:     input.EmailSubject,
		EmailBody:        input.EmailBody,
		SMSBody:          input.SMSBody,
	})

	return err
}

func taxCredentialActorLabel(actorRole string) string {
	switch strings.ToLower(strings.TrimSpace(actorRole)) {
	case "admin":
		return "an administrator"
	case "accountant":
		return "your assigned accountant"
	case "client":
		return "you"
	default:
		return "an authorized user"
	}
}
