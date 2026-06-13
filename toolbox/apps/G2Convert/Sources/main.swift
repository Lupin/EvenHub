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

func processImage(_ nsImage: NSImage, width: Int, height: Int) -> NSImage? {
    guard let tiff = nsImage.tiffRepresentation,
          NSBitmapImageRep(data: tiff) != nil else { return nil }

    // Resize (full image, no crop)
    let resized = NSImage(size: NSSize(width: width, height: height))
    resized.lockFocus()
    NSGraphicsContext.current?.imageInterpolation = .high
    nsImage.draw(in: NSRect(x: 0, y: 0, width: width, height: height),
                 from: .zero, operation: .copy, fraction: 1.0)
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
                    Text("Gael Abegg Gauthey  ·  MIT License")
                        .font(.caption2)
                        .foregroundColor(.secondary.opacity(0.6))
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

            if let img = inputImage {
                Image(nsImage: img)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .padding(8)
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
        .frame(minHeight: 140, idealHeight: 180)
        .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers in
            handleDrop(providers: providers)
            return true
        }
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
        process()
    }

    private func process() {
        guard let input = inputImage else { return }
        isProcessing = true
        status = "Converting…"
        let w = effectiveWidth, h = effectiveHeight
        let presetLabel = selectedPreset.rawValue
        DispatchQueue.global(qos: .userInitiated).async {
            let result = processImage(input, width: w, height: h)
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
                        .onSubmit { onChange() }
                    Text("H:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextField("", value: $customHeight, format: .number)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 60)
                        .onSubmit { onChange() }
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
