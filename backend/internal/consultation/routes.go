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

	authOnly := middleware.RequireAuth(tokenVerifier)

	mux.HandleFunc(
		apiBasePath+"/consultations",
		handler.PublicConsultations,
	)

	mux.Handle(
		apiBasePath+"/admin/consultations",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminConsultations),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/consultations/detail",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminConsultationDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/admin/consultations/status",
		authOnly(
			middleware.RequireAdmin(
				http.HandlerFunc(handler.AdminConsultationStatus),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/accountant/consultations",
		authOnly(
			middleware.RequireAccountant(
				http.HandlerFunc(handler.AccountantConsultations),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/accountant/consultations/detail",
		authOnly(
			middleware.RequireAccountant(
				http.HandlerFunc(handler.AccountantConsultationDetail),
			),
		),
	)

	mux.Handle(
		apiBasePath+"/accountant/consultations/status",
		authOnly(
			middleware.RequireAccountant(
				http.HandlerFunc(handler.AccountantConsultationStatus),
			),
		),
	)
}