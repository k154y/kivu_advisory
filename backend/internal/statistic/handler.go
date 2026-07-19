package statistic

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

const maxStatisticRequestBodyBytes = 1 << 20

type Handler struct {
	service *Service
}

type statisticRequest struct {
	Value        string `json:"value"`
	Label        string `json:"label"`
	Description  string `json:"description"`
	DisplayOrder int    `json:"display_order"`
	IsActive     *bool  `json:"is_active"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) PublicStatistics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	query := r.URL.Query()

	filter := ListStatisticsFilter{
		Search:   query.Get("search"),
		Page:     parsePositiveInt(query.Get("page"), 1),
		PageSize: parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListPublic(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "statistics retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) AdminStatistics(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listAdminStatistics(w, r)
	case http.MethodPost:
		h.createAdminStatistic(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminStatisticDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminStatisticByID(w, r)
	case http.MethodPut:
		h.updateAdminStatistic(w, r)
	case http.MethodDelete:
		h.deleteAdminStatistic(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminStatisticStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "statistic id is required", nil)
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

	response.OK(w, "statistic status updated successfully", item)
}

func (h *Handler) listAdminStatistics(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	filter := ListStatisticsFilter{
		Search:   query.Get("search"),
		IsActive: parseOptionalBool(query.Get("is_active"), query.Get("active")),
		Page:     parsePositiveInt(query.Get("page"), 1),
		PageSize: parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin statistics retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createAdminStatistic(w http.ResponseWriter, r *http.Request) {
	var request statisticRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	isActive := true
	if request.IsActive != nil {
		isActive = *request.IsActive
	}

	userID := middleware.UserIDFromContext(r.Context())

	item, err := h.service.CreateAdmin(r.Context(), CreateStatisticInput{
		Value:           request.Value,
		Label:           request.Label,
		Description:     request.Description,
		DisplayOrder:    request.DisplayOrder,
		IsActive:        isActive,
		CreatedByUserID: userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.Created(w, "statistic created successfully", item)
}

func (h *Handler) getAdminStatisticByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "statistic id is required", nil)
		return
	}

	item, err := h.service.GetAdminByID(r.Context(), id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "statistic retrieved successfully", item)
}

func (h *Handler) updateAdminStatistic(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "statistic id is required", nil)
		return
	}

	var request statisticRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	isActive := true
	if request.IsActive != nil {
		isActive = *request.IsActive
	}

	userID := middleware.UserIDFromContext(r.Context())

	item, err := h.service.UpdateAdmin(r.Context(), id, UpdateStatisticInput{
		Value:           request.Value,
		Label:           request.Label,
		Description:     request.Description,
		DisplayOrder:    request.DisplayOrder,
		IsActive:        isActive,
		UpdatedByUserID: userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "statistic updated successfully", item)
}

func (h *Handler) deleteAdminStatistic(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "statistic id is required", nil)
		return
	}

	if err := h.service.DeleteAdmin(r.Context(), id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "statistic deleted successfully", map[string]string{
		"id": id,
	})
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxStatisticRequestBodyBytes)
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

func parseOptionalBool(values ...string) *bool {
	for _, value := range values {
		value = strings.TrimSpace(strings.ToLower(value))
		if value == "" {
			continue
		}

		parsed := value == "true" || value == "1" || value == "yes"

		return &parsed
	}

	return nil
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
