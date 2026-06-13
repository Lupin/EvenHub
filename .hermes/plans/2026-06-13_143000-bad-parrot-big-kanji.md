# Bad Parrot — Big Kanji View Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a "big kanji" section where each Japanese phrase is displayed as a large pre-generated image (288×144, 4-bit greyscale) with pronunciation and translation text below — accessible as a new Level 3 from the current detail view.

**Architecture:** Build-time Python script renders each phrase's JP text as a 288×144 image using Pillow + Hiragino fonts, applies Floyd-Steinberg 4-bit dither (reusing the existing g2-convert pipeline), and outputs PNGs to `public/images/kanji/`. At runtime on G2, a new `renderBigKanji()` display function lays out 2 containers: an `ImageContainerProperty` (288×144, centered at top) + a `TextContainerProperty` (pronunciation + translation below). Level 3 navigation: swipe up/down = prev/next phrase, double-tap = back to Level 2.

**Tech Stack:** TypeScript, Even Hub SDK 0.0.10, Python 3 + Pillow, macOS Hiragino fonts, Vite

---

## Context / Assumptions

- Bad Parrot is a G2 phrasebook app at `/Users/gael/Documents/GitHub/EvenHub/bad parrot/`
- Currently 3 navigation levels: 0 (categories) → 1 (phrase list) → 2 (detail: JP text + pronunciation + English)
- Data is static, embedded in `src/data.ts` (7 categories × 8-12 phrases = ~75 phrases)
- G2 image constraints: 20–288w × 20–144h, max 4 per page, canvas re-encode mandatory
- Existing toolchain: `g2-convert.py` at `/Users/gael/Documents/GitHub/EvenHub/toolbox/scripts/g2-convert.py` (Pillow-based 4-bit dither)
- The user wants kanji as large as possible — text rendering can't scale beyond the built-in LVGL font, so images are the only path

---

## Proposed Approach

### Image generation (build-time, Python)
1. Render each `phrase.jp` string at large adaptive font size onto a 288×144 white-on-black canvas
2. Apply Floyd-Steinberg 4-bit dither using the same algorithm as `g2-convert.py`
3. Save to `public/images/kanji/<categoryIndex>_<phraseIndex>.png` (Vite copies `public/` to `dist/`)

### Runtime display (TypeScript)
1. `renderBigKanji(bridge, catIndex, phraseIndex)` — creates 3 containers:
   - **Event layer** (text, full-screen, transparent, `isEventCapture: 1`)
   - **Image** (288×144, x=144, y=0) — loaded via canvas re-encode + `updateImageRawData`
   - **Text** (576×138, x=0, y=150) — pronunciation + translation + nav hints
2. Canvas re-encode is MANDATORY — raw file PNGs fail with `imageException`

### Navigation
- Level 2 → **tap** (CLICK_EVENT or list click fallback) → Level 3 (big kanji)
- Level 3: swipe up (SCROLL_TOP) = prev phrase, swipe down (SCROLL_BOTTOM) = next phrase
- Level 3: double-tap = back to Level 2 (detail)

### Font sizing strategy
- Font size is computed per-phrase to maximize character height while fitting within 288×144
- Target: fill ~80% of the 288px width, center vertically
- Single char (e.g., "草", "ばか"): ~90pt
- 2-3 chars (e.g., "ありがとう", "すごい"): ~60pt
- 4-5 chars (e.g., "めっちゃいい", "空気読めない"): ~42pt
- Formula: `font_size = min(int(288 * 0.85 / len(text)), 100)` — clamped at 100pt max

---

## Step-by-Step Plan

### Task 1: Create image generation script

**Objective:** Write a Python script that renders each JP phrase as a large G2-compatible image.

**Files:**
- Create: `scripts/generate-kanji-images.py`
- Create: `public/images/kanji/` (directory, populated by script)
- Modify: `package.json` — add `"generate-images"` script

**Step 1: Write the script**

