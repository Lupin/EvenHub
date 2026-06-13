#!/usr/bin/env python3
"""
Generate big kanji images for Bad Parrot — render JP text at large size,
apply 4-bit Floyd-Steinberg dither, output to public/images/kanji/.
"""
import os, sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow not installed. Run: pip install Pillow", file=sys.stderr)
    sys.exit(1)

# ── Data (mirrors src/data.ts exactly) ──────────────────────
PHRASES = [
    # 0. Street
    ["ありがとう", "おいしい", "ごめん", "いいね", "まじ？", "行こう", "おつかれ", "すごい", "乾杯！", "またね"],
    # 1. Casual
    ["あざす", "うまっ！", "わりぃ", "それな", "マジで？", "行くぞ", "すげえ", "めっちゃいい", "超楽しい", "サボろう"],
    # 2. Gen Z
    ["あざまる", "ばりうま", "それガチ？", "やばい", "エモい", "あげぽよ", "鬼うま", "チルしよう", "神ってる", "ぱりぴ"],
    # 3. Kansai
    ["おおきに", "めっちゃええ", "なんでやねん", "しらんけど", "せやな", "ほんまに？", "あかん", "ぎょうさん"],
    # 4. Internet
    ["草", "ぴえん", "バズった", "ググって", "ミスった", "ワンチャン", "ディスるな", "それ草"],
    # 5. Roast
    ["ばか", "あほ", "うざい", "ださい", "キモい", "クソ", "ちくしょう", "うるさい", "ふざけんな", "しね"],
    # 6. WTF
    ["別腹", "猫舌", "三日坊主", "口寂しい", "ばたんきゅう", "空気読めない", "猫ばば", "バーコード人", "耳にたこ", "はなくそ", "パラサイト", "積ん読"],
]

OUT_DIR = Path("public/images/kanji")
IMG_W, IMG_H = 288, 144

# ── Font discovery ──────────────────────────────────────────
def find_jp_font() -> str:
    """Find a Japanese font on macOS. Returns path to .ttc/.ttf."""
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

# ── Dither (same algorithm as g2-convert.py) ─────────────────
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

# ── Text rendering ──────────────────────────────────────────
def compute_font_size(text: str, max_w: int, max_h: int, font_path: str) -> int:
    """Binary search for largest font size that fits text in max_w × max_h."""
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

def render_kanji(text: str, font_path: str) -> Image.Image:
    """Render JP text as white-on-black 288×144 image."""
    font_size = compute_font_size(text, IMG_W, IMG_H, font_path)
    font = ImageFont.truetype(font_path, font_size)
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    img = Image.new('L', (IMG_W, IMG_H), 0)
    draw = ImageDraw.Draw(img)
    x = (IMG_W - tw) // 2 - bbox[0]
    y = (IMG_H - th) // 2 - bbox[1]
    draw.text((x, y), text, fill=255, font=font)
    return img

# ── Main ─────────────────────────────────────────────────────
def main():
    font_path = find_jp_font()
    print(f"Font: {font_path}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    for cat_idx, phrases in enumerate(PHRASES):
        for phr_idx, text in enumerate(phrases):
            img = render_kanji(text, font_path)
            img = floyd_steinberg_4bit(img)
            out_path = OUT_DIR / f"{cat_idx}_{phr_idx}.png"
            img.save(out_path, "PNG")
            size_kb = out_path.stat().st_size / 1024
            print(f"  [{cat_idx}_{phr_idx}] {text} → {out_path} ({size_kb:.1f} KB)")
            total += 1
    print(f"\nDone: {total} images in {OUT_DIR}/")

if __name__ == "__main__":
    main()
