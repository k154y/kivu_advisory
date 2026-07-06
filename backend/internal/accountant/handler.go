package accountant
package accountant

import (
	"encoding/json"
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

func (h *Handler) AdminAccountants(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	h.listAdminAccountants(w, r)
}

func (h *Handler) AdminAccountantDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "accountant id is required", nil)
		return
	}

	foundAccountant, err := h.service.GetAdminByID(r.Context(), id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "accountant retrieved successfully", foundAccountant)
}

func (h *Handler) AdminAccountantStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "accountant id is required", nil)
		return
	}

	var request UpdateStatusInput
	if err := readJSON(w, r, &request); err != nil {
		response.BadRequest(w, "invalid request body", map[string]string{
			"body": err.Error(),
		})
		return
	}

	updatedAccountant, err := h.service.SetActiveAdmin(r.Context(), id, request)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "accountant status updated successfully", updatedAccountant)
}

func (h *Handler) AccountantProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	foundAccountant, err := h.service.GetProfile(r.Context(), user.ID)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "accountant profile retrieved successfully", foundAccountant)
}

func (h *Handler) listAdminAccountants(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	filter := ListAccountantsFilter{
		Search:   query.Get("search"),
		IsActive: parseOptionalBool(query.Get("is_active")),
		Page:     parsePositiveInt(query.Get("page"), 1),
		PageSize: parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	accountants, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "accountants retrieved successfully", map[string]any{
		"items": accountants,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
		},
	})
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