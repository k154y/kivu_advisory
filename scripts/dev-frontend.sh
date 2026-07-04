#!/usr/bin/env sh

set -eu

cd /workspace/frontend

echo "Starting frontend on http://localhost:3000"
npm run dev -- -H 0.0.0.0 -p 3000
