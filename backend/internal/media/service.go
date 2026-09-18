package media

import (
	"context"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type Service struct {
	storage Storage
}

func NewService(storage Storage) *Service {
	return &Service{
		storage: storage,
	}
}

func (s *Service) UploadImage(
	ctx context.Context,
	input SaveImageInput,
) (*UploadedImage, error) {
	if s == nil || s.storage == nil {
		return nil, apperrors.Internal("media service is not initialized")
	}

	category, err := NormalizeCategory(input.Category)
	if err != nil {
		return nil, err
	}

	input.Category = category

	storedImage, err := s.storage.SaveImage(ctx, input)
	if err != nil {
		return nil, err
	}

	return &UploadedImage{
		FileName:      storedImage.FileName,
		OriginalName:  storedImage.OriginalFileName,
		MimeType:      storedImage.MimeType,
		FileSizeBytes: storedImage.FileSizeBytes,
		StorageDriver: storedImage.StorageDriver,
		StorageKey:    storedImage.StorageKey,
		URL:           storedImage.URL,
		Category:      category,
	}, nil
}
