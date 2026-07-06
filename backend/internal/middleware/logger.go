package middleware

import (
	"log"
	"net/http"
	"time"
)

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	bytes      int
}

func newResponseRecorder(w http.ResponseWriter) *responseRecorder {
	return &responseRecorder{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func (r *responseRecorder) Write(data []byte) (int, error) {
	size, err := r.ResponseWriter.Write(data)
	r.bytes += size
	return size, err
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startedAt := time.Now()

		recorder := newResponseRecorder(w)

		next.ServeHTTP(recorder, r)

		duration := time.Since(startedAt)

		log.Printf(
			"method=%s path=%s status=%d bytes=%d duration=%s ip=%s user_agent=%q",
			r.Method,
			r.URL.Path,
			recorder.statusCode,
			recorder.bytes,
			duration,
			clientIP(r),
			r.UserAgent(),
		)
	})
}

func clientIP(r *http.Request) string {
	if forwardedFor := r.Header.Get("X-Forwarded-For"); forwardedFor != "" {
		return forwardedFor
	}

	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}

	return r.RemoteAddr
}
