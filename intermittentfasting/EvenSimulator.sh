#!/usr/bin/env bash
# EvenSimulator.sh — kill, rebuild, launch Vite + simulator for Intermittent Fasting
set -euo pipefail
cd "$(dirname "$0")"

echo "→ Killing old instances..."
pkill -9 -f evenhub-simulator 2>/dev/null || true
pkill -9 -f "vite.*5173" 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
sleep 1

echo "→ Building..."
npx tsc --noEmit && npx vite build

echo "→ Launching Vite + Simulator..."
osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && npx vite --host 0.0.0.0 --port 5173\""
sleep 4
osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && npx evenhub-simulator http://localhost:5173\""

echo "→ Ready. Check Glasses Display window."
