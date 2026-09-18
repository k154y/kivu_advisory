package media

import (
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const (
	CategoryHero  = "hero"
	CategoryStaff = "staff"
	CategoryBlog  = "blog"
)

const DefaultMaxImageSizeBytes int64 = 10 * 1024 * 1024 // 10 MB

type UploadedImage struct {
	FileName      string `json:"file_name"`
	OriginalName  string `json:"original_name"`
	MimeType      string `json:"mime_type"`
	FileSizeBytes int64  `json:"file_size_bytes"`
	StorageDriver string `json:"storage_driver"`
	StorageKey    string `json:"storage_key"`
	URL           string `json:"url"`
	Category      string `json:"category"`
}

func NormalizeCategory(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))

	switch value {
	case CategoryHero, CategoryStaff, CategoryBlog:
		return value, nil
	default:
		return "", apperrors.InvalidInput(
			"media category must be one of: hero, staff, blog",
		)
	}
}
