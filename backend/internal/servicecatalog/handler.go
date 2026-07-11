package servicecatalog

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/kyves/kivu-advisory/backend/internal/auditlog"
	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxServiceRequestBodyBytes = 1 << 20 // 1 MB

type Handler struct {
	service     *Service
	auditLogger *auditlog.Service
}

func (h *Handler) recordAudit(r *http.Request, action string, entityID string, description string) {
	if h.auditLogger == nil {
		return
	}

	user, _ := middleware.UserFromContext(r.Context())

	input := auditlog.RecordInput{
		Action:      action,
		EntityType:  "service",
		EntityID:    entityID,
		Description: description,
	}

	if user != nil {
		input.ActorUserID = user.ID
		input.ActorRole = user.Role
	}

	h.auditLogger.Record(r.Context(), input)
}

type CreateServiceRequest struct {
	Title             string `json:"title"`
	Slug              string `json:"slug"`
	ShortDescription  string `json:"short_description"`
	Description       string `json:"description"`
	Category          string `json:"category"`
	PriceLabel        string `json:"price_label"`
	ShowPriceLabel    bool   `json:"show_price_label"`
	EstimatedDuration string `json:"estimated_duration"`
	IsFeatured        bool   `json:"is_featured"`
	IsActive          bool   `json:"is_active"`
	DisplayOrder      int    `json:"display_order"`
}

type UpdateServiceRequest struct {
	Title             string `json:"title"`
	Slug              string `json:"slug"`
	ShortDescription  string `json:"short_description"`
	Description       string `json:"description"`
	Category          string `json:"category"`
	PriceLabel        string `json:"price_label"`
	ShowPriceLabel    bool   `json:"show_price_label"`
	EstimatedDuration string `json:"estimated_duration"`
	IsFeatured        bool   `json:"is_featured"`
	IsActive          bool   `json:"is_active"`
	DisplayOrder      int    `json:"display_order"`
}

type SetServiceActiveRequest struct {
	IsActive bool `json:"is_active"`
}

func NewHandler(service *Service, auditLogger *auditlog.Service) *Handler {
	return &Handler{
		service:     service,
		auditLogger: auditLogger,
	}
}

