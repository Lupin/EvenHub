#!/usr/bin/env python3
"""Generate G2 display mockups for Even Hub store listing and distribution."""

from PIL import Image, ImageDraw, ImageFont
import os, json
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "store-assets")
W, H = 576, 288

# G2 color palette (4-bit greyscale green)
BG = (5, 12, 5)          # near-black with green tint
TEXT_PRIMARY = (120, 255, 120)    # bright green (~level 12)
TEXT_SECONDARY = (70, 170, 70)   # medium green (~level 8)
TEXT_DIM = (40, 100, 40)        # dim green (~level 4)
ACCENT = (180, 255, 180)         # brightest (~level 14)

# Fonts
FONT_REGULAR = "/Users/gael/Library/Fonts/Inter_24pt-Regular.ttf"
FONT_BOLD = "/Users/gael/Library/Fonts/Inter_24pt-Bold.ttf"
FONT_MEDIUM = "/Users/gael/Library/Fonts/Inter_24pt-Medium.ttf"
FONT_CJK = "/System/Library/Fonts/STHeiti Medium.ttc"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def draw_timeline(draw, y, status, start_time, bar_progress, end_time, font_status=None, font_time=None):
    """Draw the timeline bar at position y."""
    font_s = font_status or load_font(FONT_BOLD, 20)
    font_t = font_time or load_font(FONT_REGULAR, 18)
    
    # Status label
    draw.text((4, y), status, fill=TEXT_PRIMARY, font=font_s)
    
    # Start time
    start_x = 4 + draw.textlength(status, font=font_s) + 12
    draw.text((start_x, y + 2), start_time, fill=TEXT_DIM, font=font_t)
    
    # Progress bar (12 blocks, fullwidth)
    bar_x = start_x + draw.textlength(start_time, font=font_t) + 12
    bar_total = 12
    cursor = int(bar_progress * bar_total)
    
    # Use block characters
    FULL = '\u2588'   # █
    MARKER = '\u25A0'  # ■
    SHADE = '\u2592'   # ▒
    
    bar_str = FULL * cursor + MARKER + SHADE * max(0, bar_total - cursor - 1)
    draw.text((bar_x, y + 2), bar_str, fill=TEXT_PRIMARY, font=font_t)
    
    # End time
    end_x = bar_x + draw.textlength(bar_str, font=font_t) + 12
    draw.text((end_x, y + 2), end_time, fill=TEXT_DIM, font=font_t)

def draw_clock(draw, x, y, text, font=None):
    """Draw the clock with triangle marker."""
    f = font or load_font(FONT_REGULAR, 22)
    marker = '\u25B7'  # ▷
    draw.text((4, y), f"{marker} {text}", fill=TEXT_SECONDARY, font=f)

def draw_notification(draw, text, font=None):
    """Draw a centered notification message."""
    f = font or load_font(FONT_BOLD, 26)
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    draw.text((x, 120), text, fill=ACCENT, font=f)

def new_image():
    img = Image.new("RGB", (W, H), BG)
    return img, ImageDraw.Draw(img)

def save(img, name):
    path = os.path.join(OUTPUT_DIR, name)
    img.save(path, "PNG")
    print(f"  Saved: {name}")
    return path

# ═══════════════════════════════════════════════════════════════
# MOCKUPS
# ═══════════════════════════════════════════════════════════════

font_clock = load_font(FONT_REGULAR, 22)
font_status = load_font(FONT_BOLD, 20)
font_time = load_font(FONT_REGULAR, 18)
font_notif = load_font(FONT_BOLD, 26)
font_cjk = load_font(FONT_CJK, 20)
font_cjk_big = load_font(FONT_CJK, 26)

# 1. Timeline - 16:8 fasting (FR, 24h)
img, draw = new_image()
draw_clock(draw, 4, 54, "14:30", font_clock)
draw_timeline(draw, 150, "JEÛNE", "20:00", 0.42, "12:00", font_status, font_time)
save(img, "01-timeline-16-8-fasting-fr.png")

# 2. Timeline - 16:8 fasting (EN, 12h)
img, draw = new_image()
draw_clock(draw, 4, 54, "2:30PM", font_clock)
draw_timeline(draw, 150, "FAST", "8:00PM", 0.42, "12:00PM", font_status, font_time)
save(img, "02-timeline-16-8-fasting-en-12h.png")

# 3. Timeline - Eating window (FR)
img, draw = new_image()
draw_clock(draw, 4, 54, "13:15", font_clock)
draw_timeline(draw, 150, "REPAS", "12:00", 0.15, "20:00", font_status, font_time)
save(img, "03-timeline-eating-fr.png")

# 4. Timeline - OMAD fasting (FR)
img, draw = new_image()
draw_clock(draw, 4, 54, "08:30", font_clock)
draw_timeline(draw, 150, "JEÛNE", "19:00", 0.58, "18:00", font_status, font_time)
save(img, "04-timeline-omad-fr.png")

# 5. Timeline - 5:2 REST day
img, draw = new_image()
draw_clock(draw, 4, 54, "10:45", font_clock)
draw_timeline(draw, 150, "REPOS", "00:00", 0.45, "00:00", font_status, font_time)
save(img, "05-timeline-5-2-rest-fr.png")

