# EvenHub Toolbox

Boîte à outils pour le développement d'applications Even Realities G2.

**Emplacement** : `/Users/gael/Documents/GitHub/EvenHub/toolbox/`

---

## Outils disponibles

### `scripts/g2-convert` — Convertisseur d'images G2

Exécutable macOS autonome. Convertit n'importe quelle image pour l'écran G2 (576×288, 4-bit greyscale, 16 nuances de vert).

**Usage :**
```bash
# Terminal
./toolbox/scripts/g2-convert photo.jpg output.png
./toolbox/scripts/g2-convert image.png g2-ready.png --width 200 --height 100 --crop --contrast 1.5

# Glisser-déposer : drop l'image sur l'icône g2-convert dans le Finder
```

**Options :**
| Flag | Défaut | Description |
|------|--------|-------------|
| `--width N` | 288 | Largeur cible (20–288 px) |
| `--height N` | 144 | Hauteur cible (20–144 px) |
| `--contrast F` | 1.0 | Multiplicateur de contraste (1.5 = modéré, 2.0 = agressif) |
| `--crop` | off | Crop au ratio exact (par défaut : letterbox) |
| `--grey-only` | off | Pas de dithering (reste en 8-bit) |

**Pipeline complet :** `g2-convert` → PNG optimisé → **canvas re-encode dans le navigateur** → `bridge.updateImageRawData()`. Le canvas re-encode est obligatoire pour le SDK G2.

**Premier lancement** : crée automatiquement un venv Python (`~/.even-toolbox/venv`) et installe Pillow.

---

## Structure du projet

```
toolbox/
├── README.md                ← ce fichier
├── skills-overview.md       ← catalogue des skills Even Reality
└── scripts/
    ├── g2-convert           ← exécutable macOS (wrapper bash + venv auto)
    └── g2-convert.py        ← script Python standalone
```

---

## Skills associés

Tous les skills Hermes liés au développement Even Realities sont documentés dans `skills-overview.md`. En résumé :

| Skill | Description |
|-------|-------------|
| `even-hub-dev` | Développement complet : SDK, containers, packaging, design tokens, pitfalls |
| `g2-image-converter` | Conversion d'images G2 : resize, dithering, pipeline canvas |
| `even-hub-app-development` | Soumission d'apps sur le store Even Hub |

Pour charger un skill dans Hermes : `skill_view("even-hub-dev")`

---

## À venir

Idées d'outils futurs pour cette toolbox :

- [ ] Générateur de mockups G2 (glasses display screenshots programmatiques)
- [ ] Validateur de `app.json` (vérifie les contraintes du manifest)
- [ ] Analyseur de glyphs G2 (teste quels caractères Unicode rendent sur l'écran)
- [ ] Simulateur de layout (estime si une ligne tient dans les ~47 colonnes)
- [ ] Packager one-shot (`bump version → vite build → evenhub pack → qr → save`)
- [ ] Template de projet (scaffold d'un nouveau plugin Even Hub)
