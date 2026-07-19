package document

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	clientpkg "github.com/kyves/kivu-advisory/backend/internal/client"
	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

const maxDocumentJSONBodyBytes = 1 << 20 // 1 MB

type ClientProfileService interface {
	GetByUserID(ctx context.Context, userID string) (*clientpkg.PublicClient, error)
}

type Handler struct {
	service *Service
	clients ClientProfileService
}

type UpdateDocumentRequest struct {
	Visibility   string `json:"visibility"`
	DocumentType string `json:"document_type"`
	IsFinal      bool   `json:"is_final"`
	Description  string `json:"description"`
}

func NewHandler(service *Service, clients ClientProfileService) *Handler {
	return &Handler{
		service: service,
		clients: clients,
	}
}

func (h *Handler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	actor, err := h.actorFromRequest(r)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, DefaultMaxUploadSizeBytes+(1<<20))

	if err := r.ParseMultipartForm(DefaultMaxUploadSizeBytes); err != nil {
		writeDocumentHandlerError(w, apperrors.InvalidInput("invalid multipart upload request"))
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		writeDocumentHandlerError(w, apperrors.InvalidInput("file is required"))
		return
	}
	defer file.Close()

	originalFileName := cleanFileName(fileHeader.Filename)
	mimeType := detectUploadMimeType(fileHeader.Header.Get("Content-Type"), originalFileName)

	isFinal, err := parseBoolFormValue(r, "is_final", false)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	uploadedDocument, err := h.service.Upload(r.Context(), actor, UploadDocumentInput{
		ServiceRequestID: r.FormValue("service_request_id"),
		OriginalFileName: originalFileName,
		MimeType:         mimeType,
		SizeBytes:        fileHeader.Size,
		Reader:           file,
		Visibility:       r.FormValue("visibility"),
		DocumentType:     r.FormValue("document_type"),
		IsFinal:          isFinal,
		Description:      r.FormValue("description"),
	})
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	response.Created(w, "document uploaded successfully", uploadedDocument)
}

func (h *Handler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	actor, err := h.actorFromRequest(r)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	filter := ListDocumentsFilter{
		ServiceRequestID: r.URL.Query().Get("service_request_id"),
		UploadedByUserID: r.URL.Query().Get("uploaded_by_user_id"),
		Visibility:       r.URL.Query().Get("visibility"),
		DocumentType:     r.URL.Query().Get("document_type"),
		Status:           r.URL.Query().Get("status"),
		IsFinal:          parseOptionalBoolQuery(r, "is_final"),
		Page:             parseIntQuery(r, "page", 1),
		PageSize:         parseIntQuery(r, "page_size", 20),
	}

	documents, totalItems, err := h.service.List(r.Context(), actor, filter)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	filter = filter.Normalize()

	response.OK(w, "documents retrieved successfully", map[string]any{
		"items": documents,
		"pagination": map[string]any{
			"page":        filter.Page,
			"page_size":   filter.PageSize,
			"total_items": totalItems,
			"total_pages": totalPages(totalItems, filter.PageSize),
		},
	})
}

func (h *Handler) GetDocumentByID(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	actor, err := h.actorFromRequest(r)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	documentID := r.URL.Query().Get("id")
	if strings.TrimSpace(documentID) == "" {
		response.BadRequest(w, "document id is required", nil)
		return
	}

	foundDocument, err := h.service.GetByID(r.Context(), actor, documentID)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	response.OK(w, "document retrieved successfully", foundDocument)
}

func (h *Handler) DownloadDocument(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	actor, err := h.actorFromRequest(r)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	documentID := r.URL.Query().Get("id")
	if strings.TrimSpace(documentID) == "" {
		response.BadRequest(w, "document id is required", nil)
		return
	}

	downloadedDocument, err := h.service.Download(r.Context(), actor, documentID)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}
	defer downloadedDocument.File.Reader.Close()

	fileName := cleanFileName(downloadedDocument.File.FileName)
	if fileName == "" {
		fileName = "document"
	}

	w.Header().Set("Content-Type", downloadedDocument.File.MimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", fileName))
	w.Header().Set("Content-Length", strconv.FormatInt(downloadedDocument.File.SizeBytes, 10))

	if _, err := io.Copy(w, downloadedDocument.File.Reader); err != nil {
		return
	}
}

