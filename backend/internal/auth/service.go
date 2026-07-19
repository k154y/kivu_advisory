package auth

import (
	"context"
	"strings"

	clientpkg "github.com/kyves/kivu-advisory/backend/internal/client"
	userpkg "github.com/kyves/kivu-advisory/backend/internal/user"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type UserService interface {
	RegisterClient(ctx context.Context, input userpkg.RegisterClientInput) (*userpkg.PublicUser, error)
	CreateAccountant(ctx context.Context, input userpkg.CreateAccountantInput) (*userpkg.PublicUser, error)
	Authenticate(ctx context.Context, email string, plainPassword string) (*userpkg.User, error)
	GetFullByID(ctx context.Context, id string) (*userpkg.User, error)
	UpdateProfile(ctx context.Context, id string, input userpkg.UpdateProfileInput) (*userpkg.PublicUser, error)
	ChangePassword(ctx context.Context, id string, input userpkg.ChangePasswordInput) error
}

type ClientService interface {
	CreateForUser(ctx context.Context, userID string, companyName string) (*clientpkg.PublicClient, error)
}

type Service struct {
	users             UserService
	clients           ClientService
	tokenManager      *TokenManager
	passwordMinLength int
}

func NewService(users UserService, tokenManager *TokenManager, passwordMinLength int) *Service {
	if passwordMinLength <= 0 {
		passwordMinLength = 8
	}

	return &Service{
		users:             users,
		tokenManager:      tokenManager,
		passwordMinLength: passwordMinLength,
	}
}

func (s *Service) SetClientService(clients ClientService) {
	if s == nil {
		return
	}

	s.clients = clients
}

func (s *Service) Login(ctx context.Context, request LoginRequest) (TokenResponse, error) {
	if s == nil || s.users == nil || s.tokenManager == nil {
		return TokenResponse{}, apperrors.Internal("auth service is not initialized")
	}

	if validationErrors := request.Validate(); len(validationErrors) > 0 {
		return TokenResponse{}, apperrors.Validation(validationErrors)
	}

	foundUser, err := s.users.Authenticate(ctx, request.Email, request.Password)
	if err != nil {
		return TokenResponse{}, err
	}

	return s.tokenManager.GenerateTokenPair(authUserFromUser(foundUser))
}

func (s *Service) RegisterClient(ctx context.Context, request RegisterClientRequest) (TokenResponse, error) {
	if s == nil || s.users == nil || s.tokenManager == nil {
		return TokenResponse{}, apperrors.Internal("auth service is not initialized")
	}

	if validationErrors := request.Validate(s.passwordMinLength); len(validationErrors) > 0 {
		return TokenResponse{}, apperrors.Validation(validationErrors)
	}

	createdUser, err := s.users.RegisterClient(ctx, userpkg.RegisterClientInput{
		FullName:    strings.TrimSpace(request.FullName),
		CompanyName: strings.TrimSpace(request.CompanyName),
		Email:       NormalizeEmail(request.Email),
		Phone:       strings.TrimSpace(request.Phone),
		WhatsApp:    strings.TrimSpace(request.WhatsApp),
		Location:    strings.TrimSpace(request.Location),
		Password:    request.Password,
	})
	if err != nil {
		return TokenResponse{}, err
	}

	if s.clients != nil {
		_, err := s.clients.CreateForUser(ctx, createdUser.ID, createdUser.CompanyName)
		if err != nil {
			return TokenResponse{}, err
		}
	}

	return s.tokenManager.GenerateTokenPair(authUserFromPublicUser(createdUser))
}

func (s *Service) CreateAccountant(ctx context.Context, request CreateAccountantRequest) (*userpkg.PublicUser, error) {
	if s == nil || s.users == nil {
		return nil, apperrors.Internal("auth service is not initialized")
	}

	if validationErrors := request.Validate(s.passwordMinLength); len(validationErrors) > 0 {
		return nil, apperrors.Validation(validationErrors)
	}

	return s.users.CreateAccountant(ctx, userpkg.CreateAccountantInput{
		FullName: strings.TrimSpace(request.FullName),
		Email:    NormalizeEmail(request.Email),
		Phone:    strings.TrimSpace(request.Phone),
		Password: request.Password,
	})
}

func (s *Service) RefreshToken(ctx context.Context, request RefreshTokenRequest) (TokenResponse, error) {
	if s == nil || s.users == nil || s.tokenManager == nil {
		return TokenResponse{}, apperrors.Internal("auth service is not initialized")
	}

	if validationErrors := request.Validate(); len(validationErrors) > 0 {
		return TokenResponse{}, apperrors.Validation(validationErrors)
	}

	claims, err := s.tokenManager.VerifyRefreshToken(request.RefreshToken)
	if err != nil {
		return TokenResponse{}, apperrors.Unauthorized("invalid or expired refresh token")
	}

	foundUser, err := s.users.GetFullByID(ctx, claims.UserID)
	if err != nil {
		return TokenResponse{}, err
	}

	if !foundUser.IsActive {
		return TokenResponse{}, apperrors.Unauthorized("user account is not active")
	}

	return s.tokenManager.GenerateTokenPair(authUserFromUser(foundUser))
}

func (s *Service) UpdateProfile(ctx context.Context, id string, request UpdateProfileRequest) (*userpkg.PublicUser, error) {
	if s == nil || s.users == nil {
		return nil, apperrors.Internal("auth service is not initialized")
	}

	input := userpkg.UpdateProfileInput{
		FullName:    strings.TrimSpace(request.FullName),
		CompanyName: strings.TrimSpace(request.CompanyName),
		Phone:       strings.TrimSpace(request.Phone),
		WhatsApp:    strings.TrimSpace(request.WhatsApp),
		Location:    strings.TrimSpace(request.Location),
	}

	return s.users.UpdateProfile(ctx, id, input)
}

func (s *Service) ChangePassword(ctx context.Context, id string, request ChangePasswordRequest) error {
	if s == nil || s.users == nil {
		return apperrors.Internal("auth service is not initialized")
	}

	input := userpkg.ChangePasswordInput{
		CurrentPassword: request.CurrentPassword,
		NewPassword:     request.NewPassword,
	}

	return s.users.ChangePassword(ctx, id, input)
}

func authUserFromUser(foundUser *userpkg.User) AuthenticatedUser {
	if foundUser == nil {
		return AuthenticatedUser{}
	}

	return AuthenticatedUser{
		ID:          foundUser.ID,
		FullName:    strings.TrimSpace(foundUser.FullName),
		CompanyName: strings.TrimSpace(foundUser.CompanyName),
		Email:       NormalizeEmail(foundUser.Email),
		Phone:       strings.TrimSpace(foundUser.Phone),
		WhatsApp:    strings.TrimSpace(foundUser.WhatsApp),
		Location:    strings.TrimSpace(foundUser.Location),
		Role:        NormalizeRole(foundUser.Role),
		IsActive:    foundUser.IsActive,
		CreatedAt:   foundUser.CreatedAt,
	}
}

func authUserFromPublicUser(publicUser *userpkg.PublicUser) AuthenticatedUser {
	if publicUser == nil {
		return AuthenticatedUser{}
	}

	return AuthenticatedUser{
		ID:          publicUser.ID,
		FullName:    strings.TrimSpace(publicUser.FullName),
		CompanyName: strings.TrimSpace(publicUser.CompanyName),
		Email:       NormalizeEmail(publicUser.Email),
		Phone:       strings.TrimSpace(publicUser.Phone),
		WhatsApp:    strings.TrimSpace(publicUser.WhatsApp),
		Location:    strings.TrimSpace(publicUser.Location),
		Role:        NormalizeRole(publicUser.Role),
		IsActive:    publicUser.IsActive,
		CreatedAt:   publicUser.CreatedAt,
	}
}