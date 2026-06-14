# Hermes G2 — Architecture

> Technical design decisions, data flow, and component breakdown.

---

## Overview

Hermes G2 has three main components, each running on a different device:

| Component | Device | Language | Role |
|-----------|--------|----------|------|
| **Dashboard Plugin** | Mac | Python (FastAPI) | Serves cron outputs, session data, and gateway status as JSON |
| **Companion WebView** | iPhone | TypeScript + Vite | Polls the plugin, filters messages, renders phone UI, pushes to G2 |
| **G2 Display** | G2 Glasses | Even Hub SDK (C++ → JS bridge) | Renders text containers and interactive lists on the glasses display |

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           MAC                                      │
│                                                                     │
│  ┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │ ~/.hermes/    │    │ Dashboard Plugin │    │ Hermes Dashboard │  │
│  │  cron/output/ │───▶│ plugin_api.py    │◀───│ (FastAPI server) │  │
│  │  state.db     │    │                  │    │ port 9119        │  │
│  └───────────────┘    └────────┬─────────┘    └──────────────────┘  │
│                                │                                     │
│                                │ HTTP GET /api/plugins/hermes-g2/*  │
│                                │ (JSON responses, 5s timeout)        │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                            WiFi (LAN)
                                 │
┌────────────────────────────────┼────────────────────────────────────┐
│                           IPHONE                                    │
│                                │                                     │
│  ┌─────────────────────────────▼──────────────────────────────────┐ │
│  │                   Companion WebView (TypeScript)                │ │
│  │                                                                 │ │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐  │ │
│  │  │ data.ts  │   │ main.ts  │   │config.ts │   │ display/   │  │ │
│  │  │ fetch +  │──▶│ pipeline │──▶│ bridge   │──▶│ index.ts   │  │ │
│  │  │ filter   │   │ + state  │   │ storage  │   │ G2 render  │  │ │
│  │  └──────────┘   └──────────┘   └──────────┘   └─────┬──────┘  │ │
│  │                                                      │         │ │
│  │                                              EvenHub SDK        │ │
│  └──────────────────────────────────────────────────────┼─────────┘ │
│                                                         │           │
│                                                   Even App Bridge   │
└─────────────────────────────────────────────────────────┼───────────┘
                                                          │
                                                     BLE 5.3
                                                          │
┌─────────────────────────────────────────────────────────┼───────────┐
│                      G2 GLASSES                         │           │
│                                                         │           │
│  ┌──────────────────────────────────────────────────────▼─────────┐ │
│  │              576×288 OLED Micro-Display                        │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │  Hermes · Cron Outputs (12)                              │  │ │
│  │  ├──────────────────────────────────────────────────────────┤  │ │
│  │  │  ● 14/06 10:30 [cron] Market summary: Nikkei +0.8%      │  │ │
│  │  │    14/06 09:15 [cron] Weather: Tokyo 22°C, clear         │  │ │
│  │  │    14/06 08:00 [cron] veille-akiya-japon: 3 new listings │  │ │
│  │  │    13/06 22:45 [sess] Session: Code review feedback      │  │ │
│  │  │    ...                                                    │  │ │
│  │  ├──────────────────────────────────────────────────────────┤  │ │
│  │  │  scroll   tap detail   exit                              │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Step-by-step:**

1. **Dashboard Plugin** (`plugin_api.py`) reads files from `~/.hermes/cron/output/`, `state.db`, and PID files
2. It compiles messages into a JSON response at `GET /api/plugins/hermes-g2/inbox`
3. **Companion WebView** (`src/data.ts`) polls this endpoint every 30 seconds with a 5-second timeout
4. Messages are filtered by `sourceType` and `sourceLabel` (config from `src/config.ts`)
5. Filtered messages are rendered on the phone UI for preview (`src/main.ts:renderPreview`)
6. If the Even Hub bridge is available, messages are rendered on G2 glasses via SDK containers (`src/display/index.ts`)
7. The G2 display uses `TextContainerProperty` and `ListContainerProperty` with touch event handling (`src/input.ts`)

---

## Key Design Decisions

### 1. Why Dashboard API vs. Reading Files Directly

**Decision:** The companion WebView polls the Hermes Dashboard plugin API rather than reading files from disk.

**Rationale:**
- The dashboard already has a FastAPI server with plugin infrastructure
- File I/O from a WebView is impossible (browser sandbox)
- The plugin centralises data access — cron outputs, sessions DB, gateway PID — in one place
- Adding new data sources only requires changes to the plugin, not the companion app
- The plugin can add caching, rate limiting, or authentication later without changing the client

### 2. Why `bridge.setLocalStorage` vs. `window.localStorage`

**Decision:** Config is persisted via the Even Hub SDK's `setLocalStorage`/`getLocalStorage` when available, falling back to `window.localStorage` in plain browser mode.

**Rationale:**
- The Even App WebView provides its own storage API (`bridge.setLocalStorage`) that persists across WebView sessions
- `window.localStorage` in a WebView may be cleared by iOS when storage pressure is high
- The bridge storage API is the "blessed" path — guaranteed by the Even Hub SDK contract
- The fallback to `window.localStorage` enables development and testing in a regular browser
- Config changes in the phone UI propagate to the G2 context via `storage` events (with a 2-second polling fallback for Even WebView quirks)

### 3. Why 30-Second Polling vs. WebSockets

**Decision:** The companion app polls the inbox endpoint every 30 seconds instead of using WebSockets.

**Rationale:**
- WebSocket support from the Even App WebView is undocumented and unreliable
- Hermes cron jobs run at intervals of minutes, not seconds — 30 s polling is sufficient
- Polling is simpler to implement, debug, and recover from failures
- The 5-second fetch timeout prevents hung requests from blocking the pipeline
- Aggregate bandwidth is negligible (~2 KB per poll × 2 polls/min = 4 KB/min)
- Health checks run at 60-second intervals (half the inbox rate) because health data changes slowly

**Visibility optimisation:** Polling is skipped while the document is hidden (`document.hidden`). When the tab becomes visible again, an immediate fetch runs. This conserves battery on both Mac and iPhone.

### 4. Why No Conversation Detail in Phase 1

**Decision:** v0.1.0 shows session titles and last messages in the list, but does not render full conversation threads or interact with the Hermes Agent.

**Rationale:**
- The Hermes Dashboard state database schema evolves with the agent — reading conversation metadata is easy, but rendering full threads requires a stable API
- The G2 display has limited screen real estate (576×288) — conversation views need careful UX design
- Phase 1 focuses on the "glanceable notifications" use case: cron outputs, session summaries, gateway status
- Full conversation interaction (Phase 2) requires Even Hub SDK text input support, which is still experimental
- Building the pipeline, persistence, theming, and error handling first creates a solid foundation for Phase 2

---

## Error Handling Strategy

Hermes G2 uses a layered error handling approach:

| Layer | Mechanism | Behaviour |
|-------|-----------|-----------|
| **Network fetch** | 5-second `AbortController` timeout | Returns `null` on timeout or HTTP error; caller decides next step |
| **Consecutive failure counter** | `errorState.consecutiveFailures` (incremented per failed poll) | ≤2 failures: silent (transient). ≥3 failures: shows "Dashboard not reachable" with Retry button |
| **Cached data persistence** | `lastStore` / `lastMessages` (never cleared on error) | Users always see the last successful data, even during prolonged outages |
| **Config parse resilience** | `try/catch` with `DEFAULT_CONFIG` fallback | Corrupted config in storage is silently replaced with safe defaults |
| **Bridge availability** | `try/catch` around `waitForEvenAppBridge()` | Falls back to phone-only mode with a "G2 not detected" banner |
| **Polling pause** | `tabHidden` flag with `visibilitychange` event | Prevents wasted fetches when the user isn't looking |

**Error escalation logic** (in `src/main.ts`):

```
Fail 1: "Network error. Check WiFi connection." (no retry button)
Fail 2: (silent — still using cached data)
Fail 3+: "Dashboard not reachable. Run hermes dashboard on your Mac." (Retry button appears)
Success: Consecutive failures reset to 0, error banner cleared
```

This prevents transient blips (WiFi hiccup, Mac under load) from alarming the user while surfacing genuine outages.

---

## Even OS 2.0 Compliance

Hermes G2 follows the Even Realities Design Guidelines for Even OS 2.0:

| Guideline | Implementation |
|-----------|---------------|
| **Typography scale** | 11/13/15/17/20/24px with letter-spacing (mapped to CSS classes `text-detail` through `text-vlarge-title`) |
| **Dark theme as default** | Dark tokens are active on load; light tokens are `disabled` by default |
| **Token-based theming** | All colours defined as CSS custom properties in `:root` blocks; no hardcoded colour values in styles |
| **SettingsGroup layout** | Phone UI uses `.list-item` rows with `.item-start` / `.item-value` / `.item-chevron` structure |
| **SegmentedControl** | Theme toggle uses `.segmented-control` with three buttons |
| **Select dropdowns** | Custom-styled `<select>` elements with SVG chevron, following input guidelines |
| **Status colours** | `--color-positive` (green), `--color-negative` (red), `--color-text-muted` (grey) for status dots |
| **FK Grotesk Neue** | Primary font, falling back to system fonts |

---

## File Map

```
hermes-g2/
├── README.md                         # Project overview, features, quick start (~200 lines)
├── SETUP.md                          # Step-by-step installation guide (~200 lines)
├── ARCHITECTURE.md                   # This file (~250 lines)
├── CHANGELOG.md                      # Version history
├── LICENSE                           # MIT license
├── .gitignore                        # Ignore patterns for node_modules, dist, .ehpk
├── package.json                      # npm metadata, scripts, dependencies
├── package-lock.json                 # Locked dependency tree
├── vite.config.ts                    # Vite build configuration (single-file output)
├── tsconfig.json                     # TypeScript strict-mode configuration
├── index.html                        # Phone companion UI shell (687 lines)
│                                     #   - Dark + Light theme CSS tokens
│                                     #   - App layout, typography, SettingsGroup
│                                     #   - SegmentedControl, selects, buttons
│                                     #   - Status dot, error banner, message preview
│                                     #   - G2 status bar, phone-only notice
├── dashboard-plugin/
│   ├── manifest.json                 # Plugin registration metadata (8 lines)
│   └── plugin_api.py                 # FastAPI router endpoints (271 lines)
│                                     #   - GET /inbox: compiled messages + sources
│                                     #   - GET /health: gateway status + cron stats
├── src/
│   ├── main.ts                       # Entry point — state management, pipeline (609 lines)
│   │                                 #   - Bridge init, config load, data pipeline
│   │                                 #   - Phone UI bindings, dropdown population
│   │                                 #   - Error state, theme application
│   │                                 #   - Message preview rendering
│   ├── types.ts                      # TypeScript interfaces and i18n strings (190 lines)
│   │                                 #   - HermesMessage, MessageStore, G2Config
│   │                                 #   - HealthResponse, AppState, ErrorState
│   │                                 #   - T (English + French translations)
│   ├── config.ts                     # Config persistence via bridge/localStorage (167 lines)
│   │                                 #   - loadConfig, saveConfig, loadTheme, saveTheme
│   │                                 #   - getLastSeen, setLastSeen, isFirstLaunch
│   │                                 #   - onConfigChange (storage events + 2s polling)
│   ├── data.ts                       # Dashboard API fetcher + filtering (173 lines)
│   │                                 #   - fetchStore, fetchHealth (5s timeout)
│   │                                 #   - filterMessages (type + label + max)
│   │                                 #   - startPolling (30s inbox, 60s health)
│   ├── input.ts                      # G2 touch/scroll event handlers (81 lines)
│   │                                 #   - List item click → detail view
│   │                                 #   - Back button click → list view
│   │                                 #   - System exit events
│   └── display/
│       └── index.ts                  # G2 rendering functions (385 lines)
│                                     #   - renderOnboarding, renderLoading, renderOffline
│                                     #   - renderEmpty, renderMessageList, renderMessageDetail
│                                     #   - TextContainerProperty + ListContainerProperty builders
├── dist/                             # Production build output (git-ignored)
│   ├── index.html
│   └── assets/
│       └── index.js
└── mockups/                          # Screenshot placeholders
    ├── hermes-g2-banner.png
    ├── phone-ui.png
    ├── g2-list.png
    └── g2-detail.png
```

**Total TypeScript source:** ~1,605 lines across 6 files
**Total Python (plugin):** 271 lines
**HTML/CSS (companion UI):** 687 lines

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@evenrealities/even_hub_sdk` | 0.0.10 | G2 Bridge API, container definitions, event types |
| `typescript` | ^6.0.3 | Type checking with strict mode |
| `vite` | ^8.0.16 | Dev server + production bundler |
| `esbuild` | ^0.28.1 | Fast JavaScript/TypeScript bundler |

No runtime dependencies beyond the Even Hub SDK. The entire app compiles to a single `index.js` (~15 KB gzipped) that runs in the Even App WebView.

---

## Future Directions (Phase 2+)

- **Conversation view** — Full session thread rendering on G2 with scroll
- **Push notifications** — Replace 30s polling with server-sent events or WebSocket push
- **Voice input** — Use G2 microphone for quick Hermes Agent queries
- **Multi-device** — Multiple G2 glasses sharing the same dashboard
- **Offline-first** — Service Worker for message caching when Mac is offline
- **BLE signal monitoring** — Show connection strength on phone UI
