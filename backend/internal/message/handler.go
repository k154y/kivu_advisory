package message

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/kyves/kivu-advisory/backend/internal/client"
	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

type ClientProfileService interface {
	GetByUserID(ctx context.Context, userID string) (*client.PublicClient, error)
}

type Handler struct {
	service       *Service
	clientService ClientProfileService
}

func NewHandler(service *Service, clientService ClientProfileService) *Handler {
	return &Handler{
		service:       service,
		clientService: clientService,
	}
}

type createMessageRequest struct {
	ServiceRequestID string `json:"service_request_id"`
	RecipientUserID  string `json:"recipient_user_id"`
	Subject          string `json:"subject"`
	Body             string `json:"body"`
	MessageType      string `json:"message_type"`
	Visibility       string `json:"visibility"`
	IsInternal       bool   `json:"is_internal"`
}

func (h *Handler) Messages(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listMessages(w, r)
	case http.MethodPost:
		h.createMessage(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) MessageDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getMessageByID(w, r)
	case http.MethodDelete:
		h.deleteMessage(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) MessageRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	actor, err := h.actorFromRequest(r)
	if err != nil {
		respondError(w, err)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "message id is required", nil)
		return
	}

	updatedMessage, err := h.service.MarkRead(r.Context(), actor, id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "message marked as read successfully", updatedMessage)
}

func (h *Handler) listMessages(w http.ResponseWriter, r *http.Request) {
	actor, err := h.actorFromRequest(r)
	if err != nil {
		respondError(w, err)
		return
	}

	query := r.URL.Query()

	filter := ListMessagesFilter{
		ServiceRequestID: query.Get("service_request_id"),
		SenderUserID:     query.Get("sender_user_id"),
		RecipientUserID:  query.Get("recipient_user_id"),
		MessageType:      query.Get("message_type"),
		Visibility:       query.Get("visibility"),
		Search:           query.Get("search"),
		UnreadOnly:       parseBool(query.Get("unread_only")),
		Page:             parsePositiveInt(query.Get("page"), 1),
		PageSize:         parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	messages, totalItems, err := h.service.List(r.Context(), actor, filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "messages retrieved successfully", map[string]any{
		"items": messages,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createMessage(w http.ResponseWriter, r *http.Request) {
	actor, err := h.actorFromRequest(r)
	if err != nil {
		respondError(w, err)
		return
	}

	var request createMessageRequest
	if err := readJSON(w, r, &request); err != nil {
		response.BadRequest(w, "invalid request body", map[string]string{
			"body": err.Error(),
		})
		return
	}

	createdMessage, err := h.service.Create(r.Context(), actor, CreateMessageInput{
		ServiceRequestID: request.ServiceRequestID,
		RecipientUserID:  request.RecipientUserID,
		Subject:          request.Subject,
		Body:             request.Body,
		MessageType:      request.MessageType,
		Visibility:       request.Visibility,
		IsInternal:       request.IsInternal,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "message created successfully", createdMessage)
}

func (h *Handler) getMessageByID(w http.ResponseWriter, r *http.Request) {
	actor, err := h.actorFromRequest(r)
	if err != nil {
		respondError(w, err)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "message id is required", nil)
		return
	}

	foundMessage, err := h.service.GetByID(r.Context(), actor, id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "message retrieved successfully", foundMessage)
}

func (h *Handler) deleteMessage(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	if user.Role != middleware.RoleAdmin {
		response.Forbidden(w, "only admin can delete messages")
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "message id is required", nil)
		return
	}

	if err := h.service.DeleteAdmin(r.Context(), id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "message deleted successfully", nil)
}

func (h *Handler) actorFromRequest(r *http.Request) (Actor, error) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		return Actor{}, apperrors.InvalidInput("authenticated user is required")
	}

	actor := Actor{
		UserID: user.ID,
		Role:   user.Role,
	}

	if user.Role == middleware.RoleClient {
		if h.clientService == nil {
			return Actor{}, apperrors.Internal("client service is not initialized")
		}

		clientProfile, err := h.clientService.GetByUserID(r.Context(), user.ID)
		if err != nil {
			return Actor{}, err
		}

		actor.ClientID = clientProfile.ID
	}

	return actor, nil
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	return decoder.Decode(destination)
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

func totalPages(totalItems int, pageSize int) int {
	if pageSize <= 0 || totalItems <= 0 {
		return 0
	}

	return (totalItems + pageSize - 1) / pageSize
}

func parseBool(value string) bool {
	value = strings.TrimSpace(strings.ToLower(value))

	return value == "true" || value == "1" || value == "yes"
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
