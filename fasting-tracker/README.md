# Intermittent Fasting — Even Hub Plugin for Even G2

Intermittent fasting tracker for Even Realities G2 smart glasses.
Two display modes, 7 presets, EN/FR i18n, companion app with dark/light/system theme.

## Display Modes

### Text Mode
Discreet upper-corners display with blinking separator (◐/◑ every 800ms).
Background image bottom-right. All labels follow language setting.

```
┌──────────────────────────────────────────────────────────────┐
│  16:8 — Leangains                        ◐ 3h20m restant    │
│                                                              │
│                          JEÛNE                               │
│                                              [img 288×144]   │
└──────────────────────────────────────────────────────────────┘
```

### Timeline Mode
Single-line Unicode progress bar (12 blocks █■▒) with status label, start/end times.
Clock blinks independently in separate container (no layout shift).

```
┌──────────────────────────────────────────────────────────────┐
│  ▷ 14:30                                                     │
│                                                              │
│  JEÛNE 20:00 ██████■▒▒▒▒▒ 12:00                             │
└──────────────────────────────────────────────────────────────┘
```

## Presets

| Preset | Schedule | Type |
|--------|----------|------|
| 14:10 — Doux | 20:00 → 10:00 | Window |
| 16:8 — Leangains | 20:00 → 12:00 | Window |
| 18:6 — Confirmé | 20:00 → 14:00 | Window |
| 20:4 — Warrior | 20:00 → 16:00 | Window |
| 23:1 — OMAD | 19:00 → 18:00 | Window |
| 5:2 — Hebdo | Tue + Thu | Full-day |
| ADF — Alterné | Every other day | Full-day |

## Companion App (Phone)

Built into `index.html` — no separate file. Design follows Even Realities design system
(even-toolkit tokens, FK Grotesk Neue, 6px radius, dark/light/system theme).

- **Preset selector** with segmented control (Text / Timeline)
- **Schedule** — start time picker (end derived from preset)
- **Settings** — Language (EN/FR), Time format (24h/AM-PM), Theme (Dark/Light/System)
- **Save / Cancel** with inline status feedback
- **Version footer** — always shows current build version

Settings persist in `localStorage`. Phone↔glasses sync via `storage` event + 2s polling.

## Architecture

```
src/
├── main.ts                  # Entry: bridge init, polling, blink loops
├── display/
│   ├── index.ts             # renderCurrentMode, rebuildCurrentMode, rebuildTextModeFull
│   ├── text-mode.ts          # buildTextPage: i18n labels, blink, image
│   └── timeline-mode.ts     # buildTimelinePage: Unicode bar, STATUS i18n
├── config.ts                # Presets, fasting state math
├── storage.ts               # localStorage read/write
├── types.ts                 # FastingConfig, FastingPreset types
└── i18n.ts                  # Translations (EN/FR)
index.html                   # Companion app + inline CSS/JS (theme, select, i18n)
app.json                     # Even Hub manifest
vite.config.ts               # Build config, static asset copy
```

## G2 Display Constraints

See [`docs/g2-display-reference.md`](docs/g2-display-reference.md) for exhaustive font/container analysis.

### Quick reference
- Canvas: **576×288 px**, 4-bit greyscale (16 shades)
- Max 4 image + 8 text containers per page; exactly 1 `isEventCapture: 1`
- `createStartUpPageContainer` for first render only; `rebuildPageContainer` for structure changes; `textContainerUpgrade` for flicker-free updates
- LVGL font is **proportional** (not monospaced) — ~40-47 ASCII chars/line
- Unicode blocks █■▒ are **fullwidth** (2 ASCII columns); limit bar to 12 blocks
- Only `DOUBLE_CLICK_EVENT` reliably reaches custom handlers
- ImageContainer requires **canvas-re-encoded PNG** (file PNGs rejected by SDK)
- Phone WebView caches aggressively — kill Even Realities app + rescan QR for fresh JS

## Development

```bash
npm install
npx vite --host 0.0.0.0 --port 5174         # Dev server
npx tsc --noEmit                            # Type check
```

### QR Sideloading (dev)

```bash
# Start dev server, then generate QR:
evenhub qr --url "http://<IP>:5174"
# Scan in Even Realities app main screen (NOT Terminal mode)
```

### Production Build

```bash
npx vite build                               # → dist/
evenhub pack app.json dist/ -o fasting-tracker.ehpk
evenhub deploy                               # Upload to Even Hub
```

## Relevant Skills (Hermes Agent)

- **`even-hub-dev`** — G2 SDK, container system, companion pattern, design tokens, pitfalls
- **`g2-image-converter`** — Convert images to G2 4-bit greyscale PNG
- **`even-hub-app-development`** — Build and submit plugin apps

Load with: `skill_view(name='even-hub-dev')`

## Deployment

| File | Size | Purpose |
|------|------|---------|
| `fasting-tracker.ehpk` | ~40 KB | Packaged plugin for Even Hub upload |
| `dist/` | — | Build output (gitignored) |
| `icon.png` | — | App icon |
| `chatgpt-image-g2.png` | 288×144 | Background image (4-bit greyscale, negative) |

## Session Handoff

When resuming work with Hermes Agent:

```
Continue work on /Users/gael/Documents/GitHub/EvenHub/fasting-tracker
Project: Intermittent Fasting — EvenHub plugin for G2 glasses
Current version: 1.0.4
Load skill: even-hub-dev
```

Key facts Hermes needs:
1. Repo: `/Users/gael/Documents/GitHub/EvenHub/fasting-tracker`
2. IP: `192.168.1.152`, port `5174`
3. No Homebrew — use npm/npx from system Node
4. evenhub CLI at `~/.hermes/node/bin/`
5. Kill Even Realities app + rescan QR for fresh JS (WebView cache)

## Tech Stack
- TypeScript + Vite
- `@evenrealities/even_hub_sdk`
- `evenhub-simulator` + `evenhub-cli` at `~/.hermes/node/bin/`
- `even-toolkit` design tokens (inlined in index.html)

## Version History

| Version | Changes |
|---------|---------|
| 1.0.4 | Select thème (Dark/Light/System), version footer, i18n corrigé mode texte, settings.html supprimé, renommé Intermittent Fasting |
| 1.0.3 | Companion app intégré dans index.html, image bas-droite, pipeline canvas re-encode |
| 1.0.2 | Timeline Unicode bar 12 blocs, 2 conteneurs, layout stable |
| 1.0.1 | Initial companion avec thème light/dark |
| 1.0.0 | Première version — mode texte + timeline ASCII |
