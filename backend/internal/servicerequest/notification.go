package servicerequest

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

type AdminNotificationRecipient struct {
	UserID string
	Email  string
	Phone  string
}

func (s *Service) SetNotificationService(notificationService NotificationService) {
	if s == nil {
		return
	}

	s.notificationService = notificationService
}

func (s *Service) SetAdminNotificationRecipient(recipient AdminNotificationRecipient) {
	if s == nil {
		return
	}

	s.adminNotificationRecipient = AdminNotificationRecipient{
		UserID: strings.TrimSpace(recipient.UserID),
		Email:  strings.TrimSpace(recipient.Email),
		Phone:  strings.TrimSpace(recipient.Phone),
	}
}

func (s *Service) notifyAdminAboutNewRequest(ctx context.Context, item *ServiceRequest) {
	if s == nil || s.notificationService == nil || item == nil {
		return
	}

	recipient := s.adminNotificationRecipient
	recipient.UserID = strings.TrimSpace(recipient.UserID)
	recipient.Email = strings.TrimSpace(recipient.Email)
	recipient.Phone = strings.TrimSpace(recipient.Phone)

	if recipient.UserID == "" || recipient.Email == "" {
		log.Printf("service request notification skipped: admin recipient is not configured")
		return
	}

	referenceNumber := strings.TrimSpace(item.ReferenceNumber)
	if referenceNumber == "" {
		referenceNumber = item.ID
	}

	requesterName := strings.TrimSpace(item.RequesterName)
	if requesterName == "" {
		requesterName = "A client"
	}

	requesterContact := strings.TrimSpace(item.RequesterEmail)
	if requesterContact == "" {
		requesterContact = strings.TrimSpace(item.RequesterPhone)
	}
	if requesterContact == "" {
		requesterContact = "No contact provided"
	}

	title := fmt.Sprintf("New service request %s", referenceNumber)

	body := fmt.Sprintf(
		"%s submitted a new service request: %s.",
		requesterName,
		strings.TrimSpace(item.Title),
	)

	emailBody := fmt.Sprintf(
		"Hello,\n\nA new service request has been submitted on Kivu Advisory.\n\nReference: %s\nTitle: %s\nRequester: %s\nContact: %s\nPriority: %s\n\nDescription:\n%s\n\nPlease log in to the admin dashboard to review it.",
		referenceNumber,
		strings.TrimSpace(item.Title),
		requesterName,
		requesterContact,
		strings.TrimSpace(item.Priority),
		strings.TrimSpace(item.Description),
	)

	_, err := s.notificationService.NotifyUser(ctx, notificationpkg.NotifyUserInput{
		UserID:           recipient.UserID,
		UserEmail:        recipient.Email,
		UserPhone:        recipient.Phone,
		Title:            title,
		Body:             body,
		NotificationType: "system",
		EntityType:       "service_request",
		EntityID:         item.ID,
		ActionURL:        fmt.Sprintf("/admin/requests/%s", item.ID),
		Channels: []string{
			notificationpkg.ChannelInApp,
			notificationpkg.ChannelEmail,
		},
		EmailSubject: fmt.Sprintf("New Kivu Advisory service request %s", referenceNumber),
		EmailBody:    emailBody,
	})
	if err != nil {
		log.Printf("failed to notify admin about service request %s: %v", item.ID, err)
	}
}
