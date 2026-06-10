# Architecture — G2 Convert

## Pipeline

```
[NSImage source]
    │
    ├─ crop enabled?
    │   YES → sourceCropRect() computes CGRect in source pixels (Cocoa coords)
    │   NO  → full image
    │
    ▼
[NSImage.draw(in:from:)]  — resize to target W×H, cropped if enabled
    │
    ▼
[NSBitmapImageRep → CGImage]  — rasterize the resized image
    │
    ▼
[CGContext greyscale]  — convert to 8-bit greyscale (DeviceGray, no alpha)
    │
    ▼
[dither4Bit()]  — Floyd-Steinberg on float buffer, quantize to 16 levels
    │
    ▼
[NSImage result]  — wrap in NSImage via NSBitmapImageRep
    │
    ▼
[rawOutputImage]  — stored as @State, the "source of truth"
    │
    ├─ inverted = false → displayImage = rawOutputImage
    └─ inverted = true  → invertImage(rawOutputImage) on the fly
```

## Algorithms

### Floyd-Steinberg 4-bit dithering

```swift
func dither4Bit(_ image: CGImage) -> CGImage?
```

- Input: 8-bit greyscale CGImage
- Output: 4-bit (16-level) greyscale CGImage
- Uses a **float buffer** for precise error diffusion (not integer arithmetic)
- 16 target levels: `[0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255]`
- Standard Floyd-Steinberg weights: 7/16, 3/16, 5/16, 1/16
- After diffusion, values are written back as `UInt8` — they are already exact quantized levels, no rounding needed

### Invert

```swift
func invertImage(_ image: CGImage) -> CGImage?
```

- Simple pixel inversion: `pixel = 255 - pixel`
- Works on 8-bit greyscale images
- Used on the **already-dithered** output — preserves the 4-bit levels
- Double invert = identity (verified by test)

### Image Resize + Crop

```swift
func processImage(_ nsImage: NSImage, width: Int, height: Int, cropRect: CGRect? = nil)
```

- If `cropRect` is provided, draws `nsImage.draw(in: dstRect, from: cropRect, ...)`
- Otherwise draws the full image into the target rect
- Uses `.high` interpolation
- Then extracts as CGImage for the greyscale + dither steps

## State Management

### @State variables and their roles

| Variable | Type | When set | Triggers reprocess? |
|----------|------|----------|---------------------|
| `inputImage` | NSImage? | Drop / file picker | No (explicit call) |
| `rawOutputImage` | NSImage? | After pipeline completes | No |
| `inverted` | Bool | Toggle button | **No** (computed on the fly) |
| `cropEnabled` | Bool | Toggle | Yes (onChange → reprocessIfNeeded) |
| `cropCenter` | CGPoint | Drag gesture | **No** (only updates overlay; manual reprocess needed) |
| `cropScale` | CGFloat | Slider | Yes (onChange → reprocessIfNeeded) |
| `selectedPreset` | G2Preset | Preset buttons | Yes (via onChange callback) |
| `zoom1to1` | Bool | Toggle | No (display only) |

### Reproc triggers

`reprocessIfNeeded()` → `process()` is called when:
- `cropEnabled` toggles (on/off)
- `cropScale` changes (slider drag)
- Preset changes (288×144, 576×288, custom W/H)
- Custom W/H fields change

NOT triggered by:
- Invert toggle (instant, no reprocess)
- 1:1 toggle (display only)
- Crop drag (only updates `cropCenter` for overlay; user must adjust scale or toggle crop to apply)

Important: the drag gesture updates `cropCenter` in real-time (for responsive overlay), but the actual crop is only applied on the next `process()` call (triggered by scale or toggle change).

### Resets on new image load

When a new image is dropped or opened:
- `inverted = false`
- `cropEnabled = false`
- `cropCenter = (0.5, 0.5)`
- `cropScale = 0.75`

### Invert preservation

`inverted` is **not** touched by `process()`. It survives:
- Crop changes
- Preset changes
- Scale adjustments

It is only reset when loading a new image.

## Coordinate Systems

This is the most error-prone part of the codebase.

### Two coordinate systems in play

| System | Origin | Y direction | Used by |
|--------|--------|-------------|---------|
| SwiftUI (screen) | top-left | ↓ | crop overlay rendering, drag gestures |
| Cocoa / CGImage | bottom-left | ↑ | `NSImage.draw(in:from:)`, source pixel coordinates |

### The Y-flip in sourceCropRect

```swift
let srcCenterY = srcH * (1 - cropCenter.y)
```

- `cropCenter.y = 0` → SwiftUI top → Cocoa `srcCenterY = srcH` (top of source image)
- `cropCenter.y = 1` → SwiftUI bottom → Cocoa `srcCenterY = 0` (bottom of source image)

