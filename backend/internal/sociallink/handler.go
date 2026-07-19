package sociallink

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxSocialLinkRequestBodyBytes = 1 << 20

type Handler struct {
	service *Service
}

type socialLinkRequest struct {
	Platform          string `json:"platform"`
	Label             string `json:"label"`
	URL               string `json:"url"`
	IconName          string `json:"icon_name"`
	DisplayOrder      int    `json:"display_order"`
	IsActive          bool   `json:"is_active"`
	ShowInFooter      bool   `json:"show_in_footer"`
	ShowInContactPage bool   `json:"show_in_contact_page"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) PublicSocialLinks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	query := r.URL.Query()

	filter := ListSocialLinksFilter{
		Search:            query.Get("search"),
		ShowInFooter:      parseOptionalBool(query.Get("show_in_footer")),
		ShowInContactPage: parseOptionalBool(query.Get("show_in_contact_page")),
		Page:              parsePositiveInt(query.Get("page"), 1),
		PageSize:          parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListPublic(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "social links retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) AdminSocialLinks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listAdminSocialLinks(w, r)
	case http.MethodPost:
		h.createAdminSocialLink(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminSocialLinkDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminSocialLinkByID(w, r)
	case http.MethodPut:
		h.updateAdminSocialLink(w, r)
	case http.MethodDelete:
		h.deleteAdminSocialLink(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminSocialLinkStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "social link id is required", nil)
		return
	}

	var request UpdateStatusInput
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	item, err := h.service.UpdateStatusAdmin(r.Context(), id, request)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "social link status updated successfully", item)
}

func (h *Handler) listAdminSocialLinks(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	filter := ListSocialLinksFilter{
		Search:            query.Get("search"),
		IsActive:          parseOptionalBool(query.Get("is_active")),
		ShowInFooter:      parseOptionalBool(query.Get("show_in_footer")),
		ShowInContactPage: parseOptionalBool(query.Get("show_in_contact_page")),
		Page:              parsePositiveInt(query.Get("page"), 1),
		PageSize:          parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin social links retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createAdminSocialLink(w http.ResponseWriter, r *http.Request) {
	var request socialLinkRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	item, err := h.service.CreateAdmin(r.Context(), CreateSocialLinkInput{
		Platform:          request.Platform,
		Label:             request.Label,
		URL:               request.URL,
		IconName:          request.IconName,
		DisplayOrder:      request.DisplayOrder,
		IsActive:          request.IsActive,
		ShowInFooter:      request.ShowInFooter,
		ShowInContactPage: request.ShowInContactPage,
		CreatedByUserID:   userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.Created(w, "social link created successfully", item)
}

func (h *Handler) getAdminSocialLinkByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "social link id is required", nil)
		return
	}

	item, err := h.service.GetAdminByID(r.Context(), id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "social link retrieved successfully", item)
}

func (h *Handler) updateAdminSocialLink(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "social link id is required", nil)
		return
	}

	var request socialLinkRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	item, err := h.service.UpdateAdmin(r.Context(), id, UpdateSocialLinkInput{
		Platform:          request.Platform,
		Label:             request.Label,
		URL:               request.URL,
		IconName:          request.IconName,
		DisplayOrder:      request.DisplayOrder,
		IsActive:          request.IsActive,
		ShowInFooter:      request.ShowInFooter,
		ShowInContactPage: request.ShowInContactPage,
		UpdatedByUserID:   userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "social link updated successfully", item)
}

func (h *Handler) deleteAdminSocialLink(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "social link id is required", nil)
		return
	}

	if err := h.service.DeleteAdmin(r.Context(), id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "social link deleted successfully", map[string]string{
		"id": id,
	})
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxSocialLinkRequestBodyBytes)
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

func totalPages(totalItems int, pageSize int) int {
	if pageSize <= 0 || totalItems <= 0 {
		return 0
	}

	return (totalItems + pageSize - 1) / pageSize
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

	response.InternalServerError(w)
}