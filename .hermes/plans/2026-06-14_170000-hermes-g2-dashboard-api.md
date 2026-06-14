# Hermes Agent → G2 Glasses Display App — Implementation Plan v3

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
>
> Previous plans:
> - v1: `.hermes/plans/2026-06-14_164232-hermes-g2-display.md` (passive-only inbox)
> - v2: `.hermes/plans/2026-06-14_164805-hermes-g2-companion-display.md` (companion-driven, data.json file)
>
> v3 adds: Hermes Dashboard API backend, bridge.setLocalStorage, onboarding, loading states, SegmentedControl, pull-to-refresh, background pause, NEW badges, lock file.

**Goal:** Build a G2 companion app where the **phone is the control center** and the **glasses are the display**. The user picks what Hermes content to show from the phone UI, and it renders on the G2 glasses. The backend is the Hermes Dashboard API (port 9119), which already has access to sessions, cron jobs, and their outputs.

**Architecture (v3):**
```
┌──────────┐  bridge.localStorage  ┌──────────────┐  HTTP fetch     ┌──────────────────┐
│  PHONE   │ ◄───────────────────► │  COMPANION   │ ◄─────────────► │  HERMES DASHBOARD │
│  config  │    cross-context      │  WEBVIEW     │   JSON API      │  port 9119        │
│  select  │                       │  (same HTML) │                 │  /api/plugins/    │
│  preview │                       │              │                 │    hermes-g2/     │
└──────────┘                       └──────┬───────┘                 │    inbox          │
                                          │ SDK bridge              └──────────────────┘
                                     ┌────▼──────┐                        │
                                     │  G2 DISPLAY│              ┌────────▼────────┐
                                     │  (read-only)              │  state.db       │
                                     └───────────┘              │  cron/jobs.json │
                                                                 │  cron/output/   │
                                                                 └─────────────────┘
```
- **Phone UI** — settings, source selection, message browser, pull-to-refresh, server IP config
- **Companion WebView** — the bridge; receives phone config via `bridge.setLocalStorage()`, fetches from dashboard API
- **G2 Display** — text/list containers only; onboarding screen, loading state, message list with NEW badges
- **Hermes Dashboard** — existing FastAPI server on port 9119; new plugin `hermes-g2` exposes inbox endpoint

**Tech Stack:** TypeScript + @evenrealities/even_hub_sdk 0.0.10 + Vite + even-toolkit CSS tokens. Python FastAPI dashboard plugin (no new deps).

---

## Key Design Decisions (v3)

