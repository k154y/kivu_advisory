package document

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"path/filepath"
	"strings"
	"time"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const DefaultMaxUploadSizeBytes int64 = 25 * 1024 * 1024 // 25 MB

var allowedMimeTypes = map[string]bool{
	"application/pdf": true,

	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,

	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,

	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,

	"text/plain": true,
	"text/csv":   true,

	"application/zip": true,
}

type Storage interface {
	Driver() string
	Save(ctx context.Context, input SaveFileInput) (*SavedFile, error)
	Open(ctx context.Context, key string) (*OpenedFile, error)
	Delete(ctx context.Context, key string) error
}

type SaveFileInput struct {
	Reader           io.Reader
	ServiceRequestID string
	UploadedByUserID string
	OriginalFileName string
	MimeType         string
	SizeBytes        int64
}

type SavedFile struct {
	FileName         string
	OriginalFileName string
	MimeType         string
	FileSizeBytes    int64
	StorageDriver    string
	StorageBucket    string
	StorageKey       string
}

type OpenedFile struct {
	Reader   io.ReadCloser
	FileName string
	MimeType string
	SizeBytes int64
}

func ValidateSaveFileInput(input SaveFileInput, maxSizeBytes int64) error {
	input.OriginalFileName = cleanFileName(input.OriginalFileName)
	input.MimeType = normalizeMimeType(input.MimeType)

	if input.Reader == nil {
		return apperrors.InvalidInput("file is required")
	}

	if strings.TrimSpace(input.ServiceRequestID) == "" {
		return apperrors.InvalidInput("service request id is required")
	}

	if strings.TrimSpace(input.UploadedByUserID) == "" {
		return apperrors.InvalidInput("uploaded by user id is required")
	}

	if input.OriginalFileName == "" {
		return apperrors.InvalidInput("original file name is required")
	}

	if input.SizeBytes <= 0 {
		return apperrors.InvalidInput("file size must be greater than zero")
	}

	if maxSizeBytes <= 0 {
		maxSizeBytes = DefaultMaxUploadSizeBytes
	}

	if input.SizeBytes > maxSizeBytes {
		return apperrors.InvalidInput("file is too large")
	}

	if input.MimeType == "" {
		return apperrors.InvalidInput("file mime type is required")
	}

	if !IsAllowedMimeType(input.MimeType) {
		return apperrors.InvalidInput("file type is not allowed")
	}

	if !hasSafeFileExtension(input.OriginalFileName) {
		return apperrors.InvalidInput("file extension is not allowed")
	}

	return nil
}

func BuildStorageKey(input SaveFileInput) (string, string, error) {
	originalFileName := cleanFileName(input.OriginalFileName)
	if originalFileName == "" {
		return "", "", apperrors.InvalidInput("original file name is required")
	}

	serviceRequestID := safePathPart(input.ServiceRequestID)
	if serviceRequestID == "" {
		return "", "", apperrors.InvalidInput("service request id is required")
	}

	randomValue, err := randomHex(8)
	if err != nil {
		return "", "", apperrors.InternalWrap(err, "failed to generate storage key")
	}

	now := time.Now().UTC()

	extension := strings.ToLower(filepath.Ext(originalFileName))
	baseName := strings.TrimSuffix(originalFileName, filepath.Ext(originalFileName))
	baseName = safeFileBaseName(baseName)

	if baseName == "" {
		baseName = "document"
	}

	fileName := now.Format("20060102T150405") + "-" + randomValue + "-" + baseName + extension

	storageKey := strings.Join([]string{
		"service-requests",
		serviceRequestID,
		now.Format("2006"),
		now.Format("01"),
		fileName,
	}, "/")

	return fileName, storageKey, nil
}

func IsAllowedMimeType(value string) bool {
	value = normalizeMimeType(value)

	return allowedMimeTypes[value]
}

func normalizeMimeType(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func hasSafeFileExtension(fileName string) bool {
	extension := strings.ToLower(filepath.Ext(fileName))

	switch extension {
	case ".pdf",
		".jpg",
		".jpeg",
		".png",
		".webp",
		".doc",
		".docx",
		".xls",
		".xlsx",
		".txt",
		".csv",
		".zip":
		return true
	default:
		return false
	}
}

func safePathPart(value string) string {
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, "\\", "")
	value = strings.ReplaceAll(value, "/", "")
	value = strings.ReplaceAll(value, "..", "")

	return value
}

func safeFileBaseName(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	value = strings.ReplaceAll(value, " ", "-")
	value = strings.ReplaceAll(value, "_", "-")

	var builder strings.Builder

	for _, character := range value {
		switch {
		case character >= 'a' && character <= 'z':
			builder.WriteRune(character)
		case character >= '0' && character <= '9':
			builder.WriteRune(character)
		case character == '-':
			builder.WriteRune(character)
		}
	}

	result := strings.Trim(builder.String(), "-")

	for strings.Contains(result, "--") {
		result = strings.ReplaceAll(result, "--", "-")
	}

	if len(result) > 80 {
		result = result[:80]
		result = strings.Trim(result, "-")
	}

	return result
}

func randomHex(byteLength int) (string, error) {
	if byteLength <= 0 {
		byteLength = 8
	}

	buffer := make([]byte, byteLength)

	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	return hex.EncodeToString(buffer), nil
}