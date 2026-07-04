#!/usr/bin/env sh

set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/deployment/docker/docker-compose.dev.yml"

cd "$PROJECT_ROOT"

echo "Starting Kivu Advisory development environment..."
docker compose -f "$COMPOSE_FILE" up --build
