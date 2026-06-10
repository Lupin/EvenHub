import SwiftUI
import UniformTypeIdentifiers

// MARK: - Floyd-Steinberg 4-bit dithering

func dither4Bit(_ image: CGImage) -> CGImage? {
    let width = image.width
    let height = image.height
    let levels: [UInt8] = (0...15).map { UInt8($0 * 255 / 15) }

    guard let ctx = CGContext(
        data: nil, width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: width,
        space: CGColorSpaceCreateDeviceGray(),
        bitmapInfo: CGImageAlphaInfo.none.rawValue
    ) else { return nil }

    ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let data = ctx.data?.assumingMemoryBound(to: UInt8.self) else { return nil }

    // Convert to float buffer for precise error diffusion
    var floatBuf = [Float](repeating: 0, count: width * height)
    for i in 0..<(width * height) {
        floatBuf[i] = Float(data[i])
    }

    // Floyd-Steinberg in float
    for y in 0..<height {
        for x in 0..<width {
            let idx = y * width + x
            let old = floatBuf[idx]

            // Find closest 4-bit level
            var best = levels[0]
            var bestDiff = abs(old - Float(best))
            for l in levels.dropFirst() {
                let d = abs(old - Float(l))
                if d < bestDiff { best = l; bestDiff = d }
            }
            let newVal = Float(best)
            floatBuf[idx] = newVal
            let err = old - newVal

            // Diffuse error (Floyd-Steinberg weights)
            if x + 1 < width { floatBuf[idx + 1] += err * 7.0 / 16.0 }
            if y + 1 < height {
                if x > 0 { floatBuf[idx + width - 1] += err * 3.0 / 16.0 }
                floatBuf[idx + width] += err * 5.0 / 16.0
                if x + 1 < width { floatBuf[idx + width + 1] += err * 1.0 / 16.0 }
            }
        }
    }

    // Write back as uint8 (values are already exact quantized levels)
    for i in 0..<(width * height) {
        data[i] = UInt8(floatBuf[i])
    }

    return ctx.makeImage()
}

// MARK: - Invert

func invertImage(_ image: CGImage) -> CGImage? {
    let width = image.width
    let height = image.height
    guard let ctx = CGContext(
        data: nil, width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: width,
        space: CGColorSpaceCreateDeviceGray(),
        bitmapInfo: CGImageAlphaInfo.none.rawValue
    ) else { return nil }

    ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let data = ctx.data?.assumingMemoryBound(to: UInt8.self) else { return nil }

    for i in 0..<(width * height) {
        data[i] = 255 - data[i]
    }
    return ctx.makeImage()
}

// MARK: - Image processing pipeline

/// Process with optional crop rect in source-image coordinates (Cocoa, bottom-left origin)
func processImage(_ nsImage: NSImage, width: Int, height: Int, cropRect: CGRect? = nil) -> NSImage? {
    guard let tiff = nsImage.tiffRepresentation,
          NSBitmapImageRep(data: tiff) != nil else { return nil }

    // Resize
    let resized = NSImage(size: NSSize(width: width, height: height))
    resized.lockFocus()
    NSGraphicsContext.current?.imageInterpolation = .high

    if let crop = cropRect, crop.width > 0.001, crop.height > 0.001 {
        let dstRect = NSRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height))
        nsImage.draw(in: dstRect, from: crop, operation: .copy, fraction: 1.0)
    } else {
        nsImage.draw(in: NSRect(x: 0, y: 0, width: width, height: height),
                     from: .zero, operation: .copy, fraction: 1.0)
    }
    resized.unlockFocus()

    guard let resizedTIFF = resized.tiffRepresentation,
          let resizedRep = NSBitmapImageRep(data: resizedTIFF),
          let cgImage = resizedRep.cgImage else { return nil }

    // Convert to greyscale
    guard let greyCtx = CGContext(
        data: nil, width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: width,
        space: CGColorSpaceCreateDeviceGray(),
        bitmapInfo: CGImageAlphaInfo.none.rawValue
    ) else { return nil }
    greyCtx.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let greyImage = greyCtx.makeImage() else { return nil }

    // 4-bit dither
    guard let dithered = dither4Bit(greyImage) else { return nil }

    // Wrap back in NSImage
    let resultRep = NSBitmapImageRep(cgImage: dithered)
    let result = NSImage(size: NSSize(width: width, height: height))
    result.addRepresentation(resultRep)
    return result
}

// MARK: - SwiftUI App

@main
struct G2ConvertApp: App {
    init() {
        if CommandLine.arguments.contains("--version") {
            print(VersionInfo.string())
            exit(0)
        }
    }

