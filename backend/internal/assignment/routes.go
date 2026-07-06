package assignment

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
		api+"/admin/assignments",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleAdmin)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.ListAdminAssignments(w, r)
					case http.MethodPost:
						handler.CreateAssignment(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/admin/assignments/detail",
		middleware.RequireAuth(tokenVerifier)(
			middleware.RequireRole(middleware.RoleAdmin)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.GetAdminAssignmentByID(w, r)
					case http.MethodPut:
						handler.UpdateAdminAssignment(w, r)
					case http.MethodDelete:
						handler.DeleteAdminAssignment(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/admin/assignments/status",
		methodOnlyHandler(
			http.MethodPatch,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAdmin)(
					http.HandlerFunc(handler.UpdateAdminAssignmentStatus),
				),
			),
		),
	)

	mux.Handle(
		api+"/accountant/assignments",
		methodOnlyHandler(
			http.MethodGet,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAccountant)(
					http.HandlerFunc(handler.ListAccountantAssignments),
				),
			),
		),
	)

	mux.Handle(
		api+"/accountant/assignments/detail",
		methodOnlyHandler(
			http.MethodGet,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAccountant)(
					http.HandlerFunc(handler.GetAccountantAssignmentByID),
				),
			),
		),
	)

	mux.Handle(
		api+"/accountant/assignments/status",
		methodOnlyHandler(
			http.MethodPatch,
			middleware.RequireAuth(tokenVerifier)(
				middleware.RequireRole(middleware.RoleAccountant)(
					http.HandlerFunc(handler.UpdateAccountantAssignmentStatus),
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
