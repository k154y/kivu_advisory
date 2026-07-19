package notification

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	TypeGeneral        = "general"
	TypeBlog           = "blog"
	TypeServiceRequest = "service_request"
	TypeDocument       = "document"
	TypeMessage        = "message"
	TypeConsultation   = "consultation"
	TypeAssignment     = "assignment"
	TypeSystem         = "system"

	DefaultPageSize = 20
	MaxPageSize     = 100
)

type Notification struct {
	ID               string
	UserID           string
	Title            string
	Body             string
	NotificationType string
	EntityType       string
	EntityID         string
	ActionURL        string
	IsRead           bool
	ReadAt           *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type PublicNotification struct {
	ID               string     `json:"id"`
	UserID           string     `json:"user_id"`
	Title            string     `json:"title"`
	Body             string     `json:"body"`
	NotificationType string     `json:"notification_type"`
	EntityType       string     `json:"entity_type,omitempty"`
	EntityID         string     `json:"entity_id,omitempty"`
	ActionURL        string     `json:"action_url,omitempty"`
	IsRead           bool       `json:"is_read"`
	ReadAt           *time.Time `json:"read_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type CreateNotificationInput struct {
	UserID           string
	Title            string
	Body             string
	NotificationType string
	EntityType       string
	EntityID         string
	ActionURL        string
}

type ListNotificationsFilter struct {
	UserID           string
	NotificationType string
	IsRead           *bool
	Page             int
	PageSize         int
}

func (n Notification) Public() PublicNotification {
	return PublicNotification{
		ID:               n.ID,
		UserID:           n.UserID,
		Title:            n.Title,
		Body:             n.Body,
		NotificationType: n.NotificationType,
		EntityType:       n.EntityType,
		EntityID:         n.EntityID,
		ActionURL:        n.ActionURL,
		IsRead:           n.IsRead,
		ReadAt:           n.ReadAt,
		CreatedAt:        n.CreatedAt,
		UpdatedAt:        n.UpdatedAt,
	}
}

func PublicNotifications(items []Notification) []PublicNotification {
	result := make([]PublicNotification, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateNotificationInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "user_id", i.UserID, 1, 100, true)
	validator.ValidateStringLength(v, "title", i.Title, 2, 200, true)
	validator.ValidateStringLength(v, "body", i.Body, 2, 5000, true)
	validator.ValidateStringLength(v, "entity_type", i.EntityType, 0, 50, false)
	validator.ValidateStringLength(v, "entity_id", i.EntityID, 0, 100, false)
	validator.ValidateStringLength(v, "action_url", i.ActionURL, 0, 500, false)

	v.Check(IsValidType(i.NotificationType), "notification_type", "notification type is invalid")

	return v.Errors()
}

func (f ListNotificationsFilter) Normalize() ListNotificationsFilter {
	f.UserID = strings.TrimSpace(f.UserID)
	f.NotificationType = NormalizeType(f.NotificationType)

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

func (f ListNotificationsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreateNotificationInput) CreateNotificationInput {
	input.UserID = strings.TrimSpace(input.UserID)
	input.Title = strings.TrimSpace(input.Title)
	input.Body = strings.TrimSpace(input.Body)
	input.NotificationType = NormalizeType(input.NotificationType)
	input.EntityType = strings.TrimSpace(strings.ToLower(input.EntityType))
	input.EntityID = strings.TrimSpace(input.EntityID)
	input.ActionURL = strings.TrimSpace(input.ActionURL)

	if input.NotificationType == "" {
		input.NotificationType = TypeGeneral
	}

	return input
}

func NormalizeType(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func IsValidType(value string) bool {
	switch NormalizeType(value) {
	case TypeGeneral,
		TypeBlog,
		TypeServiceRequest,
		TypeDocument,
		TypeMessage,
		TypeConsultation,
		TypeAssignment,
		TypeSystem:
		return true
	default:
		return false
	}
}
