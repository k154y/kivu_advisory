package blog

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	StatusDraft     = "draft"
	StatusPublished = "published"
	StatusArchived  = "archived"
)

type Post struct {
	ID               string
	Title            string
	Slug             string
	Excerpt          string
	Body             string
	Category         string
	Tags             []string
	FeaturedImageURL string
	Status           string
	IsFeatured       bool
	MetaTitle        string
	MetaDescription  string
	AuthorUserID     string
	PublishedAt      *time.Time
	ViewCount        int
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type PublicPost struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Slug             string     `json:"slug"`
	Excerpt          string     `json:"excerpt,omitempty"`
	Body             string     `json:"body"`
	Category         string     `json:"category,omitempty"`
	Tags             []string   `json:"tags"`
	FeaturedImageURL string     `json:"featured_image_url,omitempty"`
	Status           string     `json:"status"`
	IsFeatured       bool       `json:"is_featured"`
	MetaTitle        string     `json:"meta_title,omitempty"`
	MetaDescription  string     `json:"meta_description,omitempty"`
	PublishedAt      *time.Time `json:"published_at,omitempty"`
	ViewCount        int        `json:"view_count"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type AdminPost struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Slug             string     `json:"slug"`
	Excerpt          string     `json:"excerpt,omitempty"`
	Body             string     `json:"body"`
	Category         string     `json:"category,omitempty"`
	Tags             []string   `json:"tags"`
	FeaturedImageURL string     `json:"featured_image_url,omitempty"`
	Status           string     `json:"status"`
	IsFeatured       bool       `json:"is_featured"`
	MetaTitle        string     `json:"meta_title,omitempty"`
	MetaDescription  string     `json:"meta_description,omitempty"`
	AuthorUserID     string     `json:"author_user_id,omitempty"`
	PublishedAt      *time.Time `json:"published_at,omitempty"`
	ViewCount        int        `json:"view_count"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type CreatePostInput struct {
	Title            string
	Slug             string
	Excerpt          string
	Body             string
	Category         string
	Tags             []string
	FeaturedImageURL string
	Status           string
	IsFeatured       bool
	MetaTitle        string
	MetaDescription  string
	AuthorUserID     string
}

type UpdatePostInput struct {
	Title            string
	Slug             string
	Excerpt          string
	Body             string
	Category         string
	Tags             []string
	FeaturedImageURL string
	Status           string
	IsFeatured       bool
	MetaTitle        string
	MetaDescription  string
	AuthorUserID     string
}

type ListPostsFilter struct {
	Status     string
	Category   string
	IsFeatured *bool
	Search     string
	Page       int
	PageSize   int
}

func (p Post) Public() PublicPost {
	return PublicPost{
		ID:               p.ID,
		Title:            p.Title,
		Slug:             p.Slug,
		Excerpt:          p.Excerpt,
		Body:             p.Body,
		Category:         p.Category,
		Tags:             append([]string(nil), p.Tags...),
		FeaturedImageURL: p.FeaturedImageURL,
		Status:           p.Status,
		IsFeatured:       p.IsFeatured,
		MetaTitle:        p.MetaTitle,
		MetaDescription:  p.MetaDescription,
		PublishedAt:      p.PublishedAt,
		ViewCount:        p.ViewCount,
		CreatedAt:        p.CreatedAt,
		UpdatedAt:        p.UpdatedAt,
	}
}

func (p Post) Admin() AdminPost {
	return AdminPost{
		ID:               p.ID,
		Title:            p.Title,
		Slug:             p.Slug,
		Excerpt:          p.Excerpt,
		Body:             p.Body,
		Category:         p.Category,
		Tags:             append([]string(nil), p.Tags...),
		FeaturedImageURL: p.FeaturedImageURL,
		Status:           p.Status,
		IsFeatured:       p.IsFeatured,
		MetaTitle:        p.MetaTitle,
		MetaDescription:  p.MetaDescription,
		AuthorUserID:     p.AuthorUserID,
		PublishedAt:      p.PublishedAt,
		ViewCount:        p.ViewCount,
		CreatedAt:        p.CreatedAt,
		UpdatedAt:        p.UpdatedAt,
	}
}

func PublicPosts(items []Post) []PublicPost {
	result := make([]PublicPost, 0, len(items))
	for _, item := range items {
		result = append(result, item.Public())
	}
	return result
}

func AdminPosts(items []Post) []AdminPost {
	result := make([]AdminPost, 0, len(items))
	for _, item := range items {
		result = append(result, item.Admin())
	}
	return result
}

func (i CreatePostInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "title", i.Title, 2, 200, true)
	validator.ValidateSlug(v, "slug", i.Slug, true)
	validator.ValidateStringLength(v, "excerpt", i.Excerpt, 0, 500, false)
	validator.ValidateStringLength(v, "body", i.Body, 1, 0, true)
	validator.ValidateStringLength(v, "category", i.Category, 0, 100, false)
	validator.ValidateStringLength(v, "meta_title", i.MetaTitle, 0, 200, false)
	validator.ValidateStringLength(v, "meta_description", i.MetaDescription, 0, 300, false)
	v.Check(IsValidStatus(i.Status), "status", "status is invalid")

	return v.Errors()
}

