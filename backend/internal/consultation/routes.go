package consultation

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

	mux.HandleFunc(
		apiBasePath+"/consultations",
		handler.PublicConsultations,
	)

	adminAuth := middleware.RequireAuth(tokenVerifier)

	mux.Handle(
		apiBasePath+"/admin/consultations",
		adminAuth(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminConsultations),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/consultations/detail",
		adminAuth(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminConsultationDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/consultations/status",
		adminAuth(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminConsultationStatus),
			),
		),
	)
}