# DRAW Changelog

## 0.2.4 — 2026-06-15
- Draw mode: Save button repositioned left of "Push to glasses" (renamed from "Push to G2")
- Consistent layout with Text mode

## 0.2.3 — 2026-06-15
- Version number displayed in footer ("by Gaël Abegg-Gauthey 2026 · v0.2.3")
- Canvas grid: glyphs now white on dark theme, black on light theme — maximum contrast

## 0.2.2 — 2026-06-15
- Gallery: "Display" button on each item — pushes drawing to glasses
- Glasses: swipe up (prev) / swipe down (next) to browse gallery drawings
- Glasses: drawing name + position displayed bottom-left on each frame

## 0.2.1 — 2026-06-15
- Initial feature-complete build after implementing the 6-task plan

### Features
- **Export All** — button in Gallery header. Uses `navigator.share()` with clipboard fallback and alert last-resort
- **Share per-drawing** — ↗ button on each gallery item. Same share mechanism as Export All
- **Browse on glasses** — tap cycles through saved drawings, double-tap exits. Shows name + position indicator ("Drawing 1  1/5")
- **Save in Text mode** — Save button stores text compositions in gallery alongside drawings. Named "Text 1", "Text 2", etc.
- **Prev/Next in gallery** — detail view with ◀ ▶ arrows, position counter ("3/12"), Share/Rename/Delete actions. Tap the drawing area to return to gallery list
- **Onboard screen** — random glyph pattern + "draw — start a new drawing on your phone" shown at startup
- **Theme support** — system/dark/light via Even OS 2.0 design tokens
- **11 brush sets** — Blocks, Triangles, Shapes, Box 1-5, Blocks 2-3, Mix
- **Footer** — "by Gaël Abegg-Gauthey 2026"
