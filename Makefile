.RECIPEPREFIX := >
.DEFAULT_GOAL := help

DEV_COMPOSE := deployment/docker/docker-compose.dev.yml
PROD_COMPOSE := docker-compose.yml

.PHONY: help setup-env dev-config dev-up dev-down dev-logs prod-config prod-build prod-up prod-down prod-logs backend-build frontend-build status

help:
> @echo ""
> @echo "KIVU ADVISORY COMMANDS"
> @echo "--------------------------------------------------"
> @echo "make setup-env        Create local env files from examples"
> @echo "make dev-config       Validate development compose"
> @echo "make dev-up           Start development containers"
> @echo "make dev-down         Stop development containers"
> @echo "make dev-logs         Show development logs"
> @echo "make prod-config      Validate production compose"
> @echo "make prod-build       Build production images"
> @echo "make prod-up          Start production containers"
> @echo "make prod-down        Stop production containers"
> @echo "make prod-logs        Show production logs"
> @echo "make backend-build    Build backend image"
> @echo "make frontend-build   Build frontend image"
> @echo "make status           Show project status"
> @echo ""

setup-env:
> @test -f deployment/env/backend.env || cp deployment/env/backend.env.example deployment/env/backend.env
> @test -f deployment/env/frontend.env || cp deployment/env/frontend.env.example deployment/env/frontend.env
> @test -f deployment/env/production.env || cp deployment/env/production.env.example deployment/env/production.env
> @echo "Environment files are ready."

dev-config:
> docker compose -f $(DEV_COMPOSE) config

dev-up:
> docker compose -f $(DEV_COMPOSE) up --build

dev-down:
> docker compose -f $(DEV_COMPOSE) down

dev-logs:
> docker compose -f $(DEV_COMPOSE) logs -f

prod-config:
> docker compose -f $(PROD_COMPOSE) config

prod-build:
> docker compose -f $(PROD_COMPOSE) build

prod-up:
> docker compose -f $(PROD_COMPOSE) up -d --build

prod-down:
> docker compose -f $(PROD_COMPOSE) down

prod-logs:
> docker compose -f $(PROD_COMPOSE) logs -f

backend-build:
> docker build -t kivu-advisory-backend:local ./backend

frontend-build:
> docker build -t kivu-advisory-frontend:local ./frontend

status:
> @git status --short
> @docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"