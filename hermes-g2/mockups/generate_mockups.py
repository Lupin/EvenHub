#!/usr/bin/env python3
"""G2 Mockup Generator v2 — simulate G2 screens for Hermes G2 app.
Generates 576×288 PNG images with green-on-black 4-bit dither aesthetic.
"""

from PIL import Image, ImageDraw, ImageFont
import os, sys

W, H = 576, 288

# ── Floyd-Steinberg dither to 4-bit with green tint ──

def dither_4bit_green(img: Image.Image) -> Image.Image:
    """
    Floyd-Steinberg error diffusion dithering.
    Quantize each pixel to one of 16 green-tinted levels.
    Works directly in RGB space — no palette mode.
    """
    pixels = img.load()
    w, h = img.size
    
    # Work on a copy as float array
    import numpy as np
    arr = np.zeros((h, w, 3), dtype=np.float64)
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            arr[y, x, 0] = r
            arr[y, x, 1] = g
            arr[y, x, 2] = b
    
    # 16 green-tinted levels: each level L maps to RGB (L*0.15, L*0.85, L*0.15)
    # where L ∈ {0, 17, 34, ..., 255}
    LEVELS = [i * 17 for i in range(16)]
    
    for y in range(h):
        for x in range(w):
            r, g, b = arr[y, x]
            
            # Find the closest 4-bit green level based on luminance
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            lum = max(0, min(255, lum))
            
            # Quantize luminance to nearest 4-bit level
            idx = int(round(lum / 17))
            idx = max(0, min(15, idx))
            q_lum = LEVELS[idx]
            
            # Quantized RGB
            qr = int(q_lum * 0.20)
            qg = int(q_lum * 0.85)
            qb = int(q_lum * 0.20)
            
            # Error
            er = r - qr
            eg = g - qg
            eb = b - qb
            
            # Write quantized pixel
            arr[y, x, 0] = qr
            arr[y, x, 1] = qg
            arr[y, x, 2] = qb
            
            # Diffuse error (Floyd-Steinberg)
            if x + 1 < w:
                arr[y, x+1, 0] += er * 7/16
                arr[y, x+1, 1] += eg * 7/16
                arr[y, x+1, 2] += eb * 7/16
            if y + 1 < h:
                if x > 0:
                    arr[y+1, x-1, 0] += er * 3/16
                    arr[y+1, x-1, 1] += eg * 3/16
                    arr[y+1, x-1, 2] += eb * 3/16
                arr[y+1, x, 0] += er * 5/16
                arr[y+1, x, 1] += eg * 5/16
                arr[y+1, x, 2] += eb * 5/16
                if x + 1 < w:
                    arr[y+1, x+1, 0] += er * 1/16
                    arr[y+1, x+1, 1] += eg * 1/16
                    arr[y+1, x+1, 2] += eb * 1/16
    
    # Convert back to uint8 image
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGB')


# ── Fonts ──

def load_fonts():
    fonts = {}
    font_dir = "/System/Library/Fonts"
    
    candidates = {
        'title': [
            f"{font_dir}/Helvetica.ttc",
            f"{font_dir}/SFNS.ttf",
        ],
        'bold': [
            f"{font_dir}/Helvetica.ttc",
            f"{font_dir}/SFNS.ttf",
        ],
        'regular': [
            f"{font_dir}/Helvetica.ttc",
            f"{font_dir}/SFNS.ttf",
        ],
        'small': [
            f"{font_dir}/Helvetica.ttc",
            f"{font_dir}/SFNS.ttf",
        ],
        'tiny': [
            f"{font_dir}/Helvetica.ttc",
            f"{font_dir}/SFNS.ttf",
        ],
    }
    
    sizes = {'title': 24, 'bold': 19, 'regular': 17, 'small': 14, 'tiny': 12}
    
    for name, paths in candidates.items():
        loaded = False
        for p in paths:
            if os.path.exists(p):
                try:
                    fonts[name] = ImageFont.truetype(p, sizes[name])
                    loaded = True
                    break
                except Exception:
                    continue
        if not loaded:
            fonts[name] = ImageFont.load_default()
    
    return fonts


# ── Drawing helpers ──

def draw_rect(draw, xy, fill=None, outline=None, width=1):
    draw.rectangle(xy, fill=fill, outline=outline, width=width)

def draw_line(draw, xy, fill, width=1):
    draw.line(xy, fill=fill, width=width)


# ── SCREEN 1: Message List ──