```python
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

# ── Data (mirrors src/data.ts) ──────────────────────────────
PHRASES = [
    # Street
    ["ありがとう", "おいしい", "ごめん", "いいね", "まじ？", "行こう", "おつかれ", "すごい", "乾杯！", "またね"],
    # Casual
    ["あざす", "うまっ！", "わりぃ", "それな", "マジで？", "行くぞ", "すげえ", "めっちゃいい", "超楽しい", "サボろう"],
    # Gen Z
    ["あざまる", "ばりうま", "それガチ？", "やばい", "エモい", "あげぽよ", "鬼うま", "チルしよう", "神ってる", "ぱりぴ"],
    # Kansai
    ["おおきに", "めっちゃええ", "なんでやねん", "しらんけど", "せやな", "ほんまに？", "あかん", "ぎょうさん"],
    # Internet
    ["草", "ぴえん", "バズった", "ググって", "ミスった", "ワンチャン", "ディスるな", "それ草"],
    # Roast
    ["ばか", "あほ", "うざい", "ださい", "キモい", "クソ", "ちくしょう", "うるさい", "ふざけんな", "しね"],
    # WTF
    ["別腹", "猫舌", "三日坊主", "口寂しい", "ばたんきゅう", "空気読めない", "猫ばば", "バーコード人", "耳にたこ", "はなくそ", "パラサイト", "積ん読"],
]

OUT_DIR = Path("public/images/kanji")
IMG_W, IMG_H = 288, 144

# ── Font discovery ──────────────────────────────────────────
def find_jp_font() -> str:
    """Find a Japanese font on macOS. Returns path to .ttc/.ttf."""
    candidates = [
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",  # Hiragino Sans W6 (bold)
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",  # Hiragino Sans W3 (regular)
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",  # NFD variant
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/System/Library/Fonts/Supplemental/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/Supplemental/ヒラギノ角ゴシック W3.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    # Fallback: search with mdfind
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
    
    # Measure text
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    # Create canvas (black background)
    img = Image.new('L', (IMG_W, IMG_H), 0)  # 0 = black
    draw = ImageDraw.Draw(img)
    
    # Center text
    x = (IMG_W - tw) // 2 - bbox[0]
    y = (IMG_H - th) // 2 - bbox[1]
    draw.text((x, y), text, fill=255, font=font)  # 255 = white
    
    return img

# ── Main ─────────────────────────────────────────────────────
def main():
    font_path = find_jp_font()
    print(f"Font: {font_path}")
    
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    
    total = 0
    for cat_idx, phrases in enumerate(PHRASES):
        for phr_idx, text in enumerate(phrases):
            # Render
            img = render_kanji(text, font_path)
            
            # Dither
            img = floyd_steinberg_4bit(img)
            
            # Save
            out_path = OUT_DIR / f"{cat_idx}_{phr_idx}.png"
            img.save(out_path, "PNG")
            size_kb = out_path.stat().st_size / 1024
            print(f"  [{cat_idx}_{phr_idx}] {text} → {out_path} ({size_kb:.1f} KB)")
            total += 1
    
    print(f"\nDone: {total} images in {OUT_DIR}/")

if __name__ == "__main__":
    main()
```

**Step 2: Add npm script**

In `package.json`, add to `"scripts"`:
```json
"generate-images": "python3 scripts/generate-kanji-images.py"
```

**Step 3: Run script to generate images**

```bash
cd "/Users/gael/Documents/GitHub/EvenHub/bad parrot"
python3 scripts/generate-kanji-images.py
```
Expected: ~75 PNG files in `public/images/kanji/`, each 2-8 KB.

**Step 4: Verify output**

```bash
ls public/images/kanji/ | wc -l
# Expected: 75
file public/images/kanji/0_0.png
# Expected: PNG image data, 288 x 144, 8-bit grayscale
```

**Step 5: Commit**

```bash
git add scripts/generate-kanji-images.py public/images/kanji/ package.json
git commit -m "feat: add big kanji image generation script"
```

---

### Task 2: Update types for Level 3

**Objective:** Extend the navigation type system to support the new big kanji level.

**Files:**
- Modify: `src/types.ts`

**Step 1: Change NavigationLevel**

```typescript
// Before:
export type NavigationLevel = 0 | 1 | 2

// After:
export type NavigationLevel = 0 | 1 | 2 | 3
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Level 3 to NavigationLevel for big kanji view"
```

---

### Task 3: Add renderBigKanji display function

