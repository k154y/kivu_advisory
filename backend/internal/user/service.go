package user

import (
	"context"
	stderrors "errors"
	"strings"

	"github.com/kyves/kivu-advisory/backend/internal/config"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/password"
	"github.com/kyves/kivu-advisory/backend/pkg/validator"
)

type Service struct {
	repo           Repository
	passwordConfig password.Config
}

type RegisterClientInput struct {
	FullName    string
	CompanyName string
	Email       string
	Phone       string
	WhatsApp    string
	Location    string
	Password    string
}

type CreateAccountantInput struct {
	FullName string
	Email    string
	Phone    string
	Password string
}

type CreateAdminInput struct {
	FullName string
	Email    string
	Phone    string
	Password string
}

type UpdateProfileInput struct {
	FullName    string
	CompanyName string
	Phone       string
	WhatsApp    string
	Location    string
}

type ChangePasswordInput struct {
	CurrentPassword string
	NewPassword     string
}

func NewService(repo Repository, passwordCfg config.PasswordConfig) *Service {
	return &Service{
		repo: repo,
		passwordConfig: password.Config{
			MinLength:  passwordCfg.MinLength,
			BcryptCost: passwordCfg.BcryptCost,
		},
	}
}

func (s *Service) RegisterClient(ctx context.Context, input RegisterClientInput) (*PublicUser, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("user service is not initialized")
	}

	if validationErrors := input.Validate(s.passwordConfig.MinLength); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	email := NormalizeEmail(input.Email)

	exists, err := s.repo.EmailExists(ctx, email, "")
	if err != nil {
		return nil, err
	}

	if exists {
		return nil, apperrors.Conflict("email is already used")
	}

	passwordHash, err := password.Hash(input.Password, s.passwordConfig)
	if err != nil {
		return nil, mapPasswordError(err)
	}

	createdUser, err := s.repo.Create(ctx, CreateUserInput{
		FullName:     strings.TrimSpace(input.FullName),
		CompanyName:  strings.TrimSpace(input.CompanyName),
		Email:        email,
		Phone:        strings.TrimSpace(input.Phone),
		WhatsApp:     strings.TrimSpace(input.WhatsApp),
		Location:     strings.TrimSpace(input.Location),
		Role:         RoleClient,
		PasswordHash: passwordHash,
		IsActive:     true,
	})
	if err != nil {
		return nil, err
	}

	publicUser := createdUser.Public()

	return &publicUser, nil
}

func (s *Service) CreateAccountant(ctx context.Context, input CreateAccountantInput) (*PublicUser, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("user service is not initialized")
	}

	if validationErrors := input.Validate(s.passwordConfig.MinLength); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	email := NormalizeEmail(input.Email)

	exists, err := s.repo.EmailExists(ctx, email, "")
	if err != nil {
		return nil, err
	}

	if exists {
		return nil, apperrors.Conflict("email is already used")
	}

	passwordHash, err := password.Hash(input.Password, s.passwordConfig)
	if err != nil {
		return nil, mapPasswordError(err)
	}

	createdUser, err := s.repo.Create(ctx, CreateUserInput{
		FullName:     strings.TrimSpace(input.FullName),
		Email:        email,
		Phone:        strings.TrimSpace(input.Phone),
		Role:         RoleAccountant,
		PasswordHash: passwordHash,
		IsActive:     true,
	})
	if err != nil {
		return nil, err
	}

	publicUser := createdUser.Public()

	return &publicUser, nil
}

func (s *Service) CreateAdmin(ctx context.Context, input CreateAdminInput) (*PublicUser, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("user service is not initialized")
	}

	if validationErrors := input.Validate(s.passwordConfig.MinLength); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	email := NormalizeEmail(input.Email)

	exists, err := s.repo.EmailExists(ctx, email, "")
	if err != nil {
		return nil, err
	}

	if exists {
		return nil, apperrors.Conflict("email is already used")
	}

	passwordHash, err := password.Hash(input.Password, s.passwordConfig)
	if err != nil {
		return nil, mapPasswordError(err)
	}

	createdUser, err := s.repo.Create(ctx, CreateUserInput{
		FullName:     strings.TrimSpace(input.FullName),
		Email:        email,
		Phone:        strings.TrimSpace(input.Phone),
		Role:         RoleAdmin,
		PasswordHash: passwordHash,
		IsActive:     true,
	})
	if err != nil {
		return nil, err
	}

	publicUser := createdUser.Public()

	return &publicUser, nil
}

func (s *Service) Authenticate(ctx context.Context, email string, plainPassword string) (*User, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("user service is not initialized")
	}

	email = NormalizeEmail(email)
	plainPassword = strings.TrimSpace(plainPassword)

	if email == "" || plainPassword == "" {
		return nil, apperrors.Unauthorized("invalid email or password")
	}

	foundUser, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		if apperrors.IsNotFound(err) {
			return nil, apperrors.Unauthorized("invalid email or password")
		}

		return nil, err
	}

	if !foundUser.IsActive {
		return nil, apperrors.Unauthorized("user account is not active")
	}

	if !password.Compare(foundUser.PasswordHash, plainPassword) {
		return nil, apperrors.Unauthorized("invalid email or password")
	}

	_ = s.repo.UpdateLastLogin(ctx, foundUser.ID)

	return foundUser, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*PublicUser, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("user service is not initialized")
	}

	foundUser, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	publicUser := foundUser.Public()

	return &publicUser, nil
}

