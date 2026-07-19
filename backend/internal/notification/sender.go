package notification

import (
	"context"
	"errors"
	"log"
	"strconv"
	"strings"
	"time"
)

var ErrSenderNotConfigured = errors.New("notification sender is not configured")

type SendResult struct {
	Provider          string
	ProviderMessageID string
	RawResponse       string
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
	return &SendResult{Provider: "noop"}, ErrSenderNotConfigured
}

type NoopSMSSender struct{}

func NewNoopSMSSender() *NoopSMSSender {
	return &NoopSMSSender{}
}

func (s *NoopSMSSender) SendSMS(ctx context.Context, message SMSMessage) (*SendResult, error) {
	return &SendResult{Provider: "noop"}, ErrSenderNotConfigured
}

type LogEmailSender struct{}

func NewLogEmailSender() *LogEmailSender {
	return &LogEmailSender{}
}

func (s *LogEmailSender) SendEmail(ctx context.Context, message EmailMessage) (*SendResult, error) {
	_ = ctx

	log.Printf(
		"[notification:email] to=%s subject=%q body=%q",
		message.To,
		message.Subject,
		shortLogText(message.Body),
	)

	return &SendResult{
		Provider:          "log",
		ProviderMessageID: "log_email_" + strconv.FormatInt(time.Now().UnixNano(), 10),
	}, nil
}

type LogSMSSender struct{}

func NewLogSMSSender() *LogSMSSender {
	return &LogSMSSender{}
}

func (s *LogSMSSender) SendSMS(ctx context.Context, message SMSMessage) (*SendResult, error) {
	_ = ctx

	log.Printf(
		"[notification:sms] to=%s body=%q",
		message.To,
		shortLogText(message.Body),
	)

	return &SendResult{
		Provider:          "log",
		ProviderMessageID: "log_sms_" + strconv.FormatInt(time.Now().UnixNano(), 10),
	}, nil
}

func shortLogText(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 180 {
		return value
	}

	return value[:180] + "..."
}
