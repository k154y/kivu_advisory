package middleware

import (
	"net/http"
	"strings"

	"github.com/kyves/kivu-advisory/backend/internal/config"
)

func CORS(corsConfig config.CORSConfig) func(http.Handler) http.Handler {
	allowedOrigins := make(map[string]bool)

	for _, origin := range corsConfig.AllowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowedOrigins[origin] = true
		}
	}

	allowedMethods := strings.Join(corsConfig.AllowedMethods, ", ")
	allowedHeaders := strings.Join(corsConfig.AllowedHeaders, ", ")

	if allowedMethods == "" {
		allowedMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
	}

	if allowedHeaders == "" {
		allowedHeaders = "Authorization, Content-Type, Accept, Origin"
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := strings.TrimSpace(r.Header.Get("Origin"))

			if origin != "" && isOriginAllowed(origin, allowedOrigins) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}

			w.Header().Set("Access-Control-Allow-Methods", allowedMethods)
			w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)
			w.Header().Set("Access-Control-Max-Age", "86400")

			if corsConfig.AllowCredentials {
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isOriginAllowed(origin string, allowedOrigins map[string]bool) bool {
	if allowedOrigins["*"] {
		return true
	}

	return allowedOrigins[origin]
}
