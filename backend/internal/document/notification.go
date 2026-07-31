package document

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	notificationpkg "github.com/kyves/kivu-advisory/backend/internal/notification"
)

type NotificationService interface {
	NotifyUser(ctx context.Context, input notificationpkg.NotifyUserInput) (*notificationpkg.PublicNotification, error)
}

type NotificationRecipient struct {
	UserID   string
	FullName string
	Email    string
	Phone    string
}

type ServiceRequestNotificationContext struct {
	ID               string
	ReferenceNumber  string
	Title            string
	Priority         string
	ExpectedDeadline *time.Time
	ClientUserID     string
	ClientFullName   string
	ClientEmail      string
	ClientPhone      string
}

type NotificationResolver interface {
	FindAdminNotificationRecipient(ctx context.Context) (NotificationRecipient, error)
	FindServiceRequestNotificationContext(ctx context.Context, serviceRequestID string) (ServiceRequestNotificationContext, error)
}

func (s *Service) SetNotificationService(notificationService NotificationService) {
	if s == nil {
		return
	}

	s.notificationService = notificationService
}

func (s *Service) SetNotificationResolver(resolver NotificationResolver) {
	if s == nil {
		return
	}

	s.notificationResolver = resolver
}

func (s *Service) notifyAfterUpload(ctx context.Context, actor Actor, item *Document) {
	if s == nil || s.notificationService == nil || s.notificationResolver == nil || item == nil {
		return
	}

	requestContext, err := s.notificationResolver.FindServiceRequestNotificationContext(ctx, item.ServiceRequestID)
	if err != nil {
		log.Printf("document notification skipped: service request context not found for service_request_id=%s error=%v", item.ServiceRequestID, err)
		return
	}

	switch actor.Role {
	case roleClient, roleAccountant:
		s.notifyAdminAboutDocumentUpload(ctx, actor, item, requestContext)

	case roleAdmin:
		if item.IsFinal || item.DocumentType == DocumentTypeFinalDeliverable {
			s.notifyClientAboutFinalDocument(ctx, item, requestContext)
		}
	}
}

func (s *Service) notifyAdminAboutDocumentUpload(
	ctx context.Context,
	actor Actor,
	item *Document,
	requestContext ServiceRequestNotificationContext,
) {
	recipient, err := s.notificationResolver.FindAdminNotificationRecipient(ctx)
	if err != nil {
		log.Printf("document notification skipped: admin recipient not found error=%v", err)
		return
	}

	recipient = normalizeNotificationRecipient(recipient)
	if recipient.UserID == "" || recipient.Email == "" {
		log.Printf("document notification skipped: admin recipient is missing user id or email")
		return
	}

	referenceNumber := normalizedReferenceNumber(requestContext)
	fileName := normalizedDocumentName(item)
	uploaderLabel := documentUploaderLabel(actor.Role)

	title := fmt.Sprintf("Document uploaded for %s", referenceNumber)

	body := fmt.Sprintf(
		"%s uploaded %s for service request %s.",
		uploaderLabel,
		fileName,
		referenceNumber,
	)

	emailBody := fmt.Sprintf(
		"Hello,\n\nA document has been uploaded on Kivu Advisory.\n\nReference: %s\nRequest title: %s\nPriority: %s\nUploaded by: %s\nFile: %s\nDocument type: %s\nVisibility: %s\n\nDescription:\n%s\n\nPlease log in to the admin dashboard to review it.",
		referenceNumber,
		strings.TrimSpace(requestContext.Title),
		strings.TrimSpace(requestContext.Priority),
		uploaderLabel,
		fileName,
		strings.TrimSpace(item.DocumentType),
		strings.TrimSpace(item.Visibility),
		strings.TrimSpace(item.Description),
	)

	channels := []string{
		notificationpkg.ChannelInApp,
		notificationpkg.ChannelEmail,
	}

	if shouldNotifyDocumentUploadBySMS(requestContext.Priority, requestContext.ExpectedDeadline) && recipient.Phone != "" {
		channels = append(channels, notificationpkg.ChannelSMS)
	}

	_, err = s.notificationService.NotifyUser(ctx, notificationpkg.NotifyUserInput{
		UserID:           recipient.UserID,
		UserEmail:        recipient.Email,
		UserPhone:        recipient.Phone,
		Title:            title,
		Body:             body,
		NotificationType: "system",
		EntityType:       "document",
		EntityID:         item.ID,
		ActionURL:        fmt.Sprintf("/admin/requests/%s", item.ServiceRequestID),
		Channels:         channels,
		EmailSubject:     fmt.Sprintf("Document uploaded for Kivu Advisory request %s", referenceNumber),
		EmailBody:        emailBody,
		SMSBody:          fmt.Sprintf("Kivu Advisory: document uploaded for %s. Please check the admin dashboard.", referenceNumber),
	})
	if err != nil {
		log.Printf("failed to notify admin about document %s: %v", item.ID, err)
	}
}

