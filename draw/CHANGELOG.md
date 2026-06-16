# DRAW Changelog

## 1.1.3 — 2026-06-16
### Fix
- Simplified persistent storage: `main.ts` intercepts `localStorage.setItem` and mirrors to bridge
- Bridge restores drawings into localStorage on startup
- `index.html` uses standard localStorage — no bridge-aware code needed
- Vasarely seeded correctly on first launch

## 1.1.2 — 2026-06-16
### Fix
- Persistent storage via `bridge.setLocalStorage` — gallery survives `.ehpk` repacks
- Bridge-backed cache with localStorage fallback for browser/simulator
- Debounced saves (500ms) to avoid flooding the bridge
- Flush on `beforeunload` to save before app close
- Vasarely seeded only when storage is truly empty

## 1.1.1 — 2026-06-16
### Fix
- iOS: mini-map touch responsiveness — `touchstart` instead of `click`
- `touch-action` rules cleaned up — body no longer blocks canvas interactions
- Paint handlers guarded by `splitMode` to prevent drawing on mini-map

## 1.1.0 — 2026-06-15

### Zoom Edit Mode
- Precision drawing with mini-map (28×7 overview) + 7×7 zoomed grid
- Tap mini-map to reposition zoom area
- Large cells (48px) with 46px glyphs for comfortable painting
- "Paint pixel by pixel" hint above mini-map
- Brush set glyph row at bottom for tool switching without leaving Zoom
- Exit Zoom to push or save

### UI Improvements
- Columns and Rows dropdown selectors replace +/- buttons
- Grid / Columns+Rows / Eraser+Clear+Zoom toggle on compact single row
- Dynamic glyph sizing in Compact mode (cell size − 4px)
- Zoom edit toggle remains visible in Zoom mode
- Help page rewritten with all features documented

### Gallery
- ✎ Edit button loads drawing back to canvas for editing
- Reload sample link when gallery is empty

### Brush Sets
- 17 total: Blocks, Triangles, Shapes, Box 1-5, Blocks 2-3, Mix, Alphabet, Numbers, Symbols, Arrows, Hangul, Katakana

---

## 1.0.0 — 2026-06-15

### Core
- Draw mode: 28×7 resizable grid, 17 brush sets, Eraser, Clear, Save, Push to glasses
- Text mode: 4-character 5×5 block letters, Random toggle, Save with text as title
- Gallery: Display, Share, Rename, Delete, Export All, reload sample
- Glasses: swipe → gallery mode, tap → next, double-tap → return to content, double-tap again → exit
- Onboard screen: random glyph pattern with DRAW logo in medium grey blocks
- Theme support: System/Dark/Light via Even OS design tokens
- I♥ Vasarely default drawing, deletable, reloadable
- Help page (? button) with full tutorial
- Footer: "by Gaël Abegg-Gauthey 2026 · v1.0.0"
- Buy me a coffee link (buymeacoffee.com/gaelag)

### Brush Sets (original 11)
- Blocks, Triangles, Shapes, Box 1-5, Blocks 2-3, Mix
