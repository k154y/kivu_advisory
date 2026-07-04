package servicecatalog

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

type ServiceItem struct {
	ID                string
	Title             string
	Slug              string
	ShortDescription  string
	Description       string
	Category          string
	PriceLabel        string
	ShowPriceLabel    bool
	EstimatedDuration string
	IsFeatured        bool
	IsActive          bool
	DisplayOrder      int
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type PublicServiceItem struct {
	ID                string    `json:"id"`
	Title             string    `json:"title"`
	Slug              string    `json:"slug"`
	ShortDescription  string    `json:"short_description,omitempty"`
	Description       string    `json:"description,omitempty"`
	Category          string    `json:"category,omitempty"`
	PriceLabel        string    `json:"price_label,omitempty"`
	ShowPriceLabel    bool      `json:"show_price_label"`
	EstimatedDuration string    `json:"estimated_duration,omitempty"`
	IsFeatured        bool      `json:"is_featured"`
	IsActive          bool      `json:"is_active"`
	DisplayOrder      int       `json:"display_order"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type CreateServiceInput struct {
	Title             string
	Slug              string
	ShortDescription  string
	Description       string
	Category          string
	PriceLabel        string
	ShowPriceLabel    bool
	EstimatedDuration string
	IsFeatured        bool
	IsActive          bool
	DisplayOrder      int
}

type UpdateServiceInput struct {
	Title             string
	Slug              string
	ShortDescription  string
	Description       string
	Category          string
	PriceLabel        string
	ShowPriceLabel    bool
	EstimatedDuration string
	IsFeatured        bool
	IsActive          bool
	DisplayOrder      int
}

type ListServicesFilter struct {
	Category   string
	IsActive   *bool
	IsFeatured *bool
	Search     string
	Page       int
	PageSize   int
}

func (s ServiceItem) Public() PublicServiceItem {
	priceLabel := ""

	if s.ShowPriceLabel {
		priceLabel = s.PriceLabel
	}

	return PublicServiceItem{
		ID:                s.ID,
		Title:             s.Title,
		Slug:              s.Slug,
		ShortDescription:  s.ShortDescription,
		Description:       s.Description,
		Category:          s.Category,
		PriceLabel:        priceLabel,
		ShowPriceLabel:    s.ShowPriceLabel,
		EstimatedDuration: s.EstimatedDuration,
		IsFeatured:        s.IsFeatured,
		IsActive:          s.IsActive,
		DisplayOrder:      s.DisplayOrder,
		CreatedAt:         s.CreatedAt,
		UpdatedAt:         s.UpdatedAt,
	}
}

func PublicServiceItems(items []ServiceItem) []PublicServiceItem {
	result := make([]PublicServiceItem, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateServiceInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "title", i.Title, 2, 150, true)
	validator.ValidateSlug(v, "slug", i.Slug, true)
	validator.ValidateStringLength(v, "short_description", i.ShortDescription, 0, 300, false)
	validator.ValidateStringLength(v, "category", i.Category, 0, 100, false)
	validator.ValidateStringLength(v, "price_label", i.PriceLabel, 0, 100, false)
	validator.ValidateStringLength(v, "estimated_duration", i.EstimatedDuration, 0, 100, false)
	validator.ValidateNonNegativeInt(v, "display_order", i.DisplayOrder)

	if i.ShowPriceLabel {
		validator.RequiredField(v, "price_label", i.PriceLabel)
	}

	return v.Errors()
}

func (i UpdateServiceInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "title", i.Title, 2, 150, true)
	validator.ValidateSlug(v, "slug", i.Slug, true)
	validator.ValidateStringLength(v, "short_description", i.ShortDescription, 0, 300, false)
	validator.ValidateStringLength(v, "category", i.Category, 0, 100, false)
	validator.ValidateStringLength(v, "price_label", i.PriceLabel, 0, 100, false)
	validator.ValidateStringLength(v, "estimated_duration", i.EstimatedDuration, 0, 100, false)
	validator.ValidateNonNegativeInt(v, "display_order", i.DisplayOrder)

	if i.ShowPriceLabel {
		validator.RequiredField(v, "price_label", i.PriceLabel)
	}

	return v.Errors()
}

func (f ListServicesFilter) Normalize() ListServicesFilter {
	f.Category = strings.TrimSpace(f.Category)
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

func (f ListServicesFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreateServiceInput) CreateServiceInput {
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = validator.NormalizeSlug(input.Slug)
	input.ShortDescription = strings.TrimSpace(input.ShortDescription)
	input.Description = strings.TrimSpace(input.Description)
	input.Category = strings.TrimSpace(input.Category)
	input.PriceLabel = strings.TrimSpace(input.PriceLabel)
	input.EstimatedDuration = strings.TrimSpace(input.EstimatedDuration)

	if input.Slug == "" {
		input.Slug = validator.NormalizeSlug(input.Title)
	}

	return input
}

func NormalizeUpdateInput(input UpdateServiceInput) UpdateServiceInput {
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = validator.NormalizeSlug(input.Slug)
	input.ShortDescription = strings.TrimSpace(input.ShortDescription)
	input.Description = strings.TrimSpace(input.Description)
	input.Category = strings.TrimSpace(input.Category)
	input.PriceLabel = strings.TrimSpace(input.PriceLabel)
	input.EstimatedDuration = strings.TrimSpace(input.EstimatedDuration)

	if input.Slug == "" {
		input.Slug = validator.NormalizeSlug(input.Title)
	}

	return input
}