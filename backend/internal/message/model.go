package message

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	MessageTypeMessage      = "message"
	MessageTypeNote         = "note"
	MessageTypeSystem       = "system"
	MessageTypeStatusUpdate = "status_update"

	VisibilityConversation = "conversation"
	VisibilityStaff        = "staff"
	VisibilityAdmin        = "admin"

	DefaultPageSize = 20
	MaxPageSize     = 100
)

type Message struct {
	ID               string
	ServiceRequestID string
	SenderUserID     string
	RecipientUserID  string
	Subject          string
	Body             string
	MessageType      string
	Visibility       string
	IsInternal       bool
	IsRead           bool
	ReadAt           *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type PublicMessage struct {
	ID               string     `json:"id"`
	ServiceRequestID string     `json:"service_request_id,omitempty"`
	SenderUserID     string     `json:"sender_user_id,omitempty"`
	RecipientUserID  string     `json:"recipient_user_id,omitempty"`
	Subject          string     `json:"subject,omitempty"`
	Body             string     `json:"body"`
	MessageType      string     `json:"message_type"`
	Visibility       string     `json:"visibility"`
	IsInternal       bool       `json:"is_internal"`
	IsRead           bool       `json:"is_read"`
	ReadAt           *time.Time `json:"read_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type CreateMessageInput struct {
	ServiceRequestID string
	SenderUserID     string
	RecipientUserID  string
	Subject          string
	Body             string
	MessageType      string
	Visibility       string
	IsInternal       bool
}

type ListMessagesFilter struct {
	ServiceRequestID       string
	SenderUserID           string
	RecipientUserID        string
	MessageType            string
	Visibility             string
	Search                 string
	IncludeInternal        bool
	ExcludeAdminVisibility bool
	UnreadOnly             bool
	Page                   int
	PageSize               int
}

func (m Message) Public() PublicMessage {
	return PublicMessage{
		ID:               m.ID,
		ServiceRequestID: m.ServiceRequestID,
		SenderUserID:     m.SenderUserID,
		RecipientUserID:  m.RecipientUserID,
		Subject:          m.Subject,
		Body:             m.Body,
		MessageType:      m.MessageType,
		Visibility:       m.Visibility,
		IsInternal:       m.IsInternal,
		IsRead:           m.IsRead,
		ReadAt:           m.ReadAt,
		CreatedAt:        m.CreatedAt,
		UpdatedAt:        m.UpdatedAt,
	}
}

func PublicMessages(items []Message) []PublicMessage {
	result := make([]PublicMessage, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateMessageInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "service_request_id", i.ServiceRequestID, 0, 100, false)
	validator.ValidateStringLength(v, "sender_user_id", i.SenderUserID, 1, 100, true)
	validator.ValidateStringLength(v, "recipient_user_id", i.RecipientUserID, 0, 100, false)
	validator.ValidateStringLength(v, "subject", i.Subject, 0, 200, false)
	validator.ValidateStringLength(v, "body", i.Body, 1, 5000, true)

	v.Check(IsValidMessageType(i.MessageType), "message_type", "message type is invalid")
	v.Check(IsValidVisibility(i.Visibility), "visibility", "visibility is invalid")

	return v.Errors()
}

func (f ListMessagesFilter) Normalize() ListMessagesFilter {
	f.ServiceRequestID = strings.TrimSpace(f.ServiceRequestID)
	f.SenderUserID = strings.TrimSpace(f.SenderUserID)
	f.RecipientUserID = strings.TrimSpace(f.RecipientUserID)
	f.MessageType = NormalizeMessageType(f.MessageType)
	f.Visibility = NormalizeVisibility(f.Visibility)
	f.Search = strings.TrimSpace(f.Search)

	if f.Page <= 0 {
		f.Page = 1
	}

	if f.PageSize <= 0 {
		f.PageSize = DefaultPageSize
	}

	if f.PageSize > MaxPageSize {
		f.PageSize = MaxPageSize
	}

	return f
}

func (f ListMessagesFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreateMessageInput) CreateMessageInput {
	input.ServiceRequestID = strings.TrimSpace(input.ServiceRequestID)
	input.SenderUserID = strings.TrimSpace(input.SenderUserID)
	input.RecipientUserID = strings.TrimSpace(input.RecipientUserID)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Body = strings.TrimSpace(input.Body)
	input.MessageType = NormalizeMessageType(input.MessageType)
	input.Visibility = NormalizeVisibility(input.Visibility)

	if input.MessageType == "" {
		input.MessageType = MessageTypeMessage
	}

	if input.Visibility == "" {
		input.Visibility = VisibilityConversation
	}

	if input.Visibility == VisibilityStaff || input.Visibility == VisibilityAdmin {
		input.IsInternal = true
	}

	if input.Visibility == VisibilityConversation {
		input.IsInternal = false
	}

	return input
}

func NormalizeMessageType(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func NormalizeVisibility(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func IsValidMessageType(value string) bool {
	switch NormalizeMessageType(value) {
	case MessageTypeMessage,
		MessageTypeNote,
		MessageTypeSystem,
		MessageTypeStatusUpdate:
		return true
	default:
		return false
	}
}

func IsValidVisibility(value string) bool {
	switch NormalizeVisibility(value) {
	case VisibilityConversation,
		VisibilityStaff,
		VisibilityAdmin:
		return true
	default:
		return false
	}
}
