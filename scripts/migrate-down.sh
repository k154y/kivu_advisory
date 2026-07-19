#!/usr/bin/env sh

set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

echo "Migration rollback command will be connected after database migration tool setup."
echo "Target database: Neon PostgreSQL"
