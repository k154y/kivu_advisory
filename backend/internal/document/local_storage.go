package document

import (
	"context"
	"errors"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

const defaultLocalDocumentPath = "storage/private/documents"

type LocalStorage struct {
	basePath     string
	maxSizeBytes int64
}

func NewLocalStorage(basePath string, maxSizeBytes int64) *LocalStorage {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		basePath = defaultLocalDocumentPath
	}

	if maxSizeBytes <= 0 {
		maxSizeBytes = DefaultMaxUploadSizeBytes
	}

	return &LocalStorage{
		basePath:     basePath,
		maxSizeBytes: maxSizeBytes,
	}
}

func (s *LocalStorage) Driver() string {
	return StorageDriverLocal
}

func (s *LocalStorage) Save(ctx context.Context, input SaveFileInput) (*SavedFile, error) {
	if s == nil {
		return nil, apperrors.Internal("local storage is not initialized")
	}

	if err := ValidateSaveFileInput(input, s.maxSizeBytes); err != nil {
		return nil, err
	}

	fileName, storageKey, err := BuildStorageKey(input)
	if err != nil {
		return nil, err
	}

	destinationPath, err := s.pathForKey(storageKey)
	if err != nil {
		return nil, err
	}

	if err := os.MkdirAll(filepath.Dir(destinationPath), 0700); err != nil {
		return nil, apperrors.InternalWrap(err, "failed to create document storage directory")
	}

	destinationFile, err := os.OpenFile(destinationPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return nil, apperrors.InternalWrap(err, "failed to create stored document")
	}
	defer destinationFile.Close()

	limitedReader := io.LimitReader(input.Reader, s.maxSizeBytes+1)

	writtenBytes, err := io.Copy(destinationFile, limitedReader)
	if err != nil {
		_ = os.Remove(destinationPath)
		return nil, apperrors.InternalWrap(err, "failed to save document")
	}

	if writtenBytes > s.maxSizeBytes {
		_ = os.Remove(destinationPath)
		return nil, apperrors.InvalidInput("file is too large")
	}

	if err := ctx.Err(); err != nil {
		_ = os.Remove(destinationPath)
		return nil, apperrors.InternalWrap(err, "document upload was cancelled")
	}

	return &SavedFile{
		FileName:         fileName,
		OriginalFileName: cleanFileName(input.OriginalFileName),
		MimeType:         normalizeMimeType(input.MimeType),
		FileSizeBytes:    writtenBytes,
		StorageDriver:    StorageDriverLocal,
		StorageBucket:    "",
		StorageKey:       storageKey,
	}, nil
}

func (s *LocalStorage) Open(ctx context.Context, key string) (*OpenedFile, error) {
	if s == nil {
		return nil, apperrors.Internal("local storage is not initialized")
	}

	if err := ctx.Err(); err != nil {
		return nil, apperrors.InternalWrap(err, "document download was cancelled")
	}

	documentPath, err := s.pathForKey(key)
	if err != nil {
		return nil, err
	}

	file, err := os.Open(documentPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, apperrors.NotFound("stored document not found")
		}

		return nil, apperrors.InternalWrap(err, "failed to open stored document")
	}

	fileInfo, err := file.Stat()
	if err != nil {
		_ = file.Close()
		return nil, apperrors.InternalWrap(err, "failed to read stored document information")
	}

	fileName := filepath.Base(documentPath)
	mimeType := mime.TypeByExtension(strings.ToLower(filepath.Ext(fileName)))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	return &OpenedFile{
		Reader:    file,
		FileName:  fileName,
		MimeType:  mimeType,
		SizeBytes: fileInfo.Size(),
	}, nil
}

func (s *LocalStorage) Delete(ctx context.Context, key string) error {
	if s == nil {
		return apperrors.Internal("local storage is not initialized")
	}

	if err := ctx.Err(); err != nil {
		return apperrors.InternalWrap(err, "document deletion was cancelled")
	}

	documentPath, err := s.pathForKey(key)
	if err != nil {
		return err
	}

	if err := os.Remove(documentPath); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}

		return apperrors.InternalWrap(err, "failed to delete stored document")
	}

	return nil
}

func (s *LocalStorage) pathForKey(key string) (string, error) {
	key = strings.TrimSpace(key)
	key = strings.ReplaceAll(key, "\\", "/")

	if key == "" {
		return "", apperrors.InvalidInput("storage key is required")
	}

	cleanKey := filepath.Clean("/" + key)
	cleanKey = strings.TrimPrefix(cleanKey, "/")

	if cleanKey == "." || strings.HasPrefix(cleanKey, "../") || strings.Contains(cleanKey, "/../") {
		return "", apperrors.InvalidInput("storage key is invalid")
	}

	return filepath.Join(s.basePath, cleanKey), nil
}
