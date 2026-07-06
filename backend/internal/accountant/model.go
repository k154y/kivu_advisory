package accountant

import (
	"strings"
	"time"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

type Accountant struct {
	ID          string
	FullName    string
	Email       string
	Phone       string
	IsActive    bool
	LastLoginAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type PublicAccountant struct {
	ID          string     `json:"id"`
	FullName    string     `json:"full_name"`
	Email       string     `json:"email"`
	Phone       string     `json:"phone,omitempty"`
	IsActive    bool       `json:"is_active"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ListAccountantsFilter struct {
	Search   string
	IsActive *bool
	Page     int
	PageSize int
}

type UpdateStatusInput struct {
	IsActive bool `json:"is_active"`
}

func (a Accountant) Public() PublicAccountant {
	return PublicAccountant{
		ID:          a.ID,
		FullName:    a.FullName,
		Email:       a.Email,
		Phone:       a.Phone,
		IsActive:    a.IsActive,
		LastLoginAt: a.LastLoginAt,
		CreatedAt:   a.CreatedAt,
		UpdatedAt:   a.UpdatedAt,
	}
}

func PublicAccountants(items []Accountant) []PublicAccountant {
	result := make([]PublicAccountant, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func (f ListAccountantsFilter) Normalize() ListAccountantsFilter {
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

func (f ListAccountantsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}
