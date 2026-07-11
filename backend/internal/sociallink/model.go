package sociallink

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

type SocialLink struct {
	ID                string
	Platform          string
	Label             string
	URL               string
	IconName          string
	DisplayOrder      int
	IsActive          bool
	ShowInFooter      bool
	ShowInContactPage bool
	CreatedByUserID   string
	UpdatedByUserID   string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type PublicSocialLink struct {
	ID                string    `json:"id"`
	Platform          string    `json:"platform"`
	Label             string    `json:"label"`
	URL               string    `json:"url"`
	IconName          string    `json:"icon_name,omitempty"`
	DisplayOrder      int       `json:"display_order"`
	ShowInFooter      bool      `json:"show_in_footer"`
	ShowInContactPage bool      `json:"show_in_contact_page"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type AdminSocialLink struct {
	ID                string    `json:"id"`
	Platform          string    `json:"platform"`
	Label             string    `json:"label"`
	URL               string    `json:"url"`
	IconName          string    `json:"icon_name,omitempty"`
	DisplayOrder      int       `json:"display_order"`
	IsActive          bool      `json:"is_active"`
	ShowInFooter      bool      `json:"show_in_footer"`
	ShowInContactPage bool      `json:"show_in_contact_page"`
	CreatedByUserID   string    `json:"created_by_user_id,omitempty"`
	UpdatedByUserID   string    `json:"updated_by_user_id,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type CreateSocialLinkInput struct {
	Platform          string
	Label             string
	URL               string
	IconName          string
	DisplayOrder      int
	IsActive          bool
	ShowInFooter      bool
	ShowInContactPage bool
	CreatedByUserID   string
}

type UpdateSocialLinkInput struct {
	Platform          string
	Label             string
	URL               string
	IconName          string
	DisplayOrder      int
	IsActive          bool
	ShowInFooter      bool
	ShowInContactPage bool
	UpdatedByUserID   string
}

type UpdateStatusInput struct {
	IsActive          bool `json:"is_active"`
	ShowInFooter      bool `json:"show_in_footer"`
	ShowInContactPage bool `json:"show_in_contact_page"`
}

type ListSocialLinksFilter struct {
	Search            string
	IsActive          *bool
	ShowInFooter      *bool
	ShowInContactPage *bool
	Page              int
	PageSize          int
}

func (s SocialLink) Public() PublicSocialLink {
	return PublicSocialLink{
		ID:                s.ID,
		Platform:          s.Platform,
		Label:             s.Label,
		URL:               s.URL,
		IconName:          s.IconName,
		DisplayOrder:      s.DisplayOrder,
		ShowInFooter:      s.ShowInFooter,
		ShowInContactPage: s.ShowInContactPage,
		CreatedAt:         s.CreatedAt,
		UpdatedAt:         s.UpdatedAt,
	}
}

func (s SocialLink) Admin() AdminSocialLink {
	return AdminSocialLink{
		ID:                s.ID,
		Platform:          s.Platform,
		Label:             s.Label,
		URL:               s.URL,
		IconName:          s.IconName,
		DisplayOrder:      s.DisplayOrder,
		IsActive:          s.IsActive,
		ShowInFooter:      s.ShowInFooter,
		ShowInContactPage: s.ShowInContactPage,
		CreatedByUserID:   s.CreatedByUserID,
		UpdatedByUserID:   s.UpdatedByUserID,
		CreatedAt:         s.CreatedAt,
		UpdatedAt:         s.UpdatedAt,
	}
}

func PublicSocialLinks(items []SocialLink) []PublicSocialLink {
	result := make([]PublicSocialLink, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func AdminSocialLinks(items []SocialLink) []AdminSocialLink {
	result := make([]AdminSocialLink, 0, len(items))

	for _, item := range items {
		result = append(result, item.Admin())
	}

	return result
}

func (i CreateSocialLinkInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "platform", i.Platform, 2, 80, true)
	validator.ValidateStringLength(v, "label", i.Label, 2, 120, true)
	validator.ValidateStringLength(v, "url", i.URL, 5, 1000, true)
	validator.ValidateStringLength(v, "icon_name", i.IconName, 0, 80, false)

	v.Check(IsValidURL(i.URL), "url", "url must start with http://, https://, mailto:, tel:, or whatsapp:")
	v.Check(i.DisplayOrder >= 0, "display_order", "display order must be zero or greater")

	return v.Errors()
}

func (i UpdateSocialLinkInput) Validate() validator.Errors {
	return CreateSocialLinkInput{
		Platform:     i.Platform,
		Label:        i.Label,
		URL:          i.URL,
		IconName:     i.IconName,
		DisplayOrder: i.DisplayOrder,
	}.Validate()
}

func NormalizeCreateInput(input CreateSocialLinkInput) CreateSocialLinkInput {
	input.Platform = NormalizePlatform(input.Platform)
	input.Label = strings.TrimSpace(input.Label)
	input.URL = strings.TrimSpace(input.URL)
	input.IconName = strings.TrimSpace(strings.ToLower(input.IconName))
	input.CreatedByUserID = strings.TrimSpace(input.CreatedByUserID)

	if input.IconName == "" {
		input.IconName = input.Platform
	}

	return input
}

func NormalizeUpdateInput(input UpdateSocialLinkInput) UpdateSocialLinkInput {
	input.Platform = NormalizePlatform(input.Platform)
	input.Label = strings.TrimSpace(input.Label)
	input.URL = strings.TrimSpace(input.URL)
	input.IconName = strings.TrimSpace(strings.ToLower(input.IconName))
	input.UpdatedByUserID = strings.TrimSpace(input.UpdatedByUserID)

	if input.IconName == "" {
		input.IconName = input.Platform
	}

	return input
}

func NormalizePlatform(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.ReplaceAll(value, " ", "_")
	value = strings.ReplaceAll(value, "-", "_")

	return value
}

func IsValidURL(value string) bool {
	value = strings.TrimSpace(strings.ToLower(value))

	return strings.HasPrefix(value, "http://") ||
		strings.HasPrefix(value, "https://") ||
		strings.HasPrefix(value, "mailto:") ||
		strings.HasPrefix(value, "tel:") ||
		strings.HasPrefix(value, "whatsapp:")
}

func (f ListSocialLinksFilter) Normalize() ListSocialLinksFilter {
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

func (f ListSocialLinksFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}