    var body: some Scene {
        Window("G2 Convert", id: "main") {
            ContentView()
        }
        .windowResizability(.contentMinSize)
        .defaultSize(width: 520, height: 480)
    }
}

// MARK: - Presets

enum G2Preset: String, CaseIterable, Identifiable {
    case singleEye = "288×144"
    case dualEye   = "576×288"
    case custom    = "Custom"

    var id: String { rawValue }

    var size: (width: Int, height: Int)? {
        switch self {
        case .singleEye: return (288, 144)
        case .dualEye:   return (576, 288)
        case .custom:    return nil
        }
    }
}

// MARK: - Content View

struct ContentView: View {
    @State private var inputImage: NSImage? = nil
    @State private var rawOutputImage: NSImage? = nil     // always non-inverted
    @State private var outputPNGSize: Int = 0
    @State private var isTargeted = false
    @State private var status: String = "Drop an image or click Browse to begin"
    @State private var isProcessing = false
    @State private var selectedPreset: G2Preset = .singleEye
    @State private var customWidth: Int = 200
    @State private var customHeight: Int = 100
    @State private var zoom1to1 = false
    @State private var inverted = false

    // Crop
    @State private var cropEnabled = false
    @State private var cropCenter = CGPoint(x: 0.5, y: 0.5)  // normalized 0-1
    @State private var cropScale: CGFloat = 0.75              // fraction of image
    @State private var cropDragBase: CGPoint? = nil           // snapshot at gesture start

    /// Crop rectangle in normalized coords (0-1), aspect-ratio-locked to output.
    /// Mirrors the logic in sourceCropRect so the visual overlay matches the real crop.
    private var cropNormRect: CGRect {
        guard let img = inputImage else { return .zero }
        let imgW = img.size.width
        let imgH = img.size.height
        let imgRatio = imgW / imgH
        let outRatio = CGFloat(effectiveWidth) / CGFloat(effectiveHeight)

        // Max crop in normalized coords (0-1) — same logic as sourceCropRect
        let maxW: CGFloat, maxH: CGFloat
        if imgRatio > outRatio {
            // Source wider than output → height limits
            maxH = 1.0
            maxW = (outRatio / imgRatio)
        } else {
            // Source taller than or equal to output → width limits
            maxW = 1.0
            maxH = (imgRatio / outRatio)
        }

        let w = maxW * cropScale
        let h = maxH * cropScale
        let cx = max(w/2, min(1 - w/2, cropCenter.x))
        let cy = max(h/2, min(1 - h/2, cropCenter.y))
        return CGRect(x: cx - w/2, y: cy - h/2, width: w, height: h)
    }

