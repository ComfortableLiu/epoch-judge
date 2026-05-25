#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

info() { echo "[epoch-deploy] $*"; }
fail() { echo "[epoch-deploy] ERROR: $*" >&2; exit 1; }

# Node >= 18
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js not found. Install Node 18+ first."
fi
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 18+ required (found $(node -v))"
fi

command -v docker >/dev/null 2>&1 || fail "Docker not found"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 not found"

corepack enable 2>/dev/null || true

if [ ! -f .env ]; then
  info "Creating .env from .env.example"
  cp .env.example .env
fi

mkdir -p data/testcases

info "Installing dependencies..."
yarn install

info "Building workspace..."
yarn build

info "Starting infrastructure (MySQL, Redis, API, Judge, Web)..."
docker compose up -d --build

info "Waiting for MySQL..."
for i in $(seq 1 60); do
  if docker compose exec -T mysql mysqladmin ping -h localhost -u epoch -pepoch_secret --silent 2>/dev/null; then
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then fail "MySQL did not become ready"; fi
done

info "Running database migrations..."
export $(grep -v '^#' .env | xargs)
yarn db:migrate || yarn workspace @epoch-judge/db migrate:dev --name init --create-only && yarn db:migrate

info "Seeding admin user..."
yarn db:seed || true

info "Health check..."
sleep 3
if curl -sf http://localhost:3000/api/v1/health >/dev/null; then
  info "API healthy"
else
  info "API not ready yet — check: docker compose logs api"
fi

cat <<EOF

========================================
  纪元 EpochJudge 部署完成
========================================
  Web:  http://localhost:8080
  API:  http://localhost:3000/api/v1
  Docs: http://localhost:3000/api/docs

  默认管理员（见 .env）:
    SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD

  再次部署只需: yarn deploy
========================================
EOF
