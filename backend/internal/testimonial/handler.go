package testimonial

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

const maxTestimonialRequestBodyBytes = 1 << 20

type Handler struct {
	service *Service
}

type testimonialRequest struct {
	ClientName   string `json:"client_name"`
	ClientRole   string `json:"client_role"`
	CompanyName  string `json:"company_name"`
	Content      string `json:"content"`
	Rating       int    `json:"rating"`
	PhotoURL     string `json:"photo_url"`
	IsFeatured   bool   `json:"is_featured"`
	DisplayOrder int    `json:"display_order"`
	IsActive     bool   `json:"is_active"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) PublicTestimonials(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	query := r.URL.Query()

	filter := ListTestimonialsFilter{
		Search:     query.Get("search"),
		IsFeatured: parseOptionalBool(query.Get("featured")),
		Page:       parsePositiveInt(query.Get("page"), 1),
		PageSize:   parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListPublic(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "testimonials retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) AdminTestimonials(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listAdminTestimonials(w, r)
	case http.MethodPost:
		h.createAdminTestimonial(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminTestimonialDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminTestimonialByID(w, r)
	case http.MethodPut:
		h.updateAdminTestimonial(w, r)
	case http.MethodDelete:
		h.deleteAdminTestimonial(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminTestimonialStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "testimonial id is required", nil)
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

	response.OK(w, "testimonial status updated successfully", item)
}

func (h *Handler) listAdminTestimonials(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	filter := ListTestimonialsFilter{
		Search:     query.Get("search"),
		IsFeatured: parseOptionalBool(query.Get("is_featured")),
		IsActive:   parseOptionalBool(query.Get("is_active")),
		Page:       parsePositiveInt(query.Get("page"), 1),
		PageSize:   parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin testimonials retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createAdminTestimonial(w http.ResponseWriter, r *http.Request) {
	var request testimonialRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	item, err := h.service.CreateAdmin(r.Context(), CreateTestimonialInput{
		ClientName:      request.ClientName,
		ClientRole:      request.ClientRole,
		CompanyName:     request.CompanyName,
		Content:         request.Content,
		Rating:          request.Rating,
		PhotoURL:        request.PhotoURL,
		IsFeatured:      request.IsFeatured,
		DisplayOrder:    request.DisplayOrder,
		IsActive:        request.IsActive,
		CreatedByUserID: userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.Created(w, "testimonial created successfully", item)
}

func (h *Handler) getAdminTestimonialByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "testimonial id is required", nil)
		return
	}

	item, err := h.service.GetAdminByID(r.Context(), id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "testimonial retrieved successfully", item)
}

func (h *Handler) updateAdminTestimonial(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "testimonial id is required", nil)
		return
	}

	var request testimonialRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	item, err := h.service.UpdateAdmin(r.Context(), id, UpdateTestimonialInput{
		ClientName:      request.ClientName,
		ClientRole:      request.ClientRole,
		CompanyName:     request.CompanyName,
		Content:         request.Content,
		Rating:          request.Rating,
		PhotoURL:        request.PhotoURL,
		IsFeatured:      request.IsFeatured,
		DisplayOrder:    request.DisplayOrder,
		IsActive:        request.IsActive,
		UpdatedByUserID: userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "testimonial updated successfully", item)
}

func (h *Handler) deleteAdminTestimonial(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "testimonial id is required", nil)
		return
	}

	if err := h.service.DeleteAdmin(r.Context(), id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "testimonial deleted successfully", map[string]string{
		"id": id,
	})
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxTestimonialRequestBodyBytes)
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
