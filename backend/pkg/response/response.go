package response

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type Envelope struct {
	Success   bool       `json:"success"`
	Message   string     `json:"message,omitempty"`
	Data      any        `json:"data,omitempty"`
	Error     *ErrorBody `json:"error,omitempty"`
	Meta      any        `json:"meta,omitempty"`
	Timestamp string     `json:"timestamp"`
}

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any   `json:"details,omitempty"`
}

type PaginationMeta struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

func JSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("failed to write json response: %v", err)
	}
}

func Success(w http.ResponseWriter, statusCode int, message string, data any) {
	JSON(w, statusCode, Envelope{
		Success:   true,
		Message:   message,
		Data:      data,
		Timestamp: now(),
	})
}

func SuccessWithMeta(w http.ResponseWriter, statusCode int, message string, data any, meta any) {
	JSON(w, statusCode, Envelope{
		Success:   true,
		Message:   message,
		Data:      data,
		Meta:      meta,
		Timestamp: now(),
	})
}

func OK(w http.ResponseWriter, message string, data any) {
	Success(w, http.StatusOK, message, data)
}

func Created(w http.ResponseWriter, message string, data any) {
	Success(w, http.StatusCreated, message, data)
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func Error(w http.ResponseWriter, statusCode int, code string, message string, details any) {
	JSON(w, statusCode, Envelope{
		Success: false,
		Error: &ErrorBody{
			Code:    code,
			Message: message,
			Details: details,
		},
		Timestamp: now(),
	})
}

func BadRequest(w http.ResponseWriter, message string, details any) {
	Error(w, http.StatusBadRequest, "bad_request", message, details)
}

func ValidationError(w http.ResponseWriter, details any) {
	Error(w, http.StatusUnprocessableEntity, "validation_error", "validation failed", details)
}

func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, "unauthorized", message, nil)
}

func Forbidden(w http.ResponseWriter, message string) {
	Error(w, http.StatusForbidden, "forbidden", message, nil)
}

func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, "not_found", message, nil)
}

func Conflict(w http.ResponseWriter, message string, details any) {
	Error(w, http.StatusConflict, "conflict", message, details)
}

func InternalServerError(w http.ResponseWriter) {
	Error(w, http.StatusInternalServerError, "internal_server_error", "internal server error", nil)
}

func MethodNotAllowed(w http.ResponseWriter) {
	Error(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed", nil)
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}