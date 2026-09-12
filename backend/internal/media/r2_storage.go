package media

import (
	"context"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	apperrors "github.com/kyves/kivu-advisory/backend/pkg/errors"
)

type R2Storage struct {
	client        *s3.Client
	bucket        string
	publicBaseURL string
	maxSizeBytes  int64
}

type R2StorageConfig struct {
	Endpoint        string
	Bucket          string
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	PublicBaseURL   string
	MaxSizeBytes    int64
}

func NewR2Storage(config R2StorageConfig) (*R2Storage, error) {
	config.Endpoint = strings.TrimRight(
		strings.TrimSpace(config.Endpoint),
		"/",
	)
	config.Bucket = strings.TrimSpace(config.Bucket)
	config.AccessKeyID = strings.TrimSpace(config.AccessKeyID)
	config.SecretAccessKey = strings.TrimSpace(config.SecretAccessKey)
	config.Region = strings.TrimSpace(config.Region)
	config.PublicBaseURL = strings.TrimRight(
		strings.TrimSpace(config.PublicBaseURL),
		"/",
	)

	if config.Region == "" {
		config.Region = "auto"
	}

	if config.MaxSizeBytes <= 0 {
		config.MaxSizeBytes = DefaultMaxImageSizeBytes
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

	if config.PublicBaseURL == "" {
		return nil, apperrors.InvalidInput(
			"r2 public base url is required for website media",
		)
	}

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
			func(
				service string,
				region string,
				options ...any,
			) (aws.Endpoint, error) {
				return aws.Endpoint{
					URL:               config.Endpoint,
					SigningRegion:     config.Region,
					HostnameImmutable: true,
				}, nil
			},
		),
	}

	client := s3.NewFromConfig(
		awsConfig,
		func(options *s3.Options) {
			options.UsePathStyle = true
		},
	)

	return &R2Storage{
		client:        client,
		bucket:        config.Bucket,
		publicBaseURL: config.PublicBaseURL,
		maxSizeBytes:  config.MaxSizeBytes,
	}, nil
}

func (s *R2Storage) Driver() string {
	return StorageDriverR2
}

func (s *R2Storage) SaveImage(
	ctx context.Context,
	input SaveImageInput,
) (*StoredImage, error) {
	if s == nil || s.client == nil {
		return nil, apperrors.Internal("r2 media storage is not initialized")
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

	limitedReader := io.LimitReader(
		input.Reader,
		input.SizeBytes,
	)

	_, err = s.client.PutObject(
		ctx,
		&s3.PutObjectInput{
			Bucket:        aws.String(s.bucket),
			Key:           aws.String(storageKey),
			Body:          limitedReader,
			ContentLength: aws.Int64(input.SizeBytes),
			ContentType: aws.String(
				normalizeMimeType(input.MimeType),
			),
			CacheControl: aws.String(
				"public, max-age=31536000, immutable",
			),
		},
	)
	if err != nil {
		return nil, apperrors.InternalWrap(
			err,
			"failed to upload website image to r2",
		)
	}

	return &StoredImage{
		FileName:         fileName,
		OriginalFileName: input.OriginalFileName,
		MimeType:         normalizeMimeType(input.MimeType),
		FileSizeBytes:    input.SizeBytes,
		StorageDriver:    StorageDriverR2,
		StorageKey:       storageKey,
		URL: s.publicBaseURL + "/" +
			strings.TrimLeft(storageKey, "/"),
	}, nil
}

func (s *R2Storage) Delete(ctx context.Context, key string) error {
	if s == nil || s.client == nil {
		return apperrors.Internal("r2 media storage is not initialized")
	}

	key = strings.TrimSpace(key)

	if key == "" {
		return apperrors.InvalidInput("media storage key is required")
	}

	_, err := s.client.DeleteObject(
		ctx,
		&s3.DeleteObjectInput{
			Bucket: aws.String(s.bucket),
			Key:    aws.String(key),
		},
	)
	if err != nil {
		return apperrors.InternalWrap(
			err,
			"failed to delete website image from r2",
		)
	}

	return nil
}
