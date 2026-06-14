# Hermes G2 — Setup Guide

Step-by-step instructions to get Hermes Agent notifications on your Even Realities G2 glasses.

---

## Requirements

| Requirement | Notes |
|-------------|-------|
| **macOS** | 14+ (Sonoma or later) |
| **Node.js** | 20+ (`node --version`) |
| **Python** | 3.10+ |
| **Even G2 Glasses** | Paired with iPhone via Even App |
| **Hermes Agent** | Installed and configured |
| **iPhone + Mac** | Same WiFi network |

---

## Quick Start (one time)

### 1. Install npm dependencies

```bash
cd hermes-g2
npm install
```

### 2. Copy the plugin files (optional — for Hermes Dashboard)

```bash
mkdir -p ~/.hermes/plugins/hermes-g2/dashboard
cp dashboard-plugin/manifest.json ~/.hermes/plugins/hermes-g2/dashboard/
cp dashboard-plugin/plugin_api.py ~/.hermes/plugins/hermes-g2/dashboard/
```

---

## Start the app (every session)

Run these two services on your Mac:

### Terminal 1 — API server

```bash
python3 dashboard-plugin/server.py
```

Expected output:
```
Hermes G2 API on http://0.0.0.0:8765
```

The API server reads Hermes data (sessions, cron outputs) from `~/.hermes/state.db` and `~/.hermes/cron/output/`.

### Terminal 2 — Vite dev server

```bash
cd hermes-g2
npx vite --host 0.0.0.0 --port 5174
```

Expected output:
```
VITE v8.0.16  ready in 312 ms

➜  Local:   http://localhost:5174/
➜  Network: http://192.168.1.152:5174/
```

### QR code

```bash
evenhub qr --url "http://192.168.1.152:5174"
```

Or using the full path:
```bash
~/.hermes/node/bin/evenhub qr --url "http://192.168.1.152:5174"
```

Scan the QR code with the Even Realities App on your iPhone.

---

## Verify it works

### Check the API

```bash
curl http://localhost:8765/health
# → {"status": "ok", "service": "hermes-g2-api"}

curl http://localhost:8765/api/plugins/hermes-g2/inbox | python3 -m json.tool | head -10
# → {"messages": [...], "sources": [...]}
```

### Check the companion app

Open `http://192.168.1.152:5174` in Safari on your iPhone (same WiFi). You should see:

- **Green dot** + "Connected" in the CONNEXION section
- Messages in the list preview

Then scan the QR code with the Even App to see the list on your G2 glasses.

---

## Navigation on G2

| Gesture | Action |
|---------|--------|
| Swipe up | Move cursor up (list) / Previous message (detail) |
| Swipe down | Move cursor down (list) / Next message (detail) |
| Tap | Open detail of selected item |
| Double-tap | Exit (list) / Back to list (detail) |

---

## One-liner to start both services

```bash
python3 dashboard-plugin/server.py & cd hermes-g2 && npx vite --host 0.0.0.0 --port 5174 &
```

---

## Build for release

```bash
cd hermes-g2
npm run build
# Output in dist/
evenhub pack app.json dist/ -o hermes-g2.ehpk
```

---

## FAQ

### Why port 8765?

The Hermes Dashboard (port 9119) requires authentication. The standalone API server (port 8765) bypasses auth and serves the same data directly.

### Why does the app need my Mac's IP?

The iPhone loads the companion WebView over your local WiFi. `localhost` only works on the Mac itself. The iPhone needs the Mac's LAN address to reach the Vite dev server.

### What if my IP changes?

Set a static IP for your Mac in your router's DHCP reservation, or update the Server IP field in the companion app's CONNECTION settings.

### What happens when my Mac sleeps?

The API stops responding. The companion app detects this and shows "Disconnected". Cached messages remain visible on the glasses. Polling resumes when the Mac wakes.
