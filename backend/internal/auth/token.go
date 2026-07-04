package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/kyves/kivu-advisory/backend/internal/config"
	"github.com/kyves/kivu-advisory/backend/internal/middleware"
)

const (
	TokenTypeBearer  = "Bearer"
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

var (
	ErrTokenRequired = errors.New("token is required")
	ErrInvalidToken  = errors.New("invalid token")
	ErrExpiredToken  = errors.New("token has expired")
	ErrInvalidSecret = errors.New("jwt secret is required")
)

type TokenManager struct {
	secret          []byte
	issuer          string
	audience        string
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

type Claims struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
	IsActive bool   `json:"is_active"`
	TokenUse string `json:"token_use"`

	jwt.RegisteredClaims
}

func NewTokenManager(cfg config.JWTConfig) (*TokenManager, error) {
	secret := strings.TrimSpace(cfg.Secret)
	if secret == "" {
		return nil, ErrInvalidSecret
	}

	if cfg.AccessTokenTTL <= 0 {
		cfg.AccessTokenTTL = 60 * time.Minute
	}

	if cfg.RefreshTokenTTL <= 0 {
		cfg.RefreshTokenTTL = 7 * 24 * time.Hour
	}

	if strings.TrimSpace(cfg.Issuer) == "" {
		cfg.Issuer = "kivu-advisory"
	}

	if strings.TrimSpace(cfg.Audience) == "" {
		cfg.Audience = "kivu-advisory-users"
	}

	return &TokenManager{
		secret:          []byte(secret),
		issuer:          cfg.Issuer,
		audience:        cfg.Audience,
		accessTokenTTL:  cfg.AccessTokenTTL,
		refreshTokenTTL: cfg.RefreshTokenTTL,
	}, nil
}

func (m *TokenManager) GenerateTokenPair(user AuthenticatedUser) (TokenResponse, error) {
	accessToken, err := m.createToken(user, TokenTypeAccess, m.accessTokenTTL)
	if err != nil {
		return TokenResponse{}, err
	}

	refreshToken, err := m.createToken(user, TokenTypeRefresh, m.refreshTokenTTL)
	if err != nil {
		return TokenResponse{}, err
	}

	return TokenResponse{
		AccessToken:           accessToken,
		RefreshToken:          refreshToken,
		TokenType:             TokenTypeBearer,
		ExpiresInSeconds:      int64(m.accessTokenTTL.Seconds()),
		RefreshExpiresSeconds: int64(m.refreshTokenTTL.Seconds()),
		User:                  user,
	}, nil
}

func (m *TokenManager) VerifyAccessToken(ctx context.Context, tokenValue string) (*middleware.AuthenticatedUser, error) {
	_ = ctx

	claims, err := m.parseToken(tokenValue)
	if err != nil {
		return nil, err
	}

	if claims.TokenUse != TokenTypeAccess {
		return nil, ErrInvalidToken
	}

	return &middleware.AuthenticatedUser{
		ID:       claims.UserID,
		Email:    claims.Email,
		FullName: claims.FullName,
		Role:     claims.Role,
		IsActive: claims.IsActive,
	}, nil
}

func (m *TokenManager) VerifyRefreshToken(tokenValue string) (*Claims, error) {
	claims, err := m.parseToken(tokenValue)
	if err != nil {
		return nil, err
	}

	if claims.TokenUse != TokenTypeRefresh {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func (m *TokenManager) createToken(user AuthenticatedUser, tokenUse string, ttl time.Duration) (string, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(ttl)

	claims := Claims{
		UserID:   user.ID,
		Email:    NormalizeEmail(user.Email),
		FullName: strings.TrimSpace(user.FullName),
		Role:     NormalizeRole(user.Role),
		IsActive: user.IsActive,
		TokenUse: tokenUse,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			Issuer:    m.issuer,
			Audience:  jwt.ClaimStrings{m.audience},
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString(m.secret)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}

	return signedToken, nil
}

func (m *TokenManager) parseToken(tokenValue string) (*Claims, error) {
	tokenValue = strings.TrimSpace(tokenValue)
	if tokenValue == "" {
		return nil, ErrTokenRequired
	}

	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenValue, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, ErrInvalidToken
		}

		return m.secret, nil
	},
		jwt.WithIssuer(m.issuer),
		jwt.WithAudience(m.audience),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}

		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	if token == nil || !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.UserID == "" || claims.Email == "" || claims.Role == "" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}