package auth

import (
	"net/http"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

func RegisterRoutes(
	mux *http.ServeMux,
	apiBasePath string,
	handler *Handler,
	tokenVerifier middleware.TokenVerifier,
) {
	if mux == nil {
		return
	}

	if handler == nil {
		handler = NewHandler(nil, nil)
	}

	api := cleanRoutePrefix(apiBasePath)

	mux.HandleFunc(api+"/auth/login", methodOnly(http.MethodPost, handler.Login))
	mux.HandleFunc(api+"/auth/register", methodOnly(http.MethodPost, handler.RegisterClient))
	mux.HandleFunc(api+"/auth/refresh", methodOnly(http.MethodPost, handler.RefreshToken))

	mux.Handle(
		api+"/auth/me",
		methodOnlyHandler(
			http.MethodGet,
			middleware.RequireAuth(tokenVerifier)(http.HandlerFunc(handler.Me)),
		),
	)

	mux.Handle(
		api+"/auth/profile",
		methodOnlyHandler(
			http.MethodPut,
			middleware.RequireAuth(tokenVerifier)(http.HandlerFunc(handler.UpdateProfile)),
		),
	)

	mux.Handle(
		api+"/auth/change-password",
		methodOnlyHandler(
			http.MethodPatch,
			middleware.RequireAuth(tokenVerifier)(http.HandlerFunc(handler.ChangePassword)),
		),
	)

	mux.Handle(
		http.MethodPost+" "+api+"/admin/accountants",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleAdmin)(
				http.HandlerFunc(handler.CreateAccountant),
			),
		),
	)
}

func methodOnly(method string, handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			response.MethodNotAllowed(w)
			return
		}

		handler(w, r)
	}
}

func methodOnlyHandler(method string, handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			response.MethodNotAllowed(w)
			return
		}

		handler.ServeHTTP(w, r)
	})
}

func cleanRoutePrefix(prefix string) string {
	if prefix == "" {
		return "/api/v1"
	}

	if prefix[0] != '/' {
		prefix = "/" + prefix
	}

	if len(prefix) > 1 && prefix[len(prefix)-1] == '/' {
		prefix = prefix[:len(prefix)-1]
	}

	return prefix
}