    /// Derived display image: raw or inverted
    private var displayImage: NSImage? {
        guard let raw = rawOutputImage else { return nil }
        if !inverted { return raw }
        guard let tiff = raw.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff),
              let cg = rep.cgImage,
              let inv = invertImage(cg) else { return raw }
        let result = NSImage(size: raw.size)
        result.addRepresentation(NSBitmapImageRep(cgImage: inv))
        return result
    }

    private var effectiveWidth: Int {
        if let size = selectedPreset.size { return size.width }
        return customWidth
    }
    private var effectiveHeight: Int {
        if let size = selectedPreset.size { return size.height }
        return customHeight
    }

    var body: some View {
        HSplitView {
            // Left panel — input
            VStack(spacing: 0) {
                Text("Source")
                    .font(.headline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.top, 12)
                    .padding(.bottom, 6)

                dropZone
                    .padding(.horizontal, 12)
                    .padding(.bottom, 8)

                // Crop controls
                if inputImage != nil {
                    VStack(spacing: 4) {
                        HStack {
                            Toggle("Crop", isOn: $cropEnabled)
                                .font(.caption)
                                .disabled(isProcessing)
                                .onChange(of: cropEnabled) { reprocessIfNeeded() }
                            Spacer()
                            if cropEnabled {
                                Text("\(Int(cropScale * 100))%")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .monospacedDigit()
                            }
                        }
                        if cropEnabled {
                            Slider(value: $cropScale, in: 0.1...1.0, step: 0.05)
                                .onChange(of: cropScale) { reprocessIfNeeded() }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 6)
                }

                Divider().padding(.horizontal, 12)

                PresetPicker(selected: $selectedPreset,
                             customWidth: $customWidth, customHeight: $customHeight,
                             onChange: reprocessIfNeeded)
                    .padding(12)
                    .disabled(isProcessing || inputImage == nil)

                Spacer()

                Button("Browse…") { openFilePicker() }
                    .disabled(isProcessing)
                    .padding(.bottom, 12)
            }
            .frame(minWidth: 220, idealWidth: 260)
            .background(Color.primary.opacity(0.02))

            // Right panel — output preview
            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("G2 Preview")
                        .font(.headline)
                        .foregroundColor(.secondary)

                    Spacer()

                    if rawOutputImage != nil {
                        HStack(spacing: 4) {
                            Text("\(effectiveWidth)×\(effectiveHeight)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("·")
                                .foregroundColor(.secondary.opacity(0.4))
                            Text(ByteCountFormatter.string(
                                fromByteCount: Int64(outputPNGSize),
                                countStyle: .file))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 12)
                .padding(.bottom, 6)

                // Preview area
                previewArea
                    .padding(.horizontal, 12)
                    .padding(.bottom, 8)

                // Zoom + Invert toggles
                HStack {
                    Spacer()
                    if rawOutputImage != nil {
                        Toggle("1:1", isOn: $zoom1to1)
                            .toggleStyle(.button)
                            .controlSize(.small)
                            .font(.caption)
                        Toggle("Invert", isOn: $inverted)
                            .toggleStyle(.button)
                            .controlSize(.small)
                            .font(.caption)
                    }
                    Button("Save As…") { saveImage() }
                        .disabled(rawOutputImage == nil || isProcessing)
                        .keyboardShortcut("s", modifiers: .command)
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 8)

                // Status bar
                HStack {
                    if isProcessing {
                        ProgressView()
                            .scaleEffect(0.6)
                            .frame(width: 16, height: 16)
                    }
                    Text(status)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 10)
            }
            .frame(minWidth: 300, idealWidth: 400)
            .layoutPriority(1)
        }
        .frame(minWidth: 620, minHeight: 420)
    }

    // MARK: - Drop Zone

    private var dropZone: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(isTargeted
                    ? Color.accentColor.opacity(0.1)
                    : Color.secondary.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isTargeted
                            ? Color.accentColor
                            : Color.secondary.opacity(0.15),
                                style: SwiftUI.StrokeStyle(lineWidth: 2, dash: [6]))
                )

            GeometryReader { geo in
                if let img = inputImage {
                    // Source image
                    Image(nsImage: img)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .padding(8)

                    // Crop overlay
                    if cropEnabled {
                        cropOverlay(in: geo)
                    }
                } else {
                    VStack(spacing: 8) {
                        Image(systemName: "photo.badge.plus")
                            .font(.system(size: 28))
                            .foregroundColor(.secondary.opacity(0.5))
                        Text("Drop image")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .frame(minHeight: 140, idealHeight: 180)
        .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers in
            handleDrop(providers: providers)
            return true
        }
    }

    /// Crop overlay on source image — locked to output aspect ratio
    private func cropOverlay(in geo: GeometryProxy) -> some View {
        let imgSize = inputImage?.size ?? .zero
        guard imgSize.width > 0, imgSize.height > 0 else {
            return AnyView(EmptyView())
        }
        let padding: CGFloat = 8
        let viewW = geo.size.width - padding * 2
        let viewH = geo.size.height - padding * 2
        let scale = min(viewW / imgSize.width, viewH / imgSize.height)
        let drawW = imgSize.width * scale
        let drawH = imgSize.height * scale
        let drawX = padding + (viewW - drawW) / 2
        let drawY = padding + (viewH - drawH) / 2

        let r = cropNormRect
        let cropX = drawX + r.origin.x * drawW
        let cropY = drawY + r.origin.y * drawH
        let cropW = r.width * drawW
        let cropH = r.height * drawH

        return ZStack {
            // Invisible full-area drag target (must be first for gesture priority)
            Color.clear
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 1)
                        .onChanged { value in
                            if cropDragBase == nil {
                                cropDragBase = cropCenter
                            }
                            guard let base = cropDragBase else { return }
                            let dx = value.translation.width / drawW
                            let dy = value.translation.height / drawH
                            cropCenter.x = (base.x + dx).clamped(to: 0...1)
                            cropCenter.y = (base.y + dy).clamped(to: 0...1)
                        }
                        .onEnded { _ in
                            cropDragBase = nil
                        }
                )

            // Dim outside crop area
            Path { path in
                path.addRect(CGRect(x: 0, y: 0, width: geo.size.width, height: geo.size.height))
                path.addRect(CGRect(x: cropX, y: cropY, width: cropW, height: cropH))
            }
            .fill(Color.black.opacity(0.35), style: FillStyle(eoFill: true))
            .allowsHitTesting(false)

            // Crop rectangle border
            RoundedRectangle(cornerRadius: 2)
                .stroke(Color.accentColor, lineWidth: 1.5)
                .frame(width: cropW, height: cropH)
                .position(x: cropX + cropW/2, y: cropY + cropH/2)
                .allowsHitTesting(false)

            // Corner handles
            ForEach(0..<4) { i in
                let cx: CGFloat = i == 0 || i == 2 ? cropX : cropX + cropW
                let cy: CGFloat = i < 2 ? cropY : cropY + cropH
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.accentColor)
                    .frame(width: 8, height: 8)
                    .position(x: cx, y: cy)
                    .allowsHitTesting(false)
            }

            // Rule of thirds guides
            Path { p in
                for i in 1...2 {
                    let lx = cropX + cropW * CGFloat(i) / 3.0
                    p.move(to: CGPoint(x: lx, y: cropY))
                    p.addLine(to: CGPoint(x: lx, y: cropY + cropH))
                    let ly = cropY + cropH * CGFloat(i) / 3.0
                    p.move(to: CGPoint(x: cropX, y: ly))
                    p.addLine(to: CGPoint(x: cropX + cropW, y: ly))
                }
            }
            .stroke(Color.white.opacity(0.2), lineWidth: 0.5)
            .allowsHitTesting(false)
        }
        .eraseToAnyView()
    }

    // MARK: - Preview Area

    private var previewArea: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.secondary.opacity(0.03))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color.secondary.opacity(0.08), lineWidth: 1)
                )

            if let img = displayImage {
                Image(nsImage: img)
                    .resizable()
                    .aspectRatio(contentMode: zoom1to1 ? .fit : .fit)
                    .frame(
                        maxWidth: zoom1to1 ? CGFloat(effectiveWidth) : nil,
                        maxHeight: zoom1to1 ? CGFloat(effectiveHeight) : nil
                    )
                    .padding(zoom1to1 ? 0 : 12)
                    .drawingGroup()  // force Metal render for crisp pixel display
                    .background(
                        CheckerboardBackground()
                    )
            } else if isProcessing {
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Converting…")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else {
                VStack(spacing: 6) {
                    Image(systemName: "eye.slash")
                        .font(.system(size: 22))
                        .foregroundColor(.secondary.opacity(0.3))
                    Text("No output yet")
                        .font(.caption)
                        .foregroundColor(.secondary.opacity(0.4))
                }
            }
        }
        .frame(minHeight: 180, idealHeight: 240)
        .clipped()
    }

    // MARK: - Actions

    private func handleDrop(providers: [NSItemProvider]) {
        guard let provider = providers.first else { return }
        _ = provider.loadObject(ofClass: URL.self) { url, _ in
            guard let url = url, let img = NSImage(contentsOf: url) else { return }
            DispatchQueue.main.async {
                self.inputImage = img
                self.inverted = false
                self.cropEnabled = false
                self.cropCenter = CGPoint(x: 0.5, y: 0.5)
                self.cropScale = 0.75
                self.process()
            }
        }
    }

    private func openFilePicker() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.png, .jpeg, .heic, .bmp, .tiff]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.message = "Select an image to convert for Even Realities G2 display"
        guard panel.runModal() == .OK, let url = panel.url,
              let img = NSImage(contentsOf: url) else { return }
        inputImage = img
        inverted = false
        cropEnabled = false
        cropCenter = CGPoint(x: 0.5, y: 0.5)
        cropScale = 0.75
        process()
    }

    private func process() {
        guard let input = inputImage else { return }
        isProcessing = true
        status = "Converting…"
        let w = effectiveWidth, h = effectiveHeight
        let presetLabel = selectedPreset.rawValue
        let srcSize = input.size
        let srcCrop: CGRect? = cropEnabled ? sourceCropRect(for: srcSize, outW: w, outH: h) : nil
        DispatchQueue.global(qos: .userInitiated).async {
            let result = processImage(input, width: w, height: h, cropRect: srcCrop)
            let pngSize: Int
            if let result = result,
               let tiff = result.tiffRepresentation,
               let rep = NSBitmapImageRep(data: tiff),
               let png = rep.representation(using: .png, properties: [:]) {
                pngSize = png.count
            } else {
                pngSize = 0
            }
            DispatchQueue.main.async {
                rawOutputImage = result
                outputPNGSize = pngSize
                isProcessing = false
                if result != nil {
                    let sizeStr = ByteCountFormatter.string(fromByteCount: Int64(pngSize), countStyle: .file)
                    status = "Ready — \(presetLabel) (\(w)×\(h)) — \(sizeStr)"
                } else {
                    status = "Conversion failed"
                }
            }
        }
    }

    private func reprocessIfNeeded() {
        guard inputImage != nil else { return }
        process()
    }

    /// Compute the source-image crop rect (Cocoa coords, bottom-left origin)
    /// from the overlay's normalized center + scale, preserving output aspect ratio.
    private func sourceCropRect(for srcSize: CGSize, outW: Int, outH: Int) -> CGRect {
        let srcW = srcSize.width
        let srcH = srcSize.height
        let outRatio = CGFloat(outW) / CGFloat(outH)
        let srcRatio = srcW / srcH

        // Determine crop dimensions in source pixels (aspect-ratio-locked to output)
        let cropW: CGFloat, cropH: CGFloat
        if srcRatio > outRatio {
            // Source is wider than output → height is the constraining dimension
            cropH = srcH * cropScale
            cropW = cropH * outRatio
        } else {
            // Source is taller than (or equal to) output → width constrains
            cropW = srcW * cropScale
            cropH = cropW / outRatio
        }

        // Position from normalized center (overlay: 0=top, 1=bottom)
        // Convert to source coords (Cocoa: 0=bottom)
        let srcCenterX = cropCenter.x * srcW
        let srcCenterY = srcH * (1 - cropCenter.y)   // flip Y: overlay top → source bottom

        // Clamp center so crop rect stays within source bounds
        let cx = Swift.max(cropW / 2, Swift.min(srcW - cropW / 2, srcCenterX))
        let cy = Swift.max(cropH / 2, Swift.min(srcH - cropH / 2, srcCenterY))

        return CGRect(x: cx - cropW / 2, y: cy - cropH / 2, width: cropW, height: cropH)
    }

    private func saveImage() {
        guard let display = displayImage,
              let tiff = display.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff),
              let png = rep.representation(using: .png, properties: [:]) else { return }

        let panel = NSSavePanel()
        panel.allowedContentTypes = [.png]
        panel.nameFieldStringValue = "image-g2.png"
        panel.message = "Save 4-bit greyscale PNG for G2"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        try? png.write(to: url)
        status = "Saved: \(url.lastPathComponent)"
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }
}

