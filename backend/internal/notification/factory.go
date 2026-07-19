package notification

import (
	"log"
	"os"
	"strings"
)

func NewEmailSenderFromEnv() EmailSender {
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("EMAIL_PROVIDER")))

	switch provider {
	case "", "noop", "disabled", "none":
		return NewNoopEmailSender()
	case "log":
		return NewLogEmailSender()
	case "resend":
		return NewResendEmailSender(ResendConfig{
			APIKey:    os.Getenv("RESEND_API_KEY"),
			FromEmail: os.Getenv("RESEND_FROM_EMAIL"),
			FromName:  getEnvOrDefault("RESEND_FROM_NAME", "Kivu Advisory"),
		})
	default:
		log.Printf("unknown EMAIL_PROVIDER=%q, using noop email sender", provider)
		return NewNoopEmailSender()
	}
}

func NewSMSSenderFromEnv() SMSSender {
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("SMS_PROVIDER")))

	switch provider {
	case "", "noop", "disabled", "none":
		return NewNoopSMSSender()
	case "log":
		return NewLogSMSSender()
	case "twilio":
		return NewTwilioSMSSender(TwilioConfig{
			AccountSID: os.Getenv("TWILIO_ACCOUNT_SID"),
			AuthToken:  os.Getenv("TWILIO_AUTH_TOKEN"),
			FromSender: getEnvOrDefault("TWILIO_FROM_SENDER", os.Getenv("TWILIO_FROM_PHONE")),
		})
	default:
		log.Printf("unknown SMS_PROVIDER=%q, using noop sms sender", provider)
		return NewNoopSMSSender()
	}
}

func getEnvOrDefault(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return strings.TrimSpace(fallback)
	}

	return value
}
