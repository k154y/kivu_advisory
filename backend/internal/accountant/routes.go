package accountant

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
		apiBasePath+"/admin/accountant-accounts",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminAccountants),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/accountant-accounts/detail",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminAccountantDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/accountant-accounts/status",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminAccountantStatus),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/accountant/profile",
		authOnly(
			middleware.RequireAccountant(
				http.HandlerFunc(handler.AccountantProfile),
			),
		),
	)
}