// MARK: - Preset Picker

struct PresetPicker: View {
    @Binding var selected: G2Preset
    @Binding var customWidth: Int
    @Binding var customHeight: Int
    var onChange: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("G2 Preset")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 4) {
                ForEach(G2Preset.allCases) { preset in
                    Button(preset.rawValue) {
                        selected = preset
                        onChange()
                    }
                    .buttonStyle(.bordered)
                    .tint(selected == preset ? .accentColor : nil)
                    .controlSize(.small)
                    .font(.caption)
                }
            }

            if selected == .custom {
                HStack(spacing: 6) {
                    Text("W:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextField("", value: $customWidth, format: .number)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 60)
                        .onChange(of: customWidth) { onChange() }
                    Text("H:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextField("", value: $customHeight, format: .number)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 60)
                        .onChange(of: customHeight) { onChange() }
                }
            }

            if let s = selected.size {
                Text("Display \(s.width)×\(s.height) px — \(selected == .singleEye ? "single" : "dual") eye")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary.opacity(0.6))
            }
        }
    }
}

// MARK: - Checkerboard Background (shows transparency / 4-bit grit)

struct CheckerboardBackground: View {
    let tileSize: CGFloat = 8
    let colorA = Color.primary.opacity(0.03)
    let colorB = Color.primary.opacity(0.00)

    var body: some View {
        Canvas { ctx, size in
            let cols = Int(ceil(size.width / tileSize))
            let rows = Int(ceil(size.height / tileSize))
            for row in 0..<rows {
                for col in 0..<cols {
                    let isEven = (row + col) % 2 == 0
                    ctx.fill(
                        Path(CGRect(x: CGFloat(col) * tileSize,
                                    y: CGFloat(row) * tileSize,
                                    width: tileSize, height: tileSize)),
                        with: .color(isEven ? colorA : colorB)
                    )
                }
            }
        }
    }
}

// MARK: - Helpers

extension CGFloat {
    func clamped(to range: ClosedRange<CGFloat>) -> CGFloat {
        Swift.max(range.lowerBound, Swift.min(range.upperBound, self))
    }
}

extension View {
    func eraseToAnyView() -> AnyView { AnyView(self) }
}
