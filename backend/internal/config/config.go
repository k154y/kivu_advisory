package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	EnvDevelopment = "development"
	EnvStaging     = "staging"
	EnvProduction  = "production"

	StorageDriverLocal = "local"
	StorageDriverR2    = "r2"
)

type Config struct {
	App           AppConfig
	Server        ServerConfig
	CORS          CORSConfig
	Database      DatabaseConfig
	JWT           JWTConfig
	Password      PasswordConfig
	Storage       StorageConfig
	Upload        UploadConfig
	Email         EmailConfig
	Notifications NotificationConfig
	Admin         AdminConfig
	Logging       LoggingConfig
}

type AppConfig struct {
	Name     string
	Env      string
	Timezone string
}

type ServerConfig struct {
	Host        string
	Port        string
	APIBasePath string
	PublicURL   string
	FrontendURL string
}

type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	AllowCredentials bool
}

type DatabaseConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
	MigrationsPath  string
}

type JWTConfig struct {
	Secret          string
	Issuer          string
	Audience        string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

type PasswordConfig struct {
	MinLength  int
	BcryptCost int
}

type StorageConfig struct {
	Driver         string
	LocalUploadDir string
	R2             R2Config
}

type R2Config struct {
	AccountID       string
	AccessKeyID    string
	SecretAccessKey string
	BucketName      string
	Endpoint        string
	Region          string
	PublicBaseURL    string
}

type UploadConfig struct {
	MaxSizeMB          int
	MaxSizeBytes       int64
	AllowedExtensions []string
	AllowedMimeTypes  []string
}

type EmailConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromName  string
	FromEmail string
	UseTLS    bool
}

type NotificationConfig struct {
	SendEmailNotifications      bool
	NotifyAdminOnNewRequest    bool
	NotifyAdminOnDocumentUpload bool
	NotifyClientOnStatusChange bool
}

type AdminConfig struct {
	FullName string
	Email    string
	Password string
	Phone    string
}

type LoggingConfig struct {
	Level  string
	Format string
}

