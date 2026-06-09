# Fasting Tracker — Even Hub Plugin for Even G2

Intermittent fasting tracker with two display modes and 7 fasting presets.

## Display Modes

### Text Mode
Discreet text in screen corners showing current status and time remaining.

```
┌──────────────────────────────────────────────────────────────┐
│  16:8 — Leangains                            5h 23m         │
│                                                              │
│                          FASTING                             │
└──────────────────────────────────────────────────────────────┘
```

### Timeline Mode
Single-line day progress bar with luminous cursor.

```
┌──────────────────────────────────────────────────────────────┐
│  20:00 ═══════════ ■ ───────────────────── 12:00   14:32    │
└──────────────────────────────────────────────────────────────┘
```

## Included Presets

| Preset | Schedule |
|--------|----------|
| 14:10 — Beginner | 20:00 → 10:00 |
| 16:8 — Leangains | 20:00 → 12:00 |
| 18:6 — Extended | 20:00 → 14:00 |
| 20:4 — Warrior Diet | 20:00 → 16:00 |
| 23:1 — OMAD | 19:00 → 18:00 |
| 5:2 — Weekday | Tue + Thu only |
| ADF — Alternate Day | Every other day |

## Configuration

Open `src/phone-config/settings.html` on your phone to configure:
- Language (English / French)
- Fasting type (preset selector)
- Custom fasting window
- Display mode (text / timeline)

## Development

```bash
npm install
npm run dev              # Start Vite dev server
npm run build            # TypeScript check + production build
npm run sim              # Launch EvenHub simulator
```

## Deployment

```bash
evenhub login
evenhub pack even-hub.json dist/
evenhub deploy
```

## Tech Stack

- TypeScript + Vite
- @evenrealities/even_hub_sdk
- evenhub-simulator + evenhub-cli