func (s *Service) notifyClientAboutFinalDocument(
	ctx context.Context,
	item *Document,
	requestContext ServiceRequestNotificationContext,
) {
	recipient := normalizeNotificationRecipient(NotificationRecipient{
		UserID:   requestContext.ClientUserID,
		FullName: requestContext.ClientFullName,
		Email:    requestContext.ClientEmail,
		Phone:    requestContext.ClientPhone,
	})

	if recipient.UserID == "" || recipient.Email == "" {
		log.Printf("final document notification skipped: linked client user id or email is missing for service_request_id=%s", item.ServiceRequestID)
		return
	}

	referenceNumber := normalizedReferenceNumber(requestContext)
	fileName := normalizedDocumentName(item)

	clientName := recipient.FullName
	if clientName == "" {
		clientName = "Client"
	}

	title := fmt.Sprintf("Final document available for %s", referenceNumber)

	body := fmt.Sprintf(
		"A final document is available for service request %s.",
		referenceNumber,
	)

	emailBody := fmt.Sprintf(
		"Hello %s,\n\nA final document has been uploaded for your Kivu Advisory service request.\n\nReference: %s\nRequest title: %s\nFile: %s\n\nPlease log in to your client dashboard to view or download it.",
		clientName,
		referenceNumber,
		strings.TrimSpace(requestContext.Title),
		fileName,
	)

	channels := []string{
		notificationpkg.ChannelInApp,
		notificationpkg.ChannelEmail,
	}

	if shouldNotifyDocumentUploadBySMS(requestContext.Priority, requestContext.ExpectedDeadline) && recipient.Phone != "" {
		channels = append(channels, notificationpkg.ChannelSMS)
	}

	_, err := s.notificationService.NotifyUser(ctx, notificationpkg.NotifyUserInput{
		UserID:           recipient.UserID,
		UserEmail:        recipient.Email,
		UserPhone:        recipient.Phone,
		Title:            title,
		Body:             body,
		NotificationType: "system",
		EntityType:       "document",
		EntityID:         item.ID,
		ActionURL:        "/client/service-requests",
		Channels:         channels,
		EmailSubject:     fmt.Sprintf("Final document available for Kivu Advisory request %s", referenceNumber),
		EmailBody:        emailBody,
		SMSBody:          fmt.Sprintf("Kivu Advisory: final document available for request %s. Please check your dashboard.", referenceNumber),
	})
	if err != nil {
		log.Printf("failed to notify client about final document %s: %v", item.ID, err)
	}
}

func normalizeNotificationRecipient(recipient NotificationRecipient) NotificationRecipient {
	return NotificationRecipient{
		UserID:   strings.TrimSpace(recipient.UserID),
		FullName: strings.TrimSpace(recipient.FullName),
		Email:    strings.TrimSpace(recipient.Email),
		Phone:    strings.TrimSpace(recipient.Phone),
	}
}

func normalizedReferenceNumber(requestContext ServiceRequestNotificationContext) string {
	referenceNumber := strings.TrimSpace(requestContext.ReferenceNumber)
	if referenceNumber != "" {
		return referenceNumber
	}

	return strings.TrimSpace(requestContext.ID)
}

func normalizedDocumentName(item *Document) string {
	if item == nil {
		return "document"
	}

	fileName := strings.TrimSpace(item.OriginalFileName)
	if fileName != "" {
		return fileName
	}

	fileName = strings.TrimSpace(item.FileName)
	if fileName != "" {
		return fileName
	}

	return "document"
}

func documentUploaderLabel(role string) string {
	switch strings.TrimSpace(strings.ToLower(role)) {
	case roleClient:
		return "A client"
	case roleAccountant:
		return "An accountant"
	case roleAdmin:
		return "An admin"
	default:
		return "A user"
	}
}

func shouldNotifyDocumentUploadBySMS(priority string, expectedDeadline *time.Time) bool {
	switch strings.TrimSpace(strings.ToLower(priority)) {
	case "high", "urgent":
		return true
	}

	if expectedDeadline == nil {
		return false
	}

	now := time.Now().UTC()
	deadline := expectedDeadline.UTC()

	return !deadline.Before(now) && deadline.Before(now.Add(48*time.Hour))
}
