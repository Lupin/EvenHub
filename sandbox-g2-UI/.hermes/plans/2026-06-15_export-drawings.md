# Export/Save Drawings from sandbox-g2-UI — Implementation Plan

> **For Hermes:** Execute directly (single-file change, well-scoped).

**Goal:** Add robust export of saved drawings from the iOS companion app using `navigator.share()` (native share sheet) with clipboard fallback.

**Architecture:** Two-tier export: (1) `navigator.share({files: [File]})` → native iOS share sheet → Save to Files/AirDrop/Mail; (2) fallback to `navigator.clipboard.writeText()` → paste into Notes/Mail. Both require user gesture (button click). The gallery mode gets an "Export" button and a per-drawing "Share" button.

**Tech Stack:** Vanilla JS, Web Share API, Clipboard API, iOS WKWebView.

**Source:** Research confirmed Even Realities SDK has zero file/export APIs. Must use browser APIs.

---

## Research Findings (from subagent)

- Even Realities SDK exposes 9 methods — no file-system, download, or export APIs.
- App runs in WKWebView on iOS. `window.localStorage` persists but is wiped on `.ehpk` repack.
- `navigator.share({files: [...]})` is the most promising approach (iOS share sheet → Save to Files).
- `navigator.clipboard.writeText()` is a reliable fallback (paste into Notes).
- Blob URL + `<a download>` DOES NOT WORK in iOS WKWebView — the `download` attribute is ignored.
- QR code encoding: limited to ~3KB, practical for single drawings only.

---

### Task 1: Add "Export All" button to Gallery

**Objective:** Add a button at the top of the gallery to export all drawings as JSON.

**Files:**
- Modify: `sandbox-g2-UI/index.html` — gallery section and JS

**Step 1: Add Export All button HTML**

In the gallery group, add a button before the `#galleryList` div:

```html
<button class="btn" id="exportAll" style="margin-top:12px">Export All (JSON)</button>
```

**Step 2: Add exportAll handler**

```js
document.getElementById('exportAll').addEventListener('click', async function(){
  var list = loadDrawings();
  if (!list.length) { alert('No drawings to export'); return; }
  var json = JSON.stringify(list, null, 2);
  
  // Try Web Share API with file
  if (navigator.share && navigator.canShare) {
    var blob = new Blob([json], { type: 'application/json' });
    var file = new File([blob], 'g2-drawings.json', { type: 'application/json' });
    var data = { files: [file], title: 'G2 Drawings' };
    if (navigator.canShare(data)) {
      try { await navigator.share(data); return; } catch(e) {}
    }
  }
  
  // Fallback: clipboard
  try {
    await navigator.clipboard.writeText(json);
    alert('Copied to clipboard! Paste into Notes or Mail.');
  } catch(e) {
    // Last resort: textarea with manual copy
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;';
    var ta = document.createElement('textarea');
    ta.value = json;
    ta.style.cssText = 'width:100%;height:250px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:12px;font-family:monospace;font-size:11px;';
    var btn = document.createElement('button');
    btn.textContent = 'Close';
    btn.style.cssText = 'margin-top:12px;padding:12px 24px;background:var(--accent);color:var(--bg);border:none;border-radius:6px;font-size:15px;cursor:pointer;';
    btn.addEventListener('click', function(){ document.body.removeChild(modal); });
    modal.appendChild(ta); modal.appendChild(btn);
    document.body.appendChild(modal);
    ta.select();
  }
});
```

**Step 3: Verify**

- Build: `npx vite build` → no errors
- Test on phone: Gallery → tap "Export All"
  - Should show iOS share sheet (Save to Files, AirDrop, Mail...)
  - If share blocked → clipboard copy with alert
  - If clipboard blocked → textarea with manual copy

**Step 4: Commit**

```bash
git add sandbox-g2-UI/index.html
git commit -m "feat: add export all drawings via Web Share API with clipboard fallback"
```

---

### Task 2: Add per-drawing "Share" button to Gallery items

**Objective:** Each gallery item gets a share button next to ✎ and ✕.

**Files:**
- Modify: `sandbox-g2-UI/index.html` — renderGallery function

**Step 1: Add share button to gallery item template**

In `renderGallery()`, add a share button after the delete button:

