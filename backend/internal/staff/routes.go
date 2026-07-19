package staff

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

	mux.Handle(apiBasePath+"/staff", http.HandlerFunc(handler.PublicStaff))
	mux.Handle(apiBasePath+"/staff/detail", http.HandlerFunc(handler.PublicStaffDetail))

	mux.Handle(
		apiBasePath+"/admin/staff",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminStaff))),
	)

	mux.Handle(
		apiBasePath+"/admin/staff/detail",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminStaffDetail))),
	)

	mux.Handle(
		apiBasePath+"/admin/staff/status",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminStaffStatus))),
	)
}
