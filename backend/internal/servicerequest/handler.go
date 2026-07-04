package servicerequest

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	clientpkg "github.com/kyves/kivu-advisory/backend/internal/client"
	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxServiceRequestBodyBytes = 1 << 20 // 1 MB

type ClientProfileService interface {
	GetByUserID(ctx context.Context, userID string) (*clientpkg.PublicClient, error)
}

type Handler struct {
	service *Service
	clients ClientProfileService
}

type CreateServiceRequestRequest struct {
	ClientID                string `json:"client_id"`
	ServiceID               string `json:"service_id"`
	RequesterName           string `json:"requester_name"`
	RequesterEmail          string `json:"requester_email"`
	RequesterPhone          string `json:"requester_phone"`
	RequesterCompany        string `json:"requester_company"`
	Title                   string `json:"title"`
	Description             string `json:"description"`
	Priority                string `json:"priority"`
	PreferredContactMethod  string `json:"preferred_contact_method"`
	ExpectedDeadline        string `json:"expected_deadline"`
}

type UpdateServiceRequestRequest struct {
	ServiceID               string `json:"service_id"`
	RequesterName          string `json:"requester_name"`
	RequesterEmail         string `json:"requester_email"`
	RequesterPhone         string `json:"requester_phone"`
	RequesterCompany       string `json:"requester_company"`
	Title                  string `json:"title"`
	Description            string `json:"description"`
	Priority               string `json:"priority"`
	PreferredContactMethod string `json:"preferred_contact_method"`
	ExpectedDeadline       string `json:"expected_deadline"`
	AdminNotes             string `json:"admin_notes"`
	InternalNotes          string `json:"internal_notes"`
}

type UpdateServiceRequestStatusRequest struct {
	Status        string `json:"status"`
	AdminNotes    string `json:"admin_notes"`
	InternalNotes string `json:"internal_notes"`
}

func NewHandler(service *Service, clients ClientProfileService) *Handler {
	return &Handler{
		service: service,
		clients: clients,
	}
}

func (h *Handler) CreateVisitorRequest(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	var request CreateServiceRequestRequest
	if err := readServiceRequestJSON(w, r, &request); err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	input, err := request.ToCreateInput()
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	createdRequest, err := h.service.CreateVisitorRequest(r.Context(), input)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.Created(w, "service request submitted successfully", createdRequest)
}

func (h *Handler) CreateClientRequest(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	clientID, err := h.currentClientID(r)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	var request CreateServiceRequestRequest
	if err := readServiceRequestJSON(w, r, &request); err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	input, err := request.ToCreateInput()
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	createdRequest, err := h.service.CreateClientRequest(r.Context(), clientID, input)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.Created(w, "client service request created successfully", createdRequest)
}

