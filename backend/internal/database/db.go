package database

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kyves/kivu-advisory/backend/internal/config"
)

var ErrDatabaseURLRequired = errors.New("database url is required")

func Connect(ctx context.Context, databaseConfig config.DatabaseConfig) (*pgxpool.Pool, error) {
	databaseURL := strings.TrimSpace(databaseConfig.URL)
	if databaseURL == "" {
		return nil, ErrDatabaseURLRequired
	}

	poolConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	poolConfig.MaxConns = 10
	poolConfig.MinConns = 1
	poolConfig.MaxConnLifetime = 30 * time.Minute
	poolConfig.MaxConnIdleTime = 10 * time.Minute
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("create database pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

func Ping(ctx context.Context, pool *pgxpool.Pool) error {
	if pool == nil {
		return errors.New("database pool is nil")
	}

	return pool.Ping(ctx)
}

func Close(pool *pgxpool.Pool) {
	if pool != nil {
		pool.Close()
	}
}