func Load() (*Config, error) {
	cfg := &Config{
		App: AppConfig{
			Name:     getEnv("APP_NAME", "Kivu Advisory Backend"),
			Env:      getEnv("APP_ENV", EnvDevelopment),
			Timezone: getEnv("APP_TIMEZONE", "Africa/Kigali"),
		},
		Server: ServerConfig{
			Host:        getEnv("SERVER_HOST", "0.0.0.0"),
			Port:        getEnv("SERVER_PORT", "8080"),
			APIBasePath: normalizeAPIBasePath(getEnv("API_BASE_PATH", "/api/v1")),
			PublicURL:   getEnv("BACKEND_PUBLIC_URL", "http://localhost:8080"),
			FrontendURL: getEnv("FRONTEND_PUBLIC_URL", "http://localhost:3000"),
		},
		CORS: CORSConfig{
			AllowedOrigins:   getCSVEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"),
			AllowedMethods:   getCSVEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS"),
			AllowedHeaders:   getCSVEnv("CORS_ALLOWED_HEADERS", "Authorization,Content-Type,Accept,Origin"),
			AllowCredentials: getBoolEnv("CORS_ALLOW_CREDENTIALS", true),
		},
		Database: DatabaseConfig{
			URL:             getEnv("DATABASE_URL", ""),
			MaxOpenConns:    getIntEnv("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getIntEnv("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: time.Duration(getIntEnv("DB_CONN_MAX_LIFETIME_MINUTES", 30)) * time.Minute,
			ConnMaxIdleTime: time.Duration(getIntEnv("DB_CONN_MAX_IDLE_TIME_MINUTES", 10)) * time.Minute,
			MigrationsPath:  getEnv("MIGRATIONS_PATH", "file://db/migrations"),
		},
		JWT: JWTConfig{
			Secret:          getEnv("JWT_SECRET", ""),
			Issuer:          getEnv("JWT_ISSUER", "kivu-advisory"),
			Audience:        getEnv("JWT_AUDIENCE", "kivu-advisory-users"),
			AccessTokenTTL:  time.Duration(getIntEnv("JWT_ACCESS_TOKEN_TTL_MINUTES", 60)) * time.Minute,
			RefreshTokenTTL: time.Duration(getIntEnv("JWT_REFRESH_TOKEN_TTL_DAYS", 7)) * 24 * time.Hour,
		},
		Password: PasswordConfig{
			MinLength:  getIntEnv("PASSWORD_MIN_LENGTH", 8),
			BcryptCost: getIntEnv("BCRYPT_COST", 12),
		},
		Storage: StorageConfig{
			Driver:         getEnv("STORAGE_DRIVER", StorageDriverLocal),
			LocalUploadDir: getEnv("LOCAL_UPLOAD_DIR", "tmp/uploads-for-local-development"),
			R2: R2Config{
				AccountID:       getEnv("R2_ACCOUNT_ID", ""),
				AccessKeyID:    getEnv("R2_ACCESS_KEY_ID", ""),
				SecretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", ""),
				BucketName:      getEnv("R2_BUCKET_NAME", ""),
				Endpoint:        getEnv("R2_ENDPOINT", ""),
				Region:          getEnv("R2_REGION", "auto"),
				PublicBaseURL:    getEnv("R2_PUBLIC_BASE_URL", ""),
			},
		},
		Upload: UploadConfig{
			MaxSizeMB:          getIntEnv("MAX_UPLOAD_SIZE_MB", 20),
			AllowedExtensions: getCSVEnv("ALLOWED_UPLOAD_EXTENSIONS", "pdf,doc,docx,xls,xlsx,png,jpg,jpeg"),
			AllowedMimeTypes:  getCSVEnv("ALLOWED_UPLOAD_MIME_TYPES", ""),
		},
		Email: EmailConfig{
			Host:      getEnv("SMTP_HOST", ""),
			Port:      getIntEnv("SMTP_PORT", 587),
			Username:  getEnv("SMTP_USERNAME", ""),
			Password:  getEnv("SMTP_PASSWORD", ""),
			FromName:  getEnv("SMTP_FROM_NAME", "Kivu Advisory"),
			FromEmail: getEnv("SMTP_FROM_EMAIL", ""),
			UseTLS:    getBoolEnv("SMTP_USE_TLS", true),
		},
		Notifications: NotificationConfig{
			SendEmailNotifications:       getBoolEnv("SEND_EMAIL_NOTIFICATIONS", false),
			NotifyAdminOnNewRequest:     getBoolEnv("NOTIFY_ADMIN_ON_NEW_REQUEST", true),
			NotifyAdminOnDocumentUpload: getBoolEnv("NOTIFY_ADMIN_ON_DOCUMENT_UPLOAD", true),
			NotifyClientOnStatusChange:  getBoolEnv("NOTIFY_CLIENT_ON_STATUS_CHANGE", true),
		},
		Admin: AdminConfig{
			FullName: getEnv("ADMIN_FULL_NAME", "System Administrator"),
			Email:    getEnv("ADMIN_EMAIL", ""),
			Password: getEnv("ADMIN_PASSWORD", ""),
			Phone:    getEnv("ADMIN_PHONE", ""),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "debug"),
			Format: getEnv("LOG_FORMAT", "text"),
		},
	}

	cfg.Upload.MaxSizeBytes = int64(cfg.Upload.MaxSizeMB) * 1024 * 1024

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	var validationErrors []error

	if !isAllowed(c.App.Env, EnvDevelopment, EnvStaging, EnvProduction) {
		validationErrors = append(validationErrors, fmt.Errorf("APP_ENV must be one of: %s, %s, %s", EnvDevelopment, EnvStaging, EnvProduction))
	}

	if strings.TrimSpace(c.Server.Port) == "" {
		validationErrors = append(validationErrors, errors.New("SERVER_PORT is required"))
	}

	if !strings.HasPrefix(c.Server.APIBasePath, "/") {
		validationErrors = append(validationErrors, errors.New("API_BASE_PATH must start with /"))
	}

	if c.Password.MinLength < 6 {
		validationErrors = append(validationErrors, errors.New("PASSWORD_MIN_LENGTH must be at least 6"))
	}

	if c.Password.BcryptCost < 10 || c.Password.BcryptCost > 15 {
		validationErrors = append(validationErrors, errors.New("BCRYPT_COST must be between 10 and 15"))
	}

	if c.Upload.MaxSizeMB <= 0 {
		validationErrors = append(validationErrors, errors.New("MAX_UPLOAD_SIZE_MB must be greater than 0"))
	}

	if !isAllowed(c.Storage.Driver, StorageDriverLocal, StorageDriverR2) {
		validationErrors = append(validationErrors, fmt.Errorf("STORAGE_DRIVER must be one of: %s, %s", StorageDriverLocal, StorageDriverR2))
	}

	if c.Storage.Driver == StorageDriverR2 {
		if strings.TrimSpace(c.Storage.R2.BucketName) == "" {
			validationErrors = append(validationErrors, errors.New("R2_BUCKET_NAME is required when STORAGE_DRIVER=r2"))
		}

		if strings.TrimSpace(c.Storage.R2.Endpoint) == "" {
			validationErrors = append(validationErrors, errors.New("R2_ENDPOINT is required when STORAGE_DRIVER=r2"))
		}
	}

	if c.IsProduction() {
		if strings.TrimSpace(c.Database.URL) == "" {
			validationErrors = append(validationErrors, errors.New("DATABASE_URL is required in production"))
		}

		if strings.TrimSpace(c.JWT.Secret) == "" {
			validationErrors = append(validationErrors, errors.New("JWT_SECRET is required in production"))
		}

		if len(c.JWT.Secret) < 32 {
			validationErrors = append(validationErrors, errors.New("JWT_SECRET must be at least 32 characters in production"))
		}

		if c.Storage.Driver != StorageDriverR2 {
			validationErrors = append(validationErrors, errors.New("production must use STORAGE_DRIVER=r2"))
		}
	}

	return errors.Join(validationErrors...)
}

func (c *Config) IsDevelopment() bool {
	return c.App.Env == EnvDevelopment
}

func (c *Config) IsProduction() bool {
	return c.App.Env == EnvProduction
}

func (c *Config) Address() string {
	return c.Server.Host + ":" + c.Server.Port
}

func getEnv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func getIntEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getBoolEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}

	switch value {
	case "true", "1", "yes", "y":
		return true
	case "false", "0", "no", "n":
		return false
	default:
		return fallback
	}
}

func getCSVEnv(key string, fallback string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		value = fallback
	}

	if value == "" {
		return []string{}
	}

	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))

	for _, part := range parts {
		cleaned := strings.TrimSpace(part)
		if cleaned != "" {
			result = append(result, cleaned)
		}
	}

	return result
}

func normalizeAPIBasePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "/api/v1"
	}

	if !strings.HasPrefix(value, "/") {
		value = "/" + value
	}

	return strings.TrimRight(value, "/")
}

func isAllowed(value string, allowedValues ...string) bool {
	for _, allowed := range allowedValues {
		if value == allowed {
			return true
		}
	}

	return false
}