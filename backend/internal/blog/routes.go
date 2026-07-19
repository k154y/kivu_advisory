package blog

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

	mux.Handle(apiBasePath+"/blog", http.HandlerFunc(handler.PublicPosts))
	mux.Handle(apiBasePath+"/blog/detail", http.HandlerFunc(handler.PublicPostDetail))

	mux.Handle(
		apiBasePath+"/admin/blog",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminPosts))),
	)
	mux.Handle(
		apiBasePath+"/admin/blog/detail",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminPostDetail))),
	)
	mux.Handle(
		apiBasePath+"/admin/blog/status",
		authOnly(middleware.RequireAdmin(http.HandlerFunc(handler.AdminPostStatus))),
	)
}
