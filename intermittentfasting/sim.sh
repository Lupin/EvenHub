#!/usr/bin/env bash
# sim.sh — launch Vite dev server + EvenHub simulator for Intermittent Fasting
# Usage: ./sim.sh
set -euo pipefail
cd "$(dirname "$0")"

# Kill lingering instances
pkill -9 -f evenhub-simulator 2>/dev/null || true
pkill -9 -f "vite.*5173" 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Launch Vite dev server
osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && npx vite --host 0.0.0.0 --port 5173\""

# Wait for Vite
sleep 4

# Launch simulator
osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && npx evenhub-simulator http://localhost:5173\""

echo "Simulator launched. Check the 'Glasses Display' window."
