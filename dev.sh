#!/usr/bin/env bash
# ResidencyPrep local dev launcher.
# Starts a local Postgres (Docker), the Go backend, and the Next.js frontend.
#
# Usage:
#   ./dev.sh          start everything (skip seeding)
#   ./dev.sh seed     also seed the question bank from your CSV
#   ./dev.sh stop     stop everything

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="ippostgres"
DB_PORT="5433"
DB_URL="postgres://postgres:test@localhost:${DB_PORT}/interviewprep"
BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
CSV_DEFAULT="$HOME/Downloads/Sorting Interview Questions - Sheet1.csv"

log()  { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dev]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; }

kill_port() {
  local port="$1"
  local pid
  pid="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pid" ]; then
    log "freeing port $port (stopping pid $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi
}

stop_all() {
  log "stopping backend and frontend..."
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "backend/bin/server" 2>/dev/null || true
  kill_port "$BACKEND_PORT"
  kill_port "$FRONTEND_PORT"
  log "done."
}

start_db() {
  if ! docker info >/dev/null 2>&1; then
    err "Docker is not running. Start Docker Desktop first."
    exit 1
  fi
  if ! docker ps --format '{{.Names}}' | grep -q "^${DB_NAME}$"; then
    log "starting local Postgres container..."
    docker run -d --name "$DB_NAME" \
      -e POSTGRES_PASSWORD=test -e POSTGRES_DB=interviewprep \
      -p "$DB_PORT:5432" postgres:16-alpine >/dev/null
    for i in $(seq 1 30); do
      docker exec "$DB_NAME" pg_isready -U postgres >/dev/null 2>&1 && break
      sleep 1
    done
  else
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_NAME}$"; then
      log "starting existing Postgres container..."
      docker start "$DB_NAME" >/dev/null
      for i in $(seq 1 30); do
        docker exec "$DB_NAME" pg_isready -U postgres >/dev/null 2>&1 && break
        sleep 1
      done
    fi
  fi
  log "database ready at $DB_URL"

  # Apply all migrations (they use CREATE ... IF NOT EXISTS, so re-running is safe).
  log "applying schema migrations..."
  for mig in "$ROOT"/supabase/migrations/*.sql; do
    docker exec -i "$DB_NAME" psql -U postgres -d interviewprep < "$mig"
  done
}

seed() {
  local csv="${CSV_PATH:-$CSV_DEFAULT}"
  if [ ! -f "$csv" ]; then
    warn "CSV not found at '$csv'. Set CSV_PATH to seed from a different file."
    return
  fi
  log "seeding question bank from $csv"
  (cd "$ROOT/backend" && go run ./cmd/seed -csv "$csv" -db "$DB_URL")
}

start_backend() {
  log "building backend..."
  (cd "$ROOT/backend" && go build -o bin/server .)
  log "starting backend on :$BACKEND_PORT"
  (
    cd "$ROOT/backend"
    DATABASE_URL="$DB_URL" PORT="$BACKEND_PORT" ALLOWED_ORIGIN="http://localhost:${FRONTEND_PORT}" \
      exec ./bin/server
  ) &
}

start_frontend() {
  log "starting frontend on :$FRONTEND_PORT"
  (
    cd "$ROOT/frontend"
    BACKEND_URL="http://localhost:${BACKEND_PORT}" \
      exec npx next dev -p "$FRONTEND_PORT"
  ) &
}

trap 'stop_all' INT TERM EXIT

case "${1:-}" in
  stop)
    stop_all
    exit 0
    ;;
  seed)
    stop_all
    start_db
    seed
    start_backend
    start_frontend
    ;;
  ""|start)
    stop_all
    start_db
    start_backend
    start_frontend
    ;;
  *)
    err "unknown command: $1 (expected: start | seed | stop)"
    exit 1
    ;;
esac

log "--------------------------------------------------------------"
log "  Frontend:  http://localhost:${FRONTEND_PORT}"
log "  Backend:   http://localhost:${BACKEND_PORT}/api/meta"
log "  Press Ctrl+C to stop everything."
log "--------------------------------------------------------------"

wait