package router

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kyves/kivu-advisory/backend/internal/assignment"
	"github.com/kyves/kivu-advisory/backend/internal/auth"
	"github.com/kyves/kivu-advisory/backend/internal/client"
	"github.com/kyves/kivu-advisory/backend/internal/config"
	"github.com/kyves/kivu-advisory/backend/internal/consultation"
	"github.com/kyves/kivu-advisory/backend/internal/document"
	"github.com/kyves/kivu-advisory/backend/internal/message"
	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	"github.com/kyves/kivu-advisory/backend/internal/servicecatalog"
	"github.com/kyves/kivu-advisory/backend/internal/servicerequest"
	"github.com/kyves/kivu-advisory/backend/internal/user"
	"github.com/kyves/kivu-advisory/backend/pkg/response"
)

type Options struct {
	Config       *config.Config
	DatabasePool *pgxpool.Pool
}

func New(options Options) http.Handler {
	if options.Config == nil {
		panic("router config is required")
	}

	mux := http.NewServeMux()

	tokenVerifier := registerApplicationRoutes(mux, options)

	registerBaseRoutes(mux, options.Config)
	registerPlaceholderRoutes(mux, options.Config, tokenVerifier)

	var handler http.Handler = mux

	handler = middleware.Logger(handler)
	handler = middleware.CORS(options.Config.CORS)(handler)
	handler = SecurityHeaders(handler)

	return handler
}

func registerApplicationRoutes(mux *http.ServeMux, options Options) middleware.TokenVerifier {
	if options.DatabasePool == nil {
		log.Println("database pool is not available; application routes are not fully enabled")
		return nil
	}

	tokenManager, err := auth.NewTokenManager(options.Config.JWT)
	if err != nil {
		log.Printf("token manager is not available: %v", err)
		return nil
	}

	userRepository := user.NewPostgresRepository(options.DatabasePool)
	userService := user.NewService(userRepository, options.Config.Password)

	clientRepository := client.NewPostgresRepository(options.DatabasePool)
	clientService := client.NewService(clientRepository)

	serviceRepository := servicecatalog.NewPostgresRepository(options.DatabasePool)
	serviceCatalogService := servicecatalog.NewService(serviceRepository)

	serviceRequestRepository := servicerequest.NewPostgresRepository(options.DatabasePool)
	serviceRequestService := servicerequest.NewService(serviceRequestRepository)

	assignmentRepository := assignment.NewPostgresRepository(options.DatabasePool)
	assignmentService := assignment.NewService(assignmentRepository)

	documentRepository := document.NewPostgresRepository(options.DatabasePool)
	documentStorage := newDocumentStorage(options.Config)
	documentAccessChecker := document.NewAccessChecker(serviceRequestRepository, assignmentRepository)
	documentService := document.NewService(documentRepository, documentStorage, documentAccessChecker)

	consultationRepository := consultation.NewPostgresRepository(options.DatabasePool)
	consultationService := consultation.NewService(consultationRepository)

	messageRepository := message.NewPostgresRepository(options.DatabasePool)
	messageService := message.NewService(messageRepository, documentAccessChecker)

	bootstrapCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := auth.BootstrapAdmin(bootstrapCtx, userService, auth.BootstrapAdminInput{
		FullName: options.Config.Admin.FullName,
		Email:    options.Config.Admin.Email,
		Phone:    options.Config.Admin.Phone,
		Password: options.Config.Admin.Password,
	}); err != nil {
		log.Printf("admin bootstrap failed: %v", err)
	}

	authService := auth.NewService(userService, tokenManager, options.Config.Password.MinLength)
	authService.SetClientService(clientService)

	authHandler := auth.NewHandler(authService)
	clientHandler := client.NewHandler(clientService)
	serviceCatalogHandler := servicecatalog.NewHandler(serviceCatalogService)
	serviceRequestHandler := servicerequest.NewHandler(serviceRequestService, clientService)
	assignmentHandler := assignment.NewHandler(assignmentService)
	documentHandler := document.NewHandler(documentService, clientService)
	consultationHandler := consultation.NewHandler(consultationService)
	messageHandler := message.NewHandler(messageService, clientService)

	auth.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		authHandler,
		tokenManager,
	)

	client.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		clientHandler,
		tokenManager,
	)

	servicecatalog.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		serviceCatalogHandler,
		tokenManager,
	)

	servicerequest.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		serviceRequestHandler,
		tokenManager,
	)

	assignment.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		assignmentHandler,
		tokenManager,
	)

	document.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		documentHandler,
		tokenManager,
	)

	consultation.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		consultationHandler,
		tokenManager,
	)

	message.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		messageHandler,
		tokenManager,
	)

	return tokenManager
}

