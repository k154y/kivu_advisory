package media

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const (
	StorageDriverLocal = "local"
	StorageDriverR2    = "r2"
)

var safeFileNamePattern = regexp.MustCompile(`[^a-zA-Z0-9_-]+`)

type Storage interface {
	Driver() string
	SaveImage(ctx context.Context, input SaveImageInput) (*StoredImage, error)
	Delete(ctx context.Context, key string) error
}

type SaveImageInput struct {
	Reader           io.Reader
	Category         string
	OriginalFileName string
	MimeType         string
	SizeBytes        int64
}

type StoredImage struct {
	FileName         string
	OriginalFileName string
	MimeType         string
	FileSizeBytes    int64
	StorageDriver    string
	StorageKey       string
	URL              string
}

func ValidateImage(input SaveImageInput, maxSizeBytes int64) error {
	if input.Reader == nil {
		return apperrors.InvalidInput("image file is required")
	}

	if _, err := NormalizeCategory(input.Category); err != nil {
		return err
	}

	fileName := strings.TrimSpace(filepath.Base(input.OriginalFileName))
	if fileName == "" || fileName == "." {
		return apperrors.InvalidInput("image file name is required")
	}

	if input.SizeBytes <= 0 {
		return apperrors.InvalidInput("image file size must be greater than zero")
	}

	if maxSizeBytes <= 0 {
		maxSizeBytes = DefaultMaxImageSizeBytes
	}

	if input.SizeBytes > maxSizeBytes {
		return apperrors.InvalidInput("image file is too large")
	}

	mimeType := normalizeMimeType(input.MimeType)

	switch mimeType {
	case "image/jpeg", "image/png", "image/webp":
	default:
		return apperrors.InvalidInput(
			"image type is not allowed; use JPEG, PNG, or WebP",
		)
	}

	extension := strings.ToLower(filepath.Ext(fileName))

	switch extension {
	case ".jpg", ".jpeg", ".png", ".webp":
	default:
		return apperrors.InvalidInput(
			"image extension is not allowed; use .jpg, .jpeg, .png, or .webp",
		)
	}

	return nil
}

func BuildStorageKey(category string, originalFileName string) (string, string, error) {
	category, err := NormalizeCategory(category)
	if err != nil {
		return "", "", err
	}

	originalFileName = strings.TrimSpace(filepath.Base(originalFileName))
	if originalFileName == "" || originalFileName == "." {
		return "", "", apperrors.InvalidInput("image file name is required")
	}

	extension := strings.ToLower(filepath.Ext(originalFileName))
	baseName := strings.TrimSuffix(originalFileName, filepath.Ext(originalFileName))

	baseName = safeFileNamePattern.ReplaceAllString(baseName, "-")
	baseName = strings.Trim(baseName, "-_")

	if baseName == "" {
		baseName = "image"
	}

	randomValue, err := randomHex(8)
	if err != nil {
		return "", "", apperrors.InternalWrap(
			err,
			"failed to generate media storage key",
		)
	}

	now := time.Now().UTC()

	fileName := strings.Join([]string{
		now.Format("20060102T150405"),
		randomValue,
		baseName,
	}, "-") + extension

	storageKey := strings.Join([]string{
		"website",
		category,
		now.Format("2006"),
		now.Format("01"),
		fileName,
	}, "/")

	return fileName, storageKey, nil
}

func normalizeMimeType(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))

	if separator := strings.Index(value, ";"); separator >= 0 {
		value = strings.TrimSpace(value[:separator])
	}

	return value
}

func randomHex(byteCount int) (string, error) {
	buffer := make([]byte, byteCount)

	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	return hex.EncodeToString(buffer), nil
}
