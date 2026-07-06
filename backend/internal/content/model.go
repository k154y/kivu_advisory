package content

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	ContentTypePage    = "page"
	ContentTypeSection = "section"
	ContentTypeSetting = "setting"
	ContentTypeBanner  = "banner"
	ContentTypeFooter  = "footer"
	ContentTypeSEO     = "seo"
)

type ContentItem struct {
	ID              string
	ContentKey      string
	Title           string
	Slug            string
	ContentType     string
	Body            string
	Summary         string
	MetaTitle       string
	MetaDescription string
	ImageURL        string
	ButtonLabel     string
	ButtonURL       string
	IsActive        bool
	DisplayOrder    int
	CreatedByUserID string
	UpdatedByUserID string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type PublicContentItem struct {
	ID              string    `json:"id"`
	ContentKey      string    `json:"content_key"`
	Title           string    `json:"title,omitempty"`
	Slug            string    `json:"slug,omitempty"`
	ContentType     string    `json:"content_type"`
	Body            string    `json:"body,omitempty"`
	Summary         string    `json:"summary,omitempty"`
	MetaTitle       string    `json:"meta_title,omitempty"`
	MetaDescription string    `json:"meta_description,omitempty"`
	ImageURL        string    `json:"image_url,omitempty"`
	ButtonLabel     string    `json:"button_label,omitempty"`
	ButtonURL       string    `json:"button_url,omitempty"`
	IsActive        bool      `json:"is_active"`
	DisplayOrder    int       `json:"display_order"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type AdminContentItem struct {
	ID              string    `json:"id"`
	ContentKey      string    `json:"content_key"`
	Title           string    `json:"title,omitempty"`
	Slug            string    `json:"slug,omitempty"`
	ContentType     string    `json:"content_type"`
	Body            string    `json:"body,omitempty"`
	Summary         string    `json:"summary,omitempty"`
	MetaTitle       string    `json:"meta_title,omitempty"`
	MetaDescription string    `json:"meta_description,omitempty"`
	ImageURL        string    `json:"image_url,omitempty"`
	ButtonLabel     string    `json:"button_label,omitempty"`
	ButtonURL       string    `json:"button_url,omitempty"`
	IsActive        bool      `json:"is_active"`
	DisplayOrder    int       `json:"display_order"`
	CreatedByUserID string    `json:"created_by_user_id,omitempty"`
	UpdatedByUserID string    `json:"updated_by_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type CreateContentInput struct {
	ContentKey      string
	Title           string
	Slug            string
	ContentType     string
	Body            string
	Summary         string
	MetaTitle       string
	MetaDescription string
	ImageURL        string
	ButtonLabel     string
	ButtonURL       string
	IsActive        bool
	DisplayOrder    int
	CreatedByUserID string
	UpdatedByUserID string
}

type UpdateContentInput struct {
	ContentKey      string
	Title           string
	Slug            string
	ContentType     string
	Body            string
	Summary         string
	MetaTitle       string
	MetaDescription string
	ImageURL        string
	ButtonLabel     string
	ButtonURL       string
	IsActive        bool
	DisplayOrder    int
	UpdatedByUserID string
}

type ListContentFilter struct {
	ContentType string
	IsActive    *bool
	Search      string
	Page        int
	PageSize    int
}

func (c ContentItem) Public() PublicContentItem {
	return PublicContentItem{
		ID:              c.ID,
		ContentKey:      c.ContentKey,
		Title:           c.Title,
		Slug:            c.Slug,
		ContentType:     c.ContentType,
		Body:            c.Body,
		Summary:         c.Summary,
		MetaTitle:       c.MetaTitle,
		MetaDescription: c.MetaDescription,
		ImageURL:        c.ImageURL,
		ButtonLabel:     c.ButtonLabel,
		ButtonURL:       c.ButtonURL,
		IsActive:        c.IsActive,
		DisplayOrder:    c.DisplayOrder,
		CreatedAt:       c.CreatedAt,
		UpdatedAt:       c.UpdatedAt,
	}
}

func (c ContentItem) Admin() AdminContentItem {
	return AdminContentItem{
		ID:              c.ID,
		ContentKey:      c.ContentKey,
		Title:           c.Title,
		Slug:            c.Slug,
		ContentType:     c.ContentType,
		Body:            c.Body,
		Summary:         c.Summary,
		MetaTitle:       c.MetaTitle,
		MetaDescription: c.MetaDescription,
		ImageURL:        c.ImageURL,
		ButtonLabel:     c.ButtonLabel,
		ButtonURL:       c.ButtonURL,
		IsActive:        c.IsActive,
		DisplayOrder:    c.DisplayOrder,
		CreatedByUserID: c.CreatedByUserID,
		UpdatedByUserID: c.UpdatedByUserID,
		CreatedAt:       c.CreatedAt,
		UpdatedAt:       c.UpdatedAt,
	}
}

func PublicContentItems(items []ContentItem) []PublicContentItem {
	result := make([]PublicContentItem, 0, len(items))
	for _, item := range items {
		result = append(result, item.Public())
	}
	return result
}

func AdminContentItems(items []ContentItem) []AdminContentItem {
	result := make([]AdminContentItem, 0, len(items))
	for _, item := range items {
		result = append(result, item.Admin())
	}
	return result
}

func (i CreateContentInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateCode(v, "content_key", i.ContentKey, true)
	validator.ValidateStringLength(v, "title", i.Title, 0, 200, false)
	validator.ValidateSlug(v, "slug", i.Slug, false)
	validator.ValidateStringLength(v, "summary", i.Summary, 0, 500, false)
	validator.ValidateStringLength(v, "meta_title", i.MetaTitle, 0, 200, false)
	validator.ValidateStringLength(v, "meta_description", i.MetaDescription, 0, 300, false)
	validator.ValidateStringLength(v, "button_label", i.ButtonLabel, 0, 100, false)
	validator.ValidateNonNegativeInt(v, "display_order", i.DisplayOrder)
	v.Check(IsValidContentType(i.ContentType), "content_type", "content type is invalid")

	return v.Errors()
}

func (i UpdateContentInput) Validate() validator.Errors {
	return CreateContentInput{
		ContentKey:      i.ContentKey,
		Title:           i.Title,
		Slug:            i.Slug,
		ContentType:     i.ContentType,
		Summary:         i.Summary,
		MetaTitle:       i.MetaTitle,
		MetaDescription: i.MetaDescription,
		ButtonLabel:     i.ButtonLabel,
		DisplayOrder:    i.DisplayOrder,
	}.Validate()
}

func (f ListContentFilter) Normalize() ListContentFilter {
	f.ContentType = NormalizeContentType(f.ContentType)
	f.Search = strings.TrimSpace(f.Search)

	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.PageSize > 100 {
		f.PageSize = 100
	}

	return f
}

func (f ListContentFilter) Offset() int {
	f = f.Normalize()
	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreateContentInput) CreateContentInput {
	input.ContentKey = validator.NormalizeCode(input.ContentKey)
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = validator.NormalizeSlug(input.Slug)
	input.ContentType = NormalizeContentType(input.ContentType)
	input.Body = strings.TrimSpace(input.Body)
	input.Summary = strings.TrimSpace(input.Summary)
	input.MetaTitle = strings.TrimSpace(input.MetaTitle)
	input.MetaDescription = strings.TrimSpace(input.MetaDescription)
	input.ImageURL = strings.TrimSpace(input.ImageURL)
	input.ButtonLabel = strings.TrimSpace(input.ButtonLabel)
	input.ButtonURL = strings.TrimSpace(input.ButtonURL)
	input.CreatedByUserID = strings.TrimSpace(input.CreatedByUserID)
	input.UpdatedByUserID = strings.TrimSpace(input.UpdatedByUserID)

	if input.ContentType == "" {
		input.ContentType = ContentTypeSection
	}

	return input
}

func NormalizeUpdateInput(input UpdateContentInput) UpdateContentInput {
	input.ContentKey = validator.NormalizeCode(input.ContentKey)
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = validator.NormalizeSlug(input.Slug)
	input.ContentType = NormalizeContentType(input.ContentType)
	input.Body = strings.TrimSpace(input.Body)
	input.Summary = strings.TrimSpace(input.Summary)
	input.MetaTitle = strings.TrimSpace(input.MetaTitle)
	input.MetaDescription = strings.TrimSpace(input.MetaDescription)
	input.ImageURL = strings.TrimSpace(input.ImageURL)
	input.ButtonLabel = strings.TrimSpace(input.ButtonLabel)
	input.ButtonURL = strings.TrimSpace(input.ButtonURL)
	input.UpdatedByUserID = strings.TrimSpace(input.UpdatedByUserID)

	if input.ContentType == "" {
		input.ContentType = ContentTypeSection
	}

	return input
}

func NormalizeContentType(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func IsValidContentType(value string) bool {
	switch NormalizeContentType(value) {
	case ContentTypePage, ContentTypeSection, ContentTypeSetting, ContentTypeBanner, ContentTypeFooter, ContentTypeSEO:
		return true
	default:
		return false
	}
}
