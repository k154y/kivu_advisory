package content

import (
	"net/http"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
)

func RegisterRoutes(
	mux *http.ServeMux,
	apiBasePath string,
	handler *Handler,
	tokenVerifier middleware.TokenVerifier,
) {
	if mux == nil || handler == nil {
		return
	}

	authOnly := middleware.RequireAuth(tokenVerifier)

	mux.Handle(apiBasePath+"/content", http.HandlerFunc(handler.PublicContent))
	mux.Handle(apiBasePath+"/content/detail", http.HandlerFunc(handler.PublicContentDetail))

	mux.Handle(
		apiBasePath+"/admin/content",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminContent))),
	)
	mux.Handle(
		apiBasePath+"/admin/content/detail",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminContentDetail))),
	)
	mux.Handle(
		apiBasePath+"/admin/content/status",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminContentStatus))),
	)
}