func (h *Handler) ListClientRequests(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	clientID, err := h.currentClientID(r)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	filter := ListServiceRequestsFilter{
		ServiceID: r.URL.Query().Get("service_id"),
		Status:    r.URL.Query().Get("status"),
		Priority:  r.URL.Query().Get("priority"),
		Search:    r.URL.Query().Get("search"),
		Page:      parseIntQuery(r, "page", 1),
		PageSize:  parseIntQuery(r, "page_size", 20),
	}

	requests, totalItems, err := h.service.ListClient(r.Context(), clientID, filter)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "client service requests retrieved successfully", map[string]any{
		"items": requests,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) GetClientRequestByID(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	clientID, err := h.currentClientID(r)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	requestID := r.URL.Query().Get("id")
	if strings.TrimSpace(requestID) == "" {
		response.BadRequest(w, "service request id is required", nil)
		return
	}

	foundRequest, err := h.service.GetClientByID(r.Context(), clientID, requestID)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.OK(w, "client service request retrieved successfully", foundRequest)
}

func (h *Handler) ListAdminRequests(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	filter := ListServiceRequestsFilter{
		ClientID:  r.URL.Query().Get("client_id"),
		ServiceID: r.URL.Query().Get("service_id"),
		Status:    r.URL.Query().Get("status"),
		Priority:  r.URL.Query().Get("priority"),
		Source:    r.URL.Query().Get("source"),
		Search:    r.URL.Query().Get("search"),
		Page:      parseIntQuery(r, "page", 1),
		PageSize:  parseIntQuery(r, "page_size", 20),
	}

	requests, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin service requests retrieved successfully", map[string]any{
		"items": requests,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) CreateAdminRequest(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	var request CreateServiceRequestRequest
	if err := readServiceRequestJSON(w, r, &request); err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	input, err := request.ToCreateInput()
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	createdRequest, err := h.service.CreateAdminRequest(r.Context(), input)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.Created(w, "admin service request created successfully", createdRequest)
}

func (h *Handler) GetAdminRequestByID(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	requestID := r.URL.Query().Get("id")
	if strings.TrimSpace(requestID) == "" {
		response.BadRequest(w, "service request id is required", nil)
		return
	}

	foundRequest, err := h.service.GetAdminByID(r.Context(), requestID)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.OK(w, "admin service request retrieved successfully", foundRequest)
}

func (h *Handler) GetAdminRequestByReferenceNumber(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	referenceNumber := r.URL.Query().Get("reference_number")
	if strings.TrimSpace(referenceNumber) == "" {
		response.BadRequest(w, "reference number is required", nil)
		return
	}

	foundRequest, err := h.service.GetAdminByReferenceNumber(r.Context(), referenceNumber)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.OK(w, "admin service request retrieved successfully", foundRequest)
}

func (h *Handler) UpdateAdminRequest(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	requestID := r.URL.Query().Get("id")
	if strings.TrimSpace(requestID) == "" {
		response.BadRequest(w, "service request id is required", nil)
		return
	}

	var request UpdateServiceRequestRequest
	if err := readServiceRequestJSON(w, r, &request); err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	input, err := request.ToUpdateInput()
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	updatedRequest, err := h.service.UpdateAdmin(r.Context(), requestID, input)
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.OK(w, "service request updated successfully", updatedRequest)
}

func (h *Handler) UpdateRequestStatus(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	requestID := r.URL.Query().Get("id")
	if strings.TrimSpace(requestID) == "" {
		response.BadRequest(w, "service request id is required", nil)
		return
	}

	var request UpdateServiceRequestStatusRequest
	if err := readServiceRequestJSON(w, r, &request); err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	updatedRequest, err := h.service.UpdateStatus(r.Context(), requestID, UpdateStatusInput{
		Status:        request.Status,
		AdminNotes:    request.AdminNotes,
		InternalNotes: request.InternalNotes,
	})
	if err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.OK(w, "service request status updated successfully", updatedRequest)
}

func (h *Handler) DeleteAdminRequest(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	requestID := r.URL.Query().Get("id")
	if strings.TrimSpace(requestID) == "" {
		response.BadRequest(w, "service request id is required", nil)
		return
	}

	if err := h.service.DeleteAdmin(r.Context(), requestID); err != nil {
		writeServiceRequestHandlerError(w, err)
		return
	}

	response.OK(w, "service request deleted successfully", map[string]any{
		"id": requestID,
	})
}

func (request CreateServiceRequestRequest) ToCreateInput() (CreateServiceRequestInput, error) {
	expectedDeadline, err := parseExpectedDeadline(request.ExpectedDeadline)
	if err != nil {
		return CreateServiceRequestInput{}, err
	}

	return CreateServiceRequestInput{
		ClientID:               request.ClientID,
		ServiceID:              request.ServiceID,
		RequesterName:          request.RequesterName,
		RequesterEmail:         request.RequesterEmail,
		RequesterPhone:         request.RequesterPhone,
		RequesterCompany:       request.RequesterCompany,
		Title:                  request.Title,
		Description:            request.Description,
		Priority:               request.Priority,
		PreferredContactMethod: request.PreferredContactMethod,
		ExpectedDeadline:       expectedDeadline,
	}, nil
}

func (request UpdateServiceRequestRequest) ToUpdateInput() (UpdateServiceRequestInput, error) {
	expectedDeadline, err := parseExpectedDeadline(request.ExpectedDeadline)
	if err != nil {
		return UpdateServiceRequestInput{}, err
	}

	return UpdateServiceRequestInput{
		ServiceID:              request.ServiceID,
		RequesterName:          request.RequesterName,
		RequesterEmail:         request.RequesterEmail,
		RequesterPhone:         request.RequesterPhone,
		RequesterCompany:       request.RequesterCompany,
		Title:                  request.Title,
		Description:            request.Description,
		Priority:               request.Priority,
		PreferredContactMethod: request.PreferredContactMethod,
		ExpectedDeadline:       expectedDeadline,
		AdminNotes:             request.AdminNotes,
		InternalNotes:          request.InternalNotes,
	}, nil
}

func (h *Handler) currentClientID(r *http.Request) (string, error) {
	if h == nil || h.clients == nil {
		return "", apperrors.Internal("client service is not initialized")
	}

	authUser, err := authenticatedUserFromRequest(r)
	if err != nil {
		return "", err
	}

	userID := authenticatedUserID(authUser)
	if userID == "" {
		return "", apperrors.Forbidden("authenticated user id is missing")
	}

	clientProfile, err := h.clients.GetByUserID(r.Context(), userID)
	if err != nil {
		return "", err
	}

	if clientProfile == nil || strings.TrimSpace(clientProfile.ID) == "" {
		return "", apperrors.NotFound("client profile not found")
	}

	return clientProfile.ID, nil
}

func authenticatedUserFromRequest(r *http.Request) (*middleware.AuthenticatedUser, error) {
	if r == nil {
		return nil, apperrors.Forbidden("authentication is required")
	}

	authUser, ok := middleware.UserFromContext(r.Context())
	if !ok || authUser == nil {
		return nil, apperrors.Forbidden("authentication is required")
	}

	return authUser, nil
}

func authenticatedUserID(authUser *middleware.AuthenticatedUser) string {
	if authUser == nil {
		return ""
	}

	return stringField(authUser, "ID", "UserID")
}

func stringField(value any, fieldNames ...string) string {
	reflectedValue := reflect.ValueOf(value)
	if !reflectedValue.IsValid() {
		return ""
	}

	if reflectedValue.Kind() == reflect.Pointer {
		if reflectedValue.IsNil() {
			return ""
		}

		reflectedValue = reflectedValue.Elem()
	}

	if reflectedValue.Kind() != reflect.Struct {
		return ""
	}

	for _, fieldName := range fieldNames {
		field := reflectedValue.FieldByName(fieldName)
		if field.IsValid() && field.Kind() == reflect.String {
			return strings.TrimSpace(field.String())
		}
	}

	return ""
}

func parseExpectedDeadline(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}

	parsedDate, err := time.Parse("2006-01-02", value)
	if err == nil {
		return &parsedDate, nil
	}

	parsedDateTime, err := time.Parse(time.RFC3339, value)
	if err == nil {
		return &parsedDateTime, nil
	}

	return nil, apperrors.InvalidInput("expected_deadline must use YYYY-MM-DD format")
}

func readServiceRequestJSON(w http.ResponseWriter, r *http.Request, destination any) error {
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

func writeServiceRequestHandlerError(w http.ResponseWriter, err error) {
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