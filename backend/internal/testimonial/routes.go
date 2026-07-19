package testimonial

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

	mux.Handle(apiBasePath+"/testimonials", http.HandlerFunc(handler.PublicTestimonials))

	mux.Handle(
		apiBasePath+"/admin/testimonials",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminTestimonials))),
	)

	mux.Handle(
		apiBasePath+"/admin/testimonials/detail",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminTestimonialDetail))),
	)

	mux.Handle(
		apiBasePath+"/admin/testimonials/status",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminTestimonialStatus))),
	)
}