# 6. Timeline - ADF fasting day
img, draw = new_image()
draw_clock(draw, 4, 54, "16:20", font_clock)
draw_timeline(draw, 150, "JEÛNE", "00:00", 0.68, "00:00", font_status, font_time)
save(img, "06-timeline-adf-fr.png")

# 7. Timeline - Notification "FASTING STARTED"
img, draw = new_image()
draw_notification(draw, "\u25B6 JEÛNE", font_notif)
save(img, "07-timeline-notification-fr.png")

# 8. Timeline - Notification "EATING WINDOW"
img, draw = new_image()
draw_notification(draw, "\u25B6 REPAS", font_notif)
save(img, "08-timeline-notification-eating-fr.png")

# 9. Timeline - Chinese (ZH)
img, draw = new_image()
draw_clock(draw, 4, 54, "14:30", font_clock)
draw_timeline(draw, 150, "断食", "20:00", 0.42, "12:00", font_cjk, font_time)
save(img, "09-timeline-zh.png")

# 10. Timeline - Japanese (JA)
img, draw = new_image()
draw_clock(draw, 4, 54, "14:30", font_clock)
draw_timeline(draw, 150, "断食", "20:00", 0.42, "12:00", font_cjk, font_time)
save(img, "10-timeline-ja.png")

# 11. Timeline - Spanish (ES)
img, draw = new_image()
draw_clock(draw, 4, 54, "14:30", font_clock)
draw_timeline(draw, 150, "AYUNO", "20:00", 0.42, "12:00", font_status, font_time)
save(img, "11-timeline-es.png")

# 12. Timeline - Portuguese (PT)
img, draw = new_image()
draw_clock(draw, 4, 54, "14:30", font_clock)
draw_timeline(draw, 150, "JEJUM", "20:00", 0.42, "12:00", font_status, font_time)
save(img, "12-timeline-pt.png")

# 13. Timeline - Full bar (fasting day, late evening)
img, draw = new_image()
draw_clock(draw, 4, 54, "22:50", font_clock)
draw_timeline(draw, 150, "JEÛNE", "20:00", 0.78, "12:00", font_status, font_time)
save(img, "13-timeline-late-fr.png")

# 14. Text mode mockup - JEÛNE with countdown
img, draw = new_image()
font_top = load_font(FONT_REGULAR, 16)
font_bottom = load_font(FONT_BOLD, 22)
# Top bar: preset name + time remaining
top = "16:8 — Leangains                                 ◐ 12h30m restant"
draw.text((4, 4), top, fill=TEXT_PRIMARY, font=font_top)
# Bottom bar: status
draw.text((4, 252), "JEÛNE", fill=TEXT_PRIMARY, font=font_bottom)
# Simulate image area (bottom-right)
draw.rectangle([288, 144, 576, 288], outline=TEXT_DIM, width=1)
draw.text((320, 200), "IMAGE", fill=TEXT_DIM, font=font_top)
save(img, "14-text-mode-fr.png")

# 15. Text mode - EATING (EN)
img, draw = new_image()
top = "16:8 — Leangains                                 ◐ 4h15m left"
draw.text((4, 4), top, fill=TEXT_PRIMARY, font=font_top)
draw.text((4, 252), "EATING", fill=TEXT_PRIMARY, font=font_bottom)
draw.rectangle([288, 144, 576, 288], outline=TEXT_DIM, width=1)
draw.text((320, 200), "IMAGE", fill=TEXT_DIM, font=font_top)
save(img, "15-text-mode-eating-en.png")

# 16. Text mode - REST DAY
img, draw = new_image()
top = "5:2 — Weekday                                     REST DAY"
draw.text((4, 4), top, fill=TEXT_PRIMARY, font=font_top)
draw.text((4, 252), "REPOS", fill=TEXT_PRIMARY, font=font_bottom)
draw.rectangle([288, 144, 576, 288], outline=TEXT_DIM, width=1)
draw.text((320, 200), "IMAGE", fill=TEXT_DIM, font=font_top)
save(img, "16-text-mode-rest-fr.png")

# 17. Companion app mockup (phone screen)
phone_w, phone_h = 390, 844
img_phone = Image.new("RGB", (phone_w, phone_h), (12, 10, 7))
draw_p = ImageDraw.Draw(img_phone)
font_header = load_font(FONT_BOLD, 13)
font_label = load_font(FONT_REGULAR, 11)
font_value = load_font(FONT_REGULAR, 15)
font_btn = load_font(FONT_MEDIUM, 15)

# Header
draw_p.text((12, 20), "Intermittent Fasting", fill=(138, 127, 114), font=font_header)

# Segmented control
draw_p.rounded_rectangle([12, 56, 378, 104], radius=6, fill=(44, 38, 32))
draw_p.rounded_rectangle([14, 58, 190, 102], radius=4, fill=(22, 19, 16))
draw_p.text((70, 70), "Text", fill=TEXT_PRIMARY, font=font_value)
draw_p.text((220, 70), "Timeline", fill=(138, 127, 114), font=font_value)

