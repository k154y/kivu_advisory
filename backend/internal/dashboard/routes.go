package dashboard

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
		apiBasePath+"/admin/dashboard/stats",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminStats))),
	)
}
