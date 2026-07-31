package assignment

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

type AccountantNotificationRecipient struct {
	UserID   string
	FullName string
	Email    string
	Phone    string
}

type AccountantRecipientResolver interface {
	FindAccountantNotificationRecipient(ctx context.Context, accountantUserID string) (AccountantNotificationRecipient, error)
}

func (s *Service) SetNotificationService(notificationService NotificationService) {
	if s == nil {
		return
	}

	s.notificationService = notificationService
}

func (s *Service) SetAccountantRecipientResolver(resolver AccountantRecipientResolver) {
	if s == nil {
		return
	}

	s.accountantRecipientResolver = resolver
}

func (s *Service) notifyAccountantAboutAssignment(ctx context.Context, item *Assignment) {
	if s == nil || s.notificationService == nil || s.accountantRecipientResolver == nil || item == nil {
		return
	}

	recipient, err := s.accountantRecipientResolver.FindAccountantNotificationRecipient(ctx, item.AccountantUserID)
	if err != nil {
		log.Printf("assignment notification skipped: accountant recipient not found for user_id=%s error=%v", item.AccountantUserID, err)
		return
	}

	recipient.UserID = strings.TrimSpace(recipient.UserID)
	recipient.FullName = strings.TrimSpace(recipient.FullName)
	recipient.Email = strings.TrimSpace(recipient.Email)
	recipient.Phone = strings.TrimSpace(recipient.Phone)

	if recipient.UserID == "" || recipient.Email == "" {
		log.Printf("assignment notification skipped: accountant recipient is missing user id or email")
		return
	}

	referenceNumber := strings.TrimSpace(item.ReferenceNumber)
	if referenceNumber == "" {
		referenceNumber = item.ServiceRequestID
	}

	requestTitle := strings.TrimSpace(item.RequestTitle)
	if requestTitle == "" {
		requestTitle = "Service request"
	}

	accountantName := recipient.FullName
	if accountantName == "" {
		accountantName = "Accountant"
	}

	clientName := strings.TrimSpace(item.RequesterName)
	if clientName == "" {
		clientName = "Client"
	}

	clientContact := strings.TrimSpace(item.RequesterEmail)
	if clientContact == "" {
		clientContact = strings.TrimSpace(item.RequesterPhone)
	}
	if clientContact == "" {
		clientContact = "No contact provided"
	}

	title := fmt.Sprintf("New assignment %s", referenceNumber)

	body := fmt.Sprintf(
		"You have been assigned to service request %s: %s.",
		referenceNumber,
		requestTitle,
	)

	emailBody := fmt.Sprintf(
		"Hello %s,\n\nYou have been assigned to a Kivu Advisory service request.\n\nReference: %s\nTitle: %s\nPriority: %s\nClient: %s\nClient contact: %s\n\nAssignment notes:\n%s\n\nPlease log in to the accountant dashboard to review and start the work.",
		accountantName,
		referenceNumber,
		requestTitle,
		strings.TrimSpace(item.Priority),
		clientName,
		clientContact,
		strings.TrimSpace(item.Notes),
	)

	channels := []string{
		notificationpkg.ChannelInApp,
		notificationpkg.ChannelEmail,
	}

	if shouldNotifyAssignmentBySMS(item.Priority) && recipient.Phone != "" {
		channels = append(channels, notificationpkg.ChannelSMS)
	}

	_, err = s.notificationService.NotifyUser(ctx, notificationpkg.NotifyUserInput{
		UserID:           recipient.UserID,
		UserEmail:        recipient.Email,
		UserPhone:        recipient.Phone,
		Title:            title,
		Body:             body,
		NotificationType: "system",
		EntityType:       "assignment",
		EntityID:         item.ID,
		ActionURL:        "/accountant/assignments",
		Channels:         channels,
		EmailSubject:     fmt.Sprintf("New Kivu Advisory assignment %s", referenceNumber),
		EmailBody:        emailBody,
		SMSBody:          fmt.Sprintf("Kivu Advisory: new %s priority assignment %s. Please check your dashboard.", strings.TrimSpace(item.Priority), referenceNumber),
	})
	if err != nil {
		log.Printf("failed to notify accountant about assignment %s: %v", item.ID, err)
	}
}

func shouldNotifyAssignmentBySMS(priority string) bool {
	switch NormalizePriority(priority) {
	case PriorityHigh, PriorityUrgent:
		return true
	default:
		return false
	}
}
