package sociallink

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

	mux.Handle(
		apiBasePath+"/social-links",
		http.HandlerFunc(handler.PublicSocialLinks),
	)

	mux.Handle(
		apiBasePath+"/admin/social-links",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminSocialLinks))),
	)

	mux.Handle(
		apiBasePath+"/admin/social-links/detail",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminSocialLinkDetail))),
	)

	mux.Handle(
		apiBasePath+"/admin/social-links/status",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminSocialLinkStatus))),
	)
}
