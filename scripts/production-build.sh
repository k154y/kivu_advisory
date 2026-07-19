#!/usr/bin/env sh

set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

cd "$PROJECT_ROOT"

echo "Validating production Docker Compose..."
docker compose -f "$COMPOSE_FILE" config >/dev/null

echo "Building production containers..."
docker compose -f "$COMPOSE_FILE" build

echo "Production build completed."
