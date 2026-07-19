package taxcredential

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
		apiBasePath+"/tax-credential-systems",
		http.HandlerFunc(handler.PublicCredentialSystems),
	)

	mux.Handle(
		apiBasePath+"/admin/tax-credential-systems",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminCredentialSystems),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/tax-credential-systems/detail",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminCredentialSystemDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/tax-credential-systems/status",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminCredentialSystemStatus),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/client/tax-credentials",
		authOnly(
			middleware.RequireClient(
				http.HandlerFunc(handler.ClientCredentials),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/client/tax-credentials/detail",
		authOnly(
			middleware.RequireClient(
				http.HandlerFunc(handler.ClientCredentialDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/client/tax-credentials/reveal",
		authOnly(
			middleware.RequireClient(
				http.HandlerFunc(handler.ClientCredentialReveal),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/tax-credentials",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminCredentials),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/tax-credentials/detail",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminCredentialDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/tax-credentials/status",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminCredentialStatus),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/tax-credentials/reveal",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminCredentialReveal),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/accountant/tax-credentials",
		authOnly(
			middleware.RequireAccountant(
				http.HandlerFunc(handler.AccountantCredentials),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/accountant/tax-credentials/detail",
		authOnly(
			middleware.RequireAccountant(
				http.HandlerFunc(handler.AccountantCredentialDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/accountant/tax-credentials/reveal",
		authOnly(
			middleware.RequireAccountant(
				http.HandlerFunc(handler.AccountantCredentialReveal),
			),
		),
	)
}