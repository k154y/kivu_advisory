package servicerequest

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
		handler = NewHandler(nil, nil, nil)
	}

	api := cleanRoutePrefix(apiBasePath)

	mux.Handle(
		api+"/service-requests",
		methodOnlyHandler(
			http.MethodPost,
			http.HandlerFunc(handler.CreateVisitorRequest),
		),
	)

	mux.Handle(
		api+"/client/service-requests",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleClient)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.ListClientRequests(w, r)
					case http.MethodPost:
						handler.CreateClientRequest(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/client/service-requests/detail",
		methodOnlyHandler(
			http.MethodGet,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleClient)(
					http.HandlerFunc(handler.GetClientRequestByID),
				),
			),
		),
	)

	mux.Handle(
		api+"/admin/service-requests",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleAdmin)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.ListAdminRequests(w, r)
					case http.MethodPost:
						handler.CreateAdminRequest(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/admin/service-requests/detail",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleAdmin)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.GetAdminRequestByID(w, r)
					case http.MethodPut:
						handler.UpdateAdminRequest(w, r)
					case http.MethodDelete:
						handler.DeleteAdminRequest(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/admin/service-requests/status",
		methodOnlyHandler(
			http.MethodPatch,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAdmin)(
					http.HandlerFunc(handler.UpdateRequestStatus),
				),
			),
		),
	)

	mux.Handle(
		api+"/admin/service-requests/reference",
		methodOnlyHandler(
			http.MethodGet,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAdmin)(
					http.HandlerFunc(handler.GetAdminRequestByReferenceNumber),
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
