# syntax=docker/dockerfile:1.7

FROM golang:1.26-alpine AS builder

WORKDIR /src

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -trimpath \
  -ldflags="-s -w" \
  -o /out/kivu-advisory-backend \
  ./cmd/server

FROM alpine:3.21 AS runtime

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata curl \
  && addgroup -S appgroup \
  && adduser -S appuser -G appgroup \
  && mkdir -p /app/tmp/uploads-for-local-development \
  && chown -R appuser:appgroup /app

COPY --from=builder /out/kivu-advisory-backend /app/kivu-advisory-backend
COPY --from=builder /src/db/migrations /app/db/migrations

USER appuser

EXPOSE 8080

ENV APP_ENV=production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8080
ENV MIGRATIONS_PATH=file://db/migrations

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${SERVER_PORT}/health || curl -fsS http://127.0.0.1:${SERVER_PORT}/api/v1/health || exit 1

CMD ["/app/kivu-advisory-backend"]