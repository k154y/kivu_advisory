package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxRequestBodyBytes = 1 << 20 // 1 MB

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	var request LoginRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	tokenResponse, err := h.service.Login(r.Context(), request)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "login successful", tokenResponse)
}

func (h *Handler) RegisterClient(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	var request RegisterClientRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	tokenResponse, err := h.service.RegisterClient(r.Context(), request)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.Created(w, "client account created successfully", tokenResponse)
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	var request RefreshTokenRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	tokenResponse, err := h.service.RefreshToken(r.Context(), request)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.OK(w, "token refreshed successfully", tokenResponse)
}

func (h *Handler) CreateAccountant(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	var request CreateAccountantRequest
	if err := readJSON(w, r, &request); err != nil {
		writeHandlerError(w, err)
		return
	}

	createdAccountant, err := h.service.CreateAccountant(r.Context(), request)
	if err != nil {
		writeHandlerError(w, err)
		return
	}

	response.Created(w, "accountant account created successfully", createdAccountant)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	currentUser, ok := middleware.UserFromContext(r.Context())
	if !ok || currentUser == nil {
		response.Unauthorized(w, "authentication is required")
		return
	}

	response.OK(w, "authenticated user retrieved successfully", currentUser)
}

func readJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	if r.Body == nil {
		return apperrors.InvalidInput("request body is required")
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)

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

func writeHandlerError(w http.ResponseWriter, err error) {
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
