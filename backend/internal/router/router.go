package router

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kyves/kivu-advisory/backend/internal/auth"
	"github.com/kyves/kivu-advisory/backend/internal/client"
	"github.com/kyves/kivu-advisory/backend/internal/config"
	"github.com/kyves/kivu-advisory/backend/internal/middleware"
	"github.com/kyves/kivu-advisory/backend/internal/servicecatalog"
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
	}

	mux.HandleFunc(api+"/service-requests", notImplemented("service requests route is not implemented yet"))
	mux.HandleFunc(api+"/consultations", notImplemented("consultations route is not implemented yet"))
	mux.HandleFunc(api+"/messages", notImplemented("messages route is not implemented yet"))
	mux.HandleFunc(api+"/documents", notImplemented("documents route is not implemented yet"))

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

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		next.ServeHTTP(w, r)
	})
}