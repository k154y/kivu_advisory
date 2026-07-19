package message

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
		apiBasePath+"/messages",
		authOnly(http.HandlerFunc(handler.Messages)),
	)

	mux.Handle(
		apiBasePath+"/messages/detail",
		authOnly(http.HandlerFunc(handler.MessageDetail)),
	)

	mux.Handle(
		apiBasePath+"/messages/read",
		authOnly(http.HandlerFunc(handler.MessageRead)),
	)
}
