package statistic

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
		apiBasePath+"/statistics",
		http.HandlerFunc(handler.PublicStatistics),
	)

	mux.Handle(
		apiBasePath+"/admin/statistics",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminStatistics),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/statistics/detail",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminStatisticDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/statistics/status",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminStatisticStatus),
			),
		),
	)
}
