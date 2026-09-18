package media

import (
	"mime"
	"net/http"
	"path/filepath"
	"strings"

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

func (h *Handler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.MethodNotAllowed(w)
		return
	}

	if h == nil || h.service == nil {
		response.InternalServerError(w)
		return
	}

	// Allow a small amount of multipart overhead above the actual image limit.
	r.Body = http.MaxBytesReader(
		w,
		r.Body,
		DefaultMaxImageSizeBytes+(1<<20),
	)

	if err := r.ParseMultipartForm(DefaultMaxImageSizeBytes); err != nil {
		writeMediaHandlerError(
			w,
			apperrors.InvalidInput("invalid image upload request"),
		)
		return
	}

	category, err := NormalizeCategory(r.FormValue("category"))
	if err != nil {
		writeMediaHandlerError(w, err)
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		writeMediaHandlerError(
			w,
			apperrors.InvalidInput("image file is required"),
		)
		return
	}
	defer file.Close()

	mimeType := detectImageMimeType(
		fileHeader.Header.Get("Content-Type"),
		fileHeader.Filename,
	)

	uploadedImage, err := h.service.UploadImage(
		r.Context(),
		SaveImageInput{
			Reader:           file,
			Category:         category,
			OriginalFileName: fileHeader.Filename,
			MimeType:         mimeType,
			SizeBytes:        fileHeader.Size,
		},
	)
	if err != nil {
		writeMediaHandlerError(w, err)
		return
	}

	response.Created(
		w,
		"image uploaded successfully",
		uploadedImage,
	)
}

func detectImageMimeType(headerMimeType string, fileName string) string {
	headerMimeType = normalizeMimeType(headerMimeType)

	if headerMimeType != "" &&
		headerMimeType != "application/octet-stream" {
		return headerMimeType
	}

	detectedMimeType := mime.TypeByExtension(
		strings.ToLower(filepath.Ext(fileName)),
	)

	return normalizeMimeType(detectedMimeType)
}

func writeMediaHandlerError(w http.ResponseWriter, err error) {
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
