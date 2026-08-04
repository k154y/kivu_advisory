package consultation

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

func (s *Service) notifyAdminAboutNewConsultation(ctx context.Context, item *Consultation) {
	if s == nil || s.notificationService == nil || item == nil {
		return
	}

	recipient := s.adminNotificationRecipient
	recipient.UserID = strings.TrimSpace(recipient.UserID)
	recipient.Email = strings.TrimSpace(recipient.Email)
	recipient.Phone = strings.TrimSpace(recipient.Phone)

	if recipient.UserID == "" || recipient.Email == "" {
		log.Printf("consultation notification skipped: admin recipient is not configured")
		return
	}

	fullName := strings.TrimSpace(item.FullName)
	if fullName == "" {
		fullName = "A visitor"
	}

	contact := strings.TrimSpace(item.Email)
	if contact == "" {
		contact = strings.TrimSpace(item.Phone)
	}
	if contact == "" {
		contact = strings.TrimSpace(item.WhatsApp)
	}
	if contact == "" {
		contact = "No contact provided"
	}

	preferredDate := "Not specified"
	if item.PreferredDate != nil {
		preferredDate = item.PreferredDate.Format("2006-01-02")
	}

	preferredTime := strings.TrimSpace(item.PreferredTime)
	if preferredTime == "" {
		preferredTime = "Not specified"
	}

	title := "New consultation request"

	body := fmt.Sprintf(
		"%s submitted a new consultation request: %s.",
		fullName,
		strings.TrimSpace(item.Subject),
	)

	emailBody := fmt.Sprintf(
		"Hello,\n\nA new consultation request has been submitted on Kivu Advisory.\n\nSubject: %s\nClient: %s\nCompany: %s\nContact: %s\nConsultation type: %s\nPriority: %s\nPreferred contact method: %s\nPreferred date: %s\nPreferred time: %s\n\nMessage:\n%s\n\nPlease log in to the admin dashboard to review it.",
		strings.TrimSpace(item.Subject),
		fullName,
		strings.TrimSpace(item.CompanyName),
		contact,
		strings.TrimSpace(item.ConsultationType),
		strings.TrimSpace(item.Priority),
		strings.TrimSpace(item.PreferredContactMethod),
		preferredDate,
		preferredTime,
		strings.TrimSpace(item.Message),
	)

	_, err := s.notificationService.NotifyUser(ctx, notificationpkg.NotifyUserInput{
		UserID:           recipient.UserID,
		UserEmail:        recipient.Email,
		UserPhone:        recipient.Phone,
		Title:            title,
		Body:             body,
		NotificationType: "system",
		EntityType:       "consultation",
		EntityID:         item.ID,
		ActionURL:        fmt.Sprintf("/admin/consultations/%s", item.ID),
		Channels: []string{
			notificationpkg.ChannelInApp,
			notificationpkg.ChannelEmail,
		},
		EmailSubject: "New Kivu Advisory consultation request",
		EmailBody:    emailBody,
	})
	if err != nil {
		log.Printf("failed to notify admin about consultation %s: %v", item.ID, err)
	}
}
