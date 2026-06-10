# Rapport d'analyse — even-g2-notes

Analyse exhaustive du repo https://github.com/nickustinov/even-g2-notes (commit e71a14d).
11 fichiers lus : display.md, input-events.md, device-apis.md, ui-patterns.md, page-lifecycle.md, error-codes.md, architecture.md, browser-ui.md, simulator.md, packaging.md, README.md.

---

## 1. Inventaire complet des glyphes G2

### ASCII / Latin-1
Complet sauf 5 caractères absents : ¨ ¯ ´ µ ¸

### Flèches
12 disponibles sur 100+ : ←↑→↓↔↕↖↗↘↙⇒⇔

### Box Drawing (60+ caractères)
Lignes simples et épaisses, coins, jonctions, croix, coins arrondis disponibles.
**Pas de doubles-lignes complètes, pas de pointillés.**

### Block Elements
18 présents : ▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▒▔▕
4 absents confirmés : ▀▐░▓
Tous les quadrants absents.

### Geometric Shapes
31 disponibles : ■□▲△▶▷▼▽◀◁◆◇○● etc.

### Misc Symbols
13 disponibles : ★☆☎☏♠♡♣♤♥♧ etc.

### Typographie / Super-subscripts / Fractions
©®™†※°∞ + ⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ + ¼½⅛

### ABSENTS
Dingbats, Emoji, météo (☀☁☂☃), ❄, 💧

---

## 2. Métriques de fonte

- **Fonte LVGL proportionnelle** — PAS monospaced
- ASCII a des largeurs variables (ex: `W` plus large que `i`)
- Caractères fullwidth (CJK, block elements) = 2 colonnes ASCII
- **Workaround monospace** : fullwidth alphanumériques (Ａ-Ｚ, ａ-ｚ, ０-９) via conversion `charCode + 0xFEE0`
- Capacité : ~400-500 caractères en plein écran

---

## 3. Modèle de rendu des containers textuels

- Canvas 576×288, micro-LED vert, conversion 4-bit greyscale (16 niveaux)
- **Containers CREUX** (pas de fill/background) — confirmé
- Bordures seules décoration visuelle (borderWidth 0-5, borderColor 0-16, borderRadius 0-10, paddingLength 0-32)
- Texte left-aligned, top-aligned uniquement
- Word-wrap automatique
- Scroll interne firmware si overflow + isEventCapture
- **Piège** : `\n` final crée une ligne vide → scrollbar parasite

---

## 4. Limites TextContainerProperty

| API | Content max |
|-----|-------------|
| createStartUpPageContainer | 1000 |
| rebuildPageContainer | 1000 |
| textContainerUpgrade | 2000 |

- `textContainerUpgrade` = flicker-free (recommandé pour updates fréquentes)
- `rebuildPageContainer` = flicker visible
- Pas d'API pour get/set scroll position

---

## 5. Quirks / Bugs / Workarounds (14 documentés)

1. **CLICK_EVENT=0 → undefined** — toujours checker `=== undefined`
2. **currentSelectItemIndex manquant pour index 0**
3. **Bridge stale en ehpk** — toujours obtenir référence fraîche, toujours await
4. **localStorage navigateur effacé en ehpk** → utiliser bridge.setLocalStorage/getLocalStorage
5. **Simulateur bridé** : max 4 containers, images max 200×100
6. Hardware réel : 12 containers, images 288×144
7. **Double-tap racine = exit obligatoire** pour soumission Even Hub
8. Pas d'imgEvent dans les types SDK
9. Pas d'envois concurrents d'images
10. Pas d'image au startup
11. Tiling si taille d'image incorrecte
12. Scrollbar parasite si `\n` final dans le content
13. Fonte proportionnelle → alignement colonnes impossible en ASCII natif
14. Block elements = fullwidth → overflow sur barres de progression

---

## 6. Patterns de layout éprouvés

- **Faux boutons** : curseur `>` comme indicateur
- **Surbrillance** : toggle borderWidth on/off
- **Multi-slots texte** : simule une liste sans scroll-takeover
- **Barres de progression Unicode** : ━/─ ou █▇▆▅▄▃▂▁ (dégradé)
- **Event capture pour apps image** : container texte plein écran derrière l'image
- **Pagination manuelle** : ~400-500 chars/page

---

## 7. Événements tactiles

7 types : CLICK(0), SCROLL_TOP(1), SCROLL_BOTTOM(2), DOUBLE_CLICK(3), FOREGROUND_ENTER(4), FOREGROUND_EXIT(5), ABNORMAL_EXIT(6)

Sources : bague R1 (BLE séparé), temple tips.
Routage différent selon type de container capturant (listEvent vs textEvent).
Listes : firmware gère le scroll natif, pas de mise à jour in-place.

---

## 8. Batterie / Performance

- `batteryLevel` 0-100%, `isCharging`, `isInCase`, monitoring temps réel
- **Pas de limite documentée de rebuilds/minute** — mais flicker à chaque rebuild
- `textContainerUpgrade` recommandé pour updates fréquentes (flicker-free)
- Limiter les updates d'image (mémoire limitée, conversion 4-bit coûteuse)

---

*Rapport généré par agent Hermes — analyse du repo even-g2-notes — juin 2026*
