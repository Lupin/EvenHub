#!/usr/bin/env bash
# start.sh — Lance les deux services Hermes G2
# Usage: ./start.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Hermes G2 — Starting services ==="
echo ""

# 1. API server (port 8765)
echo "[1/2] API server (port 8765)..."
python3 "$ROOT/dashboard-plugin/server.py" &
API_PID=$!
sleep 1

# Verify API
if curl -sf http://localhost:8765/health > /dev/null 2>&1; then
  echo "  ✓ API running on http://localhost:8765"
else
  echo "  ✗ API failed to start" >&2
  kill $API_PID 2>/dev/null
  exit 1
fi

# 2. Vite dev server (port 5174)
echo "[2/2] Vite dev server (port 5174)..."
cd "$ROOT"
npx vite --host 0.0.0.0 --port 5174 &
VITE_PID=$!
sleep 2

# Verify Vite
IP=$(ipconfig getifaddr en0 2>/dev/null || echo "127.0.0.1")
if curl -sf "http://$IP:5174" > /dev/null 2>&1; then
  echo "  ✓ Vite running on http://$IP:5174"
else
  echo "  ✗ Vite failed to start" >&2
  kill $API_PID $VITE_PID 2>/dev/null
  exit 1
fi

echo ""
echo "=== Hermes G2 ready ==="
echo "  Companion: http://$IP:5174"
echo "  API:       http://localhost:8765"
echo "  Inbox:     http://localhost:8765/api/plugins/hermes-g2/inbox"
echo ""
echo "Scan the QR code with the Even App:"
echo ""
~/.hermes/node/bin/evenhub qr --url "http://$IP:5174"
echo ""
echo "Or open directly: http://$IP:5174"
echo ""
echo "To stop: kill $API_PID $VITE_PID"
