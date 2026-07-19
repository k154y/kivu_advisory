package notification

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
		apiBasePath+"/notifications",
		authOnly(http.HandlerFunc(handler.Notifications)),
	)

	mux.Handle(
		apiBasePath+"/notifications/unread-count",
		authOnly(http.HandlerFunc(handler.UnreadCount)),
	)

	mux.Handle(
		apiBasePath+"/notifications/read",
		authOnly(http.HandlerFunc(handler.NotificationRead)),
	)

	mux.Handle(
		apiBasePath+"/notifications/read-all",
		authOnly(http.HandlerFunc(handler.NotificationReadAll)),
	)

	mux.Handle(
		apiBasePath+"/notifications/detail",
		authOnly(http.HandlerFunc(handler.NotificationDetail)),
	)
}
