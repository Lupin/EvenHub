#!/usr/bin/env python3
"""
Generate category thumbnail images for Bad Parrot Level 0.
Renders each category name as a large title card + representative kanji,
output to public/images/category/.
"""
import os, sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow not installed. Run: pip install Pillow", file=sys.stderr)
    sys.exit(1)

# ── Data: category names + representative kanji ──────────────
CATEGORIES = [
    ("Street",    "街"),
    ("Casual",    "気軽"),
    ("Gen Z",     "Z世代"),
    ("Kansai",    "関西"),
    ("Internet",  "界隈"),
    ("Roast",     "罵倒"),
    ("WTF",       "何だ"),
    ("All Categories", "全部"),
]

OUT_DIR = Path("public/images/category")
IMG_W, IMG_H = 276, 144

# ── Font discovery ──────────────────────────────────────────
def find_jp_font() -> str:
    candidates = [
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/System/Library/Fonts/Supplemental/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/Supplemental/ヒラギノ角ゴシック W3.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    import subprocess
    try:
        result = subprocess.run(
            ["mdfind", "kMDItemFSName == 'ヒラギノ角ゴ*' && kMDItemContentType == 'public.truetype-font'"],
            capture_output=True, text=True, timeout=5
        )
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        if lines:
            return lines[0]
    except Exception:
        pass
    raise FileNotFoundError("No Japanese font found. Install Hiragino Sans.")

# ── Dither (same algorithm as generate-kanji-images.py) ─────
def floyd_steinberg_4bit(img: Image.Image) -> Image.Image:
    if img.mode != 'L':
        img = img.convert('L')
    width, height = img.size
    pixels = list(img.getdata())
    total = width * height
    levels = [int(i * 255 / 15) for i in range(16)]
    for idx in range(total):
        old = pixels[idx]
        new_val = min(levels, key=lambda l: abs(l - old))
        pixels[idx] = new_val
        err = old - new_val
        x = idx % width
        y = idx // width
        if x + 1 < width:
            pixels[idx + 1] += int(err * 7 / 16)
        if y + 1 < height:
            if x - 1 >= 0:
                pixels[idx + width - 1] += int(err * 3 / 16)
            pixels[idx + width] += int(err * 5 / 16)
            if x + 1 < width:
                pixels[idx + width + 1] += int(err * 1 / 16)
    result = Image.new('L', (width, height))
    result.putdata(pixels)
    return result

# ── Thumbnail rendering ──────────────────────────────────────
def compute_font_size(text: str, max_w: int, max_h: int, font_path: str) -> int:
    lo, hi = 12, 120
    best = lo
    while lo <= hi:
        mid = (lo + hi) // 2
        try:
            font = ImageFont.truetype(font_path, mid)
        except Exception:
            hi = mid - 1
            continue
        bbox = font.getbbox(text)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        if tw <= max_w * 0.88 and th <= max_h * 0.85:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best

def render_thumbnail(en_name: str, jp_glyph: str, font_path: str) -> Image.Image:
    """Render a dual-layer thumbnail: large JP glyph top, English name bottom."""
    img = Image.new('L', (IMG_W, IMG_H), 0)
    draw = ImageDraw.Draw(img)

    # Large JP glyph in upper part
    jp_size = compute_font_size(jp_glyph, IMG_W, int(IMG_H * 0.65), font_path)
    jp_font = ImageFont.truetype(font_path, jp_size)
    bbox = jp_font.getbbox(jp_glyph)
    jp_w = bbox[2] - bbox[0]
    jp_h = bbox[3] - bbox[1]
    jp_x = (IMG_W - jp_w) // 2 - bbox[0]
    jp_y = 10 - bbox[1]
    draw.text((jp_x, jp_y), jp_glyph, fill=200, font=jp_font)

    # English name below, smaller
    en_size = compute_font_size(en_name, IMG_W, 40, font_path)
    en_size = min(en_size, 28)  # cap at 28pt
    en_font = ImageFont.truetype(font_path, en_size)
    bbox2 = en_font.getbbox(en_name)
    en_w = bbox2[2] - bbox2[0]
    en_h = bbox2[3] - bbox2[1]
    en_x = (IMG_W - en_w) // 2 - bbox2[0]
    en_y = IMG_H - en_h - 8 - bbox2[1]
    draw.text((en_x, en_y), en_name, fill=180, font=en_font)

    return img

def render_all_categories(font_path: str) -> Image.Image:
    """Special thumbnail for 'All categories': show '全部' big."""
    img = Image.new('L', (IMG_W, IMG_H), 0)
    draw = ImageDraw.Draw(img)

    # "全部" big
    jp_size = compute_font_size("全部", IMG_W, int(IMG_H * 0.65), font_path)
    jp_font = ImageFont.truetype(font_path, jp_size)
    bbox = jp_font.getbbox("全部")
    jp_w = bbox[2] - bbox[0]
    jp_h = bbox[3] - bbox[1]
    jp_x = (IMG_W - jp_w) // 2 - bbox[0]
    jp_y = 10 - bbox[1]
    draw.text((jp_x, jp_y), "全部", fill=200, font=jp_font)

    # "All Categories" below
    en_font = ImageFont.truetype(font_path, 16)
    bbox2 = en_font.getbbox("All Categories")
    en_w = bbox2[2] - bbox2[0]
    en_h = bbox2[3] - bbox2[1]
    en_x = (IMG_W - en_w) // 2 - bbox2[0]
    en_y = IMG_H - en_h - 8 - bbox2[1]
    draw.text((en_x, en_y), "All Categories", fill=180, font=en_font)

    return img

# ── Main ─────────────────────────────────────────────────────
def main():
    font_path = find_jp_font()
    print(f"Font: {font_path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Category thumbnails (indices 0-6)
    for cat_idx, (en_name, jp_glyph) in enumerate(CATEGORIES[:7]):
        img = render_thumbnail(en_name, jp_glyph, font_path)
        img = floyd_steinberg_4bit(img)
        out_path = OUT_DIR / f"{cat_idx}.png"
        img.save(out_path, "PNG")
        size_kb = out_path.stat().st_size / 1024
        print(f"  [{cat_idx}] {en_name} → {out_path} ({size_kb:.1f} KB)")

    # "All categories" thumbnail (index 7)
    img = render_all_categories(font_path)
    img = floyd_steinberg_4bit(img)
    out_path = OUT_DIR / "7.png"
    img.save(out_path, "PNG")
    size_kb = out_path.stat().st_size / 1024
    print(f"  [7] All Categories → {out_path} ({size_kb:.1f} KB)")

    print(f"\nDone: {len(CATEGORIES)} thumbnails in {OUT_DIR}/")

if __name__ == "__main__":
    main()