### Ratio locking — dual computation

Both `cropNormRect` (visual overlay) and `sourceCropRect` (actual pixel crop) must use **identical** ratio logic. A past bug caused them to diverge.

**Correct logic:**

```
imgRatio = sourceW / sourceH
outRatio = outputW / outputH

if imgRatio > outRatio:
    maxH = 1.0        (source height limits)
    maxW = outRatio / imgRatio
else:
    maxW = 1.0        (source width limits)
    maxH = imgRatio / outRatio

actualW = maxW × cropScale
actualH = maxH × cropScale
```

At `cropScale = 1.0`, this gives the **maximum possible area** that fits the output aspect ratio within the source image.

### Clamping

Centers are clamped so the crop rect stays within bounds:

```swift
cx = max(cropW/2, min(srcW - cropW/2, centerX))
cy = max(cropH/2, min(srcH - cropH/2, centerY))
```

This ensures the crop can reach all four edges of the source.

## UI Layout

```
┌─ HSplitView ───────────────────────────────────────┐
│ ┌─ Left (260px) ───────┐ ┌─ Right (400px+) ───────┐│
│ │ "Source"              │ │ "G2 Preview" + size/PNG││
│ │                       │ │                        ││
│ │ ┌─ Drop Zone ──────┐ │ │ ┌─ Preview Area ─────┐ ││
│ │ │                  │ │ │ │                    │ ││
│ │ │  Source image    │ │ │ │  displayImage      │ ││
│ │ │  + Crop overlay  │ │ │ │  + checkerboard bg │ ││
│ │ │  (if enabled)    │ │ │ │                    │ ││
│ │ └──────────────────┘ │ │ └────────────────────┘ ││
│ │                       │ │                        ││
│ │ [✓] Crop   slider    │ │   [1:1] [Invert] [Save]││
│ │                       │ │                        ││
│ │ G2 Preset:            │ │   Status bar           ││
│ │ [288×144][576×288][C] │ │                        ││
│ │                       │ │                        ││
│ │ [Browse…]            │ │                        ││
│ └───────────────────────┘ └────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Crop overlay rendering order (in drop zone)

1. `Color.clear.contentShape(Rectangle())` — **invisible drag target**, first in Z-stack for gesture priority
2. `Path` with even-odd fill — dim outside the crop area
3. `RoundedRectangle` — accent-color border around crop
4. Corner handles — 8×8 accent squares at each corner
5. Rule-of-thirds guides — white 0.5px lines at 1/3 and 2/3

All decorative elements have `.allowsHitTesting(false)` so gestures pass through to the `Color.clear` layer.

### Drag gesture

```swift
DragGesture(minimumDistance: 1)
    .onChanged { value in
        if cropDragBase == nil { cropDragBase = cropCenter }  // snapshot
        let dx = value.translation.width / drawW
        let dy = value.translation.height / drawH
        cropCenter.x = (base.x + dx).clamped(to: 0...1)
        cropCenter.y = (base.y + dy).clamped(to: 0...1)
    }
    .onEnded { _ in cropDragBase = nil }
```

- `drawW`/`drawH` are the actual displayed dimensions of the source image (accounting for aspect-fit)
- `cropDragBase` snapshots the center at gesture start for stable absolute positioning
- Delta is divided by draw dimensions for normalized 0-1 movement

## Pitfalls

### `-parse-as-library` flag required

The project uses `@main` on a struct in a file that also contains top-level functions. Swift requires `-parse-as-library` for this to compile. This is set in `Package.swift`:

```swift
swiftSettings: [.unsafeFlags(["-parse-as-library"])]
```

### NSImage coordinates

`NSImage.draw(in:from:)` uses the image's internal coordinate space. For images loaded with `NSImage(contentsOf:)`, this is typically points (matching pixel dimensions for 72 DPI images). The `from:` rect is in **bottom-left origin** coordinates.

### View identity in SwiftUI

The crop overlay uses `.eraseToAnyView()` to allow returning different view types from the `cropOverlay(in:)` function. Without this, Swift's type system can't handle the conditional return (EmptyView vs ZStack).

### CGImage alpha channel

The dither context uses `CGImageAlphaInfo.none.rawValue` — NO alpha channel. If the source image has alpha, it's lost at the greyscale conversion step. This is intentional for the G2 display which is greyscale-only.

## Build System

See `build.sh` — the complete build + versioning + bundling pipeline.

Files involved in versioning:
- `VERSION` — manual semver (e.g. `1.0.0`)
- `.build-number` — auto-incremented each build
- `Sources/Version.swift` — auto-generated, contains `VersionInfo` struct
- `G2Convert.app/Contents/Info.plist` — updated via `PlistBuddy`
