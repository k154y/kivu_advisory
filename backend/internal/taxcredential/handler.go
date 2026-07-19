package taxcredential

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

const maxTaxCredentialRequestBodyBytes = 1 << 20

type Handler struct {
	service *Service
}

type credentialSystemRequest struct {
	SystemName   string `json:"system_name"`
	LoginURL     string `json:"login_url"`
	Description  string `json:"description"`
	DisplayOrder int    `json:"display_order"`
	IsActive     *bool  `json:"is_active"`
}

type clientCredentialRequest struct {
	SystemID string `json:"system_id"`
	Username string `json:"username"`
	Password string `json:"password"`
	Notes    string `json:"notes"`
	IsActive *bool  `json:"is_active"`
}

type activeStatusRequest struct {
	IsActive bool `json:"is_active"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

/*
PUBLIC SYSTEMS

Used by client frontend to show the list of systems created by admin.
*/

func (h *Handler) PublicCredentialSystems(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	query := r.URL.Query()

	filter := ListCredentialSystemsFilter{
		Search:   query.Get("search"),
		Page:     parsePositiveInt(query.Get("page"), 1),
		PageSize: parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListPublicSystems(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "tax credential systems retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

/*
ADMIN SYSTEM MANAGEMENT

Admin creates the system name and login URL.
Client cannot create or edit system names or URLs.
*/

func (h *Handler) AdminCredentialSystems(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listAdminCredentialSystems(w, r)
	case http.MethodPost:
		h.createAdminCredentialSystem(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminCredentialSystemDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminCredentialSystemByID(w, r)
	case http.MethodPut:
		h.updateAdminCredentialSystem(w, r)
	case http.MethodDelete:
		h.deleteAdminCredentialSystem(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminCredentialSystemStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "tax credential system id is required", nil)
		return
	}

	var request activeStatusRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	item, err := h.service.UpdateAdminSystemStatus(r.Context(), id, UpdateSystemStatusInput{
		IsActive: request.IsActive,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "tax credential system status updated successfully", item)
}

func (h *Handler) listAdminCredentialSystems(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	filter := ListCredentialSystemsFilter{
		Search:   query.Get("search"),
		IsActive: parseOptionalBool(query.Get("is_active"), query.Get("active")),
		Page:     parsePositiveInt(query.Get("page"), 1),
		PageSize: parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListAdminSystems(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin tax credential systems retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createAdminCredentialSystem(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	var request credentialSystemRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	isActive := true
	if request.IsActive != nil {
		isActive = *request.IsActive
	}

	item, err := h.service.CreateAdminSystem(r.Context(), CreateCredentialSystemInput{
		SystemName:      request.SystemName,
		LoginURL:        request.LoginURL,
		Description:     request.Description,
		DisplayOrder:    request.DisplayOrder,
		IsActive:        isActive,
		CreatedByUserID: userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.Created(w, "tax credential system created successfully", item)
}

func (h *Handler) getAdminCredentialSystemByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "tax credential system id is required", nil)
		return
	}

	item, err := h.service.GetAdminSystemByID(r.Context(), id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "tax credential system retrieved successfully", item)
}

func (h *Handler) updateAdminCredentialSystem(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "tax credential system id is required", nil)
		return
	}

	var request credentialSystemRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	isActive := true
	if request.IsActive != nil {
		isActive = *request.IsActive
	}

	item, err := h.service.UpdateAdminSystem(r.Context(), id, UpdateCredentialSystemInput{
		SystemName:      request.SystemName,
		LoginURL:        request.LoginURL,
		Description:     request.Description,
		DisplayOrder:    request.DisplayOrder,
		IsActive:        isActive,
		UpdatedByUserID: userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "tax credential system updated successfully", item)
}

func (h *Handler) deleteAdminCredentialSystem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "tax credential system id is required", nil)
		return
	}

	if err := h.service.DeleteAdminSystem(r.Context(), id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "tax credential system deleted successfully", map[string]string{
		"id": id,
	})
}

/*
CLIENT CREDENTIALS

Client fills only username, password and notes for a system created by admin.
*/

func (h *Handler) ClientCredentials(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listClientCredentials(w, r)
	case http.MethodPost:
		h.createClientCredential(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) ClientCredentialDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getClientCredentialByID(w, r)
	case http.MethodPut:
		h.updateClientCredential(w, r)
	case http.MethodDelete:
		h.deleteClientCredential(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) ClientCredentialReveal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.MethodNotAllowed(w)
		return
	}

	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	item, err := h.service.RevealClientCredential(r.Context(), userID, id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential revealed successfully", item)
}

func (h *Handler) listClientCredentials(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	query := r.URL.Query()

	filter := ListClientCredentialsFilter{
		SystemID:  query.Get("system_id"),
		Search:    query.Get("search"),
		IsActive:  parseOptionalBool(query.Get("is_active"), query.Get("active")),
		Page:      parsePositiveInt(query.Get("page"), 1),
		PageSize:  parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListClientCredentials(r.Context(), userID, filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "client tax credentials retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) createClientCredential(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	var request clientCredentialRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	item, err := h.service.CreateClientCredential(r.Context(), userID, CreateClientCredentialInput{
		SystemID: request.SystemID,
		Username: request.Username,
		Password: request.Password,
		Notes:    request.Notes,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.Created(w, "client tax credential created successfully", item)
}

func (h *Handler) getClientCredentialByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	item, err := h.service.GetClientCredentialByID(r.Context(), userID, id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential retrieved successfully", item)
}

func (h *Handler) updateClientCredential(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	var request clientCredentialRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	isActive := true
	if request.IsActive != nil {
		isActive = *request.IsActive
	}

	item, err := h.service.UpdateClientCredential(r.Context(), userID, id, UpdateClientCredentialInput{
		Username: request.Username,
		Password: request.Password,
		Notes:    request.Notes,
		IsActive: isActive,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential updated successfully", item)
}

func (h *Handler) deleteClientCredential(w http.ResponseWriter, r *http.Request) {
	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	if err := h.service.DeleteClientCredential(r.Context(), userID, id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential deleted successfully", map[string]string{
		"id": id,
	})
}

/*
ADMIN CREDENTIAL ACCESS

Admin can see all client credentials and reveal passwords.
*/

func (h *Handler) AdminCredentials(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	query := r.URL.Query()

	filter := ListClientCredentialsFilter{
		ClientID:  query.Get("client_id"),
		SystemID:  query.Get("system_id"),
		Search:    query.Get("search"),
		IsActive:  parseOptionalBool(query.Get("is_active"), query.Get("active")),
		Page:      parsePositiveInt(query.Get("page"), 1),
		PageSize:  parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListAdminCredentials(r.Context(), filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin client tax credentials retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) AdminCredentialDetail(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getAdminCredentialByID(w, r)
	case http.MethodDelete:
		h.deleteAdminCredential(w, r)
	default:
		response.MethodNotAllowed(w)
	}
}

func (h *Handler) AdminCredentialStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		response.MethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	var request activeStatusRequest
	if err := readJSON(w, r, &request); err != nil {
		respondError(w, err)
		return
	}

	item, err := h.service.UpdateAdminCredentialStatus(r.Context(), id, request.IsActive)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential status updated successfully", item)
}

func (h *Handler) AdminCredentialReveal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.MethodNotAllowed(w)
		return
	}

	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	item, err := h.service.RevealAdminCredential(r.Context(), userID, id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential revealed successfully", item)
}

func (h *Handler) getAdminCredentialByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	item, err := h.service.GetAdminCredentialByID(r.Context(), id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential retrieved successfully", item)
}

func (h *Handler) deleteAdminCredential(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	if err := h.service.DeleteAdminCredential(r.Context(), id); err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential deleted successfully", map[string]string{
		"id": id,
	})
}

/*
ACCOUNTANT CREDENTIAL ACCESS

Accountant can see/reveal only credentials for clients assigned to them.
*/

func (h *Handler) AccountantCredentials(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	query := r.URL.Query()

	filter := ListClientCredentialsFilter{
		ClientID:  query.Get("client_id"),
		SystemID:  query.Get("system_id"),
		Search:    query.Get("search"),
		IsActive:  parseOptionalBool(query.Get("is_active"), query.Get("active")),
		Page:      parsePositiveInt(query.Get("page"), 1),
		PageSize:  parsePositiveInt(query.Get("page_size"), DefaultPageSize),
	}

	items, totalItems, err := h.service.ListAccountantCredentials(r.Context(), userID, filter)
	if err != nil {
		respondError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "accountant client tax credentials retrieved successfully", map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) AccountantCredentialDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		response.MethodNotAllowed(w)
		return
	}

	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	item, err := h.service.GetAccountantCredentialByID(r.Context(), userID, id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential retrieved successfully", item)
}

func (h *Handler) AccountantCredentialReveal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.MethodNotAllowed(w)
		return
	}

	userID, ok := authenticatedUserID(w, r)
	if !ok {
		return
	}

	id := strings.TrimSpace(r.URL.Query().Get("id"))
	if id == "" {
		response.BadRequest(w, "client tax credential id is required", nil)
		return
	}

	item, err := h.service.RevealAccountantCredential(r.Context(), userID, id)
	if err != nil {
		respondError(w, err)
		return
	}

	response.OK(w, "client tax credential revealed successfully", item)
}

/*
HELPERS
*/

func authenticatedUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil || strings.TrimSpace(user.ID) == "" {
		response.Unauthorized(w, "authentication is required")
		return "", false
	}

	return user.ID, true
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxTaxCredentialRequestBodyBytes)
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