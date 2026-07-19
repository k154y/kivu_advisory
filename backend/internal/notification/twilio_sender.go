package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type TwilioConfig struct {
	AccountSID string
	AuthToken  string
	FromSender string
}

type TwilioSMSSender struct {
	config TwilioConfig
	client *http.Client
}

func NewTwilioSMSSender(config TwilioConfig) *TwilioSMSSender {
	return &TwilioSMSSender{
		config: config,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (s *TwilioSMSSender) SendSMS(ctx context.Context, message SMSMessage) (*SendResult, error) {
	accountSID := strings.TrimSpace(s.config.AccountSID)
	authToken := strings.TrimSpace(s.config.AuthToken)
	fromSender := strings.TrimSpace(s.config.FromSender)

	if accountSID == "" || authToken == "" || fromSender == "" {
		return &SendResult{Provider: "twilio"}, ErrSenderNotConfigured
	}

	to := strings.TrimSpace(message.To)
	if to == "" {
		return &SendResult{Provider: "twilio"}, errors.New("sms recipient is required")
	}

	body := strings.TrimSpace(message.Body)
	if body == "" {
		return &SendResult{Provider: "twilio"}, errors.New("sms body is required")
	}

	form := url.Values{}
	form.Set("From", fromSender)
	form.Set("To", to)
	form.Set("Body", body)

	endpoint := fmt.Sprintf(
		"https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json",
		url.PathEscape(accountSID),
	)

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return &SendResult{Provider: "twilio"}, err
	}

	request.SetBasicAuth(accountSID, authToken)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	response, err := s.client.Do(request)
	if err != nil {
		return &SendResult{Provider: "twilio"}, err
	}
	defer response.Body.Close()

	responseBody, _ := io.ReadAll(response.Body)

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return &SendResult{
			Provider:    "twilio",
			RawResponse: string(responseBody),
		}, fmt.Errorf("twilio sms failed with status %d", response.StatusCode)
	}

	var parsed struct {
		SID string `json:"sid"`
	}

	_ = json.Unmarshal(responseBody, &parsed)

	return &SendResult{
		Provider:          "twilio",
		ProviderMessageID: parsed.SID,
		RawResponse:       string(responseBody),
	}, nil
}