func (s *Service) GetFullByID(ctx context.Context, id string) (*User, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("user service is not initialized")
	}

	return s.repo.FindByID(ctx, id)
}

func (s *Service) List(ctx context.Context, filter ListUsersFilter) ([]PublicUser, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, apperrors.Internal("user service is not initialized")
	}

	users, totalItems, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return PublicUsers(users), totalItems, nil
}

func (s *Service) UpdateProfile(ctx context.Context, id string, input UpdateProfileInput) (*PublicUser, error) {
	if s == nil || s.repo == nil {
		return nil, apperrors.Internal("user service is not initialized")
	}

	updateInput := UpdateUserInput{
		FullName:    strings.TrimSpace(input.FullName),
		CompanyName: strings.TrimSpace(input.CompanyName),
		Phone:       strings.TrimSpace(input.Phone),
		WhatsApp:    strings.TrimSpace(input.WhatsApp),
		Location:    strings.TrimSpace(input.Location),
	}

	updatedUser, err := s.repo.Update(ctx, id, updateInput)
	if err != nil {
		return nil, err
	}

	publicUser := updatedUser.Public()

	return &publicUser, nil
}

func (s *Service) SetActive(ctx context.Context, id string, isActive bool) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("user service is not initialized")
	}

	return s.repo.SetActive(ctx, id, isActive)
}

func (s *Service) ChangePassword(ctx context.Context, id string, input ChangePasswordInput) error {
	if s == nil || s.repo == nil {
		return apperrors.Internal("user service is not initialized")
	}

	if validationErrors := input.Validate(s.passwordConfig.MinLength); len(validationErrors) > 0 {
		return apperrors.Validation(validationErrors)
	}

	foundUser, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if !password.Compare(foundUser.PasswordHash, input.CurrentPassword) {
		return apperrors.Unauthorized("current password is not correct")
	}

	newPasswordHash, err := password.Hash(input.NewPassword, s.passwordConfig)
	if err != nil {
		return mapPasswordError(err)
	}

	return s.repo.UpdatePassword(ctx, id, newPasswordHash)
}

func (input RegisterClientInput) Validate(passwordMinLength int) validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", input.FullName, 2, 150, true)
	validator.ValidateStringLength(v, "company_name", input.CompanyName, 0, 150, false)
	validator.ValidateEmail(v, "email", input.Email)
	validator.ValidatePhone(v, "phone", input.Phone, true)
	validator.ValidatePhone(v, "whatsapp", input.WhatsApp, false)
	validator.ValidateStringLength(v, "location", input.Location, 0, 150, false)
	validator.ValidatePassword(v, "password", input.Password, passwordMinLength)

	return v.Errors()
}

func (input CreateAccountantInput) Validate(passwordMinLength int) validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", input.FullName, 2, 150, true)
	validator.ValidateEmail(v, "email", input.Email)
	validator.ValidatePhone(v, "phone", input.Phone, true)
	validator.ValidatePassword(v, "password", input.Password, passwordMinLength)

	return v.Errors()
}

func (input CreateAdminInput) Validate(passwordMinLength int) validator.Errors {
	v := validator.New()

	validator.ValidateStringLength(v, "full_name", input.FullName, 2, 150, true)
	validator.ValidateEmail(v, "email", input.Email)
	validator.ValidatePhone(v, "phone", input.Phone, false)
	validator.ValidatePassword(v, "password", input.Password, passwordMinLength)

	return v.Errors()
}

func (input ChangePasswordInput) Validate(passwordMinLength int) validator.Errors {
	v := validator.New()

	validator.RequiredField(v, "current_password", input.CurrentPassword)
	validator.ValidatePassword(v, "new_password", input.NewPassword, passwordMinLength)

	return v.Errors()
}

func mapPasswordError(err error) error {
	if err == nil {
		return nil
	}

	switch {
	case stderrors.Is(err, password.ErrPasswordRequired):
		return apperrors.InvalidInput("password is required")
	case stderrors.Is(err, password.ErrPasswordTooShort):
		return apperrors.InvalidInput("password must be at least 10 characters long")
	case stderrors.Is(err, password.ErrPasswordTooCommon):
		return apperrors.InvalidInput("password is too common; choose a stronger password")
	case stderrors.Is(err, password.ErrPasswordTooWeak):
		return apperrors.InvalidInput("password must include uppercase, lowercase, number, special character, and must not contain obvious sequences")
	default:
		return apperrors.InternalWrap(err, "failed to process password")
	}
}