### 1. Backend: Hermes Dashboard API (not data.json file)
The Hermes Dashboard (port 9119) already runs FastAPI with access to `state.db`, `cron/jobs.json`, and `cron/output/`. A new plugin `hermes-g2` exposes `GET /api/plugins/hermes-g2/inbox` which returns the exact same JSON format the companion app expects. This solves the production deployment problem (.ehpk is static, can't update a bundled `data.json`).

### 2. Config storage: `bridge.setLocalStorage()` (not `window.localStorage`)
Per even-hub-dev pitfall #13, `window.localStorage` is wiped when `evenhub pack` builds the .ehpk. We use the SDK's `bridge.setLocalStorage()` / `bridge.getLocalStorage()` API which persists across repacks. The config module exposes the same `loadConfig()`/`saveConfig()` API but backed by the bridge.

### 3. Onboarding screen on G2
First launch: the G2 shows "Configure on your phone →" with a simple arrow. The phone UI shows a clear setup card. No black screen, no confusion.

### 4. Loading states everywhere
- Dropdowns show "Loading sources..." while fetching
- G2 shows a subtle "Loading..." text during initial fetch
- Refresh button shows a spinner while fetching
- Transition from list → empty state is smooth (not jarring)

### 5. SegmentedControl for source selection
Instead of `<select>` dropdowns, use even-toolkit's SegmentedControl pattern for Source (4 options: All / Cron / Sessions / Direct). Much faster on mobile, more native feel. Job stays as a `<select>` (variable items).

### 6. Pull-to-refresh on phone
Native-feeling pull-down gesture on the message list. Plus "Refresh now" button as explicit alternative. Visual feedback on both.

### 7. Background polling pause
`document.visibilitychange` listener pauses the 30s poll when the app is backgrounded. Resumes on return + immediate fetch.

### 8. NEW badges on G2
Messages that arrived since the last time the list was viewed get a `●` prefix on G2. Badge tracked via `bridge.setLocalStorage('hermes-g2-last-seen')`.

### 9. Lock file for cron data writes
If cron jobs write data directly (for the file-based fallback), use a `.lock` file with timeout to prevent concurrent writes.

---

## Data Flow (v3)

```
1. Hermes cron runs → output saved to ~/.hermes/cron/output/<job_id>/
2. Hermes Dashboard is running on port 9119
3. Plugin API reads state.db + cron/jobs.json + cron output files
4. Companion WebView polls: GET http://<dashboard_ip>:9119/api/plugins/hermes-g2/inbox
5. Phone UI reads user config from bridge.getLocalStorage():
   - Selected source type (cron / sessions / all)
   - Selected specific job/session
   - Max messages to show
6. Phone UI writes config to bridge.setLocalStorage()
7. Companion listens for storage event → triggers G2 re-render
8. G2 displays whatever the phone selected, with NEW badges
```

---

## Phone UI Layout (v3)

```
┌─────────────────────────────────┐
│         ⚡ Hermes G2            │
│   Your Agent, on your glasses  │
├─────────────────────────────────┤
│  SERVER                         │
│  ┌───────────────────────────┐  │
│  │ Dashboard IP [192.168.1.x]│  │  ← text input, auto-detected
│  │ Port         [9119     ]  │  │
│  │              [Connect]    │  │  ← button with spinner
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  SOURCE                         │
│  ┌───────────────────────────┐  │
│  │ [All] [Cron] [Sessions]   │  │  ← SegmentedControl (not <select>)
│  │           [Direct]         │  │
│  └───────────────────────────┘  │
│  Job: [veille-akiya-japon  ▼]   │  ← <select>, filtered by source
├─────────────────────────────────┤
│  MESSAGES (12)    [↻ Refresh]   │  ← count + refresh button
│  ┌───────────────────────────┐  │
│  │ ◉ 14/06 09:00 Cron ak…   │  │  ← ◉ = NEW since last visit
│  │   13/06 21:00 Cron ak…    │  │  ← scrollable list
│  │   13/06 09:00 Cron vo…    │  │     pull-to-refresh
│  │   12/06 18:30 Session …   │  │
│  │          ...              │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  v0.1.0                         │
└─────────────────────────────────┘
```

---

## G2 Display Layout (v3)

**Level -1 — Onboarding (first launch only):**
```
┌──────────────────────────────────┐
│                                  │
│         ⚡ Hermes G2             │
│                                  │
│   Configure on your phone →     │
│                                  │
│   Open the Hermes G2 companion  │
│   app and select a source.      │
│                                  │
│ ⧉ exit                          │
└──────────────────────────────────┘
```

**Level 0 — Loading:**
```
┌──────────────────────────────────┐
│                                  │
│          Loading...              │
│                                  │
│ ⧉ exit                          │
└──────────────────────────────────┘
```

**Level 0 — Message List:**
```
┌──────────────────────────────────┐
│ Hermes · Cron · veille-akiya (4) │  ← header
├──────────────────────────────────┤
│ ● 14/06 09:00 [C] 🏠 3 nouvelles…│  ← ● = NEW, item surligné
│   13/06 21:00 [C] 🏠 2 annonces… │
│   13/06 09:00 [C] ✈️ vols <700€  │
│   12/06 18:30 [S] 📋 Dashboard…  │
│                           ░░     │
│                           ▓▓     │  ← scrollbar
│                           ░░     │
│ ↕ scroll  tap detail  ⧉ exit    │
└──────────────────────────────────┘
```

**Level 0 — Empty (after filter):**
```
┌──────────────────────────────────┐
│ Hermes · Sessions (0)            │
├──────────────────────────────────┤
│                                  │
│       No messages found.         │
│    Try a different source        │
│    on your phone.                │
│                                  │
│ ⧉ exit                          │
└──────────────────────────────────┘
```

**Level 1 — Message Detail:**
```
┌──────────────────────────────────┐
│ 🏠 VEILLE AKIYA — 14 JUIN 2026  │  ← header
│                                  │
│ 3 nouvelles annonces aujourd'hui.│
│                                  │
│ 1. Maison traditionnelle         │  ← scrollable si overflow
│    Kyoto, Shimogyo-ku            │     (firmware gère le scroll)
│    8,2M¥ (508k€) — 120m², 4DK   │
│                                  │
│ 2. Kominka rénovée               │
│    ...                           │
│                                  │
│ ⧉ back to list                  │
└──────────────────────────────────┘
```

---

## API Endpoint: GET /api/plugins/hermes-g2/inbox

**Response format:**
```json
{
  "messages": [
    {
      "ts": 1718366400000,
      "source": "cron",
      "label": "veille-akiya-japon",
      "body": "🏠 VEILLE AKIYA — 14 JUIN 2026\n\n3 nouvelles annonces..."
    }
  ],
  "sources": [
    {"type": "cron", "label": "veille-akiya-japon", "count": 2},
    {"type": "cron", "label": "veille-vols-japon", "count": 1},
    {"type": "session", "label": "Dashboard Plugin", "count": 1}
  ]
}
```

**Data sources** (read from dashboard backend):
- `cron/jobs.json` → list of cron jobs with their last run status/output
- `cron/output/<job_id>/` → latest output text file
- `state.db` → recent sessions with their messages
- Messages compiled newest-first, max 100

---

---

## Design Guidelines — Even OS 2.0 Companion App Compliance

**Source:** Even Realities Figma APP Guidelines + even-toolkit tokens (canonical reference: `even-toolkit/web/theme/tokens-dark.css` + `docs/theming.md`).

Every visual decision in this app must comply with these rules. No exceptions.

### Color Tokens (Dark Theme)

The app uses the **dark theme** exclusively. All colors come from `tokens-dark.css`:

```css
:root {
  /* Text */
  --color-text: #f0ebe3;
  --color-text-dim: #8a7f72;
  --color-text-muted: #5c5347;
  --color-text-highlight: #FFFFFF;

  /* Background */
  --color-bg: #0c0a07;
  --color-surface: #161310;
  --color-surface-light: #201c17;
  --color-surface-lighter: #2c2620;

  /* Border */
  --color-border: #28221a;
  --color-border-light: #3a3228;

  /* Accent & Semantic */
  --color-accent: #FFFFFF;
  --color-accent-alpha: rgba(255,255,255,0.12);
  --color-accent-warning: #FEF991;

  /* Status */
  --color-positive: #26a69a;       /* connected, success */
  --color-positive-alpha: rgba(38,166,154,0.50);
  --color-negative: #ef5350;       /* error, disconnected */
  --color-negative-alpha: rgba(239,83,80,0.15);

  /* Input */
  --color-overlay: rgba(0,0,0,0.60);
  --color-input-bg: rgba(255,255,255,0.08);

  /* Layout */
  --radius-default: 6px;
  --spacing-margin: 12px;          /* page horizontal margins */
  --spacing-card-margin: 16px;     /* card internal padding */
  --spacing-same: 6px;             /* gap between similar items */
  --spacing-cross: 12px;           /* gap between different items */
  --spacing-section: 24px;         /* gap between sections */

  /* Fonts */
  --font-display: "FK Grotesk Neue", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: "FK Grotesk Neue", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "SF Mono", "Cascadia Code", "Fira Code", monospace;
}
```

### Typography Scale

| Role | Size | Weight | Tracking | CSS Class (even-toolkit) |
|------|------|--------|----------|--------------------------|
| Page title | 24px | 400 | -0.72px | `.text-vlarge-title` |
| Section header | 20px | 400 | -0.6px | `.text-large-title` |
| Card titles, nav items, buttons | 17px | 400 | -0.17px | `.text-medium-title` |
| Body paragraphs | 17px | 300 | -0.17px | `.text-medium-body` |
| List item titles, smaller headings | 15px | 400 | -0.15px | `.text-normal-title` |
| Default body, descriptions | 15px | 300 | -0.15px | `.text-normal-body` |
| Subtitles, captions, helper text | 13px | 400 | -0.13px | `.text-subtitle` |
| Timestamps, tiny labels, fine print | 11px | 400 | -0.11px | `.text-detail` |

**No other font sizes allowed.** The scale is fixed. Do not use 28px, 14px, 16px, etc.

### Layout Rules

- **Border radius: 6px everywhere.** No 4px, 8px, 12px. Exception: `rounded-full` for status dots and toggle knobs only.
- **Page horizontal margin: 12px** (`--spacing-margin`).
- **Card internal padding: 16px** (`--spacing-card-margin`).
- **Section gap: 24px** (`--spacing-section`).
- **Divider color: `--color-border`** (`#28221a`).
- **Font family: FK Grotesk Neue** on everything. No system font shortcuts (no `var(--font-stack)` hacks). Fallback to `-apple-system` only when FK Grotesk Neue can't be loaded (it won't be in our Vite app — that's fine, the fallback is the official pattern).

### Component Patterns (from official even-toolkit docs)

**Settings Group (canonical pattern):**
```html
<div class="settings-group">
  <div class="text-detail" style="color:var(--color-text-dim); text-transform:uppercase;
       letter-spacing:0.5px; margin-bottom:8px;">SECTION LABEL</div>
  <div class="list-item">
    <div class="item-body">
      <div class="item-title">Primary text</div>
      <div class="item-sub">Secondary text</div>
    </div>
    <span class="item-value">Value</span>
    <span class="item-chevron">›</span>
  </div>
</div>
```

CSS for each element:
```css
.settings-group {
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: var(--spacing-section);  /* 24px */
}
.settings-group > * + * {
  border-top: 1px solid var(--color-border);
}
.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-surface);
  padding: 16px;
  cursor: pointer;
}
.item-title {
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.15px;
  color: var(--color-text);
}
.item-sub {
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.13px;
  color: var(--color-text-dim);
  margin-top: 2px;
}
.item-value {
  font-size: 15px;
  color: var(--color-text-dim);
  flex-shrink: 0;
}
.item-chevron {
  color: var(--color-text-muted);
  font-size: 13px;
}
```

**SegmentedControl (for Source selection — 2-4 options):**
```html
<div class="segmented">
  <button class="active">All</button>
  <button>Cron</button>
  <button>Sessions</button>
  <button>Direct</button>
</div>
```
```css
.segmented {
  display: inline-flex;
  border-radius: 6px;
  background: var(--color-surface-lighter);
  padding: 2px;
  height: 48px;
}
.segmented button {
  flex: 1;
  background: transparent;
  color: var(--color-text-dim);
  border: none;
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.15px;
  cursor: pointer;
  padding: 0 16px;
}
.segmented button.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
```

**Buttons:**
```css
/* Primary / Highlight */
.btn-highlight {
  background: var(--color-accent);        /* #FFFFFF */
  color: var(--color-bg);                 /* #0c0a07 */
  border: none;
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  letter-spacing: -0.17px;
  padding: 12px 24px;
  cursor: pointer;
}

/* Normal */
.btn-normal {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  letter-spacing: -0.17px;
  padding: 12px 24px;
  cursor: pointer;
}

/* Ghost / secondary */
.btn-ghost {
  background: transparent;
  color: var(--color-text-dim);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 400;
  letter-spacing: -0.17px;
  padding: 12px 24px;
  cursor: pointer;
}
```

**Status indicator (connected/disconnected):**
```css
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.status-connected { background: var(--color-positive); }
.status-disconnected { background: var(--color-negative); }
```

**Select dropdown (for Job filter):**

Follow the official even-toolkit `Select` component API. In vanilla HTML, replicate its styling:

```html
<select class="hermes-select">
  <option value="">All Jobs</option>
  <option value="veille-akiya-japon">veille-akiya-japon (2)</option>
  <option value="veille-vols-japon">veille-vols-japon (1)</option>
</select>
```

```css
.hermes-select {
  appearance: none;
  -webkit-appearance: none;
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 32px 8px 12px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.15px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Cpath fill='%238a7f72' d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
```

JS interaction follows the official even-toolkit API contract:
- Event: `change` (native); the handler receives `event.target.value` (string)
- Do NOT use `onValueChange` in vanilla HTML — that's the React prop name. In vanilla JS, use `addEventListener('change', ...)`.

### Theme Switcher — Dark / Light / System

**Default: System.** The app respects the OS preference via `prefers-color-scheme`.

**Implementation pattern** (official even-toolkit approach — `@media` query + class-based override):

```html
<!-- Theme CSS — inline style blocks (Vite-safe, survives build) -->

<!-- Dark theme tokens (active when system is dark, or when .dark class is set) -->
<style id="tokens-dark">
  :root {
    --color-text: #f0ebe3;
    --color-text-dim: #8a7f72;
    --color-text-muted: #5c5347;
    --color-text-highlight: #FFFFFF;
    --color-bg: #0c0a07;
    --color-surface: #161310;
    --color-surface-light: #201c17;
    --color-surface-lighter: #2c2620;
    --color-border: #28221a;
    --color-border-light: #3a3228;
    --color-accent: #FFFFFF;
    --color-accent-alpha: rgba(255,255,255,0.12);
    --color-accent-warning: #FEF991;
    --color-positive: #26a69a;
    --color-positive-alpha: rgba(38,166,154,0.50);
    --color-negative: #ef5350;
    --color-negative-alpha: rgba(239,83,80,0.15);
    --color-overlay: rgba(0,0,0,0.60);
    --color-input-bg: rgba(255,255,255,0.08);
    --radius-default: 6px;
    --spacing-margin: 12px;
    --spacing-card-margin: 16px;
    --spacing-same: 6px;
    --spacing-cross: 12px;
    --spacing-section: 24px;
    --font-display: "FK Grotesk Neue", -apple-system, BlinkMacSystemFont, sans-serif;
    --font-body: "FK Grotesk Neue", -apple-system, BlinkMacSystemFont, sans-serif;
    --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Cpath fill='%238a7f72' d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E");
  }
</style>

<!-- Light theme tokens -->
<style id="tokens-light">
  :root {
    --color-text: #232323;
    --color-text-dim: #7B7B7B;
    --color-text-muted: #7B7B7B;
    --color-text-highlight: #FFFFFF;
    --color-bg: #EEEEEE;
    --color-surface: #FFFFFF;
    --color-surface-light: #F6F6F6;
    --color-surface-lighter: #E4E4E4;
    --color-border: #E4E4E4;
    --color-border-light: #EEEEEE;
    --color-accent: #232323;
    --color-accent-alpha: rgba(35,35,35,0.08);
    --color-accent-warning: #FEF991;
    --color-positive: #4BB956;
    --color-positive-alpha: rgba(75,185,86,0.15);
    --color-negative: #FF453A;
    --color-negative-alpha: rgba(255,69,58,0.15);
    --color-overlay: rgba(0,0,0,0.50);
    --color-input-bg: rgba(35,35,35,0.08);
    --radius-default: 6px;
    --spacing-margin: 12px;
    --spacing-card-margin: 16px;
    --spacing-same: 6px;
    --spacing-cross: 12px;
    --spacing-section: 24px;
    --font-display: "FK Grotesk Neue", -apple-system, BlinkMacSystemFont, sans-serif;
    --font-body: "FK Grotesk Neue", -apple-system, BlinkMacSystemFont, sans-serif;
    --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Cpath fill='%237B7B7B' d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E");
  }
</style>
```

**JS theme resolver:**

```javascript
var themeConfig = 'system'  // 'system' | 'dark' | 'light'

var systemQuery = window.matchMedia('(prefers-color-scheme: dark)')

function resolveTheme(theme) {
  if (theme === 'system') return systemQuery.matches ? 'dark' : 'light'
  return theme
}

function applyTheme(theme) {
  var resolved = resolveTheme(theme)
  document.getElementById('tokens-dark').disabled = (resolved !== 'dark')
  document.getElementById('tokens-light').disabled = (resolved !== 'light')
  document.documentElement.setAttribute('data-theme', theme)
}

// Live-update when OS theme changes while 'system' is selected
systemQuery.addEventListener('change', function () {
  if (themeConfig === 'system') applyTheme('system')
})

// Initial apply
applyTheme(themeConfig)
```

**Theme selector in the UI — `<select>` with 3 options:**
```html
<div class="list-item list-item-select">
  <div class="item-body">
    <div class="item-title">Theme</div>
    <div class="item-sub">Appearance</div>
  </div>
  <select id="themeSelect" class="hermes-select">
    <option value="system">System</option>
    <option value="dark">Dark</option>
    <option value="light">Light</option>
  </select>
</div>
```

The `<select>` is used (not SegmentedControl) because: 3+ options. SegmentedControl is for 2-4 options of the same weight. Theme is a preference setting → SettingsGroup pattern with trailing Select is correct.

**Theme config persistence:** save to `bridge.setLocalStorage('hermes-g2-theme', themeConfig)`. Load on init. Default: `'system'`.

**Add to the CONNECTION SettingsGroup** (as a 4th row):

```
┌──────────────────────────────────────┐
│  CONNECTION                          │
│  ┌────────────────────────────────┐  │
│  │ Server     192.168.1.42      › │  │
│  ├────────────────────────────────┤  │
│  │ Port       9119              › │  │
│  ├────────────────────────────────┤  │
│  │ Status     ● Connected         │  │
│  ├────────────────────────────────┤  │
│  │ Theme      System            ▼ │  │  ← new row
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

The Theme row uses a `<select>` with the `.hermes-select` styling — inline with the ListItem trailing pattern. Three options: System (default), Dark, Light.

### Phone UI Layout (design-compliant)

```
┌──────────────────────────────────────┐
│  ⚡ Hermes G2                        │  ← text-vlarge-title (24px, -0.72px)
│  Your Agent, on your glasses.       │  ← text-subtitle (13px, text-dim)
│                                      │
│  ┌────────────────────────────────┐  │
│  │ CONNECTION                     │  │  ← text-detail (11px uppercase)
│  │ ┌────────────────────────────┐ │  │
│  │ │ Server     192.168.1.42  ›│ │  │  ← ListItem (15px title + chevron)
│  │ ├────────────────────────────┤ │  │
│  │ │ Port       9119          ›│ │  │
│  │ ├────────────────────────────┤ │  │
│  │ │ Status     ● Connected     │ │  │  ← green dot
│  │ └────────────────────────────┘ │  │
│  └────────────────────────────────┘  │  ← margin-bottom: 24px
│                                      │
│  ┌────────────────────────────────┐  │
│  │ SOURCE                         │  │
│  │ ┌────────────────────────────┐ │  │
│  │ │ [All] [Cron] [Sess.] [Dir] │ │  │  ← SegmentedControl
│  │ ├────────────────────────────┤ │  │
│  │ │ Job  veille-akiya-japon  ▼│ │  │  ← ListItem + trailing Select
│  │ └────────────────────────────┘ │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ MESSAGES (12)                  │  │
│  │ ┌────────────────────────────┐ │  │
│  │ │ ● 14/06 09:00            ›│ │  │  ← ListItem: title=date+tag
│  │ │   Cron · 3 nouvelles...    │ │  │    subtitle=preview (13px dim)
│  │ ├────────────────────────────┤ │  │
│  │ │   13/06 21:00            ›│ │  │
│  │ │   Cron · 2 annonces...    │ │  │
│  │ ├────────────────────────────┤ │  │
│  │ │   13/06 09:00            ›│ │  │
│  │ │   Cron · vols <700€...    │ │  │
│  │ └────────────────────────────┘ │  │
│  │  [↻ Refresh now]               │  │  ← btn-normal
│  └────────────────────────────────┘  │
│                                      │
│  v0.1.0                              │  ← text-detail (11px, text-muted)
└──────────────────────────────────────┘
```

### What NOT to do

- ❌ Blue accent (`#4a9eff`, `#2563EB`) — Even accent is **white** in dark theme, **black (#232323)** in light
- ❌ Custom border radius (4px, 8px, 12px) — **6px only**
- ❌ System font as primary — **FK Grotesk Neue** (fallback allowed)
- ❌ Custom font sizes (14px, 16px, 18px, 28px) — use the **8-size scale** only
- ❌ `border-bottom` for separators — use **full border-top on `.list-item + .list-item`** (SettingsGroup pattern)
- ❌ Floating toasts for save feedback — use **inline status text** below buttons
- ❌ Card shadows — Even cards are **flat**, bordered with `--color-border`
- ❌ Outlined SegmentedControl — buttons sit on `--color-surface-lighter` background
- ❌ `<select>` for Source — use **SegmentedControl** for 4 options, `<select>` only for variable lists (Job) and preferences (Theme)
- ❌ Forcing dark theme only — support **System** (default), Dark, and Light via the official even-toolkit pattern

---

## Error & Degradation States

Every failure mode must degrade gracefully. The user should always know what's happening and what to do. No silent failures, no white screens, no frozen UI.

### 1. Dashboard API Down (port 9119 not running / crashed)

**Detection:** `fetch()` to dashboard API fails (connection refused, timeout after 5s, or HTTP error)

**Phone UI:**
- Status row in CONNECTION group: `● Disconnected` (red dot `var(--color-negative)`)
- Below the SettingsGroup: inline warning text (13px, `--color-negative`): "Dashboard not reachable. Run `hermes dashboard` on your Mac."
- Retry button appears: "Retry connection"
- Last known messages remain visible (cached), but greyed out with a banner "Showing cached data"

**G2 (if bridge available):**
- Header: `Hermes · Offline`
- Body: "Dashboard offline.\nCheck your phone."
- Exit still works (double-tap)

### 2. Network Down (WiFi disconnected / IP changed)

**Detection:** `fetch()` timeout after 5s, or `TypeError: Failed to fetch`

**Phone UI:**
- Status row: `● Disconnected` (red)
- Warning: "Network error. Check WiFi connection."
- Server IP field stays editable — user can fix the IP and tap Retry

**G2:** same as case 1

### 3. Gateway Down (Hermes gateway not running, crons stalled)

**Detection:** Dashboard API responds successfully but returns a flag `"gateway_online": false` (the dashboard can check if gateway is running)

**Phone UI:**
- Warning badge (amber, `--color-accent-warning: #FEF991` with dark text) next to message count: "⚠ Gateway offline"
- Messages still display (latest cron outputs are on disk)
- Explanatory text: "No new messages until gateway restarts."

**G2:**
- Header: `Hermes · Cron · veille-akiya (4) ⚠`
- The `⚠` is appended to the header to indicate stale data
- Messages still readable, NEW badges still work for messages since last visit

**Dashboard API addition:** add a `gateway_online` boolean to the inbox response by checking if the gateway process is running (e.g., check for pid file or `hermes gateway status`).

### 4. Empty Data (first launch, no crons ever run)

**Detection:** inbox API returns `messages: []`, `sources: []`

**Phone UI:**
- SettingsGroup MESSAGES shows empty state card: "No messages yet."
- Subtitle: "Messages will appear here when Hermes cron jobs run."
- The app remains fully functional — user can configure server and sources. When data arrives, it appears automatically.

**G2 (first launch):**
- Onboarding screen: "⚡ Hermes G2\nConfigure on your phone →"
- Full explanation: "Open the companion app\nto set up your server and\nchoose what to display."

**G2 (returning user, no matching messages for filter):**
- "No messages found.\nTry a different source\non your phone."

### 5. JSON Parse Error (malformed API response)

**Detection:** `resp.json()` throws, or response structure doesn't match `MessageStore` type

**Behavior:**
- Error is logged to console
- Last valid cached data is preserved
- Phone UI: subtle inline status below message list — "Could not load messages. Retrying..." (text-subtitle, 13px, `--color-text-dim`)
- Auto-retry on next poll (30s)
- After 3 consecutive failures: show a more prominent warning "Data format error. The dashboard API may need a restart."
- G2: stays on last known good state. No error shown on glasses (don't alarm the user for transient issues).

### 6. Bridge SDK Error (waitForEvenAppBridge timeout)

**Detection:** `waitForEvenAppBridge()` promise rejects or times out

**Behavior:**
- App enters **phone-only mode** (browser / no G2 connected)
- G2 status bar hidden
- Phone UI fully visible and functional — server config, source selection, message preview all work
- Subtle hint: "G2 not detected — running in phone mode."
- This is a normal state during development (browser testing). Not an error.

### 7. localStorage / bridge Storage Wiped (repack, clear data)

**Detection:** config load returns defaults (no saved config found)

**Behavior:**
- `firstLaunch` flag is absent → treat as first launch
- Onboarding screen on G2
- All config reverts to defaults: System theme, All sources, no server IP override
- Theme defaults to `'system'` → auto-detects from OS
- User reconfigures naturally via phone UI
- **No error message** — this is expected after repack. The UI just behaves like first launch.

### Error Recovery Flow Summary

```
fetch() called
  │
  ├─ Success + valid JSON ──→ Update UI, clear error state, cache data
  │
  ├─ Network error (timeout/refused) ──→ Show Disconnected, keep cache
  │                                         Retry on next poll + manual Retry button
  │
  ├─ HTTP 4xx/5xx ──→ Show "Dashboard error (code 502)", keep cache
  │
  ├─ JSON parse error ──→ Log, keep cache, retry next poll
  │                        After 3 failures → show warning
  │
  └─ Empty data (valid, but no messages) ──→ Show empty state
                                               (not an error — normal state)
```

### Offline Resilience

- **Last known state is always preserved in memory** (module-level variable `lastValidStore`)
- When fetch fails, the UI shows cached data with a visual distinction:
  - Message list items get a slightly dimmed opacity (CSS `opacity: 0.6`)
  - A status banner appears: "Showing cached data · Last updated 3 min ago"
- Timestamps on cached data help the user judge staleness
- **Never clear the UI on error** — always fall back to cache, never to blank

### Timeout Values

| Operation | Timeout | Rationale |
|-----------|---------|-----------|
| Dashboard API fetch | 5 seconds | Local network should be fast; 5s is generous for WiFi |
| Bridge init (`waitForEvenAppBridge`) | SDK default (~10s) | SDK handles this internally |
| Poll interval (normal) | 30 seconds | Balance freshness vs battery |
| Poll interval (after error) | 30 seconds | Same — don't hammer a broken server |
| Manual retry cooldown | 2 seconds | Prevent double-tap spam |

### Dashboard API Health Endpoint

Add a lightweight endpoint that the companion app can call separately from inbox:

```
GET /api/plugins/hermes-g2/health
```

Response:
```json
{
  "status": "ok",
  "gateway_online": true,
  "cron_jobs_total": 3,
  "cron_jobs_active": 2,
  "last_cron_run": "2026-06-14T09:00:00Z"
}
```

The companion app polls this every 60s. The inbox endpoint also includes `gateway_online`. If the health check fails, the app shows disconnected state immediately (60s detection instead of waiting for the next 30s inbox poll).

---

## Tasks (v3)

### Task 0: Create Hermes Dashboard plugin `hermes-g2`

**Objective:** Expose `GET /api/plugins/hermes-g2/inbox` on the dashboard (port 9119)

**Files:**
- Create: `hermes-g2-dashboard/plugin_api.py`
- Create: `hermes-g2-dashboard/manifest.json`

**Step 1: Write manifest.json**

```json
{
  "name": "hermes-g2",
  "label": "Hermes G2",
  "description": "API endpoint for Hermes G2 companion app — serves cron outputs and session data",
  "icon": "Glasses",
  "version": "0.1.0",
  "api": "plugin_api.py"
}
```

**Step 2: Write plugin_api.py**

```python
"""Hermes G2 dashboard plugin — inbox API for the G2 companion app."""

import json
import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter

log = logging.getLogger(__name__)
router = APIRouter()

HERMES_HOME = Path(os.environ.get("HERMES_HOME", os.path.expanduser("~/.hermes")))
STATE_DB = HERMES_HOME / "state.db"
CRON_JOBS = HERMES_HOME / "cron" / "jobs.json"
CRON_OUTPUT = HERMES_HOME / "cron" / "output"

MAX_MESSAGES = 100


def _get_db() -> sqlite3.Connection:
    db = sqlite3.connect(f"file:{STATE_DB}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    return db


def _load_cron_messages() -> list[dict]:
    """Read latest cron job outputs."""
    messages = []
    try:
        with open(CRON_JOBS) as f:
            jobs = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return messages

    for job in jobs:
        job_id = job.get("job_id", "")
        name = job.get("name", job_id)
        output_dir = CRON_OUTPUT / job_id

        if not output_dir.is_dir():
            continue

        # Find latest output file
        files = sorted(output_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            continue

        latest = files[0]
        try:
            body = latest.read_text()[:5000]  # cap at 5KB per message
        except Exception:
            continue

        ts_ms = int(latest.stat().st_mtime * 1000)

        messages.append({
            "ts": ts_ms,
            "source": "cron",
            "label": name,
            "body": body,
        })

    return messages


def _load_session_messages() -> list[dict]:
    """Read recent session summaries from state.db."""
    messages = []
    try:
        db = _get_db()
        rows = db.execute(
            """SELECT session_id, title, started_at, input_tokens, output_tokens
               FROM sessions
               WHERE title IS NOT NULL AND title != ''
               ORDER BY started_at DESC
               LIMIT 20"""
        ).fetchall()
    except Exception:
        return messages

    for row in rows:
        ts_ms = int(row["started_at"] * 1000) if row["started_at"] else 0
        body = (
            f"Session: {row['title']}\n"
            f"ID: {row['session_id']}\n"
            f"Tokens: {row['input_tokens'] or 0} in / {row['output_tokens'] or 0} out"
        )
        messages.append({
            "ts": ts_ms,
            "source": "session",
            "label": row["title"],
            "body": body,
        })

    return messages


def _build_sources_index(messages: list[dict]) -> list[dict]:
    """Build deduplicated source list with counts."""
    from collections import Counter
    counts = Counter()
    for m in messages:
        counts[(m["source"], m["label"])] += 1

    return sorted(
        [{"type": t, "label": l, "count": c} for (t, l), c in counts.items()],
        key=lambda s: s["count"],
        reverse=True,
    )


@router.get("/inbox")
async def inbox():
    """Return compiled inbox with cron outputs + session summaries."""
    messages = _load_cron_messages() + _load_session_messages()

    # Sort newest first
    messages.sort(key=lambda m: m["ts"], reverse=True)
    messages = messages[:MAX_MESSAGES]

    sources = _build_sources_index(messages)

    return {
        "messages": messages,
        "sources": sources,
    }
```

**Step 3: Install the plugin**

```bash
mkdir -p ~/.hermes/plugins/hermes-g2/dashboard
cp hermes-g2-dashboard/manifest.json ~/.hermes/plugins/hermes-g2/dashboard/
cp hermes-g2-dashboard/plugin_api.py ~/.hermes/plugins/hermes-g2/dashboard/
# Restart dashboard: hermes dashboard (auto-discovers new plugin)
```

**Step 4: Verify endpoint**

```bash
curl -s http://localhost:9119/api/plugins/hermes-g2/inbox | python3 -m json.tool | head -20
```

---

### Task 1: Project scaffold

Same as v2 Task 1 — `hermes-g2/package.json`, `tsconfig.json`, `vite.config.ts`, `app.json`.
Port 5174.

---

### Task 2: Define types (extended)

**Add to v2 types.ts:**
- `ServerConfig` — dashboard IP + port
- `AppState` extended with `isLoading`, `isFirstLaunch`, `lastSeenTs`
- i18n strings for onboarding, loading, empty states

---

### Task 3: Config module using `bridge.setLocalStorage()`

**Critical change from v2:** Use `bridge.setLocalStorage()` and `bridge.getLocalStorage()` instead of `window.localStorage`.

The config module needs the bridge reference. Pattern:

```typescript
// config.ts
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

let _bridge: EvenAppBridge | null = null

export function initConfig(bridge: EvenAppBridge): void {
  _bridge = bridge
}

export async function loadConfig(): Promise<G2Config> {
  if (_bridge) {
    try {
      const raw = await _bridge.getLocalStorage('hermes-g2-config')
      if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    } catch { /* fall through to defaults */ }
  }
  return { ...DEFAULT_CONFIG }
}

export async function saveConfig(config: G2Config): Promise<void> {
  if (_bridge) {
    await _bridge.setLocalStorage('hermes-g2-config', JSON.stringify(config))
  }
}
```

Also persist: `hermes-g2-last-seen` (timestamp for NEW badges), `hermes-g2-first-launch` (boolean).

---

### Task 4: Data fetcher — fetch from dashboard API

**Change from v2:** Fetch from `http://<IP>:9119/api/plugins/hermes-g2/inbox` instead of `/data.json`.

Add server IP config field in phone UI. Auto-detect via `window.location.hostname` (works in QR sideload since Vite dev server runs on same machine).

```typescript
// data.ts
const DEFAULT_PORT = 9119

function getApiUrl(config: G2Config): string {
  const ip = config.serverIP || window.location.hostname
  const port = config.serverPort || DEFAULT_PORT
  return `http://${ip}:${port}/api/plugins/hermes-g2/inbox`
}
```

Polling pauses on `document.visibilitychange`:

```typescript
let tabVisible = true
document.addEventListener('visibilitychange', () => {
  tabVisible = document.visibilityState === 'visible'
  if (tabVisible) poll() // immediate refresh on return
})

// In poll loop:
if (!tabVisible) return  // skip poll when hidden
```

---

### Task 5: G2 display module (extended)

**Add to v2 display module:**

- `renderOnboarding(bridge)` — first launch screen
- `renderLoading(bridge)` — loading state
- `renderEmpty(bridge, label)` — empty state with hint
- `renderMessageList(bridge, messages, configLabel, lastSeenTs)` — list with ● NEW badges
- NEW badge logic: `if msg.ts > lastSeenTs → prefix with '● '`

---

### Task 6: Input handler (unchanged from v2)

---

### Task 7: main.ts (extended)

**Key additions:**
1. `initConfig(bridge)` on bridge init
2. Check `hermes-g2-first-launch` → show onboarding if not set
3. `visibilitychange` listener for poll pause
4. Update `hermes-g2-last-seen` when user views the list
5. Pull-to-refresh via touch events on phone UI

---

### Task 8: Companion phone UI (index.html — redesigned)

**Changes from v2:**
- **Server IP section** at the top — text input for dashboard IP, pre-filled with `window.location.hostname`
- **SegmentedControl** for Source instead of `<select>`
- **Pull-to-refresh** on message list using touch events
- **Spinner** on refresh button during fetch
- **Loading skeleton** for initial load
- Separator between server config and source selection

---

### Task 9: Message preview in browser mode

Add server IP config to browser mode too. Fallback: if dashboard not reachable, show "Cannot reach Hermes Dashboard. Check that hermes dashboard is running."

---

### Task 10: Script for cron-triggered messages (fallback)

For Hermes cron jobs that want to push messages. This is a **fallback** — the primary path is the dashboard API reading cron outputs directly.

```bash
#!/usr/bin/env bash
# update-inbox-via-api.sh
# Usage: echo "message body" | update-inbox-via-api.sh "cron" "job-name"
# POSTs to the dashboard API to add a direct message.
# This is for messages that don't come from cron outputs (e.g., manual pushes).
```

---

### Task 11: Lock file for concurrent writes

```python
# In update script (fallback path only)
import fcntl, time

def acquire_lock(lock_path: str, timeout: int = 5) -> bool:
    """Try to acquire an exclusive lock with timeout."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
            os.close(fd)
            return True
        except FileExistsError:
            # Check if stale (>60s old)
            if time.time() - os.path.getmtime(lock_path) > 60:
                os.remove(lock_path)
                continue
            time.sleep(0.1)
    return False

def release_lock(lock_path: str):
    if os.path.exists(lock_path):
        os.remove(lock_path)
```

---

### Task 12: Build, QR sideload, test on hardware

Same as v2, plus:
- Verify dashboard API endpoint is reachable from phone
- Test onboarding screen on first launch
- Test NEW badges appear/disappear
- Test background pause/resume
- Test pull-to-refresh
- Test empty state after filter change

---

## Verification Checklist (v3)

- [ ] `curl localhost:9119/api/plugins/hermes-g2/inbox` returns valid JSON
- [ ] Dashboard plugin auto-discovers after restart
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vite build` — succeeds
- [ ] `evenhub pack` — succeeds
- [ ] G2: onboarding screen on first launch
- [ ] G2: loading screen during initial fetch
- [ ] G2: message list with NEW badges
- [ ] G2: empty state with hint when filter returns nothing
- [ ] G2: tap → detail, double-tap → back, double-tap Level 0 → exit
- [ ] Phone: SegmentedControl changes source, filters job dropdown
- [ ] Phone: pull-to-refresh triggers re-fetch with spinner
- [ ] Phone: server IP configurable, auto-detected
- [ ] Config survives repack (bridge.setLocalStorage)
- [ ] Polling pauses when app is backgrounded
- [ ] NEW badges clear after viewing list

---

## Risk & Tradeoffs (v3)

| Risk | Mitigation |
|------|-----------|
| Dashboard must be running on Mac | Phone UI shows clear error + "Start dashboard" instructions |
| Dashboard IP changes (DHCP) | Auto-detect via `window.location.hostname` in QR mode; manual input field |
| `bridge.setLocalStorage` API availability | Graceful fallback to `window.localStorage` for browser dev mode |
| CORS on dashboard API | Dashboard already serves CORS headers for WebView access |
| Dashboard plugin discovery | Plugin goes in `~/.hermes/plugins/`, auto-discovered on restart |
| Cron outputs can be huge | Cap at 5000 chars per message in API |
| Two crons writing concurrently | Lock file in fallback script; API path reads cron outputs read-only |

---

## Documentation & Repository Structure

The repo must be self-contained and ready for open-source publication. Every file a new user needs.

### Repository Layout

```
hermes-g2/
├── README.md                    # Project overview, badges, screenshots
├── SETUP.md                     # Step-by-step setup tutorial
├── ARCHITECTURE.md              # Technical architecture for contributors
├── CHANGELOG.md                 # Version history
├── LICENSE                      # MIT
├── .gitignore
├── index.html                   # Companion app entry point
├── app.json                     # Even Hub manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                  # Entry point, bridge init, orchestration
│   ├── types.ts                 # All TypeScript interfaces
│   ├── config.ts                # bridge.setLocalStorage config persistence
│   ├── data.ts                  # Dashboard API fetcher, polling, filtering
│   ├── inbox.ts                 # (deprecated — merged into data.ts)
│   ├── input.ts                 # G2 touch event handler
│   └── display/
│       └── index.ts             # G2 rendering functions
├── public/                      # Static assets (Vite copies to dist/)
│   └── (empty — no data.json, data comes from API)
├── dashboard-plugin/            # Hermes Dashboard plugin (Python)
│   ├── manifest.json
│   └── plugin_api.py
├── scripts/
│   └── update-inbox.sh          # Fallback: cron pipe → dashboard API
├── mockups/
│   ├── 01-message-list.png      # G2 screenshots (576×288)
│   ├── 02-message-detail.png
│   ├── 03-empty-state.png
│   ├── 04-source-changed.png
│   └── generate_mockups.py      # Script to regenerate mockups
├── QRcode/                      # Versioned QR codes for sideloading
│   └── v0.1.0.txt
└── store-assets/                # Even Hub store listing assets
    ├── icon.png                 # 512×512 app icon (monochrome)
    ├── background.png           # Store background
    ├── screenshots/             # G2 display mockups for store
    └── store-description.md     # Plain-text store description
```

### README.md

```markdown
# Hermes G2

**Your Hermes Agent, on your glasses.**

Hermes G2 brings [Hermes Agent](https://github.com/NousResearch/hermes-agent) notifications to your [Even Realities G2](https://evenrealities.com) smart glasses. Cron job outputs, session summaries, and direct messages — all readable on your glasses, controlled from your phone.

> ⚠️ Early preview. Works today. Expect rough edges.

## Features

- 📡 **Dashboard-powered** — reads directly from your Hermes instance (state.db, cron outputs)
- 📱 **Phone-controlled** — pick what to display (which cron job, which session) from the companion app
- 🕶️ **G2-native** — scrollable message list, tap-to-expand detail view, double-tap navigation
- 🎨 **Even OS 2.0 design** — follows official Even Realities companion app guidelines (FK Grotesk Neue, color tokens, settings pattern)
- 🌓 **System/Dark/Light theme** — respects your OS preference, switchable
- 🔌 **Offline-resilient** — graceful degradation when dashboard is down, data cached
- ● **NEW badges** — see which messages arrived since your last visit
- 🔒 **Zero telemetry** — all data stays on your local network

## Quick Start

### Prerequisites

- [Hermes Agent](https://hermes-agent.nousresearch.com) running on your Mac
- [Even Realities App](https://evenrealities.com/app) on your phone
- G2 glasses paired with your phone

### 1. Install the dashboard plugin

```bash
mkdir -p ~/.hermes/plugins/hermes-g2/dashboard
cp dashboard-plugin/manifest.json ~/.hermes/plugins/hermes-g2/dashboard/
cp dashboard-plugin/plugin_api.py ~/.hermes/plugins/hermes-g2/dashboard/
hermes dashboard restart
```

### 2. Build and sideload the app

```bash
npm install
npm run build
npx vite --host 0.0.0.0 --port 5174
# In another terminal:
evenhub qr --url "http://<YOUR_MAC_IP>:5174"
```

### 3. Scan and configure

1. Open Even Realities App → scan QR code
2. The companion app opens on your phone
3. Server IP is auto-detected (same as QR host)
4. Pick a source (Cron / Sessions) and a specific job
5. Messages appear on your phone and on your G2 glasses

## How It Works

```
Hermes cron → state.db / cron/output/
     ↓
Dashboard API (port 9119) /api/plugins/hermes-g2/inbox
     ↓
Companion WebView (fetch every 30s)
     ↓
G2 display (SDK bridge)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Screenshots

| Message List | Message Detail | Empty State |
|-------------|---------------|-------------|
| ![List](mockups/01-message-list.png) | ![Detail](mockups/02-message-detail.png) | ![Empty](mockups/03-empty-state.png) |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Dashboard not reachable" | Run `hermes dashboard` on your Mac |
| "Gateway offline" | Run `hermes gateway start` |
| G2 shows black screen | Kill Even Realities App, Vite server, restart both, rescan QR |
| Messages not updating | Tap "Refresh now" or wait 30s for next poll |
| Theme not changing | Check System/Dark/Light selector in Connection settings |

## Contributing

MIT licensed. PRs welcome. See [SETUP.md](SETUP.md) for development setup.

## Related

- [Hermes Agent](https://github.com/NousResearch/hermes-agent)
- [Even Realities G2 SDK](https://hub.evenrealities.com/docs)
- [even-toolkit](https://github.com/fabioglimb/even-toolkit)
```

### SETUP.md

```markdown
# Hermes G2 — Setup Guide

Step-by-step from zero to messages on your glasses.

## Requirements

- macOS (where Hermes runs)
- Node.js 20+ and npm
- Python 3.10+ (for the dashboard plugin)
- Even Realities G2 glasses + Even Realities App on iPhone/Android
- Hermes Agent installed (`curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`)

## Step 1: Install the dashboard plugin

The dashboard plugin exposes an API endpoint that the G2 app fetches from.

```bash
# Clone or copy the plugin files
cd hermes-g2
mkdir -p ~/.hermes/plugins/hermes-g2/dashboard
cp dashboard-plugin/manifest.json ~/.hermes/plugins/hermes-g2/dashboard/
cp dashboard-plugin/plugin_api.py ~/.hermes/plugins/hermes-g2/dashboard/

# Restart the dashboard (or start it if not running)
hermes dashboard restart
# or: hermes dashboard
```

Verify it works:
```bash
curl http://localhost:9119/api/plugins/hermes-g2/inbox | python3 -m json.tool
```

You should see `{"messages": [...], "sources": [...]}`.

### If you don't have cron jobs yet

Create a test cron job to generate data:
```bash
hermes cron create "0 */6 * * *" \
  --name "g2-test" \
  --prompt "Write a short status update about the current time and weather. Keep it under 200 characters."
```

## Step 2: Install npm dependencies

```bash
cd hermes-g2
npm install
```

## Step 3: Build the companion app

```bash
npm run build
# Output in dist/
```

Verify:
```bash
ls dist/
# Should show: index.html, assets/index.js
```

## Step 4: Start the dev server and sideload

```bash
# Start Vite dev server (binds to all interfaces)
npx vite --host 0.0.0.0 --port 5174

# Find your Mac's local IP
IP=$(ipconfig getifaddr en0 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "Your IP: $IP"

# Generate QR code
mkdir -p QRcode
evenhub qr --url "http://${IP}:5174" > QRcode/v0.1.0.txt
cat QRcode/v0.1.0.txt
```

## Step 5: Scan and test

1. Open the Even Realities App on your phone
2. Go to Even Hub → scan QR code (top-right scanner icon)
3. The companion app loads
4. On your phone: check the CONNECTION section shows "● Connected" (green dot)
5. Select a source: tap "Cron" in the SegmentedControl
6. Pick a job from the dropdown
7. Messages should appear in the list
8. On your G2 glasses: you should see the message list

### If the G2 doesn't show messages

1. Kill the Even Realities App (swipe up)
2. Kill the Vite dev server (Ctrl+C)
3. Restart both
4. Rescan the QR code
5. The phone WebView caches aggressively — this cleanup is sometimes needed

## Step 6: Package for production (.ehpk)

Once everything works via QR sideload:

```bash
# Bump version in app.json AND index.html (APP_VERSION constant)
npm run build
evenhub pack app.json dist/ -o hermes-g2.ehpk

# Set Finder comment for version tracking
osascript -e "tell application \"Finder\" to set comment of (POSIX file \"$(pwd)/hermes-g2.ehpk\" as alias) to \"Hermes G2 v0.1.0\""
```

The `.ehpk` can be installed via Even Hub. Note: the dashboard API must be reachable from the phone (same WiFi network).

## Development

```bash
# Type-check continuously
npx tsc --noEmit --watch

# Dev server with hot reload
npx vite --host 0.0.0.0 --port 5174

# Test the dashboard API
curl http://localhost:9119/api/plugins/hermes-g2/inbox | python3 -m json.tool | head -20
curl http://localhost:9119/api/plugins/hermes-g2/health

# Regenerate mockups
python3 mockups/generate_mockups.py
```

### Debugging the bridge

Open Safari on your Mac → Develop → [your iPhone] → inspect the WebView. Console logs from the companion app appear there.

## FAQ

**Q: Why does the app need my Mac's IP address?**
A: The G2 companion app runs on your phone but fetches data from the Hermes Dashboard running on your Mac. They need to be on the same WiFi network.

**Q: Can I use this without the dashboard?**
A: No. The dashboard API is the data source. It reads Hermes's state.db and cron outputs directly.

**Q: What if my Mac's IP changes (DHCP)?**
A: Set a static IP for your Mac in your router's DHCP reservation table. Or update the IP in the app's CONNECTION settings.

**Q: Does this work over the internet (away from home)?**
A: Not with the default setup. You'd need Tailscale or a VPN to reach your Mac's dashboard from outside your home network.
```

### ARCHITECTURE.md

```markdown
# Hermes G2 — Architecture

## Overview

Hermes G2 is a companion app for Even Realities G2 smart glasses that displays Hermes Agent notifications. It has three components:

1. **Dashboard Plugin** (Python/FastAPI) — runs inside Hermes Dashboard, reads state.db + cron outputs
2. **Companion WebView** (TypeScript/HTML/CSS) — runs on the phone inside the Even Realities App
3. **G2 Display** (TypeScript/Even Hub SDK) — runs on the glasses, renders text/list containers

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                       HERMES MAC                         │
│                                                          │
│  Hermes Agent (CLI/Gateway)                              │
│  ├── cron jobs → ~/.hermes/cron/output/<job_id>/         │
│  ├── sessions  → ~/.hermes/state.db (SQLite)             │
│  └── config    → ~/.hermes/cron/jobs.json                │
│                                                          │
│  Hermes Dashboard (FastAPI, port 9119)                   │
│  └── plugin: hermes-g2                                   │
│      ├── GET /api/plugins/hermes-g2/inbox                │
│      └── GET /api/plugins/hermes-g2/health               │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP (local WiFi, port 9119)
                       │
┌──────────────────────▼───────────────────────────────────┐
│                       PHONE                              │
│                                                          │
│  Even Realities App (WebView)                            │
│  └── hermes-g2/index.html                                │
│      ├── Phone UI: server config, source selection,      │
│      │             message preview, theme switcher        │
│      ├── Data layer: fetch inbox every 30s, filter       │
│      ├── Config: bridge.setLocalStorage()                │
│      └── Bridge: waitForEvenAppBridge()                  │
└──────────────────────┬───────────────────────────────────┘
                       │ Bluetooth LE (SDK bridge)
                       │
┌──────────────────────▼───────────────────────────────────┐
│                     G2 GLASSES                           │
│                                                          │
│  576×288 greyscale display                               │
│  ├── TextContainer (header, detail view)                 │
│  ├── ListContainer (message list, 20 items max)          │
│  └── Touch events: tap, double-tap, swipe                │
└──────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Why Dashboard API instead of a file?

The `.ehpk` package is a static zip. A `data.json` bundled at build time can never be updated. The dashboard API is always live — it reads the current state of Hermes directly.

### Why bridge.setLocalStorage instead of window.localStorage?

`window.localStorage` is wiped when `evenhub pack` builds the `.ehpk`. The SDK's `bridge.setLocalStorage()` survives repacks.

### Why 30-second polling instead of WebSockets?

The Even Realities WebView is a standard browser context. WebSockets would require the dashboard to maintain persistent connections for every companion app instance. HTTP polling is simpler, more robust, and the 30s interval is more than adequate for notification-style data.

### Why no conversation mode in Phase 1?

Phase 1 establishes the data pipeline (Hermes → API → companion → G2). Once that's solid, Phase 2 adds the reverse path (G2 input → companion → Hermes API → response → G2). Building the read path first avoids scope creep.

## Error Handling Strategy

See the [Error & Degradation States](#error--degradation-states) section of the implementation plan for the complete strategy. Summary:

- **Never clear the UI on error** — always fall back to cached data
- **Distinguish transient from permanent** — network errors auto-retry, config errors need user action
- **Show status prominently** — green/red/amber dots, explicit messages, actionable instructions
- **G2 stays calm** — don't show error details on the tiny display; redirect to phone

## Even OS 2.0 Compliance

The companion app follows the official [Even Realities Design Guidelines](https://hub.evenrealities.com/docs/guides/design-guidelines):

- Dark theme tokens from `even-toolkit/web/theme/tokens-dark.css`
- Typography scale: 8 predefined sizes (24/20/17/15/13/11px)
- Border radius: 6px everywhere
- Settings page pattern: `SettingsGroup` → `ListItem` rows
- SegmentedControl for 2-4 option selectors
- FK Grotesk Neue font family
- 12px page margins, 16px card padding, 24px section gaps

## File Map

| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `index.html` | Companion app shell + theme CSS + phone UI | ~200 |
| `src/main.ts` | Bridge init, polling orchestration, config sync | ~120 |
| `src/types.ts` | All TypeScript interfaces + i18n strings | ~80 |
| `src/config.ts` | bridge.setLocalStorage wrapper + theme resolver | ~90 |
| `src/data.ts` | Dashboard API fetch, filter, poll, visibility pause | ~100 |
| `src/input.ts` | G2 touch event handler | ~50 |
| `src/display/index.ts` | G2 rendering: list, detail, empty, loading, onboarding | ~200 |
| `dashboard-plugin/plugin_api.py` | FastAPI inbox + health endpoints | ~130 |
| `app.json` | Even Hub manifest | ~12 |
| **Total** | | **~982** |
```

### CHANGELOG.md

```markdown
v0.1.0 (2026-06-14)

  Added
  - Initial release
  - Dashboard API plugin: inbox + health endpoints
  - Companion app with Even OS 2.0 design guidelines compliance
  - G2 message list with tap-to-detail navigation
  - Source filtering: Cron / Sessions / Direct
  - SegmentedControl for Source, Select for Job and Theme
  - Theme switcher: System (default) / Dark / Light
  - Offline resilience: cached data, error states, health checks
  - NEW badges for unread messages
  - Background poll pause on visibility change
  - Pull-to-refresh on message list
```
```

### store-assets/store-description.md

```text
Hermes G2 brings your Hermes Agent notifications to your Even Realities G2 glasses.

Connect to your Hermes Dashboard and choose what to display: cron job outputs, session summaries, or direct messages. The companion app on your phone controls everything. Your glasses show a scrollable message list with tap-to-expand detail view.

Follows Even OS 2.0 design guidelines. Supports System, Dark, and Light themes.

Works entirely on your local network. No data ever leaves your WiFi. Zero telemetry.

Requirements: Hermes Agent running on a Mac on the same WiFi network as your phone.
```

---

---

## Tasks (v3)

### Task 13: Create repository structure and documentation

**Objective:** Set up the repo with README, SETUP, ARCHITECTURE, CHANGELOG, LICENSE, store assets, and .gitignore

**Files:**
- Create: `hermes-g2/README.md`
- Create: `hermes-g2/SETUP.md`
- Create: `hermes-g2/ARCHITECTURE.md`
- Create: `hermes-g2/CHANGELOG.md`
- Create: `hermes-g2/LICENSE` (MIT)
- Create: `hermes-g2/.gitignore`
- Create: `hermes-g2/store-assets/store-description.md`

**Step 1: Write all files** (content above)

**Step 2: Write .gitignore**
```
node_modules/
dist/
*.ehpk
.DS_Store
QRcode/*.txt
```

**Step 3: Initialize git + commit**
```bash
cd hermes-g2
git init
git add -A
git commit -m "feat: initial Hermes G2 — dashboard plugin, companion app, docs"
```

---

## Future: Phase 2 — Conversation Mode

Same as v2. The dashboard API would need a POST endpoint for sending messages to Hermes, or the companion app could use a different mechanism (direct Hermes CLI spawn, etc.).
