#!/usr/bin/env sh

set -eu

cd /workspace

echo "Starting backend and frontend..."

(cd backend && go run ./cmd/server) &
BACKEND_PID=$!

trap 'kill $BACKEND_PID 2>/dev/null || true' INT TERM EXIT

cd frontend
npm run dev -- -H 0.0.0.0 -p 3000
