package auth

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

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterClientRequest struct {
	FullName    string `json:"full_name"`
	CompanyName string `json:"company_name"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	WhatsApp    string `json:"whatsapp"`
	Location    string `json:"location"`
	Password    string `json:"password"`
	AcceptTerms bool   `json:"accept_terms"`
}

type CreateAccountantRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type AuthenticatedUser struct {
	ID          string    `json:"id"`
	FullName    string    `json:"full_name"`
	CompanyName string    `json:"company_name,omitempty"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone,omitempty"`
	WhatsApp    string    `json:"whatsapp,omitempty"`
	Location    string    `json:"location,omitempty"`
	Role        string    `json:"role"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

type TokenResponse struct {
	AccessToken           string            `json:"access_token"`
	RefreshToken          string            `json:"refresh_token"`
	TokenType             string            `json:"token_type"`
	ExpiresInSeconds      int64             `json:"expires_in_seconds"`
	RefreshExpiresSeconds int64             `json:"refresh_expires_in_seconds"`
	User                  AuthenticatedUser `json:"user"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (r LoginRequest) Validate() validator.Errors {
	v := validator.New()

	validator.ValidateEmail(v, "email", r.Email)
	validator.RequiredField(v, "password", r.Password)

	return v.Errors()
}

func (r RegisterClientRequest) Validate(passwordMinLength int) validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", r.FullName, 2, 150, true)
	validator.ValidateStringLength(v, "company_name", r.CompanyName, 0, 150, false)
	validator.ValidateEmail(v, "email", r.Email)
	validator.ValidatePhone(v, "phone", r.Phone, true)
	validator.ValidatePhone(v, "whatsapp", r.WhatsApp, false)
	validator.ValidateStringLength(v, "location", r.Location, 0, 150, false)
	validator.ValidatePassword(v, "password", r.Password, passwordMinLength)

	v.Check(r.AcceptTerms, "accept_terms", "you must accept the terms and conditions")

	return v.Errors()
}

func (r CreateAccountantRequest) Validate(passwordMinLength int) validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", r.FullName, 2, 150, true)
	validator.ValidateEmail(v, "email", r.Email)
	validator.ValidatePhone(v, "phone", r.Phone, true)
	validator.ValidatePassword(v, "password", r.Password, passwordMinLength)

	return v.Errors()
}

func (r RefreshTokenRequest) Validate() validator.Errors {
	v := validator.New()

	validator.RequiredField(v, "refresh_token", r.RefreshToken)

	return v.Errors()
}

func (r ChangePasswordRequest) Validate(passwordMinLength int) validator.Errors {
	v := validator.New()

	validator.RequiredField(v, "current_password", r.CurrentPassword)
	validator.ValidatePassword(v, "new_password", r.NewPassword, passwordMinLength)

	return v.Errors()
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

func IsStaffRole(role string) bool {
	switch NormalizeRole(role) {
	case RoleAdmin, RoleAccountant:
		return true
	default:
		return false
	}
}

func IsClientRole(role string) bool {
	return NormalizeRole(role) == RoleClient
}