```js
h += '...<button class=\"del\" onclick=\"event.stopPropagation();deleteDrawing('+i+')\">✕</button>'
  + '<button onclick=\"event.stopPropagation();shareDrawing('+i+')\">↗</button>...'
```

**Step 2: Add shareDrawing function**

```js
window.shareDrawing = async function(i) {
  var d = loadDrawings()[i];
  var text = d.lines.join('\n');
  
  if (navigator.share) {
    try { await navigator.share({ title: d.name, text: text }); return; } catch(e) {}
  }
  
  try {
    await navigator.clipboard.writeText(text);
    alert('Copied: ' + d.name);
  } catch(e) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:20%;left:10%;width:80%;height:200px;z-index:999;background:var(--bg);color:var(--text);border:1px solid var(--border);padding:12px;font-family:monospace;font-size:11px;';
    document.body.appendChild(ta);
    ta.select();
    setTimeout(function(){ document.body.removeChild(ta); }, 10000);
  }
};
```

**Step 3: Verify**

- Build → no errors
- Test on phone: Gallery → tap ↗ on a drawing → share sheet or clipboard

**Step 4: Commit**

```bash
git add sandbox-g2-UI/index.html
git commit -m "feat: add per-drawing share button to gallery"
```

---

### Task 3: Hardware Test

**Objective:** Test both export paths on actual Even Realities hardware.

**Verification:**
- Scan QR, load app on glasses
- Phone companion app: Draw mode → draw something → Save
- Gallery → Export All → verify iOS share sheet appears (or clipboard fallback)
- Gallery → ↗ on a drawing → verify share sheet or clipboard
- If share sheet works: Save to Files, verify JSON is valid
- If clipboard works: Paste into Notes, verify content

**If share fails entirely:** Update the code to skip share and go directly to clipboard. Some WKWebView configurations disable `navigator.share`.

---

## Risks & Tradeoffs

- **`navigator.share()` may be disabled** in Even App's WKWebView. If so, clipboard is the fallback.
- **Clipboard on iOS WebView** may require a user gesture (click). Our buttons provide that.
- **Large drawing collections** (>100KB JSON) may hit clipboard limits on iOS. In that case, the textarea modal allows manual selection.
- **No file system access** — we can't save directly to iOS Files without the share sheet.

---

### Task 4: Add "View on Glasses" interactive browse mode to Gallery

**Objective:** Add a button in the gallery that pushes drawings to the glasses interactively. No animation — each tap loads the next drawing. The glasses display one drawing. Phone pushes first drawing, then each tap on glasses advances to next. Double-tap ends browse mode.

**Key constraint:** No `setInterval`/animation-based auto-advance (known to be unreliable due to BLE latency). Only tap-driven interaction.

**Files:**
- Modify: `sandbox-g2-UI/index.html` — gallery button + browse logic
- Modify: `sandbox-g2-UI/src/main.ts` — handle browse events (tap=next, double-tap=exit)

**How it works:**
1. User taps "▶ Browse" in the gallery
2. Phone pushes drawing #0 to the glasses via `g2-push` localStorage
3. Glasses show the drawing
4. Single tap on glasses → glasses set `g2-browse-next` localStorage flag
5. Phone polls `g2-browse-next`, increments index, pushes next drawing, removes flag
6. Double-tap on glasses → glasses clear browse mode, show onboard pattern
7. Phone detects browse ended, resets button

**Step 1: Add browse button to gallery HTML**

```html
<button class="btn" id="startBrowse" style="margin-top:8px">▶ Browse on Glasses</button>
```

**Step 2: Add browse handler (phone side)**

