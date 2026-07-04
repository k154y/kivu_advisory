package servicecatalog

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
		api+"/services",
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				handler.ListPublicServices(w, r)
			default:
				response.MethodNotAllowed(w)
			}
		}),
	)

	mux.Handle(
		api+"/services/detail",
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				handler.GetPublicServiceBySlug(w, r)
			default:
				response.MethodNotAllowed(w)
			}
		}),
	)

	mux.Handle(
		api+"/admin/services",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleAdmin)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.ListAdminServices(w, r)
					case http.MethodPost:
						handler.CreateService(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/admin/services/detail",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleAdmin)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.GetAdminServiceByID(w, r)
					case http.MethodPut:
						handler.UpdateService(w, r)
					case http.MethodDelete:
						handler.DeleteService(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/admin/services/status",
		methodOnlyHandler(
			http.MethodPatch,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAdmin)(
					http.HandlerFunc(handler.SetServiceActive),
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