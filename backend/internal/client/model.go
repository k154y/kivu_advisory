package client

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

type Client struct {
	ID           string
	UserID       string
	CompanyName  string
	TIN          string
	BusinessType string
	Address      string
	City         string
	Country      string
	Website      string
	Notes        string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type PublicClient struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	CompanyName  string    `json:"company_name,omitempty"`
	TIN          string    `json:"tin,omitempty"`
	BusinessType string    `json:"business_type,omitempty"`
	Address      string    `json:"address,omitempty"`
	City         string    `json:"city,omitempty"`
	Country      string    `json:"country,omitempty"`
	Website      string    `json:"website,omitempty"`
	Notes        string    `json:"notes,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CreateClientInput struct {
	UserID       string
	CompanyName  string
	TIN          string
	BusinessType string
	Address      string
	City         string
	Country      string
	Website      string
	Notes        string
}

type UpdateClientInput struct {
	CompanyName  string
	TIN          string
	BusinessType string
	Address      string
	City         string
	Country      string
	Website      string
	Notes        string
}

type ListClientsFilter struct {
	Search   string
	Page     int
	PageSize int
}

func (c Client) Public() PublicClient {
	return PublicClient{
		ID:           c.ID,
		UserID:       c.UserID,
		CompanyName:  c.CompanyName,
		TIN:          c.TIN,
		BusinessType: c.BusinessType,
		Address:      c.Address,
		City:         c.City,
		Country:      c.Country,
		Website:      c.Website,
		Notes:        c.Notes,
		CreatedAt:    c.CreatedAt,
		UpdatedAt:    c.UpdatedAt,
	}
}

func PublicClients(clients []Client) []PublicClient {
	result := make([]PublicClient, 0, len(clients))

	for _, item := range clients {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateClientInput) Validate() validator.Errors {
	v := validator.New()

	validator.RequiredField(v, "user_id", i.UserID)
	validator.ValidateStringLength(v, "company_name", i.CompanyName, 0, 150, false)
	validator.ValidateStringLength(v, "tin", i.TIN, 0, 50, false)
	validator.ValidateStringLength(v, "business_type", i.BusinessType, 0, 100, false)
	validator.ValidateStringLength(v, "address", i.Address, 0, 200, false)
	validator.ValidateStringLength(v, "city", i.City, 0, 100, false)
	validator.ValidateStringLength(v, "country", i.Country, 0, 100, false)
	validator.ValidateStringLength(v, "website", i.Website, 0, 200, false)
	validator.ValidateStringLength(v, "notes", i.Notes, 0, 1000, false)

	return v.Errors()
}

func (i UpdateClientInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "company_name", i.CompanyName, 0, 150, false)
	validator.ValidateStringLength(v, "tin", i.TIN, 0, 50, false)
	validator.ValidateStringLength(v, "business_type", i.BusinessType, 0, 100, false)
	validator.ValidateStringLength(v, "address", i.Address, 0, 200, false)
	validator.ValidateStringLength(v, "city", i.City, 0, 100, false)
	validator.ValidateStringLength(v, "country", i.Country, 0, 100, false)
	validator.ValidateStringLength(v, "website", i.Website, 0, 200, false)
	validator.ValidateStringLength(v, "notes", i.Notes, 0, 1000, false)

	return v.Errors()
}

func (f ListClientsFilter) Normalize() ListClientsFilter {
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

func (f ListClientsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeInput(input CreateClientInput) CreateClientInput {
	input.UserID = strings.TrimSpace(input.UserID)
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.TIN = strings.TrimSpace(input.TIN)
	input.BusinessType = strings.TrimSpace(input.BusinessType)
	input.Address = strings.TrimSpace(input.Address)
	input.City = strings.TrimSpace(input.City)
	input.Country = strings.TrimSpace(input.Country)
	input.Website = strings.TrimSpace(input.Website)
	input.Notes = strings.TrimSpace(input.Notes)

	return input
}

func NormalizeUpdateInput(input UpdateClientInput) UpdateClientInput {
	input.CompanyName = strings.TrimSpace(input.CompanyName)
	input.TIN = strings.TrimSpace(input.TIN)
	input.BusinessType = strings.TrimSpace(input.BusinessType)
	input.Address = strings.TrimSpace(input.Address)
	input.City = strings.TrimSpace(input.City)
	input.Country = strings.TrimSpace(input.Country)
	input.Website = strings.TrimSpace(input.Website)
	input.Notes = strings.TrimSpace(input.Notes)

	return input
}