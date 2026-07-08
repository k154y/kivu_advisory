package notification

import (
	"context"
	"fmt"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type BlogPublishedNotificationInput struct {
	BlogID      string
	Title       string
	Slug        string
	Excerpt     string
	ActionURL   string
	NotifySMS   bool
	CustomBody  string
}

func (s *Service) NotifyClientsAboutBlogPublished(ctx context.Context, input BlogPublishedNotificationInput) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("notification service is not initialized")
	}

	if s.recipientRepo == nil {
		return apperrors.Internal("notification recipient repository is not initialized")
	}

	input = normalizeBlogPublishedNotificationInput(input)

	if input.BlogID == "" {
		return apperrors.InvalidInput("blog id is required")
	}

	if input.Title == "" {
		return apperrors.InvalidInput("blog title is required")
	}

	recipients, err := s.recipientRepo.ListActiveClients(ctx)
	if err != nil {
		return err
	}

	if len(recipients) == 0 {
		return nil
	}

	for _, recipient := range recipients {
		channels := []string{ChannelInApp, ChannelEmail}
		if input.NotifySMS {
			channels = append(channels, ChannelSMS)
		}

		body := input.CustomBody
		if body == "" {
			body = fmt.Sprintf("A new advisory article is now available: %s.", input.Title)
		}

		emailBody := body
		if input.Excerpt != "" {
			emailBody = body + "\n\n" + input.Excerpt
		}

		if input.ActionURL != "" {
			emailBody = emailBody + "\n\nRead more: " + input.ActionURL
		}

		smsBody := body
		if len(smsBody) > 160 {
			smsBody = smsBody[:157] + "..."
		}

		if _, err := s.NotifyUser(ctx, NotifyUserInput{
			UserID:           recipient.UserID,
			UserEmail:        recipient.Email,
			UserPhone:        recipient.Phone,
			Title:            "New article published",
			Body:             body,
			NotificationType: TypeBlog,
			EntityType:       "blog",
			EntityID:         input.BlogID,
			ActionURL:        input.ActionURL,
			Channels:         channels,
			EmailSubject:     "New Kivu Advisory article: " + input.Title,
			EmailBody:        emailBody,
			SMSBody:          smsBody,
		}); err != nil {
			return err
		}
	}

	return nil
}

func normalizeBlogPublishedNotificationInput(input BlogPublishedNotificationInput) BlogPublishedNotificationInput {
	input.BlogID = strings.TrimSpace(input.BlogID)
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = strings.TrimSpace(input.Slug)
	input.Excerpt = strings.TrimSpace(input.Excerpt)
	input.ActionURL = strings.TrimSpace(input.ActionURL)
	input.CustomBody = strings.TrimSpace(input.CustomBody)

	if input.ActionURL == "" && input.Slug != "" {
		input.ActionURL = "/blog/" + input.Slug
	}

	return input
}