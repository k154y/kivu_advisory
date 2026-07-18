package router

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kyves/kivu-advisory/backend/internal/accountant"
	"github.com/kyves/kivu-advisory/backend/internal/notification"
	"github.com/kyves/kivu-advisory/backend/internal/sociallink"
	"github.com/kyves/kivu-advisory/backend/internal/staff"
	"github.com/kyves/kivu-advisory/backend/internal/statistic"
	"github.com/kyves/kivu-advisory/backend/internal/taxcredential"

	"github.com/kyves/kivu-advisory/backend/internal/assignment"
	"github.com/kyves/kivu-advisory/backend/internal/auditlog"
	"github.com/kyves/kivu-advisory/backend/internal/auth"
	"github.com/kyves/kivu-advisory/backend/internal/blog"
	"github.com/kyves/kivu-advisory/backend/internal/client"
	"github.com/kyves/kivu-advisory/backend/internal/config"
	"github.com/kyves/kivu-advisory/backend/internal/consultation"
	"github.com/kyves/kivu-advisory/backend/internal/content"
	"github.com/kyves/kivu-advisory/backend/internal/dashboard"
	"github.com/kyves/kivu-advisory/backend/internal/document"
	"github.com/kyves/kivu-advisory/backend/internal/message"
	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	"github.com/kyves/kivu-advisory/backend/internal/servicecatalog"
	"github.com/kyves/kivu-advisory/backend/internal/servicerequest"
	"github.com/kyves/kivu-advisory/backend/internal/testimonial"
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

	staffRepository := staff.NewPostgresRepository(options.DatabasePool)
	staffService := staff.NewService(staffRepository)

	messageRepository := message.NewPostgresRepository(options.DatabasePool)
	messageService := message.NewService(messageRepository, documentAccessChecker)

	contentRepository := content.NewPostgresRepository(options.DatabasePool)
	contentService := content.NewService(contentRepository)

	accountantRepository := accountant.NewPostgresRepository(options.DatabasePool)
	accountantService := accountant.NewService(accountantRepository)

	notificationRepository := notification.NewPostgresRepository(options.DatabasePool)
	notificationDeliveryRepository := notification.NewPostgresDeliveryRepository(options.DatabasePool)
	notificationRecipientRepository := notification.NewPostgresRecipientRepository(options.DatabasePool)

	notificationService := notification.NewServiceWithDeliveryAndRecipients(
		notificationRepository,
		notificationDeliveryRepository,
		notificationRecipientRepository,
		notification.NewNoopEmailSender(),
		notification.NewNoopSMSSender(),
	)

	blogRepository := blog.NewPostgresRepository(options.DatabasePool)
	blogService := blog.NewServiceWithNotifications(blogRepository, notificationService)

	testimonialRepository := testimonial.NewPostgresRepository(options.DatabasePool)
	testimonialService := testimonial.NewService(testimonialRepository)

	auditLogRepository := auditlog.NewPostgresRepository(options.DatabasePool)
	auditLogService := auditlog.NewService(auditLogRepository)

	socialLinkRepository := sociallink.NewPostgresRepository(options.DatabasePool)
	socialLinkService := sociallink.NewService(socialLinkRepository)

	statisticRepository := statistic.NewPostgresRepository(options.DatabasePool)
	statisticService := statistic.NewService(statisticRepository)

	taxCredentialSystemRepository := taxcredential.NewPostgresSystemRepository(options.DatabasePool)
	taxCredentialRepository := taxcredential.NewPostgresCredentialRepository(options.DatabasePool)

	taxCredentialEncryptor, err := taxcredential.NewEncryptorFromEnv()
	if err != nil {
		panic(err)
	}

	taxCredentialService := taxcredential.NewService(
		taxCredentialSystemRepository,
		taxCredentialRepository,
		taxCredentialEncryptor,
	)

	

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

	authHandler := auth.NewHandler(authService, auditLogService)
	clientHandler := client.NewHandler(clientService)
	serviceCatalogHandler := servicecatalog.NewHandler(serviceCatalogService, auditLogService)
	serviceRequestHandler := servicerequest.NewHandler(serviceRequestService, clientService, auditLogService)
	assignmentHandler := assignment.NewHandler(assignmentService, auditLogService)
	documentHandler := document.NewHandler(documentService, clientService)
	consultationHandler := consultation.NewHandler(consultationService, auditLogService)
	messageHandler := message.NewHandler(messageService, clientService)
	contentHandler := content.NewHandler(contentService)
	blogHandler := blog.NewHandler(blogService, auditLogService)
	accountantHandler := accountant.NewHandler(accountantService, auditLogService)
	notificationHandler := notification.NewHandler(notificationService)
	staffHandler := staff.NewHandler(staffService, auditLogService)
	testimonialHandler := testimonial.NewHandler(testimonialService)
	statisticHandler := statistic.NewHandler(statisticService)
	dashboardHandler := dashboard.NewHandler(
		serviceRequestService,
		consultationService,
		clientService,
		accountantService,
	)
	auditLogHandler := auditlog.NewHandler(auditLogService)
	socialLinkHandler := sociallink.NewHandler(socialLinkService)
	taxCredentialHandler := taxcredential.NewHandler(taxCredentialService)
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

	content.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		contentHandler,
		tokenManager,
	)

	blog.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		blogHandler,
		tokenManager,
	)

	accountant.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		accountantHandler,
		tokenManager,
	)

	notification.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		notificationHandler,
		tokenManager,
	)

	staff.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		staffHandler,
		tokenManager,
	)

	testimonial.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		testimonialHandler,
		tokenManager,
	)

	dashboard.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		dashboardHandler,
		tokenManager,
	)

	auditlog.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		auditLogHandler,
		tokenManager,
	)

	sociallink.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		socialLinkHandler,
		tokenManager,
	)

	statistic.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		statisticHandler,
		tokenManager,
	)

	taxcredential.RegisterRoutes(
		mux,
		options.Config.Server.APIBasePath,
		taxCredentialHandler,
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

		mux.HandleFunc(api+"/content", notImplemented("content route requires database connection"))
		mux.HandleFunc(api+"/content/detail", notImplemented("content detail route requires database connection"))
		mux.HandleFunc(api+"/admin/content", notImplemented("admin content route requires database connection"))
		mux.HandleFunc(api+"/admin/content/detail", notImplemented("admin content detail route requires database connection"))
		mux.HandleFunc(api+"/admin/content/status", notImplemented("admin content status route requires database connection"))

		mux.HandleFunc(api+"/blog", notImplemented("blog route requires database connection"))
		mux.HandleFunc(api+"/blog/detail", notImplemented("blog detail route requires database connection"))
		mux.HandleFunc(api+"/admin/blog", notImplemented("admin blog route requires database connection"))
		mux.HandleFunc(api+"/admin/blog/detail", notImplemented("admin blog detail route requires database connection"))
		mux.HandleFunc(api+"/admin/blog/status", notImplemented("admin blog status route requires database connection"))

		mux.HandleFunc(api+"/admin/accountant-accounts", notImplemented("admin accountant accounts route requires database connection"))
		mux.HandleFunc(api+"/admin/accountant-accounts/detail", notImplemented("admin accountant account detail route requires database connection"))
		mux.HandleFunc(api+"/admin/accountant-accounts/status", notImplemented("admin accountant account status route requires database connection"))
		mux.HandleFunc(api+"/accountant/profile", notImplemented("accountant profile route requires database connection"))

		mux.HandleFunc(api+"/notifications", notImplemented("notifications route requires database connection"))
		mux.HandleFunc(api+"/notifications/unread-count", notImplemented("notification unread count route requires database connection"))
		mux.HandleFunc(api+"/notifications/read", notImplemented("notification read route requires database connection"))
		mux.HandleFunc(api+"/notifications/read-all", notImplemented("notification read all route requires database connection"))
		mux.HandleFunc(api+"/notifications/detail", notImplemented("notification detail route requires database connection"))

		mux.HandleFunc(api+"/accountant/consultations", notImplemented("accountant consultations route requires database connection"))
		mux.HandleFunc(api+"/accountant/consultations/detail", notImplemented("accountant consultation detail route requires database connection"))
		mux.HandleFunc(api+"/accountant/consultations/status", notImplemented("accountant consultation status route requires database connection"))

		mux.HandleFunc(api+"/staff", notImplemented("staff route requires database connection"))
		mux.HandleFunc(api+"/staff/detail", notImplemented("staff detail route requires database connection"))
		mux.HandleFunc(api+"/admin/staff", notImplemented("admin staff route requires database connection"))
		mux.HandleFunc(api+"/admin/staff/detail", notImplemented("admin staff detail route requires database connection"))
		mux.HandleFunc(api+"/admin/staff/status", notImplemented("admin staff status route requires database connection"))

		mux.HandleFunc(api+"/testimonials", notImplemented("testimonials route requires database connection"))
		mux.HandleFunc(api+"/admin/testimonials", notImplemented("admin testimonials route requires database connection"))
		mux.HandleFunc(api+"/admin/testimonials/detail", notImplemented("admin testimonial detail route requires database connection"))
		mux.HandleFunc(api+"/admin/testimonials/status", notImplemented("admin testimonial status route requires database connection"))

		mux.HandleFunc(api+"/admin/dashboard/stats", notImplemented("admin dashboard stats route requires database connection"))

		mux.HandleFunc(api+"/admin/audit-log", notImplemented("admin audit log route requires database connection"))

		mux.HandleFunc(api+"/social-links", notImplemented("social links route requires database connection"))
		mux.HandleFunc(api+"/admin/social-links", notImplemented("admin social links route requires database connection"))
		mux.HandleFunc(api+"/admin/social-links/detail", notImplemented("admin social link detail route requires database connection"))
		mux.HandleFunc(api+"/admin/social-links/status", notImplemented("admin social link status route requires database connection"))

		mux.HandleFunc(api+"/statistics", notImplemented("statistics route requires database connection"))
		mux.HandleFunc(api+"/admin/statistics", notImplemented("admin statistics route requires database connection"))
		mux.HandleFunc(api+"/admin/statistics/detail", notImplemented("admin statistic detail route requires database connection"))
		mux.HandleFunc(api+"/admin/statistics/status", notImplemented("admin statistic status route requires database connection"))

		mux.HandleFunc(api+"/tax-credential-systems", notImplemented("tax credential systems route requires database connection"))

		mux.HandleFunc(api+"/admin/tax-credential-systems", notImplemented("admin tax credential systems route requires database connection"))
		mux.HandleFunc(api+"/admin/tax-credential-systems/detail", notImplemented("admin tax credential system detail route requires database connection"))
		mux.HandleFunc(api+"/admin/tax-credential-systems/status", notImplemented("admin tax credential system status route requires database connection"))

		mux.HandleFunc(api+"/client/tax-credentials", notImplemented("client tax credentials route requires database connection"))
		mux.HandleFunc(api+"/client/tax-credentials/detail", notImplemented("client tax credential detail route requires database connection"))
		mux.HandleFunc(api+"/client/tax-credentials/reveal", notImplemented("client tax credential reveal route requires database connection"))

		mux.HandleFunc(api+"/admin/tax-credentials", notImplemented("admin tax credentials route requires database connection"))
		mux.HandleFunc(api+"/admin/tax-credentials/detail", notImplemented("admin tax credential detail route requires database connection"))
		mux.HandleFunc(api+"/admin/tax-credentials/status", notImplemented("admin tax credential status route requires database connection"))
		mux.HandleFunc(api+"/admin/tax-credentials/reveal", notImplemented("admin tax credential reveal route requires database connection"))

		mux.HandleFunc(api+"/accountant/tax-credentials", notImplemented("accountant tax credentials route requires database connection"))
		mux.HandleFunc(api+"/accountant/tax-credentials/detail", notImplemented("accountant tax credential detail route requires database connection"))
		mux.HandleFunc(api+"/accountant/tax-credentials/reveal", notImplemented("accountant tax credential reveal route requires database connection"))
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
