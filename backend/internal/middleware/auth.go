package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

type contextKey string

const authUserContextKey contextKey = "auth_user"

const (
	RoleAdmin      = "admin"
	RoleClient     = "client"
	RoleAccountant = "accountant"
)

type AuthenticatedUser struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
	IsActive bool   `json:"is_active"`
}

type TokenVerifier interface {
	VerifyAccessToken(ctx context.Context, token string) (*AuthenticatedUser, error)
}

func RequireAuth(verifier TokenVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if verifier == nil {
				response.InternalServerError(w)
				return
			}

			token := bearerToken(r)
			if token == "" {
				response.Unauthorized(w, "authentication token is required")
				return
			}

			user, err := verifier.VerifyAccessToken(r.Context(), token)
			if err != nil {
				response.Unauthorized(w, "invalid or expired authentication token")
				return
			}

			if user == nil || !user.IsActive {
				response.Unauthorized(w, "user account is not active")
				return
			}

			ctx := context.WithValue(r.Context(), authUserContextKey, user)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(verifier TokenVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if verifier == nil {
				next.ServeHTTP(w, r)
				return
			}

			token := bearerToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}

			user, err := verifier.VerifyAccessToken(r.Context(), token)
			if err != nil || user == nil || !user.IsActive {
				next.ServeHTTP(w, r)
				return
			}

			ctx := context.WithValue(r.Context(), authUserContextKey, user)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool)

	for _, role := range allowedRoles {
		role = strings.TrimSpace(strings.ToLower(role))
		if role != "" {
			allowed[role] = true
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := UserFromContext(r.Context())
			if !ok || user == nil {
				response.Unauthorized(w, "authentication is required")
				return
			}

			role := strings.TrimSpace(strings.ToLower(user.Role))
			if !allowed[role] {
				response.Forbidden(w, "you do not have permission to access this resource")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RequireAdmin(next http.Handler) http.Handler {
	return RequireRole(RoleAdmin)(next)
}

func RequireClient(next http.Handler) http.Handler {
	return RequireRole(RoleClient)(next)
}

func RequireAccountant(next http.Handler) http.Handler {
	return RequireRole(RoleAccountant)(next)
}

func UserFromContext(ctx context.Context) (*AuthenticatedUser, bool) {
	user, ok := ctx.Value(authUserContextKey).(*AuthenticatedUser)
	return user, ok
}

func UserIDFromContext(ctx context.Context) string {
	user, ok := UserFromContext(ctx)
	if !ok || user == nil {
		return ""
	}

	return user.ID
}

func UserRoleFromContext(ctx context.Context) string {
	user, ok := UserFromContext(ctx)
	if !ok || user == nil {
		return ""
	}

	return user.Role
}

func bearerToken(r *http.Request) string {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if header == "" {
		return ""
	}

	parts := strings.Fields(header)
	if len(parts) != 2 {
		return ""
	}

	if !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}

