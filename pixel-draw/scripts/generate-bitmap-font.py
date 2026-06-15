#!/usr/bin/env python3
"""
Génère deux spritesheets G2 — blanc (score) et gris (noms d'équipe).
Rendu direct à la taille finale, pas de scaling.
"""

import json, os
from PIL import Image, ImageDraw, ImageFont
import numpy as np

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')
FONT_PATH = '/tmp/public-pixel.ttf'
FONT_URL = 'https://st.1001fonts.net/download/font/public-pixel.regular.ttf'

if not os.path.exists(FONT_PATH):
    import urllib.request
    urllib.request.urlretrieve(FONT_URL, FONT_PATH)

# ─── Rendu pixel-perfect : taille native, pas de scaling ────
# Pour que "FRA 3:1 NIR" remplisse bien 288px, on veut ~22-26px par glyphe
# Public Pixel à 24px native → glyphes propres, pas d'anti-aliasing si on utilise
# le bon mode de rendu

SIZE = 24
font = ImageFont.truetype(FONT_PATH, SIZE)

CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/ '
GAP = 2  # espace entre glyphes dans la spritesheet

# Niveaux de gris G2 (16 niveaux, 0-255 par pas de 17)
WHITE = 255       # niveau 15/15 — score
GREY  = 119       # niveau 7/15  — noms d'équipe (50% approx)

# ─── Mesure ─────────────────────────────────────────────────

glyph_h = 0
glyph_w = 0
for ch in CHARS:
    if ch == ' ': continue
    bbox = font.getbbox(ch)
    h = bbox[3] - bbox[1]
    w = bbox[2] - bbox[0]
    if h > glyph_h: glyph_h = h
    if w > glyph_w: glyph_w = w

glyph_h += 2  # marge
print(f'Police {SIZE}px → glyphe max {glyph_w}×{glyph_h}px')

# ─── Spritesheet ────────────────────────────────────────────

total_w = sum((font.getbbox(c)[2] - font.getbbox(c)[0] if c != ' ' else glyph_w) + GAP for c in CHARS)

def make_sheet(fill_value):
    """Rend la spritesheet au niveau de gris donné (0-255)."""
    sheet = Image.new('L', (int(total_w), int(glyph_h)), 0)
    draw = ImageDraw.Draw(sheet)
    meta = {'glyph_w': glyph_w, 'glyph_h': glyph_h, 'glyphs': {}}
    x = 0
    for ch in CHARS:
        bbox = font.getbbox(ch) if ch != ' ' else (0, 0, glyph_w, 0)
        w = bbox[2] - bbox[0] if ch != ' ' else glyph_w
        # Centrer verticalement
        y_off = (glyph_h - (bbox[3] - bbox[1])) // 2 - bbox[1]
        draw.text((x - bbox[0], y_off), ch, fill=fill_value, font=font)
        meta['glyphs'][ch] = {'x': x, 'w': w}
        x += w + GAP
    return sheet, meta

# Générer les deux versions
sheet_white, meta_white = make_sheet(WHITE)
sheet_grey,  meta_grey  = make_sheet(GREY)

# ─── Dithering 4-bit ────────────────────────────────────────

def dither_4bit(arr):
    h, w = arr.shape
    arr = arr.astype(float)
    levels = np.linspace(0, 255, 16)
    for y in range(h):
        for x in range(w):
            old = arr[y, x]
            idx = np.argmin(np.abs(levels - old))
            arr[y, x] = levels[idx]
            err = old - levels[idx]
            if x + 1 < w: arr[y, x + 1] += err * 7/16
            if y + 1 < h:
                if x > 0: arr[y + 1, x - 1] += err * 3/16
                arr[y + 1, x] += err * 5/16
                if x + 1 < w: arr[y + 1, x + 1] += err * 1/16
    return np.clip(arr, 0, 255).astype(np.uint8)

def to_rgb(arr):
    rgb = np.zeros((arr.shape[0], arr.shape[1], 3), dtype=np.uint8)
    rgb[:, :, 1] = arr
    return rgb

os.makedirs(OUTPUT_DIR, exist_ok=True)

for name, sheet, meta in [('white', sheet_white, meta_white), ('grey', sheet_grey, meta_grey)]:
    arr = dither_4bit(np.array(sheet))
    Image.fromarray(to_rgb(arr)).save(os.path.join(OUTPUT_DIR, f'bitmap-font-{name}.png'))
    with open(os.path.join(OUTPUT_DIR, f'bitmap-font-{name}.json'), 'w') as f:
        json.dump(meta, f)

print(f'→ {OUTPUT_DIR}/bitmap-font-white.png + .json')
print(f'→ {OUTPUT_DIR}/bitmap-font-grey.png  + .json')
print(f'  {total_w}×{glyph_h}px, {len(CHARS)} glyphes, rendu natif {SIZE}px')
