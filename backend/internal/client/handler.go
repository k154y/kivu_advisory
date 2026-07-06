package client

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxClientRequestBodyBytes = 1 << 20 // 1 MB

type Handler struct {
	service *Service
}

type UpdateClientProfileRequest struct {
	CompanyName  string `json:"company_name"`
	TIN          string `json:"tin"`
	BusinessType string `json:"business_type"`
	Address      string `json:"address"`
	City         string `json:"city"`
	Country      string `json:"country"`
	Website      string `json:"website"`
	Notes        string `json:"notes"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) GetMyProfile(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	currentUser, ok := middleware.UserFromContext(r.Context())
	if !ok || currentUser == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	clientProfile, err := h.service.GetByUserID(r.Context(), currentUser.ID)
	if err != nil {
		writeClientHandlerError(w, err)
		return
	}

	response.OK(w, "client profile retrieved successfully", clientProfile)
}

func (h *Handler) UpdateMyProfile(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	currentUser, ok := middleware.UserFromContext(r.Context())
	if !ok || currentUser == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	var request UpdateClientProfileRequest
	if err := readClientJSON(w, r, &request); err != nil {
		writeClientHandlerError(w, err)
		return
	}

	updatedProfile, err := h.service.UpdateByUserID(r.Context(), currentUser.ID, request.ToInput())
	if err != nil {
		writeClientHandlerError(w, err)
		return
	}

	response.OK(w, "client profile updated successfully", updatedProfile)
}

func (h *Handler) ListClients(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	filter := ListClientsFilter{
		Search:   r.URL.Query().Get("search"),
		Page:     parseIntQuery(r, "page", 1),
		PageSize: parseIntQuery(r, "page_size", 20),
	}

	clients, totalItems, err := h.service.List(r.Context(), filter)
	if err != nil {
		writeClientHandlerError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "clients retrieved successfully", map[string]any{
		"items": clients,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) GetClientByID(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	clientID := r.URL.Query().Get("id")
	if clientID == "" {
		response.BadRequest(w, "client id is required", nil)
		return
	}

	clientProfile, err := h.service.GetByID(r.Context(), clientID)
	if err != nil {
		writeClientHandlerError(w, err)
		return
	}

	response.OK(w, "client profile retrieved successfully", clientProfile)
}

func (request UpdateClientProfileRequest) ToInput() UpdateClientInput {
	return UpdateClientInput{
		CompanyName:  request.CompanyName,
		TIN:          request.TIN,
		BusinessType: request.BusinessType,
		Address:      request.Address,
		City:         request.City,
		Country:      request.Country,
		Website:      request.Website,
		Notes:        request.Notes,
	}
}

func readClientJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	if r.Body == nil {
		return apperrors.InvalidInput("request body is required")
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxClientRequestBodyBytes)

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

func writeClientHandlerError(w http.ResponseWriter, err error) {
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
