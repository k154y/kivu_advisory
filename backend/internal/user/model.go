package user

import (
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

const (
	RoleAdmin      = "admin"
	RoleClient     = "client"
	RoleAccountant = "accountant"
)

type User struct {
	ID           string
	FullName     string
	CompanyName  string
	Email        string
	Phone        string
	WhatsApp     string
	Location     string
	Role         string
	PasswordHash string
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	LastLoginAt  *time.Time
}

type PublicUser struct {
	ID          string     `json:"id"`
	FullName    string     `json:"full_name"`
	CompanyName string     `json:"company_name,omitempty"`
	Email       string     `json:"email"`
	Phone       string     `json:"phone,omitempty"`
	WhatsApp    string     `json:"whatsapp,omitempty"`
	Location    string     `json:"location,omitempty"`
	Role        string     `json:"role"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
}

type CreateUserInput struct {
	FullName     string
	CompanyName  string
	Email        string
	Phone        string
	WhatsApp     string
	Location     string
	Role         string
	PasswordHash string
	IsActive     bool
}

type UpdateUserInput struct {
	FullName    string
	CompanyName string
	Phone       string
	WhatsApp    string
	Location    string
	IsActive    *bool
}

type ListUsersFilter struct {
	Role     string
	IsActive *bool
	Search   string
	Page     int
	PageSize int
}

func (u User) Public() PublicUser {
	return PublicUser{
		ID:          u.ID,
		FullName:    u.FullName,
		CompanyName: u.CompanyName,
		Email:       u.Email,
		Phone:       u.Phone,
		WhatsApp:    u.WhatsApp,
		Location:    u.Location,
		Role:        NormalizeRole(u.Role),
		IsActive:    u.IsActive,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
		LastLoginAt: u.LastLoginAt,
	}
}

func PublicUsers(users []User) []PublicUser {
	result := make([]PublicUser, 0, len(users))

	for _, item := range users {
		result = append(result, item.Public())
	}

	return result
}

func (i CreateUserInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", i.FullName, 2, 150, true)
	validator.ValidateEmail(v, "email", i.Email)
	validator.ValidatePhone(v, "phone", i.Phone, false)
	validator.ValidatePhone(v, "whatsapp", i.WhatsApp, false)
	validator.ValidateStringLength(v, "company_name", i.CompanyName, 0, 150, false)
	validator.ValidateStringLength(v, "location", i.Location, 0, 150, false)

	v.Check(IsValidRole(i.Role), "role", "role must be admin, client, or accountant")
	v.Check(strings.TrimSpace(i.PasswordHash) != "", "password_hash", "password hash is required")

	return v.Errors()
}

func (i UpdateUserInput) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", i.FullName, 2, 150, true)
	validator.ValidatePhone(v, "phone", i.Phone, false)
	validator.ValidatePhone(v, "whatsapp", i.WhatsApp, false)
	validator.ValidateStringLength(v, "company_name", i.CompanyName, 0, 150, false)
	validator.ValidateStringLength(v, "location", i.Location, 0, 150, false)

	return v.Errors()
}

func (f ListUsersFilter) Normalize() ListUsersFilter {
	f.Role = NormalizeRole(f.Role)
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

func (f ListUsersFilter) Offset() int {
	f = f.Normalize()

	return (f.Page - 1) * f.PageSize
}

func NormalizeEmail(email string) string {
	return validator.NormalizeEmail(email)
}

func NormalizeRole(role string) string {
	return strings.TrimSpace(strings.ToLower(role))
}

func IsValidRole(role string) bool {
	switch NormalizeRole(role) {
	case RoleAdmin, RoleClient, RoleAccountant:
		return true
	default:
		return false
	}
}

func IsAdmin(role string) bool {
	return NormalizeRole(role) == RoleAdmin
}

func IsClient(role string) bool {
	return NormalizeRole(role) == RoleClient
}

func IsAccountant(role string) bool {
	return NormalizeRole(role) == RoleAccountant
}

func RoleDisplayName(role string) string {
	switch NormalizeRole(role) {
	case RoleAdmin:
		return "Admin"
	case RoleClient:
		return "Client"
	case RoleAccountant:
		return "Accountant"
	default:
		return "Unknown"
	}
}