**Objective:** Create the display function that renders the big kanji layout (image + text below).

**Files:**
- Modify: `src/display/index.ts`

**Step 1: Add imports**

Add these imports at the top of `src/display/index.ts`:
```typescript
import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
  TextContainerUpgrade,       // ← NEW
  ImageContainerProperty,     // ← NEW
  ImageRawDataUpdate,         // ← NEW
} from '@evenrealities/even_hub_sdk'
```

**Step 2: Add image dimension constants**

After existing constants, add:
```typescript
const KANJI_IMG_W = 288
const KANJI_IMG_H = 144
const KANJI_IMG_X = (576 - KANJI_IMG_W) / 2  // = 144 (centered)
const KANJI_IMG_Y = 0
const KANJI_TEXT_Y = 152
const KANJI_TEXT_H = 288 - KANJI_TEXT_Y - 4  // = 132
```

**Step 3: Add helper function — canvas re-encode + image push**

```typescript
async function loadAndPushKanjiImage(
  bridge: EvenAppBridge,
  catIndex: number,
  phraseIndex: number
): Promise<void> {
  const url = `/images/kanji/${catIndex}_${phraseIndex}.png`
  
  const resp = await fetch(url)
  if (!resp.ok) {
    console.error(`Kanji image not found: ${url}`)
    return
  }
  const blob = await resp.blob()
  const objectUrl = URL.createObjectURL(blob)
  
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement('img')
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image load failed'))
    el.src = objectUrl
  })
  
  const canvas = document.createElement('canvas')
  canvas.width = KANJI_IMG_W
  canvas.height = KANJI_IMG_H
  canvas.getContext('2d')!.drawImage(img, 0, 0, KANJI_IMG_W, KANJI_IMG_H)
  URL.revokeObjectURL(objectUrl)
  
  const outBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  )
  const bytes = new Uint8Array(await outBlob.arrayBuffer())
  
  const result = await bridge.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: 2,
      containerName: 'kanjiImg',
      imageData: bytes,
    })
  )
  if (result !== 'success') {
    console.error('updateImageRawData:', result)
  }
}
```

**Step 4: Add renderBigKanji function**

```typescript
export function renderBigKanji(
  bridge: EvenAppBridge,
  catIndex: number,
  phraseIndex: number
): void {
  const cat = categories[catIndex]
  const p = cat.phrases[phraseIndex]
  const total = cat.phrases.length
  
  // Build text content
  const nav = `${phraseIndex + 1}/${total}  ↑↓ phrase  ⊳⊳ back`
  const content = `${p.ph}\n${p.en}\n\n${nav}`
  
  // Image container (centered top)
  const image = new ImageContainerProperty({
    containerID: 2,
    containerName: 'kanjiImg',
    xPosition: KANJI_IMG_X,
    yPosition: KANJI_IMG_Y,
    width: KANJI_IMG_W,
    height: KANJI_IMG_H,
  })
  
  // Text container (pronunciation + translation below image)
  const text = new TextContainerProperty({
    containerID: 1,
    containerName: 'kanjiText',
    content,
    xPosition: 4,
    yPosition: KANJI_TEXT_Y,
    width: 568,
    height: KANJI_TEXT_H,
    isEventCapture: 1,
  })
  
  bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 2,
      textObject: [text],
      imageObject: [image],
    })
  )
  
  // Push the kanji image (async, don't await — let it resolve in background)
  loadAndPushKanjiImage(bridge, catIndex, phraseIndex).catch(err =>
    console.error('loadAndPushKanjiImage failed:', err)
  )
}
```

**CRITICAL**: The image container must have a DIFFERENT `containerID` from the text container. Text = ID 1 (isEventCapture), Image = ID 2. When rebuilding pages with image containers, always re-push the image bytes AFTER `rebuildPageContainer` (the image container is blank after rebuild).

**Step 5: Commit**

```bash
git add src/display/index.ts
git commit -m "feat: add renderBigKanji display function with image + text layout"
```

---

### Task 4: Add image-related SDK imports to display module

**Objective:** Ensure `ImageContainerProperty`, `ImageRawDataUpdate`, and `TextContainerUpgrade` are imported.