def screen_message_list(fonts, output_path):
    img = Image.new('RGB', (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Header bar
    draw_rect(draw, (0, 0, W, 28), fill=(5, 22, 5))
    draw.text((8, 4), "Hermes · Cron · veille-akiya (4)", font=fonts['bold'], fill=(180, 245, 180))
    
    draw_line(draw, (0, 28, W, 28), fill=(0, 40, 0))
    
    messages = [
        ("14/06 09:00", "C", "🏠 3 nouvelles annonces — Kyoto, Kanazawa..."),
        ("13/06 21:00", "C", "🏠 2 annonces — Tokyo Setagaya, Nagano 4.8"),
        ("13/06 09:00", "C", "✈️ vols <700€ — Lyon→Tokyo, Geneve→Tokyo"),
        ("12/06 18:30", "S", "📋 Dashboard Plugin — 3 endpoints, 2 pages"),
    ]
    
    for i, (date, tag, text) in enumerate(messages):
        y = 33 + i * 33
        
        # Highlight first item
        if i == 0:
            draw_rect(draw, (2, y-2, W-4, y+30), fill=(10, 35, 10), outline=(15, 50, 15))
        
        draw.text((8, y+1), date, font=fonts['small'], fill=(100, 170, 100))
        
        tag_color = (160, 230, 160) if tag == "C" else (120, 200, 120)
        draw.text((86, y+1), f"[{tag}]", font=fonts['small'], fill=tag_color)
        
        title = text[:44] + '…' if len(text) > 44 else text
        draw.text((118, y+1), title, font=fonts['regular'], fill=(200, 250, 200))
    
    # Scrollbar
    draw_rect(draw, (W-4, 38, W-1, 140), fill=(10, 40, 10))
    draw_rect(draw, (W-4, 42, W-1, 55), fill=(20, 100, 20))
    
    # Bottom hint
    draw.text((8, H-18), "↕ scroll   tap detail   ⧉ exit", font=fonts['tiny'], fill=(60, 120, 60))
    
    result = dither_4bit_green(img)
    result.save(output_path)
    print(f"Saved: {output_path}")


# ── SCREEN 2: Message Detail ──

def screen_message_detail(fonts, output_path):
    img = Image.new('RGB', (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    draw_rect(draw, (0, 0, W, 28), fill=(5, 22, 5))
    draw.text((8, 4), "🏠 VEILLE AKIYA — 14 JUIN 2026", font=fonts['bold'], fill=(180, 245, 180))
    draw.text((W-100, 6), "Cron · 09:00", font=fonts['tiny'], fill=(100, 160, 100))
    draw_line(draw, (0, 28, W, 28), fill=(0, 40, 0))
    
    body = [
        "3 nouvelles annonces aujourd'hui.",
        "",
        "1. Maison traditionnelle",
        "   Kyoto, Shimogyo-ku",
        "   8,2M¥ (508k€) — 120m², 4DK",
        "",
        "2. Kominka rénovée",
        "   Kanazawa",
        "   5,5M¥ (341k€) — 90m², 3DK",
        "",
        "3. Akiya avec terrain",
        "   Shizuoka, Ito",
        "   3,2M¥ (198k€) — 80m², 2LDK",
        "   + 200m² terrain",
    ]
    
    y = 34
    for line in body:
        if y > H - 20:
            break
        is_indent = line.startswith("   ")
        font = fonts['small'] if is_indent else fonts['regular']
        fill = (180, 235, 180) if is_indent else (210, 250, 210)
        draw.text((10, y), line, font=font, fill=fill)
        y += 18
    
    draw.text((8, H-18), "⧉ back to list", font=fonts['tiny'], fill=(60, 120, 60))
    
    result = dither_4bit_green(img)
    result.save(output_path)
    print(f"Saved: {output_path}")


# ── SCREEN 3: Empty State ──

def screen_empty_state(fonts, output_path):
    img = Image.new('RGB', (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    draw.text((W//2 - 130, H//2 - 45), "No messages yet.", font=fonts['title'], fill=(140, 200, 140))
    draw.text((W//2 - 155, H//2 + 5), "Select a source on your phone.", font=fonts['regular'], fill=(100, 160, 100))
    
    draw.text((8, H-18), "⧉ exit", font=fonts['tiny'], fill=(60, 120, 60))
    
    result = dither_4bit_green(img)
    result.save(output_path)
    print(f"Saved: {output_path}")


# ── SCREEN 4: Source Changed ──

def screen_source_changed(fonts, output_path):
    img = Image.new('RGB', (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    draw_rect(draw, (0, 0, W, 28), fill=(5, 22, 5))
    draw.text((8, 4), "Hermes · Session · Dashboard Plugin (1)", font=fonts['bold'], fill=(180, 245, 180))
    draw_line(draw, (0, 28, W, 28), fill=(0, 40, 0))
    
    draw_rect(draw, (2, 30, W-4, 62), fill=(10, 35, 10), outline=(15, 50, 15))
    draw.text((8, 34), "12/06 18:30", font=fonts['small'], fill=(100, 170, 100))
    draw.text((86, 34), "[S]", font=fonts['small'], fill=(120, 200, 120))
    draw.text((118, 34), "📋 Dashboard Plugin", font=fonts['regular'], fill=(200, 250, 200))
    draw.text((124, 53), "3 API endpoints, 2 pages React", font=fonts['small'], fill=(160, 220, 160))
    
    draw.text((8, H-18), "↕ scroll   tap detail   ⧉ exit", font=fonts['tiny'], fill=(60, 120, 60))
    
    result = dither_4bit_green(img)
    result.save(output_path)
    print(f"Saved: {output_path}")


# ── MAIN ──

if __name__ == '__main__':
    OUTDIR = "/Users/gael/Documents/GitHub/EvenHub/hermes-g2/mockups"
    os.makedirs(OUTDIR, exist_ok=True)
    
    print("Loading fonts...")
    fonts = load_fonts()
    
    print("Generating mockups...")
    screen_message_list(fonts, os.path.join(OUTDIR, "01-message-list.png"))
    screen_message_detail(fonts, os.path.join(OUTDIR, "02-message-detail.png"))
    screen_empty_state(fonts, os.path.join(OUTDIR, "03-empty-state.png"))
    screen_source_changed(fonts, os.path.join(OUTDIR, "04-source-changed.png"))
    
    print(f"\nDone! Open: {OUTDIR}/")