func (h *Handler) ListPublicServices(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	filter := ListServicesFilter{
		Category:   r.URL.Query().Get("category"),
		IsFeatured: parseOptionalBoolQuery(r, "featured"),
		Search:     r.URL.Query().Get("search"),
		Page:       parseIntQuery(r, "page", 1),
		PageSize:   parseIntQuery(r, "page_size", 20),
	}

	services, totalItems, err := h.service.ListPublic(r.Context(), filter)
	if err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "services retrieved successfully", map[string]any{
		"items": services,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) GetPublicServiceBySlug(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	slug := r.URL.Query().Get("slug")
	if slug == "" {
		response.BadRequest(w, "service slug is required", nil)
		return
	}

	serviceItem, err := h.service.GetPublicBySlug(r.Context(), slug)
	if err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	response.OK(w, "service retrieved successfully", serviceItem)
}

func (h *Handler) ListAdminServices(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	filter := ListServicesFilter{
		Category:   r.URL.Query().Get("category"),
		IsActive:   parseOptionalBoolQuery(r, "active"),
		IsFeatured: parseOptionalBoolQuery(r, "featured"),
		Search:     r.URL.Query().Get("search"),
		Page:       parseIntQuery(r, "page", 1),
		PageSize:   parseIntQuery(r, "page_size", 20),
	}

	services, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin services retrieved successfully", map[string]any{
		"items": services,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) CreateService(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	var request CreateServiceRequest
	if err := readServiceJSON(w, r, &request); err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	createdService, err := h.service.Create(r.Context(), request.ToInput())
	if err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	h.recordAudit(r, "service.created", createdService.ID, "Service created: "+createdService.Title)

	response.Created(w, "service created successfully", createdService)
}

func (h *Handler) GetAdminServiceByID(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	serviceID := r.URL.Query().Get("id")
	if serviceID == "" {
		response.BadRequest(w, "service id is required", nil)
		return
	}

	serviceItem, err := h.service.GetAdminByID(r.Context(), serviceID)
	if err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	response.OK(w, "admin service retrieved successfully", serviceItem)
}

func (h *Handler) UpdateService(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	serviceID := r.URL.Query().Get("id")
	if serviceID == "" {
		response.BadRequest(w, "service id is required", nil)
		return
	}

	var request UpdateServiceRequest
	if err := readServiceJSON(w, r, &request); err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	updatedService, err := h.service.Update(r.Context(), serviceID, request.ToInput())
	if err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	h.recordAudit(r, "service.updated", serviceID, "Service updated: "+updatedService.Title)

	response.OK(w, "service updated successfully", updatedService)
}

func (h *Handler) SetServiceActive(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	serviceID := r.URL.Query().Get("id")
	if serviceID == "" {
		response.BadRequest(w, "service id is required", nil)
		return
	}

	var request SetServiceActiveRequest
	if err := readServiceJSON(w, r, &request); err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	if err := h.service.SetActive(r.Context(), serviceID, request.IsActive); err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	statusLabel := "deactivated"
	if request.IsActive {
		statusLabel = "activated"
	}

	h.recordAudit(r, "service.status_updated", serviceID, "Service "+statusLabel)

	response.OK(w, "service status updated successfully", map[string]any{
		"id":        serviceID,
		"is_active": request.IsActive,
	})
}

func (h *Handler) DeleteService(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	serviceID := r.URL.Query().Get("id")
	if serviceID == "" {
		response.BadRequest(w, "service id is required", nil)
		return
	}

	if err := h.service.Delete(r.Context(), serviceID); err != nil {
		writeServiceHandlerError(w, err)
		return
	}

	h.recordAudit(r, "service.deleted", serviceID, "Service deleted")

	response.OK(w, "service deleted successfully", map[string]any{
		"id": serviceID,
	})
}

func (request CreateServiceRequest) ToInput() CreateServiceInput {
	return CreateServiceInput{
		Title:             request.Title,
		Slug:              request.Slug,
		ShortDescription:  request.ShortDescription,
		Description:       request.Description,
		Category:          request.Category,
		PriceLabel:        request.PriceLabel,
		ShowPriceLabel:    request.ShowPriceLabel,
		EstimatedDuration: request.EstimatedDuration,
		IsFeatured:        request.IsFeatured,
		IsActive:          request.IsActive,
		DisplayOrder:      request.DisplayOrder,
	}
}

func (request UpdateServiceRequest) ToInput() UpdateServiceInput {
	return UpdateServiceInput{
		Title:             request.Title,
		Slug:              request.Slug,
		ShortDescription:  request.ShortDescription,
		Description:       request.Description,
		Category:          request.Category,
		PriceLabel:        request.PriceLabel,
		ShowPriceLabel:    request.ShowPriceLabel,
		EstimatedDuration: request.EstimatedDuration,
		IsFeatured:        request.IsFeatured,
		IsActive:          request.IsActive,
		DisplayOrder:      request.DisplayOrder,
	}
}

func readServiceJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	if r.Body == nil {
		return apperrors.InvalidInput("request body is required")
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxServiceRequestBodyBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(destination); err != nil {
		var syntaxError *json.SyntaxError
		var unmarshalTypeError *json.UnmarshalTypeError
		var maxBytesError *http.MaxBytesError

		switch {
		case errors.As(err, &syntaxError):
			return apperrors.InvalidInput(fmt.Sprintf("request body contains invalid JSON near character %d", syntaxError.Offset))
		case errors.Is(err, io.ErrUnexpectedEOF):
			return apperrors.InvalidInput("request body contains invalid JSON")
		case errors.As(err, &unmarshalTypeError):
			return apperrors.InvalidInput(fmt.Sprintf("invalid value for field %q", unmarshalTypeError.Field))
		case errors.Is(err, io.EOF):
			return apperrors.InvalidInput("request body is required")
		case errors.As(err, &maxBytesError):
			return apperrors.InvalidInput("request body is too large")
		default:
			return apperrors.InvalidInput("request body is invalid")
		}
	}

	if decoder.Decode(&struct{}{}) != io.EOF {
		return apperrors.InvalidInput("request body must contain only one JSON object")
	}

	return nil
}

func writeServiceHandlerError(w http.ResponseWriter, err error) {
	if err == nil {
		response.InternalServerError(w)
		return
	}

	response.Error(
		w,
		apperrors.StatusCode(err),
		apperrors.Code(err),
		apperrors.Message(err),
		apperrors.Details(err),
	)
}

func parseIntQuery(r *http.Request, key string, defaultValue int) int {
	value := r.URL.Query().Get(key)
	if value == "" {
		return defaultValue
	}

	parsedValue, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
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

	pages := totalItems / pageSize
	if totalItems%pageSize != 0 {
		pages++
	}

	return pages
}
