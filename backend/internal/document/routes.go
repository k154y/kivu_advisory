package document

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

	allowedDocumentRoles := middleware.RequireRole(
		middleware.RoleAdmin,
		middleware.RoleClient,
		middleware.RoleAccountant,
	)

	mux.Handle(
		api+"/documents",
		middleware.RequireAuth(tokenVerifier)(
			allowedDocumentRoles(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.ListDocuments(w, r)
					case http.MethodPost:
						handler.UploadDocument(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/documents/detail",
		middleware.RequireAuth(tokenVerifier)(
			allowedDocumentRoles(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch r.Method {
					case http.MethodGet:
						handler.GetDocumentByID(w, r)
					case http.MethodPut:
						handler.UpdateDocumentMetadata(w, r)
					case http.MethodDelete:
						handler.DeleteDocument(w, r)
					default:
						response.MethodNotAllowed(w)
					}
				}),
			),
		),
	)

	mux.Handle(
		api+"/documents/download",
		methodOnlyHandler(
			http.MethodGet,
			middleware.RequireAuth(tokenVerifier)(
				allowedDocumentRoles(
					http.HandlerFunc(handler.DownloadDocument),
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