func (i UpdatePostInput) Validate() validator.Errors {
	return CreatePostInput{
		Title:           i.Title,
		Slug:            i.Slug,
		Excerpt:         i.Excerpt,
		Body:            i.Body,
		Category:        i.Category,
		Status:          i.Status,
		MetaTitle:       i.MetaTitle,
		MetaDescription: i.MetaDescription,
	}.Validate()
}

func (f ListPostsFilter) Normalize() ListPostsFilter {
	f.Status = NormalizeStatus(f.Status)
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

func (f ListPostsFilter) Offset() int {
	f = f.Normalize()
	return (f.Page - 1) * f.PageSize
}

func NormalizeCreateInput(input CreatePostInput) CreatePostInput {
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = validator.NormalizeSlug(input.Slug)
	input.Excerpt = strings.TrimSpace(input.Excerpt)
	input.Body = strings.TrimSpace(input.Body)
	input.Category = strings.TrimSpace(input.Category)
	input.FeaturedImageURL = strings.TrimSpace(input.FeaturedImageURL)
	input.Status = NormalizeStatus(input.Status)
	input.MetaTitle = strings.TrimSpace(input.MetaTitle)
	input.MetaDescription = strings.TrimSpace(input.MetaDescription)
	input.AuthorUserID = strings.TrimSpace(input.AuthorUserID)
	input.Tags = normalizeTags(input.Tags)

	if input.Slug == "" {
		input.Slug = validator.NormalizeSlug(input.Title)
	}
	if input.Status == "" {
		input.Status = StatusDraft
	}

	return input
}

func NormalizeUpdateInput(input UpdatePostInput) UpdatePostInput {
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = validator.NormalizeSlug(input.Slug)
	input.Excerpt = strings.TrimSpace(input.Excerpt)
	input.Body = strings.TrimSpace(input.Body)
	input.Category = strings.TrimSpace(input.Category)
	input.FeaturedImageURL = strings.TrimSpace(input.FeaturedImageURL)
	input.Status = NormalizeStatus(input.Status)
	input.MetaTitle = strings.TrimSpace(input.MetaTitle)
	input.MetaDescription = strings.TrimSpace(input.MetaDescription)
	input.AuthorUserID = strings.TrimSpace(input.AuthorUserID)
	input.Tags = normalizeTags(input.Tags)

	if input.Slug == "" {
		input.Slug = validator.NormalizeSlug(input.Title)
	}
	if input.Status == "" {
		input.Status = StatusDraft
	}

	return input
}

func NormalizeStatus(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func IsValidStatus(value string) bool {
	switch NormalizeStatus(value) {
	case StatusDraft, StatusPublished, StatusArchived:
		return true
	default:
		return false
	}
}

func normalizeTags(tags []string) []string {
	result := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			result = append(result, tag)
		}
	}
	return result
}
