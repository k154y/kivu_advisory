package media

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type LocalStorage struct {
	basePath      string
	publicBaseURL string
	maxSizeBytes  int64
}

func NewLocalStorage(
	basePath string,
	publicBaseURL string,
	maxSizeBytes int64,
) *LocalStorage {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		basePath = "tmp/uploads-for-local-development"
	}

	publicBaseURL = strings.TrimRight(
		strings.TrimSpace(publicBaseURL),
		"/",
	)

	if maxSizeBytes <= 0 {
		maxSizeBytes = DefaultMaxImageSizeBytes
	}

	return &LocalStorage{
		basePath:      basePath,
		publicBaseURL: publicBaseURL,
		maxSizeBytes:  maxSizeBytes,
	}
}

func (s *LocalStorage) Driver() string {
	return StorageDriverLocal
}

func (s *LocalStorage) SaveImage(
	ctx context.Context,
	input SaveImageInput,
) (*StoredImage, error) {
	if s == nil {
		return nil, apperrors.Internal("local media storage is not initialized")
	}

	if err := ValidateImage(input, s.maxSizeBytes); err != nil {
		return nil, err
	}

	fileName, storageKey, err := BuildStorageKey(
		input.Category,
		input.OriginalFileName,
	)
	if err != nil {
		return nil, err
	}

	destinationPath, err := s.pathForKey(storageKey)
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(filepath.Dir(destinationPath), 0755); err != nil {
		return nil, apperrors.InternalWrap(
			err,
			"failed to create media storage directory",
		)
	}

	destinationFile, err := os.OpenFile(
		destinationPath,
		os.O_WRONLY|os.O_CREATE|os.O_EXCL,
		0644,
	)
	if err != nil {
		return nil, apperrors.InternalWrap(
			err,
			"failed to create stored media file",
		)
	}

	defer destinationFile.Close()

	limitedReader := io.LimitReader(input.Reader, s.maxSizeBytes+1)

	writtenBytes, err := io.Copy(destinationFile, limitedReader)
	if err != nil {
		_ = os.Remove(destinationPath)

		return nil, apperrors.InternalWrap(
			err,
			"failed to save media image",
		)
	}

	if writtenBytes > s.maxSizeBytes {
		_ = os.Remove(destinationPath)
		return nil, apperrors.InvalidInput("image file is too large")
	}

	if err := ctx.Err(); err != nil {
		_ = os.Remove(destinationPath)

		return nil, apperrors.InternalWrap(
			err,
			"media upload was cancelled",
		)
	}

	return &StoredImage{
		FileName:         fileName,
		OriginalFileName: filepath.Base(input.OriginalFileName),
		MimeType:         normalizeMimeType(input.MimeType),
		FileSizeBytes:    writtenBytes,
		StorageDriver:    StorageDriverLocal,
		StorageKey:       storageKey,
		URL:              s.publicURL(storageKey),
	}, nil
}

func (s *LocalStorage) Delete(ctx context.Context, key string) error {
	if s == nil {
		return apperrors.Internal("local media storage is not initialized")
	}

	if err := ctx.Err(); err != nil {
		return apperrors.InternalWrap(
			err,
			"media deletion was cancelled",
		)
	}

	path, err := s.pathForKey(key)
	if err != nil {
		return err
	}

	err = os.Remove(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return apperrors.InternalWrap(
			err,
			"failed to delete media image",
		)
	}

	return nil
}

func (s *LocalStorage) pathForKey(key string) (string, error) {
	key = filepath.ToSlash(strings.TrimSpace(key))
	key = strings.TrimPrefix(key, "/")

	if key == "" {
		return "", apperrors.InvalidInput("media storage key is required")
	}

	cleanKey := filepath.Clean(filepath.FromSlash(key))

	if cleanKey == "." ||
		filepath.IsAbs(cleanKey) ||
		cleanKey == ".." ||
		strings.HasPrefix(cleanKey, ".."+string(filepath.Separator)) {
		return "", apperrors.InvalidInput("invalid media storage key")
	}

	basePath, err := filepath.Abs(s.basePath)
	if err != nil {
		return "", apperrors.InternalWrap(
			err,
			"failed to resolve media storage directory",
		)
	}

	destinationPath, err := filepath.Abs(
		filepath.Join(basePath, cleanKey),
	)
	if err != nil {
		return "", apperrors.InternalWrap(
			err,
			"failed to resolve media storage path",
		)
	}

	prefix := basePath + string(filepath.Separator)

	if destinationPath != basePath &&
		!strings.HasPrefix(destinationPath, prefix) {
		return "", apperrors.InvalidInput("invalid media storage path")
	}

	return destinationPath, nil
}

func (s *LocalStorage) publicURL(storageKey string) string {
	path := "/media/" + strings.TrimLeft(
		filepath.ToSlash(storageKey),
		"/",
	)

	if s.publicBaseURL == "" {
		return path
	}

	return s.publicBaseURL + path
}
