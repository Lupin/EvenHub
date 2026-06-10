# Status — G2 Convert

Last updated: 2026-06-10

## Version

- **Semver**: 1.0.0 (from `VERSION`)
- **Build**: 4 (auto-incremented by `./build.sh`)
- **Git**: `7fb5202` — `feat(toolbox): G2 Convert.app — double-clickable macOS app with file picker`
- **Swift**: Apple Swift 6.3, SDK macOS 26.0
- **Target**: macOS 14.0+

## Test Results

```
=== G2Convert Tests ===

dither4Bit:
  ✓ preserves dimensions        → 16 distinct 4-bit levels seen
  ✓ produces 4-bit levels
  ✓ solid black → all zeros
  ✓ solid white → all 255

processImage:
  ✓ respects target dimensions  → valid PNG output
  ✓ outputs valid PNG
  ✓ minimum dimensions (20×20)
  ✓ maximum dimensions (288×144)

invertImage:
  ✓ preserves dimensions
  ✓ inverts all pixels (black ↔ white)
  ✓ double invert = identity

─────────────────────────────
11/11 passed
```

Runner: `swift Tests/test_runner.swift` (standalone, no XCTest dependency)

## What Works

| Feature | Status |
|---------|--------|
| Drop zone / file picker | ✓ |
| Presets: 288×144, 576×288, Custom | ✓ |
| Floyd-Steinberg 4-bit dithering | ✓ |
| Greyscale conversion | ✓ |
| Crop overlay with ratio lock | ✓ |
| Crop drag (full surface) | ✓ |
| Crop scale slider | ✓ |
| Real-time invert toggle | ✓ |
| Invert preserved across reprocess | ✓ |
| 1:1 pixel preview | ✓ |
| Checkerboard background | ✓ |
| Save As PNG (Cmd+S) | ✓ |
| Finder reveal after save | ✓ |
| Resizable window (HSplitView) | ✓ |
| `--version` CLI flag | ✓ |
| Auto-versioning (build.sh) | ✓ |
| Info.plist metadata | ✓ |
| `.app` bundle (double-clickable) | ✓ |
| ARM64 native binary | ✓ |
| No Xcode required (CLT only) | ✓ |
| No external dependencies | ✓ |

## Known Behaviors

### Vertical line artifact on glasses
A 1px vertical line appears on the right edge when rendered on actual G2 hardware. This is a known WebView/SDK artifact — not fixable from the app side. All border props at 0 don't eliminate it.

### NSImage coordinate subtleties
`NSImage.size` returns size in points, which may differ from pixel dimensions for Retina-resolution images. In practice, most PNGs are 72 DPI so points = pixels. The `NSImage.draw(in:from:)` method handles coordinate mapping internally.

### Crop drag doesn't auto-reprocess
Dragging the crop rectangle updates the overlay in real-time but does NOT trigger a pipeline reprocess. Reprocessing only happens on: scale slider change, crop toggle, or preset change. This is intentional — avoids constant reprocessing during drag.

### Single file compilation
All Swift code lives in `Sources/main.swift` (761 lines) + `Sources/Version.swift` (auto-generated, 20 lines). The test runner is a separate script, not compiled into the app.

## Bug History (Fixed)

| Bug | Date | Fix |
|-----|------|-----|
| Crop overlay showed full image when actual crop was smaller (ratio mismatch between norm rect and source rect) | 2026-06-10 | Unified ratio logic in `cropNormRect` to match `sourceCropRect` |
| Invert reset on crop/preset change | 2026-06-10 | Moved `inverted = false` out of `process()`, only reset on new image load |
| Crop couldn't reach top/bottom edges | 2026-06-10 | Added Y-flip in `sourceCropRect` for Cocoa coords, proper edge clamping |
| Crop drag non-functional | 2026-06-10 | Added `Color.clear` hit-test layer + `cropDragBase` snapshot pattern |
| Dither test failure (Retina scaling) | 2026-06-10 | Used `NSBitmapImageRep` for test images instead of CGContext |
| Dither test failure (draw corrupts pixels) | 2026-06-10 | Read raw pixels via `CFDataGetBytePtr` instead of re-drawing |
| Pillow deprecation warning (Python script) | 2026-06-10 | Changed `getflattened_data()` → `get_flattened_data()` |

## Roadmap

- [ ] Keyboard shortcuts for crop (arrow keys = nudge, +/- = scale)
- [ ] Drag & drop from Finder directly to save location
- [ ] Batch mode (process multiple images)
- [ ] EXIF orientation handling
- [ ] Undo/redo
- [ ] Crop presets (square, golden ratio, etc.)
- [ ] Direct send to Even Hub device

## File Inventory

```
G2Convert/
├── README.md           (this overview)
├── ARCHITECTURE.md     (pipeline, algorithms, state, pitfalls)
├── STATUS.md           (this file)
├── VERSION             "1.0.0"
├── .build-number       4
├── build.sh            complete build script
├── Package.swift       SPM manifest
├── Sources/
│   ├── main.swift      761 lines — full app
│   └── Version.swift   20 lines — auto-generated
├── Tests/
│   └── test_runner.swift  435 lines — 11 standalone tests
├── G2Convert.app/      bundled application
└── .build/             SPM artifacts (gitignored)
```
