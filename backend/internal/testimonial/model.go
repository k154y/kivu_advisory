package testimonial

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
	MinRating       = 1
	MaxRating       = 5
	DefaultRating   = 5
)

type Testimonial struct {
	ID              string
	ClientName      string
	ClientRole      string
	CompanyName     string
	Content         string
	Rating          int
	PhotoURL        string
	IsFeatured      bool
	DisplayOrder    int
	IsActive        bool
	CreatedByUserID string
	UpdatedByUserID string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type PublicTestimonial struct {
	ID           string    `json:"id"`
	ClientName   string    `json:"client_name"`
	ClientRole   string    `json:"client_role,omitempty"`
	CompanyName  string    `json:"company_name,omitempty"`
	Content      string    `json:"content"`
	Rating       int       `json:"rating"`
	PhotoURL     string    `json:"photo_url,omitempty"`
	IsFeatured   bool      `json:"is_featured"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
}

type AdminTestimonial struct {
	ID              string    `json:"id"`
	ClientName      string    `json:"client_name"`
	ClientRole      string    `json:"client_role,omitempty"`
	CompanyName     string    `json:"company_name,omitempty"`
	Content         string    `json:"content"`
	Rating          int       `json:"rating"`
	PhotoURL        string    `json:"photo_url,omitempty"`
	IsFeatured      bool      `json:"is_featured"`
	DisplayOrder    int       `json:"display_order"`
	IsActive        bool      `json:"is_active"`
	CreatedByUserID string    `json:"created_by_user_id,omitempty"`
	UpdatedByUserID string    `json:"updated_by_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type CreateTestimonialInput struct {
	ClientName      string
	ClientRole      string
	CompanyName     string
	Content         string
	Rating          int
	PhotoURL        string
	IsFeatured      bool
	DisplayOrder    int
	IsActive        bool
	CreatedByUserID string
}

type UpdateTestimonialInput struct {
	ClientName      string
	ClientRole      string
	CompanyName     string
	Content         string
	Rating          int
	PhotoURL        string
	IsFeatured      bool
	DisplayOrder    int
	IsActive        bool
	UpdatedByUserID string
}

type UpdateStatusInput struct {
	IsActive   bool `json:"is_active"`
	IsFeatured bool `json:"is_featured"`
}

type ListTestimonialsFilter struct {
	Search     string
	IsFeatured *bool
	IsActive   *bool
	Page       int
	PageSize   int
}

func (t Testimonial) Public() PublicTestimonial {
	return PublicTestimonial{
		ID:           t.ID,
		ClientName:   t.ClientName,
		ClientRole:   t.ClientRole,
		CompanyName:  t.CompanyName,
		Content:      t.Content,
		Rating:       t.Rating,
		PhotoURL:     t.PhotoURL,
		IsFeatured:   t.IsFeatured,
		DisplayOrder: t.DisplayOrder,
		CreatedAt:    t.CreatedAt,
	}
}

func (t Testimonial) Admin() AdminTestimonial {
	return AdminTestimonial{
		ID:              t.ID,
		ClientName:      t.ClientName,
		ClientRole:      t.ClientRole,
		CompanyName:     t.CompanyName,
		Content:         t.Content,
		Rating:          t.Rating,
		PhotoURL:        t.PhotoURL,
		IsFeatured:      t.IsFeatured,
		DisplayOrder:    t.DisplayOrder,
		IsActive:        t.IsActive,
		CreatedByUserID: t.CreatedByUserID,
		UpdatedByUserID: t.UpdatedByUserID,
		CreatedAt:       t.CreatedAt,
		UpdatedAt:       t.UpdatedAt,
	}
}

func PublicTestimonials(items []Testimonial) []PublicTestimonial {
	result := make([]PublicTestimonial, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func AdminTestimonials(items []Testimonial) []AdminTestimonial {
	result := make([]AdminTestimonial, 0, len(items))

	for _, item := range items {
		result = append(result, item.Admin())
	}

	return result
}

func (i CreateTestimonialInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "client_name", i.ClientName, 2, 150, true)
	validator.ValidateStringLength(v, "client_role", i.ClientRole, 0, 150, false)
	validator.ValidateStringLength(v, "company_name", i.CompanyName, 0, 150, false)
	validator.ValidateStringLength(v, "content", i.Content, 10, 2000, true)
	validator.ValidateStringLength(v, "photo_url", i.PhotoURL, 0, 1000, false)

	v.Check(i.Rating >= MinRating && i.Rating <= MaxRating, "rating", "rating must be between 1 and 5")
	v.Check(i.DisplayOrder >= 0, "display_order", "display order must be zero or greater")

	return v.Errors()
}

func (i UpdateTestimonialInput) Validate() validator.Errors {
	return CreateTestimonialInput{
		ClientName:   i.ClientName,
		ClientRole:   i.ClientRole,
		CompanyName:  i.CompanyName,
		Content:      i.Content,
		Rating:       i.Rating,
		PhotoURL:     i.PhotoURL,
		DisplayOrder: i.DisplayOrder,
	}.Validate()
}

func NormalizeCreateInput(input CreateTestimonialInput) CreateTestimonialInput {
	input.ClientName = strings.TrimSpace(input.ClientName)
	input.ClientRole = strings.TrimSpace(input.ClientRole)
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.Content = strings.TrimSpace(input.Content)
	input.PhotoURL = strings.TrimSpace(input.PhotoURL)
	input.CreatedByUserID = strings.TrimSpace(input.CreatedByUserID)

	if input.Rating <= 0 {
		input.Rating = DefaultRating
	}

	return input
}

func NormalizeUpdateInput(input UpdateTestimonialInput) UpdateTestimonialInput {
	input.ClientName = strings.TrimSpace(input.ClientName)
	input.ClientRole = strings.TrimSpace(input.ClientRole)
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.Content = strings.TrimSpace(input.Content)
	input.PhotoURL = strings.TrimSpace(input.PhotoURL)
	input.UpdatedByUserID = strings.TrimSpace(input.UpdatedByUserID)

	if input.Rating <= 0 {
		input.Rating = DefaultRating
	}

	return input
}

func (f ListTestimonialsFilter) Normalize() ListTestimonialsFilter {
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

func (f ListTestimonialsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}
