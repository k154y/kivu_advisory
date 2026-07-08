package notification

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) Notifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	query := r.URL.Query()

	filter := ListNotificationsFilter{
		NotificationType: query.Get("notification_type"),
		IsRead:           parseOptionalBool(query.Get("is_read")),
		Page:             parsePositiveInt(query.Get("page"), 1),
		PageSize:         parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	notifications, totalItems, unreadCount, err := h.service.ListForUser(r.Context(), user.ID, filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "notifications retrieved successfully", map[string]any{
		"items":        notifications,
		"unread_count": unreadCount,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
		},
	})
}

func (h *Handler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	unreadCount, err := h.service.CountUnreadForUser(r.Context(), user.ID)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "unread notifications counted successfully", map[string]int{
		"unread_count": unreadCount,
	})
}

func (h *Handler) NotificationRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "notification id is required", nil)
		return
	}

	updatedNotification, err := h.service.MarkReadForUser(r.Context(), id, user.ID)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "notification marked as read successfully", updatedNotification)
}

func (h *Handler) NotificationReadAll(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	if err := h.service.MarkAllReadForUser(r.Context(), user.ID); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "all notifications marked as read successfully", nil)
}

func (h *Handler) NotificationDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		response.MethodNotAllowed(w)
		return
	}

	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "notification id is required", nil)
		return
	}

	if err := h.service.DeleteForUser(r.Context(), id, user.ID); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "notification deleted successfully", nil)
}

func parsePositiveInt(value string, fallback int) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}

	parsedValue, err := strconv.Atoi(value)
	if err != nil || parsedValue <= 0 {
		return fallback
	}

	return parsedValue
}

func parseOptionalBool(value string) *bool {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return nil
	}

	parsed := value == "true" || value == "1" || value == "yes"

	return &parsed
}

func respondError(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}

	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		response.Error(w, appErr.StatusCode, appErr.Code, appErr.Message, appErr.Details)
		return
	}

	response.Error(w, http.StatusInternalServerError, "internal_error", "internal server error", nil)
}
