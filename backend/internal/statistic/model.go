package statistic

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

type Statistic struct {
	ID              string
	Value           string
	Label           string
	Description     string
	DisplayOrder    int
	IsActive        bool
	CreatedByUserID string
	UpdatedByUserID string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type PublicStatistic struct {
	ID           string    `json:"id"`
	Value        string    `json:"value"`
	Label        string    `json:"label"`
	Description  string    `json:"description,omitempty"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AdminStatistic struct {
	ID              string    `json:"id"`
	Value           string    `json:"value"`
	Label           string    `json:"label"`
	Description     string    `json:"description,omitempty"`
	DisplayOrder    int       `json:"display_order"`
	IsActive        bool      `json:"is_active"`
	CreatedByUserID string    `json:"created_by_user_id,omitempty"`
	UpdatedByUserID string    `json:"updated_by_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type CreateStatisticInput struct {
	Value           string
	Label           string
	Description     string
	DisplayOrder    int
	IsActive        bool
	CreatedByUserID string
}

type UpdateStatisticInput struct {
	Value           string
	Label           string
	Description     string
	DisplayOrder    int
	IsActive        bool
	UpdatedByUserID string
}

type UpdateStatusInput struct {
	IsActive bool `json:"is_active"`
}

type ListStatisticsFilter struct {
	Search   string
	IsActive *bool
	Page     int
	PageSize int
}

func (s Statistic) Public() PublicStatistic {
	return PublicStatistic{
		ID:           s.ID,
		Value:        s.Value,
		Label:        s.Label,
		Description:  s.Description,
		DisplayOrder: s.DisplayOrder,
		CreatedAt:    s.CreatedAt,
		UpdatedAt:    s.UpdatedAt,
	}
}

func (s Statistic) Admin() AdminStatistic {
	return AdminStatistic{
		ID:              s.ID,
		Value:           s.Value,
		Label:           s.Label,
		Description:     s.Description,
		DisplayOrder:    s.DisplayOrder,
		IsActive:        s.IsActive,
		CreatedByUserID: s.CreatedByUserID,
		UpdatedByUserID: s.UpdatedByUserID,
		CreatedAt:       s.CreatedAt,
		UpdatedAt:       s.UpdatedAt,
	}
}

func PublicStatistics(items []Statistic) []PublicStatistic {
	result := make([]PublicStatistic, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func AdminStatistics(items []Statistic) []AdminStatistic {
	result := make([]AdminStatistic, 0, len(items))

	for _, item := range items {
		result = append(result, item.Admin())
	}

	return result
}

func (i CreateStatisticInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "value", i.Value, 1, 80, true)
	validator.ValidateStringLength(v, "label", i.Label, 2, 150, true)
	validator.ValidateStringLength(v, "description", i.Description, 0, 1000, false)

	v.Check(i.DisplayOrder >= 0, "display_order", "display order must be zero or greater")

	return v.Errors()
}

func (i UpdateStatisticInput) Validate() validator.Errors {
	return CreateStatisticInput{
		Value:        i.Value,
		Label:        i.Label,
		Description:  i.Description,
		DisplayOrder: i.DisplayOrder,
		IsActive:     i.IsActive,
	}.Validate()
}

func NormalizeCreateInput(input CreateStatisticInput) CreateStatisticInput {
	input.Value = strings.TrimSpace(input.Value)
	input.Label = strings.TrimSpace(input.Label)
	input.Description = strings.TrimSpace(input.Description)
	input.CreatedByUserID = strings.TrimSpace(input.CreatedByUserID)

	return input
}

func NormalizeUpdateInput(input UpdateStatisticInput) UpdateStatisticInput {
	input.Value = strings.TrimSpace(input.Value)
	input.Label = strings.TrimSpace(input.Label)
	input.Description = strings.TrimSpace(input.Description)
	input.UpdatedByUserID = strings.TrimSpace(input.UpdatedByUserID)

	return input
}

func (f ListStatisticsFilter) Normalize() ListStatisticsFilter {
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

func (f ListStatisticsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}