func (h *Handler) UpdateDocumentMetadata(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	actor, err := h.actorFromRequest(r)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	documentID := r.URL.Query().Get("id")
	if strings.TrimSpace(documentID) == "" {
		response.BadRequest(w, "document id is required", nil)
		return
	}

	var request UpdateDocumentRequest
	if err := readDocumentJSON(w, r, &request); err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	updatedDocument, err := h.service.UpdateMetadata(r.Context(), actor, documentID, UpdateDocumentInput{
		Visibility:   request.Visibility,
		DocumentType: request.DocumentType,
		IsFinal:      request.IsFinal,
		Description:  request.Description,
	})
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	response.OK(w, "document updated successfully", updatedDocument)
}

func (h *Handler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	actor, err := h.actorFromRequest(r)
	if err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	documentID := r.URL.Query().Get("id")
	if strings.TrimSpace(documentID) == "" {
		response.BadRequest(w, "document id is required", nil)
		return
	}

	if err := h.service.Delete(r.Context(), actor, documentID); err != nil {
		writeDocumentHandlerError(w, err)
		return
	}

	response.OK(w, "document deleted successfully", map[string]any{
		"id": documentID,
	})
}

func (h *Handler) actorFromRequest(r *http.Request) (Actor, error) {
	if r == nil {
		return Actor{}, apperrors.Forbidden("authentication is required")
	}

	user, ok := middleware.UserFromContext(r.Context())
	if !ok || user == nil {
		return Actor{}, apperrors.Forbidden("authentication is required")
	}

	actor := Actor{
		UserID: user.ID,
		Role:   user.Role,
	}

	if strings.EqualFold(user.Role, middleware.RoleClient) {
		if h.clients == nil {
			return Actor{}, apperrors.Internal("client service is not initialized")
		}

		clientProfile, err := h.clients.GetByUserID(r.Context(), user.ID)
		if err != nil {
			return Actor{}, err
		}

		if clientProfile == nil || strings.TrimSpace(clientProfile.ID) == "" {
			return Actor{}, apperrors.NotFound("client profile not found")
		}

		actor.ClientID = clientProfile.ID
	}

	return actor, nil
}

func detectUploadMimeType(headerMimeType string, fileName string) string {
	headerMimeType = strings.TrimSpace(strings.ToLower(headerMimeType))

	if headerMimeType != "" && headerMimeType != "application/octet-stream" {
		if semicolonIndex := strings.Index(headerMimeType, ";"); semicolonIndex >= 0 {
			headerMimeType = strings.TrimSpace(headerMimeType[:semicolonIndex])
		}

		return headerMimeType
	}

	extensionMimeType := mime.TypeByExtension(strings.ToLower(filepath.Ext(fileName)))
	if extensionMimeType != "" {
		if semicolonIndex := strings.Index(extensionMimeType, ";"); semicolonIndex >= 0 {
			extensionMimeType = strings.TrimSpace(extensionMimeType[:semicolonIndex])
		}

		return strings.ToLower(extensionMimeType)
	}

	return headerMimeType
}

func parseBoolFormValue(r *http.Request, key string, defaultValue bool) (bool, error) {
	value := strings.TrimSpace(r.FormValue(key))
	if value == "" {
		return defaultValue, nil
	}

	parsedValue, err := strconv.ParseBool(value)
	if err != nil {
		return false, apperrors.InvalidInput(key + " must be true or false")
	}

	return parsedValue, nil
}

func readDocumentJSON(w http.ResponseWriter, r *http.Request, destination any) error {
	if r.Body == nil {
		return apperrors.InvalidInput("request body is required")
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxDocumentJSONBodyBytes)

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

func writeDocumentHandlerError(w http.ResponseWriter, err error) {
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
