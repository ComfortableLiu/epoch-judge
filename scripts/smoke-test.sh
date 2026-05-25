#!/usr/bin/env bash
set -euo pipefail
API="${API_URL:-http://localhost:3000/api/v1}"

echo "Health..."
curl -sf "$API/health" | grep -q '"status"'

echo "Register..."
USER="smoke_$(date +%s)"
REG=$(curl -sf -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USER\",\"password\":\"testpass123\"}")
TOKEN=$(echo "$REG" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0)).accessToken)")

echo "Problems..."
curl -sf "$API/problems" -H "Authorization: Bearer $TOKEN" >/dev/null

echo "Smoke OK"
