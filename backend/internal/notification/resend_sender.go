package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const resendEmailEndpoint = "https://api.resend.com/emails"

type ResendConfig struct {
	APIKey    string
	FromEmail string
	FromName  string
}

type ResendEmailSender struct {
	config ResendConfig
	client *http.Client
}

func NewResendEmailSender(config ResendConfig) *ResendEmailSender {
	return &ResendEmailSender{
		config: config,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (s *ResendEmailSender) SendEmail(ctx context.Context, message EmailMessage) (*SendResult, error) {
	apiKey := strings.TrimSpace(s.config.APIKey)
	fromEmail := strings.TrimSpace(s.config.FromEmail)

	if apiKey == "" || fromEmail == "" {
		return &SendResult{Provider: "resend"}, ErrSenderNotConfigured
	}

	if strings.TrimSpace(message.To) == "" {
		return &SendResult{Provider: "resend"}, errors.New("email recipient is required")
	}

	payload := map[string]any{
		"from":    buildFromAddress(s.config.FromName, fromEmail),
		"to":      []string{strings.TrimSpace(message.To)},
		"subject": strings.TrimSpace(message.Subject),
		"text":    strings.TrimSpace(message.Body),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return &SendResult{Provider: "resend"}, err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, resendEmailEndpoint, bytes.NewReader(body))
	if err != nil {
		return &SendResult{Provider: "resend"}, err
	}

	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set("Content-Type", "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		return &SendResult{Provider: "resend"}, err
	}
	defer response.Body.Close()

	responseBody, _ := io.ReadAll(response.Body)

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return &SendResult{
			Provider:    "resend",
			RawResponse: string(responseBody),
		}, fmt.Errorf("resend email failed with status %d", response.StatusCode)
	}

	var parsed struct {
		ID string `json:"id"`
	}

	_ = json.Unmarshal(responseBody, &parsed)

	return &SendResult{
		Provider:          "resend",
		ProviderMessageID: parsed.ID,
		RawResponse:       string(responseBody),
	}, nil
}

func buildFromAddress(fromName string, fromEmail string) string {
	fromName = strings.TrimSpace(fromName)
	fromEmail = strings.TrimSpace(fromEmail)

	if fromName == "" {
		return fromEmail
	}

	return fmt.Sprintf("%s <%s>", fromName, fromEmail)
}
