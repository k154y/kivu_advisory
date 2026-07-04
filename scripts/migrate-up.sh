#!/usr/bin/env sh

set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

ENV_FILE="${ENV_FILE:-deployment/env/backend.env}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-backend/db/migrations}"

load_database_url() {
  if [ -f "$ENV_FILE" ]; then
    value=$(
      awk -F= '
        /^DATABASE_URL=/ {
          sub(/^DATABASE_URL=/, "")
          print
          exit
        }
        /^export[[:space:]]+DATABASE_URL=/ {
          sub(/^export[[:space:]]+DATABASE_URL=/, "")
          print
          exit
        }
      ' "$ENV_FILE" 2>/dev/null || true
    )

    value=$(printf "%s" "$value" | tr -d '\r')

    value=${value#\"}
    value=${value%\"}
    value=${value#\'}
    value=${value%\'}

    if [ -n "$value" ]; then
      export DATABASE_URL="$value"
      echo "Loaded DATABASE_URL from $ENV_FILE"
      return 0
    fi
  fi

  if [ -n "${DATABASE_URL:-}" ]; then
    echo "Using existing DATABASE_URL from the environment"
    return 0
  fi

  echo "DATABASE_URL was not found in $ENV_FILE and no environment value is set."
  echo "Set DATABASE_URL manually before running this script."
  return 1
}

require_command() {
  command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name"
    exit 1
  fi
}

ensure_migrations_table() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  " >/dev/null
}

migration_applied() {
  version="$1"

  result=$(
    psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "
      SELECT 1
      FROM schema_migrations
      WHERE version = '$version'
      LIMIT 1;
    "
  )

  [ "$result" = "1" ]
}

apply_migration() {
  migration_file="$1"
  filename=$(basename "$migration_file")
  version=${filename%%_*}
  migration_name=$(printf "%s" "$filename" | sed "s/'/''/g")

  if migration_applied "$version"; then
    echo "Skipping already applied migration: $filename"
    return 0
  fi

  echo "Applying migration: $filename"

  temp_file=$(mktemp)

  {
    echo "BEGIN;"
    cat "$migration_file"
    echo ""
    echo "INSERT INTO schema_migrations (version, name) VALUES ('$version', '$migration_name');"
    echo "COMMIT;"
  } > "$temp_file"

  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$temp_file" >/dev/null; then
    rm -f "$temp_file"
    echo "Applied migration: $filename"
    return 0
  fi

  rm -f "$temp_file"
  echo "Failed migration: $filename"
  exit 1
}

load_database_url || exit 1
require_command psql

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

echo "Target database: Neon PostgreSQL"
echo "Migrations directory: $MIGRATIONS_DIR"

echo "Testing database connection..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT 1;" >/dev/null
echo "Database connection successful"

ensure_migrations_table

found_migration=false

for migration_file in "$MIGRATIONS_DIR"/*.up.sql; do
  if [ ! -e "$migration_file" ]; then
    continue
  fi

  found_migration=true
  apply_migration "$migration_file"
done

if [ "$found_migration" = false ]; then
  echo "No .up.sql migration files found in $MIGRATIONS_DIR"
  exit 1
fi

echo "All up migrations completed successfully"

echo "Current public tables:"
psql "$DATABASE_URL" -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
"