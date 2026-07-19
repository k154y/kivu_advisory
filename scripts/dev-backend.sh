#!/usr/bin/env sh

set -eu

cd /workspace/backend

echo "Starting backend on http://localhost:8080"
go run ./cmd/server
