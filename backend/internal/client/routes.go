package client

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
		handler = NewHandler(nil)
	}

	api := cleanRoutePrefix(apiBasePath)

	mux.Handle(
		api+"/client/profile",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleClient)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.GetMyProfile(w, r)
					case http.MethodPut:
						handler.UpdateMyProfile(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/admin/clients",
		methodOnlyHandler(
			http.MethodGet,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAdmin)(
					http.HandlerFunc(handler.ListClients),
				),
			),
		),
	)

	mux.Handle(
		api+"/admin/clients/detail",
		methodOnlyHandler(
			http.MethodGet,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAdmin)(
					http.HandlerFunc(handler.GetClientByID),
				),
			),
		),
	)
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