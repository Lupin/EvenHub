# Status — G2 Convert

Last updated: 2026-06-10

## Version

- **Semver**: 1.0.13 (from `VERSION`)
- **Build**: 20 (auto-incremented by `./build.sh`)
- **Git**: `925f5b1` — `feat(toolbox): G2 Convert.app — double-clickable macOS app with file picker`
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

processImage with crop (horizontal):
  ✓ crop left half of horizontal 800×200 → dark output
  ✓ crop right half of horizontal 800×200 → bright output

processImage with crop (vertical Y-axis):
  ✓ crop top half of vertical image → dark output
  ✓ crop bottom half of vertical image → bright output

─────────────────────────────
15/15 passed
```

Runner: `swift Tests/test_runner.swift` (standalone, no XCTest dependency)

## What Works

| Feature | Status |
|---------|--------|
| Drop zone / file picker | ✓ |
| Presets: 288×144, 576×288, Custom | ✓ |
| Custom W/H validated on Enter (not per-keystroke) | ✓ |
| Floyd-Steinberg 4-bit dithering | ✓ |
| Greyscale conversion | ✓ |
| Real-time invert toggle | ✓ |
| Invert preserved across reprocess | ✓ |
| 1:1 pixel preview | ✓ |
| Checkerboard background | ✓ |
| Save As PNG (Cmd+S) | ✓ |
| Finder reveal after save | ✓ |
| Resizable window (HSplitView) | ✓ |
| `--version` CLI flag | ✓ |
| Auto-versioning (build.sh) | ✓ |
| Info.plist metadata (© Gael Abegg Gauthey) | ✓ |
| Author credit in status bar | ✓ |
| MIT License (`LICENSE` file) | ✓ |
| DMG distribution (`G2Convert-<version>.dmg`) | ✓ |
| `.app` bundle (double-clickable) | ✓ |
| ARM64 native binary | ✓ |
| No Xcode required (CLT only) | ✓ |
| No external dependencies | ✓ |

## Architecture

Simple pipeline: NSImage → resize → greyscale → Floyd-Steinberg 4-bit → NSImage result.
No crop — the full source image is always used.

### What triggers process()
- preset button tap (single-eye, dual-eye)
- custom W/H Enter validation
- initial image load

### What does NOT trigger process()
- invert toggle (computed property)
- custom W/H keystroke changes (`.onSubmit`, not `.onChange`)

## Known Behaviors

### Vertical line artifact on glasses
A 1px vertical line appears on the right edge when rendered on actual G2 hardware. This is a known WebView/SDK artifact — not fixable from the app side. All border props at 0 don't eliminate it.

### NSImage coordinate subtleties
`NSImage.size` returns size in points, which may differ from pixel dimensions for Retina-resolution images. In practice, most PNGs are 72 DPI so points = pixels.

### Single file compilation
All Swift code lives in `Sources/main.swift` (~565 lines) + `Sources/Version.swift` (auto-generated, 20 lines). The test runner is a separate script, not compiled into the app.

## Bug History (Fixed)

| Bug | Date | Fix |
|-----|------|-----|
| Crop feature removed entirely — too many coordinate alignment issues across SwiftUI/Cocoa boundary | 2026-06-10 | Removed all crop code: `@State` vars, `cropOverlay`, `cropConstraints`, `clampedCropCenter`, `sourceCropRect`, `displayImageRect`, UI controls. `processImage` no longer takes `cropRect` parameter. Binary dropped from 480KB to 381KB. |
| Custom W/H keystroke triggers reprocess on every digit — impossible to type numbers | 2026-06-10 | Replaced `.onChange(of: customWidth)` / `.onChange(of: customHeight)` with `.onSubmit { onChange() }` — pipeline only runs on Enter |
| Dither test failure (Retina scaling) | 2026-06-10 | Used `NSBitmapImageRep` for test images instead of CGContext |
| Dither test failure (draw corrupts pixels) | 2026-06-10 | Read raw pixels via `CFDataGetBytePtr` instead of re-drawing |

## Roadmap

- [ ] Drag & drop from Finder directly to save location
- [ ] Batch mode (process multiple images)
- [ ] EXIF orientation handling
- [ ] Undo/redo
- [ ] Direct send to Even Hub device

## File Inventory

```
G2Convert/
├── README.md
├── ARCHITECTURE.md
├── STATUS.md
├── LICENSE              MIT License (© Gael Abegg Gauthey)
├── VERSION              1.0.13
├── .build-number        20
├── build.sh             complete build script
├── Package.swift        SPM manifest
├── G2Convert-*.dmg      built DMG distribution
├── Sources/
│   ├── main.swift       ~565 lines — full app
│   └── Version.swift    20 lines — auto-generated
├── Tests/
│   └── test_runner.swift  435 lines — 15 standalone tests
├── G2Convert.app/       bundled application
└── .build/              SPM artifacts (gitignored)
```
