package notification

import (
	"context"
	"errors"
)

var ErrSenderNotConfigured = errors.New("notification sender is not configured")

type SendResult struct {
	Provider          string
	ProviderMessageID string
}

type EmailMessage struct {
	To      string
	Subject string
	Body    string
}

type SMSMessage struct {
	To   string
	Body string
}

type EmailSender interface {
	SendEmail(ctx context.Context, message EmailMessage) (*SendResult, error)
}

type SMSSender interface {
	SendSMS(ctx context.Context, message SMSMessage) (*SendResult, error)
}

type NoopEmailSender struct{}

func NewNoopEmailSender() *NoopEmailSender {
	return &NoopEmailSender{}
}

func (s *NoopEmailSender) SendEmail(ctx context.Context, message EmailMessage) (*SendResult, error) {
	return &SendResult{
		Provider: "noop",
	}, ErrSenderNotConfigured
}

type NoopSMSSender struct{}

func NewNoopSMSSender() *NoopSMSSender {
	return &NoopSMSSender{}
}

func (s *NoopSMSSender) SendSMS(ctx context.Context, message SMSMessage) (*SendResult, error) {
	return &SendResult{
		Provider: "noop",
	}, ErrSenderNotConfigured
}
