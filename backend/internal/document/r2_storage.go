package document

import (
	"context"
	"errors"
	"io"
	"mime"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type R2Storage struct {
	client       *s3.Client
	bucket       string
	endpoint     string
	maxSizeBytes int64
}

type R2StorageConfig struct {
	Endpoint        string
	Bucket          string
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	MaxSizeBytes    int64
}

func NewR2Storage(config R2StorageConfig) (*R2Storage, error) {
	config.Endpoint = strings.TrimSpace(config.Endpoint)
	config.Bucket = strings.TrimSpace(config.Bucket)
	config.AccessKeyID = strings.TrimSpace(config.AccessKeyID)
	config.SecretAccessKey = strings.TrimSpace(config.SecretAccessKey)
	config.Region = strings.TrimSpace(config.Region)

	if config.Region == "" {
		config.Region = "auto"
	}

	if config.MaxSizeBytes <= 0 {
		config.MaxSizeBytes = DefaultMaxUploadSizeBytes
	}

	if config.Endpoint == "" {
		return nil, apperrors.InvalidInput("r2 endpoint is required")
	}

	if config.Bucket == "" {
		return nil, apperrors.InvalidInput("r2 bucket is required")
	}

	if config.AccessKeyID == "" {
		return nil, apperrors.InvalidInput("r2 access key id is required")
	}

	if config.SecretAccessKey == "" {
		return nil, apperrors.InvalidInput("r2 secret access key is required")
	}

	config.Endpoint = strings.TrimRight(config.Endpoint, "/")

	awsConfig := aws.Config{
		Region: config.Region,
		Credentials: aws.NewCredentialsCache(
			credentials.NewStaticCredentialsProvider(
				config.AccessKeyID,
				config.SecretAccessKey,
				"",
			),
		),
		EndpointResolverWithOptions: aws.EndpointResolverWithOptionsFunc(
			func(service string, region string, options ...any) (aws.Endpoint, error) {
				return aws.Endpoint{
					URL:               config.Endpoint,
					SigningRegion:     config.Region,
					HostnameImmutable: true,
				}, nil
			},
		),
	}

	client := s3.NewFromConfig(awsConfig, func(options *s3.Options) {
		options.UsePathStyle = true
	})

	return &R2Storage{
		client:       client,
		bucket:       config.Bucket,
		endpoint:     config.Endpoint,
		maxSizeBytes: config.MaxSizeBytes,
	}, nil
}

func (s *R2Storage) Driver() string {
	return StorageDriverR2
}

func (s *R2Storage) Save(ctx context.Context, input SaveFileInput) (*SavedFile, error) {
	if s == nil || s.client == nil {
		return nil, apperrors.Internal("r2 storage is not initialized")
	}

	if err := ValidateSaveFileInput(input, s.maxSizeBytes); err != nil {
		return nil, err
	}

	fileName, storageKey, err := BuildStorageKey(input)
	if err != nil {
		return nil, err
	}

	limitedReader := io.LimitReader(input.Reader, input.SizeBytes)

	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucket),
		Key:           aws.String(storageKey),
		Body:          limitedReader,
		ContentLength: aws.Int64(input.SizeBytes),
		ContentType:   aws.String(normalizeMimeType(input.MimeType)),
	})
	if err != nil {
		return nil, apperrors.InternalWrap(err, "failed to upload document to r2")
	}

	return &SavedFile{
		FileName:         fileName,
		OriginalFileName: cleanFileName(input.OriginalFileName),
		MimeType:         normalizeMimeType(input.MimeType),
		FileSizeBytes:    input.SizeBytes,
		StorageDriver:    StorageDriverR2,
		StorageBucket:    s.bucket,
		StorageKey:       storageKey,
	}, nil
}

func (s *R2Storage) Open(ctx context.Context, key string) (*OpenedFile, error) {
	if s == nil || s.client == nil {
		return nil, apperrors.Internal("r2 storage is not initialized")
	}

	key = strings.TrimSpace(key)
	if key == "" {
		return nil, apperrors.InvalidInput("storage key is required")
	}

	output, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		var noSuchKey *types.NoSuchKey
		if errors.As(err, &noSuchKey) {
			return nil, apperrors.NotFound("stored document not found")
		}

		return nil, apperrors.InternalWrap(err, "failed to open document from r2")
	}

	fileName := filepath.Base(key)

	mimeType := ""
	if output.ContentType != nil {
		mimeType = strings.TrimSpace(*output.ContentType)
	}

	if mimeType == "" {
		mimeType = mime.TypeByExtension(strings.ToLower(filepath.Ext(fileName)))
	}

	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	var sizeBytes int64
	if output.ContentLength != nil {
		sizeBytes = *output.ContentLength
	}

	return &OpenedFile{
		Reader:    output.Body,
		FileName:  fileName,
		MimeType:  mimeType,
		SizeBytes: sizeBytes,
	}, nil
}

func (s *R2Storage) Delete(ctx context.Context, key string) error {
	if s == nil || s.client == nil {
		return apperrors.Internal("r2 storage is not initialized")
	}

	key = strings.TrimSpace(key)
	if key == "" {
		return apperrors.InvalidInput("storage key is required")
	}

	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return apperrors.InternalWrap(err, "failed to delete document from r2")
	}

	return nil
}