func registerBaseRoutes(mux *http.ServeMux, cfg *config.Config) {
	mux.HandleFunc("/health", methodOnly(http.MethodGet, healthHandler(cfg)))
	mux.HandleFunc(cfg.Server.APIBasePath+"/health", methodOnly(http.MethodGet, healthHandler(cfg)))
	mux.HandleFunc(cfg.Server.APIBasePath+"/", methodOnly(http.MethodGet, apiRootHandler(cfg)))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		response.NotFound(w, "route not found")
	})
}

func registerPlaceholderRoutes(mux *http.ServeMux, cfg *config.Config, tokenVerifier middleware.TokenVerifier) {
	api := cfg.Server.APIBasePath

	if tokenVerifier == nil {
		mux.HandleFunc(api+"/auth/login", notImplemented("auth login route requires database connection"))
		mux.HandleFunc(api+"/auth/register", notImplemented("auth register route requires database connection"))
		mux.HandleFunc(api+"/auth/refresh", notImplemented("auth refresh route requires database connection"))
		mux.HandleFunc(api+"/auth/me", notImplemented("auth me route requires database connection"))
		mux.HandleFunc(api+"/admin/accountants", notImplemented("admin accountant route requires database connection"))

		mux.HandleFunc(api+"/client/profile", notImplemented("client profile route requires database connection"))
		mux.HandleFunc(api+"/admin/clients", notImplemented("admin clients route requires database connection"))
		mux.HandleFunc(api+"/admin/clients/detail", notImplemented("admin client detail route requires database connection"))

		mux.HandleFunc(api+"/services", notImplemented("services route requires database connection"))
		mux.HandleFunc(api+"/services/detail", notImplemented("service detail route requires database connection"))
		mux.HandleFunc(api+"/admin/services", notImplemented("admin services route requires database connection"))
		mux.HandleFunc(api+"/admin/services/detail", notImplemented("admin service detail route requires database connection"))
		mux.HandleFunc(api+"/admin/services/status", notImplemented("admin service status route requires database connection"))

		mux.HandleFunc(api+"/service-requests", notImplemented("service requests route requires database connection"))
		mux.HandleFunc(api+"/client/service-requests", notImplemented("client service requests route requires database connection"))
		mux.HandleFunc(api+"/client/service-requests/detail", notImplemented("client service request detail route requires database connection"))
		mux.HandleFunc(api+"/admin/service-requests", notImplemented("admin service requests route requires database connection"))
		mux.HandleFunc(api+"/admin/service-requests/detail", notImplemented("admin service request detail route requires database connection"))
		mux.HandleFunc(api+"/admin/service-requests/status", notImplemented("admin service request status route requires database connection"))
		mux.HandleFunc(api+"/admin/service-requests/reference", notImplemented("admin service request reference route requires database connection"))

		mux.HandleFunc(api+"/admin/assignments", notImplemented("admin assignments route requires database connection"))
		mux.HandleFunc(api+"/admin/assignments/detail", notImplemented("admin assignment detail route requires database connection"))
		mux.HandleFunc(api+"/admin/assignments/status", notImplemented("admin assignment status route requires database connection"))
		mux.HandleFunc(api+"/accountant/assignments", notImplemented("accountant assignments route requires database connection"))
		mux.HandleFunc(api+"/accountant/assignments/detail", notImplemented("accountant assignment detail route requires database connection"))
		mux.HandleFunc(api+"/accountant/assignments/status", notImplemented("accountant assignment status route requires database connection"))

		mux.HandleFunc(api+"/documents", notImplemented("documents route requires database connection"))
		mux.HandleFunc(api+"/documents/detail", notImplemented("document detail route requires database connection"))
		mux.HandleFunc(api+"/documents/download", notImplemented("document download route requires database connection"))

		mux.HandleFunc(api+"/consultations", notImplemented("consultations route requires database connection"))
		mux.HandleFunc(api+"/admin/consultations", notImplemented("admin consultations route requires database connection"))
		mux.HandleFunc(api+"/admin/consultations/detail", notImplemented("admin consultation detail route requires database connection"))
		mux.HandleFunc(api+"/admin/consultations/status", notImplemented("admin consultation status route requires database connection"))

		mux.HandleFunc(api+"/messages", notImplemented("messages route requires database connection"))
		mux.HandleFunc(api+"/messages/detail", notImplemented("message detail route requires database connection"))
		mux.HandleFunc(api+"/messages/read", notImplemented("message read route requires database connection"))
	}

	mux.HandleFunc(api+"/admin", notImplemented("admin route is not implemented yet"))
	mux.HandleFunc(api+"/client", notImplemented("client route is not implemented yet"))
	mux.HandleFunc(api+"/accountant", notImplemented("accountant route is not implemented yet"))
}

func healthHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response.OK(w, "backend is healthy", map[string]string{
			"status":      "ok",
			"service":     "kivu-advisory-backend",
			"environment": cfg.App.Env,
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func apiRootHandler(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != cfg.Server.APIBasePath && r.URL.Path != cfg.Server.APIBasePath+"/" {
			response.NotFound(w, "route not found")
			return
		}

		response.OK(w, "Kivu Advisory API is running", map[string]string{
			"api_base_path": cfg.Server.APIBasePath,
			"environment":   cfg.App.Env,
		})
	}
}

func notImplemented(message string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		response.Error(w, http.StatusNotImplemented, "not_implemented", message, nil)
	}
}

func methodOnly(method string, handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			response.MethodNotAllowed(w)
			return
		}

		handler(w, r)
	}
}

func newDocumentStorage(cfg *config.Config) document.Storage {
	if cfg == nil {
		log.Println("document storage: local private storage")
		return document.NewLocalStorage("", document.DefaultMaxUploadSizeBytes)
	}

	maxUploadSize := document.DefaultMaxUploadSizeBytes
	if cfg.Upload.MaxSizeBytes > 0 {
		maxUploadSize = cfg.Upload.MaxSizeBytes
	}

	switch cfg.Storage.Driver {
	case config.StorageDriverR2:
		r2Storage, err := document.NewR2Storage(document.R2StorageConfig{
			Endpoint:        cfg.Storage.R2.Endpoint,
			Bucket:          cfg.Storage.R2.BucketName,
			AccessKeyID:     cfg.Storage.R2.AccessKeyID,
			SecretAccessKey: cfg.Storage.R2.SecretAccessKey,
			Region:          cfg.Storage.R2.Region,
			MaxSizeBytes:    maxUploadSize,
		})
		if err != nil {
			log.Printf("r2 storage unavailable, falling back to local storage: %v", err)
			return document.NewLocalStorage(cfg.Storage.LocalUploadDir, maxUploadSize)
		}

		log.Println("document storage: cloudflare r2")
		return r2Storage

	default:
		log.Println("document storage: local private storage")
		return document.NewLocalStorage(cfg.Storage.LocalUploadDir, maxUploadSize)
	}
}

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		next.ServeHTTP(w, r)
	})
}