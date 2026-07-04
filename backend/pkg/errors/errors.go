package errors

import (
	stderrors "errors"
	"fmt"
	"net/http"
)

const (
	CodeInvalidInput    = "invalid_input"
	CodeValidationError = "validation_error"
	CodeNotFound        = "not_found"
	CodeUnauthorized    = "unauthorized"
	CodeForbidden       = "forbidden"
	CodeConflict        = "conflict"
	CodeInternal        = "internal_error"
)

type AppError struct {
	Code       string
	Message    string
	Details    any
	StatusCode int
	Err        error
}

func (e *AppError) Error() string {
	if e == nil {
		return ""
	}

	if e.Err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Err)
	}

	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	if e == nil {
		return nil
	}

	return e.Err
}

func (e *AppError) PublicMessage() string {
	if e == nil {
		return "internal server error"
	}

	if e.Message == "" {
		return "internal server error"
	}

	return e.Message
}

func New(code string, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

func WithDetails(code string, message string, statusCode int, details any) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Details:    details,
		StatusCode: statusCode,
	}
}

func Wrap(err error, code string, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
		Err:        err,
	}
}

func InvalidInput(message string) *AppError {
	return New(CodeInvalidInput, message, http.StatusBadRequest)
}

func Validation(details any) *AppError {
	return WithDetails(CodeValidationError, "validation failed", http.StatusUnprocessableEntity, details)
}

func NotFound(message string) *AppError {
	return New(CodeNotFound, message, http.StatusNotFound)
}

func Unauthorized(message string) *AppError {
	return New(CodeUnauthorized, message, http.StatusUnauthorized)
}

func Forbidden(message string) *AppError {
	return New(CodeForbidden, message, http.StatusForbidden)
}

func Conflict(message string) *AppError {
	return New(CodeConflict, message, http.StatusConflict)
}

func Internal(message string) *AppError {
	if message == "" {
		message = "internal server error"
	}

	return New(CodeInternal, message, http.StatusInternalServerError)
}

func InternalWrap(err error, message string) *AppError {
	if message == "" {
		message = "internal server error"
	}

	return Wrap(err, CodeInternal, message, http.StatusInternalServerError)
}

func AsAppError(err error) (*AppError, bool) {
	var appErr *AppError

	if stderrors.As(err, &appErr) {
		return appErr, true
	}

	return nil, false
}

func StatusCode(err error) int {
	appErr, ok := AsAppError(err)
	if !ok || appErr.StatusCode == 0 {
		return http.StatusInternalServerError
	}

	return appErr.StatusCode
}

func Code(err error) string {
	appErr, ok := AsAppError(err)
	if !ok || appErr.Code == "" {
		return CodeInternal
	}

	return appErr.Code
}

func Message(err error) string {
	appErr, ok := AsAppError(err)
	if !ok {
		return "internal server error"
	}

	return appErr.PublicMessage()
}

func Details(err error) any {
	appErr, ok := AsAppError(err)
	if !ok {
		return nil
	}

	return appErr.Details
}

func IsNotFound(err error) bool {
	return Code(err) == CodeNotFound
}

func IsUnauthorized(err error) bool {
	return Code(err) == CodeUnauthorized
}

func IsForbidden(err error) bool {
	return Code(err) == CodeForbidden
}

func IsConflict(err error) bool {
	return Code(err) == CodeConflict
}

func IsValidation(err error) bool {
	return Code(err) == CodeValidationError
}