**Files:**
- Modify: `src/display/index.ts` (imports section)

This is already covered in Task 3 Step 1. Verify the imports are complete after writing.

---

### Task 5: Wire Level 3 navigation in main.ts

**Objective:** Add callbacks for entering and navigating the big kanji view.

**Files:**
- Modify: `src/main.ts`

**Step 1: Import renderBigKanji**

```typescript
import { renderCategoryList, renderPhraseList, renderDetail, renderBigKanji } from './display'
```

**Step 2: Add onEnterBigKanji and navigation callbacks**

After `onBack`, add:
```typescript
const onEnterBigKanji = () => {
  level = 3
  renderBigKanji(bridge, currentCategory, currentPhrase)
}

const onBigKanjiNext = () => {
  currentPhrase = (currentPhrase + 1) % categories[currentCategory].phrases.length
  renderBigKanji(bridge, currentCategory, currentPhrase)
}

const onBigKanjiPrev = () => {
  const total = categories[currentCategory].phrases.length
  currentPhrase = (currentPhrase - 1 + total) % total
  renderBigKanji(bridge, currentCategory, currentPhrase)
}

const onBigKanjiBack = () => {
  level = 2
  renderDetail(bridge, currentCategory, currentPhrase)
}
```

**Step 3: Update setupInputHandlers call**

Add the new callbacks:
```typescript
setupInputHandlers(
  bridge, getLevel,
  onSelectCategory, onSelectPhrase,
  onNext, onPrev, onBack,
  onEnterBigKanji, onBigKanjiNext, onBigKanjiPrev, onBigKanjiBack  // ← NEW
)
```

**Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire Level 3 big kanji navigation in main.ts"
```

---

### Task 6: Update input handlers for Level 3

**Objective:** Handle gestures for the big kanji view (enter from Level 2, navigate, back).

**Files:**
- Modify: `src/input.ts`

**Step 1: Update function signature**

```typescript
export function setupInputHandlers(
  bridge: EvenAppBridge,
  getLevel: () => NavigationLevel,
  onSelectCategory: (index: number) => void,
  onSelectPhrase: (index: number) => void,
  onNext: () => void,
  onPrev: () => void,
  onBack: () => void,
  onEnterBigKanji: () => void,      // ← NEW
  onBigKanjiNext: () => void,       // ← NEW
  onBigKanjiPrev: () => void,       // ← NEW
  onBigKanjiBack: () => void        // ← NEW
): () => void {
```

**Step 2: Add Level 3 gesture handling**

After the Level 2 swipe up/down block, add:
```typescript
// Level 3: big kanji view
if (lev === 3) {
  if (type === OsEventTypeList.SCROLL_TOP_EVENT) {
    onBigKanjiPrev()
    return
  }
  if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    onBigKanjiNext()
    return
  }
  if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    onBigKanjiBack()
    return
  }
  return
}
```

**Step 3: Add tap-to-enter from Level 2**

After the Level 2 swipe handling block (before the Level 3 block), modify the existing Level 2 section to add a tap handler:
```typescript
// Level 2: swipe up/down for prev/next phrase, tap to enter big kanji
if (lev === 2) {
  if (type === OsEventTypeList.SCROLL_TOP_EVENT) {
    onPrev()
    return
  }
  if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    onNext()
    return
  }
  // Tap enters big kanji view (CLICK_EVENT is 0 — falsy!)
  if (type === OsEventTypeList.CLICK_EVENT) {
    onEnterBigKanji()
    return
  }
}
```

**CRITICAL PITFALL**: `OsEventTypeList.CLICK_EVENT = 0` is falsy. The existing guard `if (type === OsEventTypeList.CLICK_EVENT)` works because it uses strict equality (`===`), not truthiness. This is already the pattern used in the codebase. No change needed to the guard logic.

**PITFALL**: On hardware, CLICK_EVENT may be consumed by the SDK for text containers. If tap doesn't work to enter big kanji mode, fall back to a different gesture (e.g., swipe up from Level 2 enters big kanji, swipe down stays as prev). For now, use tap — if hardware testing shows it's unreliable, we'll remap in a follow-up.

**Step 4: Commit**

```bash
git add src/input.ts
git commit -m "feat: add Level 3 gesture handling (tap to enter, swipe to navigate, double-tap back)"
```

---

### Task 7: Bump version and build

**Objective:** Increment version, build, and verify the .ehpk package.

**Files:**
- Modify: `app.json` — bump `"version"` to `"0.2.0"`
- Modify: `index.html` — bump `APP_VERSION` to `"0.2.0"`

**Step 1: Bump versions**

In `app.json`:
```json
"version": "0.2.0"
```

In `index.html`:
```javascript
var APP_VERSION = '0.2.0';
```

**Step 2: Generate images and build**

```bash
cd "/Users/gael/Documents/GitHub/EvenHub/bad parrot"
npm run generate-images
npx vite build
```

**Step 3: Verify dist/ contains generated images**

```bash
ls dist/images/kanji/ | wc -l
# Expected: 75
```

**Step 4: Pack**

```bash
npx evenhub pack app.json dist/ -o bad-parrot.ehpk
```

**Step 5: Save QR**

```bash
npx evenhub qr --url "http://192.168.1.152:5173" > QRcode/v0.2.0.txt
/Users/gael/Documents/GitHub/EvenHub/toolbox/scripts/qr-image "http://192.168.1.152:5173" QRcode/v0.2.0.png
```

**Step 6: Commit**

```bash
git add app.json index.html QRcode/ bad-parrot.ehpk
git commit -m "chore: bump to v0.2.0 with big kanji feature"
```

---

## Verification

### On hardware (G2 glasses)
1. QR sideload `v0.2.0`
2. Navigate: Level 0 → tap category → Level 1 → tap phrase → Level 2 (detail)
3. Level 2: **tap** → Level 3 (big kanji) — verify large kanji image appears
4. Swipe up/down → verify prev/next phrase changes image + text
5. Double-tap → verify returns to Level 2 (detail)
6. Double-tap again → Level 1, once more → Level 0
7. Double-tap at Level 0 → exit

### Image quality check
- Kanji characters should be crisp, centered, and dithered (no banding on gradients)
- White text on black background (inverted: bright pixels on dark G2 display = visible)
- All 75 phrases should render correctly (no missing glyphs, no overflow)

### Edge cases
- Phrases with mixed kanji/kana (e.g., "神ってる") — image uses both
- Single-character phrases (e.g., "草") — should fill most of the 288×144 canvas
- Longest phrases (e.g., "空気読めない", "バーコード人") — should fit without truncation
- Punctuation (！, ？, ・) — should render correctly in the font

---

## Risks & Tradeoffs

| Risk | Mitigation |
|------|------------|
| **CLICK_EVENT unreliable on hardware** | If tap doesn't work on real G2 to enter Level 3, remap: swipe up from Level 2 = enter big kanji, swipe down = prev phrase. Update input.ts with a follow-up patch. |
| **Image push fails** (`sendFailed` / `imageException`) | Canvas re-encode is in place (mandatory). If `sendFailed` persists, isolate with text-only test first, then add image. |
| **Font missing some glyphs** | Hiragino Sans (macOS built-in) covers all JIS characters. The data uses standard Japanese — all characters should be present. |
| **Image size too large for BLE** | 288×144 PNG at 4-bit ~2-8 KB. BLE transfer ~0.5-2s per image. Acceptable for turn-based interaction. |
| **Build-time generation = stale images if data changes** | If phrases are added/modified, re-run `npm run generate-images`. Document in CHANGELOG. |
| **Container count mismatch** | `rebuildPageContainer` wipes all containers. The big kanji page always recreates both image + text. No stale state. |

---

## Open Questions

1. **Should the big kanji view replace Level 2 entirely?** Currently planned as an ADDITIONAL Level 3. If the user prefers it as the ONLY detail view (replacing Level 2), simplify by removing the tap-to-enter and using Level 2 as big kanji directly.
2. **Font choice**: Hiragino Sans W6 (bold) gives thicker strokes that look better on G2's low-res display. If it looks too heavy, fall back to W3 (regular).
3. **Image inversion**: Currently white-on-black (text=255, bg=0). On G2, high values = brighter green. White text on black BG is the standard approach. If it looks inverted, toggle the render.