```js
var browseIndex = 0;
var browseActive = false;

document.getElementById('startBrowse').addEventListener('click', function(){
  if (browseActive) {
    browseActive = false;
    this.textContent = '▶ Browse on Glasses';
    localStorage.removeItem('g2-browse');
    return;
  }
  var list = loadDrawings();
  if (!list.length) { alert('No drawings to browse'); return; }
  browseIndex = 0;
  browseActive = true;
  this.textContent = '■ Stop Browsing';
  pushBrowseSlide();
});

function pushBrowseSlide() {
  var list = loadDrawings();
  if (browseIndex >= list.length) {
    browseActive = false;
    document.getElementById('startBrowse').textContent = '▶ Browse on Glasses';
    localStorage.removeItem('g2-browse');
    return;
  }
  var d = list[browseIndex];
  localStorage.setItem('g2-push', JSON.stringify({mode:'draw', lines:d.lines}));
  localStorage.setItem('g2-browse', JSON.stringify({active: true, index: browseIndex, total: list.length}));
}

// Poll for tap events from glasses
setInterval(function(){
  if (!browseActive) return;
  var next = localStorage.getItem('g2-browse-next');
  if (next) {
    localStorage.removeItem('g2-browse-next');
    browseIndex++;
    pushBrowseSlide();
  }
  // Double-tap from glasses clears g2-browse
  var state = localStorage.getItem('g2-browse');
  if (!state && browseActive) {
    browseActive = false;
    document.getElementById('startBrowse').textContent = '▶ Browse on Glasses';
  }
}, 400);
```

**Step 3: Add glasses-side browse logic to main.ts**

Add a browse mode flag and tap handler:

```ts
let browseOn = false

// In bridge.onEvenHubEvent:
if (et === OsEventTypeList.CLICK_EVENT) {
  if (browseOn) {
    localStorage.setItem('g2-browse-next', '1')
  }
}
if (et === OsEventTypeList.DOUBLE_CLICK_EVENT) {
  if (browseOn) {
    browseOn = false
    localStorage.removeItem('g2-browse')
    localStorage.removeItem('g2-browse-next')
    bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: 1, containerName: 'main',
      content: onboardPattern(),
    }))
  } else {
    bridge.shutDownPageContainer(1)
  }
}

// Poll for browse state changes from phone
setInterval(() => {
  const raw = localStorage.getItem('g2-browse')
  if (raw) {
    try {
      const bs = JSON.parse(raw)
      browseOn = bs.active
    } catch(e) {}
  }
}, 500)
```

**Step 4: Verify**

- Build → no errors
- Gallery → "▶ Browse on Glasses" → glasses show drawing #0
- Tap → next drawing
- Double-tap → onboard pattern
- Phone button "■ Stop Browsing" stops the session

**Step 5: Commit**

```bash
git add sandbox-g2-UI/index.html sandbox-g2-UI/src/main.ts
git commit -m "feat: add interactive browse mode for gallery drawings on glasses"
```

---

### Task 5: Add Save button to Text mode

**Objective:** Save text-mode compositions to the gallery alongside drawings, using the same storage format. A text composition becomes a drawing-like entry with the text rendered as lines (same as draw mode output).

**Files:**
- Modify: `sandbox-g2-UI/index.html` — text mode UI + save handler
- Modify: `sandbox-g2-UI/src/main.ts` — renderText already outputs 5-line blocks, which fits the lines[] format

**How it works:**
- Add a "Save" button next to Push in text mode
- Clicking Save calls `renderText()` logic client-side (duplicate the glyph grid logic in JS) to produce lines[] output
- Saves to localStorage `g2-drawings` with same format: `{id, name:'Text N', cols, rows:5, lines, date}`
- Gallery displays text compositions same as drawings

**Step 1: Add Save button to text mode HTML**

```html
<div class="btn-row"><button class="btn-sm save" id="textSave">Save</button></div>
<button class="btn" id="textPush">Push to G2</button>
```

Place it between the glyph grid and the Push button.

**Step 2: Add client-side text renderer**

The text mode needs to render the 5-row glyph grid in JS (same as main.ts does on glasses) to produce lines[] output:

```js
// Text rendering (mirrors main.ts renderText logic for saving)
var textGlyphDefs = {
  'A':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1]],
  'B':[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0]],
  // ... full alphabet from main.ts
  '0':[[0,1,1,1,0],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[0,1,1,1,0]],
  // ... etc
};

function renderTextToLines(text, pool, randomOn) {
  var chars = text.toUpperCase().split('').slice(0, 4);
  var rows = [[],[],[],[],[]];
  for (var ci = 0; ci < chars.length; ci++) {
    var g = textGlyphDefs[chars[ci]] || textGlyphDefs[' '];
    for (var r = 0; r < 5; r++) {
      rows[r].push(g[r].map(function(c){ return c ? (randomOn ? pool[Math.floor(Math.random()*pool.length)] : pool[0]) : FW; }).join(''));
    }
  }
  return rows.map(function(r){ return r.join(FW); });
}
```

