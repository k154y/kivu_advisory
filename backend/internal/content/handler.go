package content

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxContentRequestBodyBytes = 1 << 20

type Handler struct {
	service *Service
}

type createContentRequest struct {
	ContentKey      string `json:"content_key"`
	Title           string `json:"title"`
	Slug            string `json:"slug"`
	ContentType     string `json:"content_type"`
	Body            string `json:"body"`
	Summary         string `json:"summary"`
	MetaTitle       string `json:"meta_title"`
	MetaDescription string `json:"meta_description"`
	ImageURL        string `json:"image_url"`
	ButtonLabel     string `json:"button_label"`
	ButtonURL       string `json:"button_url"`
	IsActive        bool   `json:"is_active"`
	DisplayOrder    int    `json:"display_order"`
}

type updateContentRequest = createContentRequest

type setContentStatusRequest struct {
	IsActive bool `json:"is_active"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) PublicContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	filter := ListContentFilter{
		ContentType: r.URL.Query().Get("content_type"),
		Search:      r.URL.Query().Get("search"),
		Page:        parseIntQuery(r, "page", 1),
		PageSize:    parseIntQuery(r, "page_size", 20),
	}

	items, totalItems, err := h.service.ListPublic(r.Context(), filter)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	filter = filter.Normalize()
	response.OK(w, "content retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) PublicContentDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		response.BadRequest(w, "content slug is required", nil)
		return
	}

	item, err := h.service.GetPublicBySlug(r.Context(), slug)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "content retrieved successfully", item)
}

func (h *Handler) AdminContent(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listAdminContent(w, r)
	case http.MethodPost:
		h.createContent(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminContentDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminContentByID(w, r)
	case http.MethodPut:
		h.updateContent(w, r)
	case http.MethodDelete:
		h.deleteContent(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminContentStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		response.BadRequest(w, "content id is required", nil)
		return
	}

	var request setContentStatusRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	if err := h.service.SetActive(r.Context(), id, request.IsActive, userID); err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "content status updated successfully", map[string]any{
		"id":        id,
		"is_active": request.IsActive,
	})
}

func (h *Handler) listAdminContent(w http.ResponseWriter, r *http.Request) {
	filter := ListContentFilter{
		ContentType: r.URL.Query().Get("content_type"),
		IsActive:    parseOptionalBoolQuery(r, "active"),
		Search:      r.URL.Query().Get("search"),
		Page:        parseIntQuery(r, "page", 1),
		PageSize:    parseIntQuery(r, "page_size", 20),
	}

	items, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	filter = filter.Normalize()
	response.OK(w, "admin content retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createContent(w http.ResponseWriter, r *http.Request) {
	var request createContentRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	item, err := h.service.Create(r.Context(), CreateContentInput{
		ContentKey:      request.ContentKey,
		Title:           request.Title,
		Slug:            request.Slug,
		ContentType:     request.ContentType,
		Body:            request.Body,
		Summary:         request.Summary,
		MetaTitle:       request.MetaTitle,
		MetaDescription: request.MetaDescription,
		ImageURL:        request.ImageURL,
		ButtonLabel:     request.ButtonLabel,
		ButtonURL:       request.ButtonURL,
		IsActive:        request.IsActive,
		DisplayOrder:    request.DisplayOrder,
		CreatedByUserID: userID,
		UpdatedByUserID: userID,
	})
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.Created(w, "content created successfully", item)
}

func (h *Handler) getAdminContentByID(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.BadRequest(w, "content id is required", nil)
		return
	}

	item, err := h.service.GetAdminByID(r.Context(), id)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "content retrieved successfully", item)
}

func (h *Handler) updateContent(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.BadRequest(w, "content id is required", nil)
		return
	}

	var request updateContentRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())
	item, err := h.service.Update(r.Context(), id, UpdateContentInput{
		ContentKey:      request.ContentKey,
		Title:           request.Title,
		Slug:            request.Slug,
		ContentType:     request.ContentType,
		Body:            request.Body,
		Summary:         request.Summary,
		MetaTitle:       request.MetaTitle,
		MetaDescription: request.MetaDescription,
		ImageURL:        request.ImageURL,
		ButtonLabel:     request.ButtonLabel,
		ButtonURL:       request.ButtonURL,
		IsActive:        request.IsActive,
		DisplayOrder:    request.DisplayOrder,
		UpdatedByUserID: userID,
	})
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "content updated successfully", item)
}

func (h *Handler) deleteContent(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		response.BadRequest(w, "content id is required", nil)
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "content deleted successfully", map[string]any{"id": id})
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxContentRequestBodyBytes)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(destination); err != nil {
		if errors.Is(err, io.EOF) {
			return apperrors.InvalidInput("request body is required")
		}
		return apperrors.InvalidInput("invalid request body")
	}

	return nil
}

func parseIntQuery(r *http.Request, key string, fallback int) int {
	value := r.URL.Query().Get(key)
	if value == "" {
		return fallback
	}

	parsedValue, err := strconv.Atoi(value)
	if err != nil || parsedValue <= 0 {
		return fallback
	}

	return parsedValue
}

func parseOptionalBoolQuery(r *http.Request, key string) *bool {
	value := r.URL.Query().Get(key)
	if value == "" {
		return nil
	}

	parsedValue, err := strconv.ParseBool(value)
	if err != nil {
		return nil
	}

	return &parsedValue
}

func totalPages(totalItems int, pageSize int) int {
	if pageSize <= 0 {
		return 0
	}
	if totalItems == 0 {
		return 0
	}
	return (totalItems + pageSize - 1) / pageSize
}

func writeHandlerError(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}

	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		response.Error(w, appErr.StatusCode, appErr.Code, appErr.Message, appErr.Details)
		return
	}

	response.InternalServerError(w)
}
