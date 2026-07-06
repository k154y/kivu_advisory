package assignment

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxAssignmentRequestBodyBytes = 1 << 20 // 1 MB

type Handler struct {
	service *Service
}

type CreateAssignmentRequest struct {
	ServiceRequestID string `json:"service_request_id"`
	AccountantUserID string `json:"accountant_user_id"`
	Priority         string `json:"priority"`
	DueDate          string `json:"due_date"`
	Notes            string `json:"notes"`
	InternalNotes    string `json:"internal_notes"`
}

type UpdateAssignmentRequest struct {
	AccountantUserID string `json:"accountant_user_id"`
	Priority         string `json:"priority"`
	DueDate          string `json:"due_date"`
	Notes            string `json:"notes"`
	InternalNotes    string `json:"internal_notes"`
}

type UpdateAssignmentStatusRequest struct {
	Status        string `json:"status"`
	Notes         string `json:"notes"`
	InternalNotes string `json:"internal_notes"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) ListAdminAssignments(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	filter := ListAssignmentsFilter{
		ServiceRequestID: r.URL.Query().Get("service_request_id"),
		AccountantUserID: r.URL.Query().Get("accountant_user_id"),
		AssignedByUserID: r.URL.Query().Get("assigned_by_user_id"),
		Status:           r.URL.Query().Get("status"),
		Priority:         r.URL.Query().Get("priority"),
		Page:             parseIntQuery(r, "page", 1),
		PageSize:         parseIntQuery(r, "page_size", 20),
	}

	assignments, totalItems, err := h.service.ListAdmin(r.Context(), filter)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "admin assignments retrieved successfully", map[string]any{
		"items": assignments,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) CreateAssignment(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	adminUserID, err := currentUserID(r)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	var request CreateAssignmentRequest
	if err := readAssignmentJSON(w, r, &request); err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	input, err := request.ToInput(adminUserID)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	createdAssignment, err := h.service.CreateAdmin(r.Context(), input)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	response.Created(w, "assignment created successfully", createdAssignment)
}

func (h *Handler) GetAdminAssignmentByID(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	assignmentID := r.URL.Query().Get("id")
	if strings.TrimSpace(assignmentID) == "" {
		response.BadRequest(w, "assignment id is required", nil)
		return
	}

	foundAssignment, err := h.service.GetAdminByID(r.Context(), assignmentID)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	response.OK(w, "admin assignment retrieved successfully", foundAssignment)
}

func (h *Handler) UpdateAdminAssignment(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	assignmentID := r.URL.Query().Get("id")
	if strings.TrimSpace(assignmentID) == "" {
		response.BadRequest(w, "assignment id is required", nil)
		return
	}

	var request UpdateAssignmentRequest
	if err := readAssignmentJSON(w, r, &request); err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	input, err := request.ToInput()
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	updatedAssignment, err := h.service.UpdateAdmin(r.Context(), assignmentID, input)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	response.OK(w, "assignment updated successfully", updatedAssignment)
}

func (h *Handler) UpdateAdminAssignmentStatus(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	assignmentID := r.URL.Query().Get("id")
	if strings.TrimSpace(assignmentID) == "" {
		response.BadRequest(w, "assignment id is required", nil)
		return
	}

	var request UpdateAssignmentStatusRequest
	if err := readAssignmentJSON(w, r, &request); err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	updatedAssignment, err := h.service.UpdateStatusAdmin(r.Context(), assignmentID, UpdateStatusInput{
		Status:        request.Status,
		Notes:         request.Notes,
		InternalNotes: request.InternalNotes,
	})
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	response.OK(w, "assignment status updated successfully", updatedAssignment)
}

func (h *Handler) DeleteAdminAssignment(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	assignmentID := r.URL.Query().Get("id")
	if strings.TrimSpace(assignmentID) == "" {
		response.BadRequest(w, "assignment id is required", nil)
		return
	}

	if err := h.service.DeleteAdmin(r.Context(), assignmentID); err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	response.OK(w, "assignment deleted successfully", map[string]any{
		"id": assignmentID,
	})
}

func (h *Handler) ListAccountantAssignments(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	accountantUserID, err := currentUserID(r)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	filter := ListAssignmentsFilter{
		ServiceRequestID: r.URL.Query().Get("service_request_id"),
		Status:           r.URL.Query().Get("status"),
		Priority:         r.URL.Query().Get("priority"),
		Page:             parseIntQuery(r, "page", 1),
		PageSize:         parseIntQuery(r, "page_size", 20),
	}

	assignments, totalItems, err := h.service.ListAccountant(r.Context(), accountantUserID, filter)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "accountant assignments retrieved successfully", map[string]any{
		"items": assignments,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) GetAccountantAssignmentByID(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	accountantUserID, err := currentUserID(r)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	assignmentID := r.URL.Query().Get("id")
	if strings.TrimSpace(assignmentID) == "" {
		response.BadRequest(w, "assignment id is required", nil)
		return
	}

	foundAssignment, err := h.service.GetAccountantByID(r.Context(), accountantUserID, assignmentID)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	response.OK(w, "accountant assignment retrieved successfully", foundAssignment)
}

func (h *Handler) UpdateAccountantAssignmentStatus(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	accountantUserID, err := currentUserID(r)
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	assignmentID := r.URL.Query().Get("id")
	if strings.TrimSpace(assignmentID) == "" {
		response.BadRequest(w, "assignment id is required", nil)
		return
	}

	var request UpdateAssignmentStatusRequest
	if err := readAssignmentJSON(w, r, &request); err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	updatedAssignment, err := h.service.UpdateStatusAccountant(r.Context(), accountantUserID, assignmentID, UpdateStatusInput{
		Status:        request.Status,
		Notes:         request.Notes,
		InternalNotes: request.InternalNotes,
	})
	if err != nil {
		writeAssignmentHandlerError(w, err)
		return
	}

	response.OK(w, "accountant assignment status updated successfully", updatedAssignment)
}

func (request CreateAssignmentRequest) ToInput(assignedByUserID string) (CreateAssignmentInput, error) {
	dueDate, err := parseDate(request.DueDate, "due_date")
	if err != nil {
		return CreateAssignmentInput{}, err
	}

	return CreateAssignmentInput{
		ServiceRequestID: request.ServiceRequestID,
		AccountantUserID: request.AccountantUserID,
		AssignedByUserID: assignedByUserID,
		Priority:         request.Priority,
		DueDate:          dueDate,
		Notes:            request.Notes,
		InternalNotes:    request.InternalNotes,
	}, nil
}

func (request UpdateAssignmentRequest) ToInput() (UpdateAssignmentInput, error) {
	dueDate, err := parseDate(request.DueDate, "due_date")
	if err != nil {
		return UpdateAssignmentInput{}, err
	}

	return UpdateAssignmentInput{
		AccountantUserID: request.AccountantUserID,
		Priority:         request.Priority,
		DueDate:          dueDate,
		Notes:            request.Notes,
		InternalNotes:    request.InternalNotes,
	}, nil
}

func currentUserID(r *http.Request) (string, error) {
	if r == nil {
		return "", apperrors.Forbidden("authentication is required")
	}

	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		return "", apperrors.Forbidden("authentication is required")
	}

	userID := strings.TrimSpace(user.ID)
	if userID == "" {
		return "", apperrors.Forbidden("authenticated user id is missing")
	}

	return userID, nil
}

func parseDate(value string, fieldName string) (*time.Time, error) {
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

	return nil, apperrors.InvalidInput(fieldName + " must use YYYY-MM-DD format")
}

func readAssignmentJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	if r.Body == nil {
		return apperrors.InvalidInput("request body is required")
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxAssignmentRequestBodyBytes)

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

func writeAssignmentHandlerError(w http.ResponseWriter, err error) {
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
