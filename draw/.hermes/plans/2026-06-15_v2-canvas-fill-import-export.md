# DRAW v2 — Plan (updated 2026-06-16)

> **Status:** Milestone 1 ✅ | Milestones 2-7 pending

---

## ✅ Milestone 1 — Zoom Edit Mode (v1.1.0) — COMPLETED

- Mini-map 28×7 interactive (touchstart → repositionne zone zoom)
- Zone zoom 7×7 (cellules 48px, glyphes 46px)
- Toggle Zoom edit intégré au layout (ligne Eraser/Clear)
- Layout compact : Grid / Columns+Rows dropdowns / Eraser+Clear+Zoom
- Glyphes dynamiques en Compact (cellSize − 4px)
- ✎ Edit dans la liste de la gallery
- "Paint pixel by pixel" hint
- iOS testé : mini-map fonctionnelle

### Leçons apprises (Milestone 1)
- `touch-action:none` sur body → retiré. Mis uniquement sur canvas en mode Compact.
- Mini-map : utiliser `touchstart` pas `click` pour iOS.
- `splitMode` guard dans les handlers de peinture — pas de dessin sur la mini-map.
- Éviter les wrappers DOM (`.canvas-scroll` → crash). Utiliser CSS overflow sur le parent existant.
- Les IIFE et les variables globales : les fonctions appelées depuis `onclick` doivent être sur `window`.
- Ne pas patcher le même fichier 30 fois — le CSS et JS finissent par se contredire. Préférer une réécriture propre d'un bloc.

---

## Pending Milestones

### Milestone 2 — Fill + Random Fill (v1.1.1)
- Bouton Fill : remplit toute la grille avec le glyphe sélectionné
- Bouton Random : remplit avec glyphes aléatoires du brush set courant
- **Risque:** 🟢 NUL

### Milestone 3 — .draw Export (v1.1.2)
- Export JSON via `navigator.share({files})` + fallback clipboard
- **Risque:** 🟢 FAIBLE

### Milestone 4 — .draw Import (v1.1.3)
- File picker → parse JSON → charger dans le canvas
- **Risque:** 🟢 FAIBLE

### Milestone 5 — G2 Preview + PNG/SVG Export (v1.2.0)
- Toggle G2 View (green on black, no grid)
- PNG export 576×288
- SVG export vectoriel
- **Risque:** 🟢 FAIBLE

### Milestone 6 — Image Import (v1.3.0)
- Photo → glyph art via brightness-to-density
- **Risque:** 🟡 MODÉRÉ (qualité variable)

### Milestone 7 — Share to Even Realities User (v1.3.1)
- .draw file via share sheet avec message d'instruction
- **Risque:** 🟡 MODÉRÉ
