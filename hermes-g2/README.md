# Hermes G2

<p align="center">
  <img src="mockups/hermes-g2-banner.png" alt="Hermes G2 banner" width="600">
</p>

<p align="center">
  <strong>Your Hermes Agent, on your glasses.</strong>
</p>

<p align="center">
  <a href="https://github.com/EvenHub/hermes-g2/releases"><img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version 0.1.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License MIT"></a>
  <a href="#early-preview"><img src="https://img.shields.io/badge/status-early%20preview-orange" alt="Early Preview"></a>
</p>

---

**Hermes G2** is a companion app for [Even Realities G2](https://www.evenrealities.com/g2) smart glasses that
displays [Hermes Agent](https://github.com/nousresearch/hermes-agent) notifications — cron job outputs, session
summaries, and gateway status — directly on your glasses.

> ⚠️ **Early preview** — This is v0.1.0, tested on a single Mac + G2 pair. Expect rough edges. PRs welcome!

---

## Features

| Feature | Description |
|---------|-------------|
| 🧠 **Dashboard-powered** | Reads inbox and health data from the Hermes Dashboard plugin API — no polling of cron files |
| 📱 **Phone-controlled** | Select sources, filter by job, and preview messages from your iPhone companion WebView |
| 👓 **G2-native** | Message list with touch-to-detail, scroll, and system exit — all via Even Hub SDK |
| 🎨 **Even OS 2.0 Design** | Follows Even Realities UI guidelines: typography scale, token-based theming, SettingsGroup layout |
| 🌗 **System / Dark / Light** | Three-way theme toggle with live switching via CSS custom properties |
| 📡 **Offline-resilient** | Keeps the last valid message store visible across network failures; only shows error after 3 consecutive fails |
| 🆕 **NEW badges** | Messages since your last view get a `●` indicator — never miss fresh cron output |
| 🔒 **Zero telemetry** | No analytics, no tracking, no data collection. Your messages stay between you, your Mac, and your glasses |

---

## Quick Start

### 1. Install the Dashboard Plugin

```bash
# Copy the plugin into your Hermes dashboard plugins directory
cp -r dashboard-plugin ~/.hermes/plugins/hermes-g2/

# Restart the Hermes dashboard
hermes dashboard restart

# Verify the endpoint is live
curl http://localhost:9119/api/plugins/hermes-g2/health
```

### 2. Build & Sideload

```bash
cd hermes-g2
npm install
npm run build
# → dist/ is now ready
```

### 3. Scan & Configure

```bash
# Start the Vite dev server (broadcast on your local network)
npm run dev

# Find your Mac's local IP:
ipconfig getifaddr en0

# Open in your iPhone browser:
# http://<YOUR_MAC_IP>:5174

# ✅ Connection check passes → Hermes G2 appears in Even App sources
# ✅ Select 'Hermes G2' as your G2 source
# → Messages appear on your glasses!
```

---

## How It Works

```
┌──────────┐     WiFi      ┌──────────┐     BLE      ┌──────────┐
│   Mac    │──────────────▶│  iPhone  │─────────────▶│ G2 Glasses│
│          │               │          │              │          │
│ Hermes   │  HTTP/JSON     │ Companion│  Even Hub   │ Message  │
│ Dashboard│◀──────────────│ WebView  │◀────────────│ List +   │
│ Plugin   │  30s polling  │ (Vite)   │  Protocol   │ Detail   │
│ (Python) │               │ (TypeScript)           │          │
└──────────┘               └──────────┘              └──────────┘
```

1. **Dashboard Plugin** (`dashboard-plugin/plugin_api.py`) reads Hermes cron outputs, session DB, and gateway status
2. **Companion WebView** (`src/`) polls the plugin every 30 s, renders messages, and persists config on the phone
3. **G2 Display** (`src/display/`) renders the message list and detail views using the Even Hub SDK container API

---

## Screenshots

| Phone Companion | G2 Message List | G2 Message Detail |
|:---:|:---:|:---:|
| ![Phone UI](mockups/phone-ui.png) | ![G2 List](mockups/g2-list.png) | ![G2 Detail](mockups/g2-detail.png) |

*(Mockups coming soon — contributions welcome!)*

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| **"Dashboard not reachable"** | Hermes dashboard isn't running or plugin not installed | Run `hermes dashboard status` and check that `~/.hermes/plugins/hermes-g2/` exists |
| **Connection check fails on phone** | iPhone can't reach Mac IP on local network | Verify both devices are on same WiFi; check Mac firewall allows port 5174 |
| **"G2 not detected" banner** | Bridge SDK failed to initialise | Open the page inside the Even App WebView, not Safari |
| **Messages not updating** | Polling paused (tab in background) | Bring the Even App to foreground; polling resumes automatically |
| **Blank screen on G2** | First launch — onboarding shown once | Open companion on phone and select a source |

---

## Links

- [Hermes Agent](https://github.com/nousresearch/hermes-agent) — The AI agent that powers these notifications
- [Even Realities G2 SDK](https://www.npmjs.com/package/@evenrealities/even_hub_sdk) — npm package for G2 glasses
- [even-toolkit](https://github.com/evenrealities/even-toolkit) — Community tools for Even Realities devices
- [Hermes G2 Setup Guide](SETUP.md) — Full step-by-step installation
- [Architecture](ARCHITECTURE.md) — Technical design decisions and data flow

---

## Contributing

Hermes G2 is MIT licensed. Found a bug? Have a feature idea? PRs are welcome.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/cool-thing`)
3. Make your changes, keeping the TypeScript strict
4. Open a PR against `main`

For larger changes, open an issue first to discuss the approach.

---

## License

MIT © 2026 Gael Abegg Gauthey — see [LICENSE](LICENSE) for full text.

---

## Early Preview

This is an early preview release (v0.1.0). What works well:

- Cron output display on G2 glasses
- Session title + last message display
- Source filtering and per-job filtering
- Theme switching (system / dark / light)
- Offline resilience with cached data display

Known limitations:

- No conversation detail (Phase 2)
- No push notifications — 30 s polling only
- Single Mac + single phone setup only
- No BLE signal strength monitoring
- Auto-discovery of Mac IP is best-effort (reads `window.location.hostname`)

> **Breaking changes are likely before v1.0.0.** Use at your own risk in production workflows.
