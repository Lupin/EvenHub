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

### Task 4: Add "View on Glasses" slideshow mode to Gallery

**Objective:** Add a button in the gallery that pushes drawings to the glasses one by one via tap. The glasses display a single drawing with "tap: next | double-tap: exit". The phone pushes the first drawing, then each tap on the glasses advances to the next.

**Files:**
- Modify: `sandbox-g2-UI/index.html` — gallery button + slideshow logic
- Modify: `sandbox-g2-UI/src/main.ts` — handle slideshow events (tap=next, double-tap=exit)

**How it works:**
1. User taps "▶ Slideshow" in the gallery
2. Phone pushes drawing #0 to the glasses via `g2-push` localStorage
3. Phone sets `g2-slideshow` localStorage key with `{index: 0, total: N}`
4. On the glasses, `main.ts` sees the drawing and also polls `g2-slideshow`
5. Single tap on glasses → phone increments index, pushes next drawing
6. Double-tap on glasses → clear slideshow mode, show "Slideshow ended"

**Step 1: Add slideshow button to gallery HTML**

```html
<button class="btn" id="startSlideshow" style="margin-top:8px">▶ Slideshow</button>
```

**Step 2: Add slideshow handler**

```js
var slideshowIndex = 0;
var slideshowActive = false;

document.getElementById('startSlideshow').addEventListener('click', function(){
  var list = loadDrawings();
  if (!list.length) { alert('No drawings to show'); return; }
  slideshowIndex = 0;
  slideshowActive = true;
  this.textContent = '■ Stop';
  pushCurrentSlide();
});

function pushCurrentSlide() {
  var list = loadDrawings();
  if (slideshowIndex >= list.length) {
    slideshowActive = false;
    document.getElementById('startSlideshow').textContent = '▶ Slideshow';
    localStorage.setItem('g2-slideshow', JSON.stringify({active: false}));
    return;
  }
  var d = list[slideshowIndex];
  localStorage.setItem('g2-push', JSON.stringify({mode:'draw', lines:d.lines}));
  localStorage.setItem('g2-slideshow', JSON.stringify({
    active: true, index: slideshowIndex, total: list.length, name: d.name
  }));
}

// When slideshow button is pressed while active, stop it
document.getElementById('startSlideshow').addEventListener('click', function(){
  if (slideshowActive) {
    slideshowActive = false;
    this.textContent = '▶ Slideshow';
    localStorage.setItem('g2-slideshow', JSON.stringify({active: false}));
  }
  // else: already started above (the first addEventListener handles start)
});
```

Actually, combine start/stop into one handler:

```js
document.getElementById('startSlideshow').addEventListener('click', function(){
  if (slideshowActive) {
    slideshowActive = false;
    this.textContent = '▶ Slideshow';
    localStorage.setItem('g2-slideshow', JSON.stringify({active: false}));
    return;
  }
  var list = loadDrawings();
  if (!list.length) { alert('No drawings to show'); return; }
  slideshowIndex = 0;
  slideshowActive = true;
  this.textContent = '■ Stop';
  pushCurrentSlide();
});
```

**Step 3: Add glasses-side slideshow logic to main.ts**

In `main.ts`, after the existing `g2-push` polling interval, add:

```ts
// Slideshow: poll g2-slideshow for tap=next, double-tap=exit
let slideshowOn = false

setInterval(() => {
  const raw = localStorage.getItem('g2-slideshow')
  if (!raw) return
  try {
    const ss = JSON.parse(raw)
    if (ss.active && !slideshowOn) {
      // Slideshow just started — draw index 0 is already pushed via g2-push
      slideshowOn = true
    }
    if (!ss.active && slideshowOn) {
      // Slideshow stopped from phone
      slideshowOn = false
      bridge.textContainerUpgrade(new TextContainerUpgrade({
        containerID: 1, containerName: 'main',
        content: 'Slideshow ended\n\ndouble-tap: exit',
      }))
    }
  } catch(e) {}
}, 500)
```

Modify the tap handler (inside `bridge.onEvenHubEvent`) to handle slideshow next:

```ts
// Inside onEvenHubEvent, after DOUBLE_CLICK_EVENT check:
if (et === OsEventTypeList.CLICK_EVENT) {
  if (slideshowOn) {
    // Tell phone to advance to next slide
    localStorage.setItem('g2-slideshow-next', '1')
  }
}
```

And on the phone side, poll for `g2-slideshow-next`:

```js
// Phone-side slideshow polling (add to the gallery JS)
setInterval(function(){
  if (!slideshowActive) return;
  var next = localStorage.getItem('g2-slideshow-next');
  if (next) {
    localStorage.removeItem('g2-slideshow-next');
    slideshowIndex++;
    pushCurrentSlide();
  }
}, 400);
```

Update the double-tap handler on glasses to end slideshow instead of shutting down:

```ts
// In onEvenHubEvent:
if (et === OsEventTypeList.DOUBLE_CLICK_EVENT) {
  if (slideshowOn) {
    slideshowOn = false
    localStorage.setItem('g2-slideshow', JSON.stringify({active: false}))
  } else {
    bridge.shutDownPageContainer(1)
  }
}
```

**Step 4: Verify**

- Build → no errors
- Test on phone: Gallery → "▶ Slideshow"
- Glasses show drawing #1 with "tap: next | double-tap: exit"
- Tap → next drawing
- Double-tap → "Slideshow ended"
- Phone button shows "■ Stop" — tap to end slideshow

**Step 5: Commit**

```bash
git add sandbox-g2-UI/index.html sandbox-g2-UI/src/main.ts
git commit -m "feat: add gallery slideshow mode on glasses"
```
