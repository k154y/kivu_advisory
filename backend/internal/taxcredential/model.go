package taxcredential

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

type CredentialSystem struct {
	ID              string
	SystemName      string
	LoginURL        string
	Description     string
	DisplayOrder    int
	IsActive        bool
	CreatedByUserID string
	UpdatedByUserID string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type ClientTaxCredential struct {
	ID                   string
	ClientID             string
	SystemID             string
	SystemName           string
	LoginURL             string
	Username             string
	EncryptedPassword    string
	Notes                string
	IsActive             bool
	CreatedByUserID      string
	UpdatedByUserID      string
	LastRevealedAt        *time.Time
	LastRevealedByUserID  string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type PublicCredentialSystem struct {
	ID           string    `json:"id"`
	SystemName   string    `json:"system_name"`
	LoginURL     string    `json:"login_url"`
	Description  string    `json:"description,omitempty"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AdminCredentialSystem struct {
	ID              string    `json:"id"`
	SystemName      string    `json:"system_name"`
	LoginURL        string    `json:"login_url"`
	Description     string    `json:"description,omitempty"`
	DisplayOrder    int       `json:"display_order"`
	IsActive        bool      `json:"is_active"`
	CreatedByUserID string    `json:"created_by_user_id,omitempty"`
	UpdatedByUserID string    `json:"updated_by_user_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type PublicClientTaxCredential struct {
	ID                  string     `json:"id"`
	ClientID            string     `json:"client_id"`
	SystemID            string     `json:"system_id"`
	SystemName          string     `json:"system_name"`
	LoginURL            string     `json:"login_url"`
	Username            string     `json:"username"`
	Notes               string     `json:"notes,omitempty"`
	IsActive            bool       `json:"is_active"`
	HasPassword         bool       `json:"has_password"`
	LastRevealedAt       *time.Time `json:"last_revealed_at,omitempty"`
	LastRevealedByUserID string     `json:"last_revealed_by_user_id,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type AdminClientTaxCredential struct {
	ID                  string     `json:"id"`
	ClientID            string     `json:"client_id"`
	SystemID            string     `json:"system_id"`
	SystemName          string     `json:"system_name"`
	LoginURL            string     `json:"login_url"`
	Username            string     `json:"username"`
	Notes               string     `json:"notes,omitempty"`
	IsActive            bool       `json:"is_active"`
	HasPassword         bool       `json:"has_password"`
	CreatedByUserID     string     `json:"created_by_user_id,omitempty"`
	UpdatedByUserID     string     `json:"updated_by_user_id,omitempty"`
	LastRevealedAt       *time.Time `json:"last_revealed_at,omitempty"`
	LastRevealedByUserID string     `json:"last_revealed_by_user_id,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type RevealedCredential struct {
	ID         string `json:"id"`
	ClientID   string `json:"client_id"`
	SystemID   string `json:"system_id"`
	SystemName string `json:"system_name"`
	LoginURL   string `json:"login_url"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	Notes      string `json:"notes,omitempty"`
}

type CreateCredentialSystemInput struct {
	SystemName      string
	LoginURL        string
	Description     string
	DisplayOrder    int
	IsActive        bool
	CreatedByUserID string
}

type UpdateCredentialSystemInput struct {
	SystemName      string
	LoginURL        string
	Description     string
	DisplayOrder    int
	IsActive        bool
	UpdatedByUserID string
}

type UpdateSystemStatusInput struct {
	IsActive bool `json:"is_active"`
}

type CreateClientCredentialInput struct {
	ClientID        string
	SystemID        string
	Username        string
	Password        string
	Notes           string
	CreatedByUserID string
}

type UpdateClientCredentialInput struct {
	Username        string
	Password        string
	Notes           string
	IsActive        bool
	UpdatedByUserID string
}

type ListCredentialSystemsFilter struct {
	Search   string
	IsActive *bool
	Page     int
	PageSize int
}

type ListClientCredentialsFilter struct {
	ClientID  string
	SystemID  string
	Search    string
	IsActive  *bool
	Page      int
	PageSize  int
}

func (s CredentialSystem) Public() PublicCredentialSystem {
	return PublicCredentialSystem{
		ID:           s.ID,
		SystemName:   s.SystemName,
		LoginURL:     s.LoginURL,
		Description:  s.Description,
		DisplayOrder: s.DisplayOrder,
		CreatedAt:    s.CreatedAt,
		UpdatedAt:    s.UpdatedAt,
	}
}

func (s CredentialSystem) Admin() AdminCredentialSystem {
	return AdminCredentialSystem{
		ID:              s.ID,
		SystemName:      s.SystemName,
		LoginURL:        s.LoginURL,
		Description:     s.Description,
		DisplayOrder:    s.DisplayOrder,
		IsActive:        s.IsActive,
		CreatedByUserID: s.CreatedByUserID,
		UpdatedByUserID: s.UpdatedByUserID,
		CreatedAt:       s.CreatedAt,
		UpdatedAt:       s.UpdatedAt,
	}
}

func (c ClientTaxCredential) Public() PublicClientTaxCredential {
	return PublicClientTaxCredential{
		ID:                  c.ID,
		ClientID:            c.ClientID,
		SystemID:            c.SystemID,
		SystemName:          c.SystemName,
		LoginURL:            c.LoginURL,
		Username:            c.Username,
		Notes:               c.Notes,
		IsActive:            c.IsActive,
		HasPassword:         strings.TrimSpace(c.EncryptedPassword) != "",
		LastRevealedAt:       c.LastRevealedAt,
		LastRevealedByUserID: c.LastRevealedByUserID,
		CreatedAt:           c.CreatedAt,
		UpdatedAt:           c.UpdatedAt,
	}
}

func (c ClientTaxCredential) Admin() AdminClientTaxCredential {
	return AdminClientTaxCredential{
		ID:                  c.ID,
		ClientID:            c.ClientID,
		SystemID:            c.SystemID,
		SystemName:          c.SystemName,
		LoginURL:            c.LoginURL,
		Username:            c.Username,
		Notes:               c.Notes,
		IsActive:            c.IsActive,
		HasPassword:         strings.TrimSpace(c.EncryptedPassword) != "",
		CreatedByUserID:     c.CreatedByUserID,
		UpdatedByUserID:     c.UpdatedByUserID,
		LastRevealedAt:       c.LastRevealedAt,
		LastRevealedByUserID: c.LastRevealedByUserID,
		CreatedAt:           c.CreatedAt,
		UpdatedAt:           c.UpdatedAt,
	}
}

func PublicCredentialSystems(items []CredentialSystem) []PublicCredentialSystem {
	result := make([]PublicCredentialSystem, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func AdminCredentialSystems(items []CredentialSystem) []AdminCredentialSystem {
	result := make([]AdminCredentialSystem, 0, len(items))

	for _, item := range items {
		result = append(result, item.Admin())
	}

	return result
}

func PublicClientCredentials(items []ClientTaxCredential) []PublicClientTaxCredential {
	result := make([]PublicClientTaxCredential, 0, len(items))

	for _, item := range items {
		result = append(result, item.Public())
	}

	return result
}

func AdminClientCredentials(items []ClientTaxCredential) []AdminClientTaxCredential {
	result := make([]AdminClientTaxCredential, 0, len(items))

	for _, item := range items {
		result = append(result, item.Admin())
	}

	return result
}

func (i CreateCredentialSystemInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "system_name", i.SystemName, 2, 150, true)
	validator.ValidateStringLength(v, "login_url", i.LoginURL, 5, 1000, true)
	validator.ValidateStringLength(v, "description", i.Description, 0, 1000, false)

	v.Check(IsValidCredentialURL(i.LoginURL), "login_url", "login url must start with http:// or https://")
	v.Check(i.DisplayOrder >= 0, "display_order", "display order must be zero or greater")

	return v.Errors()
}

func (i UpdateCredentialSystemInput) Validate() validator.Errors {
	return CreateCredentialSystemInput{
		SystemName:   i.SystemName,
		LoginURL:     i.LoginURL,
		Description:  i.Description,
		DisplayOrder: i.DisplayOrder,
		IsActive:     i.IsActive,
	}.Validate()
}

func (i CreateClientCredentialInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "client_id", i.ClientID, 1, 100, true)
	validator.ValidateStringLength(v, "system_id", i.SystemID, 1, 100, true)
	validator.ValidateStringLength(v, "username", i.Username, 1, 300, true)
	validator.ValidateStringLength(v, "password", i.Password, 1, 1000, true)
	validator.ValidateStringLength(v, "notes", i.Notes, 0, 1000, false)

	return v.Errors()
}

func (i UpdateClientCredentialInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "username", i.Username, 1, 300, true)
	validator.ValidateStringLength(v, "password", i.Password, 0, 1000, false)
	validator.ValidateStringLength(v, "notes", i.Notes, 0, 1000, false)

	return v.Errors()
}

func NormalizeCreateSystemInput(input CreateCredentialSystemInput) CreateCredentialSystemInput {
	input.SystemName = strings.TrimSpace(input.SystemName)
	input.LoginURL = strings.TrimSpace(input.LoginURL)
	input.Description = strings.TrimSpace(input.Description)
	input.CreatedByUserID = strings.TrimSpace(input.CreatedByUserID)

	return input
}

func NormalizeUpdateSystemInput(input UpdateCredentialSystemInput) UpdateCredentialSystemInput {
	input.SystemName = strings.TrimSpace(input.SystemName)
	input.LoginURL = strings.TrimSpace(input.LoginURL)
	input.Description = strings.TrimSpace(input.Description)
	input.UpdatedByUserID = strings.TrimSpace(input.UpdatedByUserID)

	return input
}

func NormalizeCreateCredentialInput(input CreateClientCredentialInput) CreateClientCredentialInput {
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.SystemID = strings.TrimSpace(input.SystemID)
	input.Username = strings.TrimSpace(input.Username)
	input.Password = strings.TrimSpace(input.Password)
	input.Notes = strings.TrimSpace(input.Notes)
	input.CreatedByUserID = strings.TrimSpace(input.CreatedByUserID)

	return input
}

func NormalizeUpdateCredentialInput(input UpdateClientCredentialInput) UpdateClientCredentialInput {
	input.Username = strings.TrimSpace(input.Username)
	input.Password = strings.TrimSpace(input.Password)
	input.Notes = strings.TrimSpace(input.Notes)
	input.UpdatedByUserID = strings.TrimSpace(input.UpdatedByUserID)

	return input
}

func IsValidCredentialURL(value string) bool {
	value = strings.TrimSpace(strings.ToLower(value))

	return strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://")
}

func (f ListCredentialSystemsFilter) Normalize() ListCredentialSystemsFilter {
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

func (f ListCredentialSystemsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func (f ListClientCredentialsFilter) Normalize() ListClientCredentialsFilter {
	f.ClientID = strings.TrimSpace(f.ClientID)
	f.SystemID = strings.TrimSpace(f.SystemID)
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

func (f ListClientCredentialsFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}