# Section: Fasting Type
draw_p.text((16, 130), "FASTING TYPE", fill=(138, 127, 114), font=font_label)

# Preset items
presets = ["16:8 — Leangains    ✓", "18:6 — Extended", "20:4 — Warrior", "OMAD — One Meal"]
y = 152
for i, p in enumerate(presets):
    bg_color = (44, 38, 32) if i == 0 else (22, 19, 16)
    draw_p.rounded_rectangle([12, y, 378, y + 52], radius=6, fill=bg_color)
    draw_p.rectangle([20, y + 14, 30, y + 24], fill=(100, 170, 100))  # dot
    draw_p.text((44, y + 8), p.replace("    ✓", ""), fill=TEXT_PRIMARY, font=font_value)
    if "✓" in p:
        draw_p.text((320, y + 8), "✓", fill=(120, 255, 120), font=font_value)
    y += 54

# Section: Settings
draw_p.text((16, y + 10), "SETTINGS", fill=(138, 127, 114), font=font_label)
y += 32

settings = [("Language", "Français"), ("Time Format", "24h"), ("Theme", "Dark")]
for label, value in settings:
    draw_p.rounded_rectangle([12, y, 378, y + 52], radius=6, fill=(22, 19, 16))
    draw_p.text((20, y + 10), label, fill=TEXT_PRIMARY, font=font_value)
    draw_p.text((310, y + 10), value + " ›", fill=(138, 127, 114), font=font_value)
    y += 54

# Buttons
y += 16
draw_p.rounded_rectangle([12, y, 190, y + 44], radius=6, outline=(58, 48, 38), width=1)
draw_p.text((65, y + 10), "Cancel", fill=(138, 127, 114), font=font_btn)
draw_p.rounded_rectangle([200, y, 378, y + 44], radius=6, fill=(255, 255, 255))
draw_p.text((265, y + 10), "Save", fill=(35, 35, 35), font=font_btn)

# Footer
draw_p.text((170, y + 70), "v1.0.4", fill=(92, 83, 71), font=font_label)

save(img_phone, "17-companion-app.png")

# 18. Hero shot — both timeline + notification side by side
img_hero = Image.new("RGB", (W * 2 + 20, H), BG)
draw_hero = ImageDraw.Draw(img_hero)

# Left: normal timeline
draw_clock(draw_hero, 4, 54, "20:01", font_clock)
draw_timeline(draw_hero, 150, "JEÛNE", "20:00", 0.05, "12:00", font_status, font_time)

# Right: notification (offset by W+20)
draw_notification_offset = lambda d, t, f: d.text((W + 20 + (W - d.textbbox((0,0), t, font=f)[2]) // 2, 120), t, fill=ACCENT, font=f)
# Actually simpler approach: just draw on the right half
right_draw = draw_hero  # same canvas
right_draw.text((W + 20 + 200, 120), "\u25B6 JEÛNE", fill=ACCENT, font=font_notif)

# Divider
draw_hero.line([(W + 10, 20), (W + 10, H - 20)], fill=TEXT_DIM, width=1)

save(img_hero, "18-hero-timeline-notification.png")

# 19. All 6 languages grid
img_lang = Image.new("RGB", (W * 2 + 12, H * 3 + 24), BG)
draw_lang = ImageDraw.Draw(img_lang)
langs = [
    ("EN", "FAST", "12:00PM", "8:00PM"),
    ("FR", "JEÛNE", "12:00", "20:00"),
    ("ES", "AYUNO", "12:00", "20:00"),
    ("ZH", "断食", "12:00", "20:00"),
    ("JA", "断食", "12:00", "20:00"),
    ("PT", "JEJUM", "12:00", "20:00"),
]
for i, (code, status, start, end) in enumerate(langs):
    col = i % 2
    row = i // 2
    ox = col * (W + 12)
    oy = row * (H + 12)
    font_s = font_cjk if code in ("ZH", "JA") else font_status
    draw_lang.rectangle([ox, oy, ox + W, oy + H], outline=TEXT_DIM, width=1)
    draw_lang.text((ox + 4, oy + 4), code, fill=TEXT_DIM, font=font_clock)
    draw_lang.text((ox + 4, oy + 130), status, fill=TEXT_PRIMARY, font=font_s)
    # Mini bar
    bar_x = ox + 4 + draw_lang.textlength(status, font=font_s) + 8
    bar_mini = "\u2588" * 5 + "\u25A0" + "\u2592" * 5
    draw_lang.text((bar_x, oy + 132), bar_mini, fill=TEXT_PRIMARY, font=font_time)
    draw_lang.text((ox + 4, oy + 132), start, fill=TEXT_DIM, font=font_time)
    end_x = bar_x + draw_lang.textlength(bar_mini, font=font_time) + 8
    draw_lang.text((end_x, oy + 132), end, fill=TEXT_DIM, font=font_time)

save(img_lang, "19-languages-grid.png")

print(f"\nDone! {len(os.listdir(OUTPUT_DIR))} files in {OUTPUT_DIR}")
