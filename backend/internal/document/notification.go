package document

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	notificationpkg "github.com/kyves/kivu-advisory/backend/internal/notification"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type NotificationService interface {
	NotifyUser(ctx context.Context, input notificationpkg.NotifyUserInput) (*notificationpkg.PublicNotification, error)
	NotifyExternalContact(ctx context.Context, input notificationpkg.NotifyExternalContactInput) error
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

type RequestClientUploadInput struct {
	ServiceRequestID string
	DocumentName     string
	Message          string
	Urgency          string
}

func (s *Service) RequestClientUpload(ctx context.Context, actor Actor, input RequestClientUploadInput) error {
	if s == nil || s.notificationService == nil || s.notificationResolver == nil {
		return apperrors.Internal("document notification service is not initialized")
	}

	actor = normalizeActor(actor)
	if err := validateActor(actor); err != nil {
		return err
	}

	if actor.Role != roleAdmin {
		return apperrors.Forbidden("only admin can request client document uploads")
	}

	input = normalizeRequestClientUploadInput(input)

	if input.ServiceRequestID == "" {
		return apperrors.InvalidInput("service request id is required")
	}

	if input.DocumentName == "" {
		return apperrors.InvalidInput("document name is required")
	}

	requestContext, err := s.notificationResolver.FindServiceRequestNotificationContext(ctx, input.ServiceRequestID)
	if err != nil {
		return err
	}

	recipient := normalizeNotificationRecipient(NotificationRecipient{
		UserID:   requestContext.ClientUserID,
		FullName: requestContext.ClientFullName,
		Email:    requestContext.ClientEmail,
		Phone:    requestContext.ClientPhone,
	})

	if recipient.Email == "" && recipient.Phone == "" {
		return apperrors.InvalidInput("this service request does not have a requester email or phone number")
	}

	referenceNumber := normalizedReferenceNumber(requestContext)
	clientName := recipient.FullName
	if clientName == "" {
		clientName = "Client"
	}

	title := fmt.Sprintf("Document required for %s", referenceNumber)

	body := fmt.Sprintf(
		"Kivu Advisory requests you to upload: %s.",
		input.DocumentName,
	)

	emailSubject := fmt.Sprintf(
		"Document required for Kivu Advisory request %s",
		referenceNumber,
	)

	emailBody := fmt.Sprintf(
		"Hello %s,\n\nKivu Advisory requests you to upload a document for your service request.\n\nReference: %s\nRequest title: %s\nRequired document: %s\nUrgency: %s\n\nMessage:\n%s\n\nPlease upload the requested document so our team can continue processing your request.",
		clientName,
		referenceNumber,
		strings.TrimSpace(requestContext.Title),
		input.DocumentName,
		normalizedUploadRequestUrgency(input.Urgency),
		input.Message,
	)

	smsBody := fmt.Sprintf(
		"Kivu Advisory: please upload %s for request %s.",
		input.DocumentName,
		referenceNumber,
	)

	if recipient.UserID != "" {
		return s.notifyRegisteredClientForDocumentUpload(
			ctx,
			recipient,
			requestContext,
			title,
			body,
			emailSubject,
			emailBody,
			smsBody,
		)
	}

	return s.notifyVisitorForDocumentUpload(
		ctx,
		recipient,
		input.ServiceRequestID,
		emailSubject,
		emailBody,
		smsBody,
	)
}

func normalizeRequestClientUploadInput(input RequestClientUploadInput) RequestClientUploadInput {
	input.ServiceRequestID = strings.TrimSpace(input.ServiceRequestID)
	input.DocumentName = strings.TrimSpace(input.DocumentName)
	input.Message = strings.TrimSpace(input.Message)
	input.Urgency = strings.TrimSpace(strings.ToLower(input.Urgency))

	if input.Message == "" {
		input.Message = "Please upload the requested document so our team can continue processing your service request."
	}

	if input.Urgency == "" {
		input.Urgency = "high"
	}

	return input
}

func (s *Service) notifyRegisteredClientForDocumentUpload(
	ctx context.Context,
	recipient NotificationRecipient,
	requestContext ServiceRequestNotificationContext,
	title string,
	body string,
	emailSubject string,
	emailBody string,
	smsBody string,
) error {
	channels := []string{
		notificationpkg.ChannelInApp,
	}

	if recipient.Email != "" {
		channels = append(channels, notificationpkg.ChannelEmail)
	}

	if recipient.Phone != "" {
		channels = append(channels, notificationpkg.ChannelSMS)
	}

	_, err := s.notificationService.NotifyUser(ctx, notificationpkg.NotifyUserInput{
		UserID:           recipient.UserID,
		UserEmail:        recipient.Email,
		UserPhone:        recipient.Phone,
		Title:            title,
		Body:             body,
		NotificationType: "system",
		EntityType:       "service_request",
		EntityID:         requestContext.ID,
		ActionURL:        "/client/service-requests",
		Channels:         channels,
		EmailSubject:     emailSubject,
		EmailBody:        emailBody,
		SMSBody:          smsBody,
	})
	if err != nil {
		log.Printf("failed to request client document upload for service_request_id=%s: %v", requestContext.ID, err)
		return err
	}

	return nil
}

func (s *Service) notifyVisitorForDocumentUpload(
	ctx context.Context,
	recipient NotificationRecipient,
	serviceRequestID string,
	emailSubject string,
	emailBody string,
	smsBody string,
) error {
	channels := make([]string, 0, 2)

	if recipient.Email != "" {
		channels = append(channels, notificationpkg.ChannelEmail)
	}

	if recipient.Phone != "" {
		channels = append(channels, notificationpkg.ChannelSMS)
	}

	err := s.notificationService.NotifyExternalContact(ctx, notificationpkg.NotifyExternalContactInput{
		UserEmail:    recipient.Email,
		UserPhone:    recipient.Phone,
		Channels:     channels,
		EmailSubject: emailSubject,
		EmailBody:    emailBody,
		SMSBody:      smsBody,
	})
	if err != nil {
		log.Printf("failed to request visitor document upload for service_request_id=%s: %v", serviceRequestID, err)
		return err
	}

	return nil
}

func normalizedUploadRequestUrgency(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "urgent":
		return "urgent"
	case "high":
		return "high"
	case "normal":
		return "normal"
	default:
		return "high"
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
