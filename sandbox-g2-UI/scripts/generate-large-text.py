#!/usr/bin/env python3
"""
generate-large-text.py — Génère une image G2 4-bit avec du texte en grande police.

USAGE:
  python3 scripts/generate-large-text.py "42px" 42
  python3 scripts/generate-large-text.py "BONJOUR" 56

COMMENT LE G2 PEUT AFFICHER DES POLICES LARGES :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Le G2 a UNE seule police LVGL intégrée, d'environ 16px de haut.
Il n'y a PAS de `font-size` CSS, pas de `textSize` dans le SDK.

Pour afficher du texte plus grand que ~16px, la SEULE méthode est :
  1. Rendre le texte comme IMAGE avec Pillow (police système macOS)
  2. Appliquer un dithering Floyd-Steinberg 4-bit (16 nuances de vert)
  3. Pousser l'image via ImageContainerProperty + canvas re-encode

C'est exactement ce que fait l'interface dans g2UI.webp.
Le "42px" au centre n'est PAS du texte LVGL — c'est une image de 288×144px.

CONTRAINTES :
  - Image container : 20–288px large, 20–144px haut
  - Display : 576×288px, 4-bit greyscale (16 niveaux)
  - Max 4 images par page
  - Les images doivent passer par un canvas browser (pas de PNG fichier direct)
"""

import sys
import os
import argparse
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# ─── CONFIG ────────────────────────────────────────────────

IMG_W = 288   # largeur max image container G2
IMG_H = 144   # hauteur max image container G2

# ─── FLOYD-STEINBERG DITHER 4-BIT ──────────────────────────

def floyd_steinberg_4bit(img: Image.Image) -> Image.Image:
    """
    Applique un dithering Floyd-Steinberg à 4-bit (16 niveaux de vert).
    Travaille en espace RGB sur le canal vert uniquement (R=0, B=0).
    """
    arr = np.array(img.convert('L')).astype(float)  # 0–255
    h, w = arr.shape

    # 16 niveaux : 0, 17, 34, ..., 255
    levels = np.linspace(0, 255, 16)

    for y in range(h):
        for x in range(w):
            old = arr[y, x]
            # Trouver le niveau le plus proche
            idx = np.argmin(np.abs(levels - old))
            new_val = levels[idx]
            arr[y, x] = new_val
            err = old - new_val

            # Diffuser l'erreur
            if x + 1 < w:
                arr[y, x + 1] += err * 7 / 16
            if y + 1 < h:
                if x > 0:
                    arr[y + 1, x - 1] += err * 3 / 16
                arr[y + 1, x] += err * 5 / 16
                if x + 1 < w:
                    arr[y + 1, x + 1] += err * 1 / 16

    # Convertir en image RGB avec teinte verte G2
    # G2 green tint: R=0, G=L, B=0 (on garde le canal vert pur)
    result = np.zeros((h, w, 3), dtype=np.uint8)
    result[:, :, 1] = np.clip(arr, 0, 255).astype(np.uint8)  # canal vert uniquement
    # R et B restent à 0

    return Image.fromarray(result, 'RGB')


# ─── RENDU DU TEXTE ────────────────────────────────────────

def find_font(size: int) -> str:
    """
    Trouve une police système macOS adaptée.
    Priorité : SF Pro (macOS) > Helvetica > police par défaut.
    """
    candidates = [
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/SFNS.ttf',
        '/System/Library/Fonts/Supplemental/Helvetica.ttc',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/HelveticaNeue.ttc',
    ]
    for path in candidates:
        if os.path.exists(path):
            return path

    # Fallback : chercher avec mdfind
    import subprocess
    result = subprocess.run(
        ['mdfind', "kMDItemFSName == 'Helvetica.ttc'"],
        capture_output=True, text=True, timeout=5
    )
    lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
    if lines:
        return lines[0]

    # Dernier recours : police par défaut Pillow
    return 'default'


def render_text(text: str, font_size: int, font_path: str | None = None) -> Image.Image:
    """
    Rend du texte centré en blanc sur fond noir dans un canvas 288×144.
    Utilise une recherche binaire pour trouver la plus grande taille qui rentre.
    """
    if font_path is None:
        font_path = find_font(font_size)

    # Recherche binaire de la taille optimale
    lo, hi = 12, font_size
    best = lo
    best_font = None

    while lo <= hi:
        mid = (lo + hi) // 2
        try:
            if font_path == 'default':
                font = ImageFont.load_default()
            else:
                font = ImageFont.truetype(font_path, mid)
        except Exception:
            hi = mid - 1
            continue

        bbox = font.getbbox(text)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]

        # Marge de 12% pour être safe
        if tw <= IMG_W * 0.88 and th <= IMG_H * 0.85:
            best = mid
            best_font = font
            lo = mid + 1
        else:
            hi = mid - 1

    if best_font is None:
        best_font = ImageFont.load_default()

    # Créer l'image
    img = Image.new('L', (IMG_W, IMG_H), 0)  # fond noir
    draw = ImageDraw.Draw(img)

    bbox = best_font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    x = (IMG_W - tw) // 2 - bbox[0]
    y = (IMG_H - th) // 2 - bbox[1]

    draw.text((x, y), text, fill=255, font=best_font)

    return img


# ─── MAIN ──────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Génère une image G2 4-bit avec du texte en grande police'
    )
    parser.add_argument('text', nargs='?', default='42px',
                        help='Texte à afficher (défaut: "42px")')
    parser.add_argument('size', nargs='?', type=int, default=42,
                        help='Taille de police cible en px (défaut: 42)')
    parser.add_argument('-o', '--output', default=None,
                        help='Fichier de sortie (défaut: public/images/large-text.png)')
    parser.add_argument('--font', default=None,
                        help='Chemin vers une police .ttf/.ttc spécifique')

    args = parser.parse_args()

    # Déterminer la sortie
    if args.output:
        output_path = args.output
    else:
        # Sortie par défaut dans public/images/
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_dir = os.path.dirname(script_dir)
        public_dir = os.path.join(project_dir, 'public', 'images')
        os.makedirs(public_dir, exist_ok=True)
        output_path = os.path.join(public_dir, 'large-text.png')

    # Étape 1 : rendre le texte
    print(f"Rendu du texte '{args.text}' en police {args.size}px...")
    text_img = render_text(args.text, args.size, args.font)
    text_img.save('/tmp/g2ui_text_grey.png')

    # Étape 2 : dithering 4-bit
    print("Application du dithering Floyd-Steinberg 4-bit...")
    dithered = floyd_steinberg_4bit(text_img)

    # Étape 3 : sauvegarder
    dithered.save(output_path)
    file_size = os.path.getsize(output_path)

    print(f"\n✓ Image générée : {output_path}")
    print(f"  Dimensions : {IMG_W}×{IMG_H}px")
    print(f"  Taille : {file_size} octets")
    print(f"  Format : PNG RGB (canal vert uniquement)")
    print(f"\n  → Cette image sera servie par Vite à /images/large-text.png")
    print(f"  → Le script main.ts la pousse via canvas re-encode + updateImageRawData")


if __name__ == '__main__':
    main()
