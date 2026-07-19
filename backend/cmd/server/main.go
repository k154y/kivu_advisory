package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kyves/kivu-advisory/backend/internal/config"
	"github.com/kyves/kivu-advisory/backend/internal/database"
	"github.com/kyves/kivu-advisory/backend/internal/router"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration error: %v", err)
	}

	dbPool := connectDatabase(cfg)
	if dbPool != nil {
		defer dbPool.Close()
	}

	appRouter := router.New(router.Options{
		Config:       cfg,
		DatabasePool: dbPool,
	})

	server := &http.Server{
		Addr:              cfg.Address(),
		Handler:           appRouter,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("Kivu Advisory backend started on %s", cfg.Address())
		log.Printf("environment: %s", cfg.App.Env)
		log.Printf("api base path: %s", cfg.Server.APIBasePath)

		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	waitForShutdown(server)
}

func connectDatabase(cfg *config.Config) *pgxpool.Pool {
	if cfg == nil {
		log.Fatal("configuration is required")
	}

	if cfg.Database.URL == "" {
		if cfg.App.Env == config.EnvProduction {
			log.Fatal("DATABASE_URL is required in production")
		}

		log.Println("DATABASE_URL is empty; backend will start without database connection")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.Connect(ctx, cfg.Database)
	if err != nil {
		if cfg.App.Env == config.EnvProduction {
			log.Fatalf("database connection failed: %v", err)
		}

		log.Printf("database connection failed; backend will start without database: %v", err)
		return nil
	}

	log.Println("database connected successfully")

	return pool
}

func waitForShutdown(server *http.Server) {
	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	<-shutdownCtx.Done()

	log.Println("shutting down backend server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}

	log.Println("backend server stopped")
}
