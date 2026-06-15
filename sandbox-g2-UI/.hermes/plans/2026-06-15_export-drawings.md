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
