# Visual Assets Plan — Intermittent Fasting Campaign

## Directory Structure

```
social Networks/
├── campaign-plan.md          ← overall strategy
├── instagram.md              ← IG posts copy
├── x-twitter.md              ← X posts copy
├── discord.md                ← Discord announcements
├── assets/                   ← generated visuals
│   ├── hero-1200x630.png     ← link preview (OG image)
│   ├── ig-carousel-modes/    ← IG carousel: display modes
│   ├── ig-carousel-why/      ← IG carousel: why glasses
│   ├── x-header-1500x500.png ← X profile header
│   └── discord-embed.png     ← Discord rich embed
├── Screenshot *.png          ← raw screenshots (source material)
└── assets-plan.md            ← this file
```

## Assets to Generate

### 1. Hero Image (1200×630)
**Use:** Open Graph / link preview for store listing, X cards, Discord embeds
**Content:** G2 glasses mockup with timeline display visible + "Intermittent Fasting" title overlay
**Style:** Dark background (#0c0a07), green accent (#4ADE80), FK Grotesk Neue font

### 2. Instagram Carousel — Display Modes (3× 1080×1080)
- Slide 1: Text mode on glasses + label "TEXT MODE — Clean corners"
- Slide 2: Timeline mode on glasses + label "TIMELINE MODE — Full progress bar"
- Slide 3: Companion app UI + label "COMPANION — Settings & theme"

### 3. Instagram Carousel — Why Glasses? (2× 1080×1080)
- Slide 1: Phone with fasting app (dimmed, crossed out) vs G2 glasses (bright, glowing)
- Slide 2: "Your fast, always in sight" + feature bullets + QR code

### 4. X Profile Header (1500×500)
**Content:** Timeline display spanning across banner + "Intermittent Fasting for G2" + green accent line
**Style:** Dark, minimal, matching Even Realities aesthetic

### 5. Story Templates (1080×1920)
- "Now Live on Even Hub" with store link QR
- "Behind the Build" with code aesthetic
- "Your Setup" — UGC template frame

## Source Materials (already available)

From `../store-assets/`:
- G2 display mockups in various languages (glasses_20260610*.png)
- Companion app screenshots

From `social Networks/`:
- 4 raw screenshots of companion app (dark mode)

## Generation Method

Use Python PIL (like `../scripts/gen-mockups.py`) to compose:
1. Base G2 display mockup (576×288 green-on-black)
2. Overlay on device/frame background
3. Text overlays with FK Grotesk Neue
4. Export at target resolutions

Run: `python3 scripts/gen-social-assets.py` (to be created)
