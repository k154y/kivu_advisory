package notification

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	ChannelInApp = "in_app"
	ChannelEmail = "email"
	ChannelSMS   = "sms"

	DeliveryStatusPending = "pending"
	DeliveryStatusSent    = "sent"
	DeliveryStatusFailed  = "failed"
	DeliveryStatusSkipped = "skipped"
)

type Delivery struct {
	ID                string
	NotificationID    string
	UserID            string
	Channel           string
	Recipient         string
	Subject           string
	Message           string
	Provider          string
	ProviderMessageID string
	Status            string
	AttemptCount      int
	ErrorMessage      string
	SentAt            *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type PublicDelivery struct {
	ID                string     `json:"id"`
	NotificationID    string     `json:"notification_id"`
	UserID            string     `json:"user_id"`
	Channel           string     `json:"channel"`
	Recipient         string     `json:"recipient"`
	Subject           string     `json:"subject,omitempty"`
	Message           string     `json:"message"`
	Provider          string     `json:"provider,omitempty"`
	ProviderMessageID string     `json:"provider_message_id,omitempty"`
	Status            string     `json:"status"`
	AttemptCount      int        `json:"attempt_count"`
	ErrorMessage      string     `json:"error_message,omitempty"`
	SentAt            *time.Time `json:"sent_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type CreateDeliveryInput struct {
	NotificationID string
	UserID         string
	Channel        string
	Recipient      string
	Subject        string
	Message        string
	Provider       string
}

type MarkDeliverySentInput struct {
	Provider          string
	ProviderMessageID string
}

type MarkDeliveryFailedInput struct {
	Provider     string
	ErrorMessage string
}

type ListDeliveriesFilter struct {
	NotificationID string
	UserID         string
	Channel        string
	Status         string
	Page           int
	PageSize       int
}

func (d Delivery) Public() PublicDelivery {
	return PublicDelivery{
		ID:                d.ID,
		NotificationID:    d.NotificationID,
		UserID:            d.UserID,
		Channel:           d.Channel,
		Recipient:         d.Recipient,
		Subject:           d.Subject,
		Message:           d.Message,
		Provider:          d.Provider,
		ProviderMessageID: d.ProviderMessageID,
		Status:            d.Status,
		AttemptCount:      d.AttemptCount,
		ErrorMessage:      d.ErrorMessage,
		SentAt:            d.SentAt,
		CreatedAt:         d.CreatedAt,
		UpdatedAt:         d.UpdatedAt,
	}
}

func PublicDeliveries(items []Delivery) []PublicDelivery {
	result := make([]PublicDelivery, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func NormalizeCreateDeliveryInput(input CreateDeliveryInput) CreateDeliveryInput {
	input.NotificationID = strings.TrimSpace(input.NotificationID)
	input.UserID = strings.TrimSpace(input.UserID)
	input.Channel = NormalizeChannel(input.Channel)
	input.Recipient = strings.TrimSpace(input.Recipient)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Message = strings.TrimSpace(input.Message)
	input.Provider = strings.TrimSpace(strings.ToLower(input.Provider))

	if input.Channel == "" {
		input.Channel = ChannelInApp
	}

	return input
}

func (i CreateDeliveryInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "notification_id", i.NotificationID, 1, 100, true)
	validator.ValidateStringLength(v, "user_id", i.UserID, 1, 100, true)
	validator.ValidateStringLength(v, "recipient", i.Recipient, 1, 255, true)
	validator.ValidateStringLength(v, "subject", i.Subject, 0, 255, false)
	validator.ValidateStringLength(v, "message", i.Message, 2, 5000, true)
	validator.ValidateStringLength(v, "provider", i.Provider, 0, 100, false)

	v.Check(IsValidChannel(i.Channel), "channel", "delivery channel is invalid")

	return v.Errors()
}

func (f ListDeliveriesFilter) Normalize() ListDeliveriesFilter {
	f.NotificationID = strings.TrimSpace(f.NotificationID)
	f.UserID = strings.TrimSpace(f.UserID)
	f.Channel = NormalizeChannel(f.Channel)
	f.Status = NormalizeDeliveryStatus(f.Status)

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

func (f ListDeliveriesFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeChannel(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func IsValidChannel(value string) bool {
	switch NormalizeChannel(value) {
	case ChannelInApp, ChannelEmail, ChannelSMS:
		return true
	default:
		return false
	}
}

func NormalizeDeliveryStatus(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func IsValidDeliveryStatus(value string) bool {
	switch NormalizeDeliveryStatus(value) {
	case DeliveryStatusPending,
		DeliveryStatusSent,
		DeliveryStatusFailed,
		DeliveryStatusSkipped:
		return true
	default:
		return false
	}
}
