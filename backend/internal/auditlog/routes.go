package auditlog

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
		apiBasePath+"/admin/audit-log",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminAuditLogs))),
	)
}