**Step 3: Add textSave handler**

```js
document.getElementById('textSave').addEventListener('click', function() {
  var text = inp.value || '8';
  var pool = Array.from(ag);
  var lines = renderTextToLines(text, pool, rnd);
  var list = loadDrawings();
  list.push({
    id: Date.now(),
    name: 'Text ' + (list.length + 1),
    cols: 18, rows: 5,
    lines: lines,
    date: new Date().toISOString()
  });
  saveDrawings(list);
  this.textContent = 'Saved!';
  setTimeout(function(){ document.getElementById('textSave').textContent = 'Save'; }, 1500);
});
```

**Step 4: Verify**

- Build → no errors
- Text mode → type "ABC" → Save
- Gallery → "Text N" appears with preview
- Tap → loads into draw canvas (or just push to glasses)

**Step 5: Commit**

```bash
git add sandbox-g2-UI/index.html
git commit -m "feat: add save button to text mode, store compositions in gallery"
```

---

### Task 6: Add Prev/Next buttons to Gallery detail view on phone

**Objective:** When browsing drawings on the phone gallery, add ◀ and ▶ buttons to navigate between drawings without going back to the list. Shows "2/5" position indicator.

**Files:**
- Modify: `sandbox-g2-UI/index.html` — gallery section

**How it works:**
- Tapping a drawing in the gallery opens it in draw mode (current behavior via `loadToCanvas`).
- Replace that with an inline detail view showing the drawing preview larger + prev/next arrows.
- The detail view shows: larger preview, name, "◀ prev | 2/5 | next ▶", back to gallery button.

Alternative simplifiée : ajouter prev/next directement dans la liste de la galerie, sous la forme de boutons flottants en bas de la liste qui permettent de charger le dessin précédent/suivant directement dans le canvas.

**Step 1: Add prev/next floating bar to gallery**

```html
<div id="galleryNav" style="display:none; padding:8px 16px; display:flex; gap:8px; align-items:center; justify-content:center">
  <button class="btn-sm" id="prevDrawing">◀</button>
  <span id="galleryPos" style="font-size:13px; color:var(--text-dim)">1/0</span>
  <button class="btn-sm" id="nextDrawing">▶</button>
</div>
```

**Step 2: Wire prev/next to loadToCanvas**

```js
var galleryCurrentIndex = -1;

document.getElementById('prevDrawing').addEventListener('click', function(){
  if (galleryCurrentIndex > 0) {
    galleryCurrentIndex--;
    loadToCanvas(loadDrawings()[galleryCurrentIndex]);
    updateGalleryNav();
    modeSel.value = 'draw'; switchMode('draw');
  }
});

document.getElementById('nextDrawing').addEventListener('click', function(){
  var list = loadDrawings();
  if (galleryCurrentIndex < list.length - 1) {
    galleryCurrentIndex++;
    loadToCanvas(list[galleryCurrentIndex]);
    updateGalleryNav();
    modeSel.value = 'draw'; switchMode('draw');
  }
});

function updateGalleryNav() {
  var list = loadDrawings();
  document.getElementById('galleryPos').textContent = (galleryCurrentIndex+1) + '/' + list.length;
  document.getElementById('galleryNav').style.display = list.length > 0 ? 'flex' : 'none';
}
```

Update `loadToCanvas` to track the current index. When a drawing is tapped in the gallery list, set `galleryCurrentIndex`.

**Step 3: Verify**

- Gallery → tap prev/next → drawing loads in draw canvas
- Position indicator updates
- Prev disabled at first drawing?
- Next disabled at last drawing?

**Step 4: Commit**

```bash
git add sandbox-g2-UI/index.html
git commit -m "feat: add prev/next navigation buttons in gallery"
```

---

## Export Strategy Decision

**`navigator.share()` is the primary approach** (Tasks 1 & 2 implement it). Research confirms:

- `navigator.share({files: [File]})` opens native iOS share sheet → Save to Files, AirDrop, Mail
- Works in WKWebView on iOS 14+ (which Even App uses)
- Requires user gesture (button click) — satisfied by our Export buttons
- Fallback: `navigator.clipboard.writeText()` if share is blocked by the Even App
- Last resort: textarea with manual select+copy

No other viable approaches exist for WKWebView (blob download, data URI download both blocked by iOS).
