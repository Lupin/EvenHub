#!/usr/bin/env swift

// G2Convert — Standalone test runner (no XCTest needed)
// Run with: swift Tests/test_runner.swift
//
// The functions under test live in Sources/main.swift.
// We compile them together here.

import AppKit

// ===========================================================================
// Functions under test (copied from Sources/main.swift)
// ===========================================================================

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

/// Process with optional crop rect in source-image coordinates (Cocoa, bottom-left origin)
func processImage(_ nsImage: NSImage, width: Int, height: Int, cropRect: CGRect? = nil) -> NSImage? {
    guard let tiff = nsImage.tiffRepresentation,
          NSBitmapImageRep(data: tiff) != nil else { return nil }

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

    guard let greyCtx = CGContext(
        data: nil, width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: width,
        space: CGColorSpaceCreateDeviceGray(),
        bitmapInfo: CGImageAlphaInfo.none.rawValue
    ) else { return nil }
    greyCtx.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let greyImage = greyCtx.makeImage() else { return nil }

    guard let dithered = dither4Bit(greyImage) else { return nil }

    let resultRep = NSBitmapImageRep(cgImage: dithered)
    let result = NSImage(size: NSSize(width: width, height: height))
    result.addRepresentation(resultRep)
    return result
}

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

// ===========================================================================
// Test helpers
// ===========================================================================

func createTestImage(width: Int, height: Int, color: NSColor) -> NSImage {
    // Create at exact pixel dimensions, avoiding Retina 2× scaling
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: width * 4,
        bitsPerPixel: 32
    ) else { return NSImage() }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    color.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()
    NSGraphicsContext.restoreGraphicsState()
    let img = NSImage(size: NSSize(width: width, height: height))
    img.addRepresentation(rep)
    return img
}

func createGradientImage(width: Int, height: Int) -> NSImage {
    let img = NSImage(size: NSSize(width: width, height: height))
    img.lockFocus()
    guard let ctx = NSGraphicsContext.current?.cgContext else {
        img.unlockFocus()
        return img
    }
    let colors = [NSColor.black.cgColor, NSColor.white.cgColor] as CFArray
    guard let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceGray(),
                                    colors: colors, locations: [0, 1]) else {
        img.unlockFocus()
        return img
    }
    ctx.drawLinearGradient(gradient,
                           start: CGPoint(x: 0, y: 0),
                           end: CGPoint(x: width, y: 0),
                           options: [])
    img.unlockFocus()
    return img
}

var passed = 0
var failed = 0

func test(_ name: String, _ block: () throws -> Void) {
    do {
        try block()
        passed += 1
        print("  ✓ \(name)")
    } catch {
        failed += 1
        print("  ✗ \(name): \(error)")
    }
}

func assertEqual<T: Equatable>(_ a: T, _ b: T, _ msg: String) throws {
    guard a == b else { throw TestError("\(msg): \(a) != \(b)") }
}

func assertNotNil(_ val: Any?, _ msg: String) throws {
    guard val != nil else { throw TestError("\(msg): nil") }
}

func assertGreaterThan<T: Comparable>(_ a: T, _ b: T, _ msg: String) throws {
    guard a > b else { throw TestError("\(msg): \(a) <= \(b)") }
}

func assertGreaterThanOrEqual<T: Comparable>(_ a: T, _ b: T, _ msg: String) throws {
    guard a >= b else { throw TestError("\(msg): \(a) < \(b)") }
}

func assertLessThan<T: Comparable>(_ a: T, _ b: T, _ msg: String) throws {
    guard a < b else { throw TestError("\(msg): \(a) >= \(b)") }
}

func assertLessThanOrEqual<T: Comparable>(_ a: T, _ b: T, _ msg: String) throws {
    guard a <= b else { throw TestError("\(msg): \(a) > \(b)") }
}

struct TestError: Error, CustomStringConvertible {
    let description: String
    init(_ msg: String) { self.description = msg }
}

// ===========================================================================
// Tests
// ===========================================================================

print("=== G2Convert Tests ===\n")

// dither4Bit
print("dither4Bit:")
test("preserves dimensions") {
    let img = createTestImage(width: 64, height: 64, color: .white)
    let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let result = dither4Bit(cg)
    try assertNotNil(result, "result nil")
    try assertEqual(result!.width, 64, "width")
    try assertEqual(result!.height, 64, "height")
}

test("produces 4-bit levels") {
    let gradient = createGradientImage(width: 128, height: 128)
    let cg = gradient.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let dithered = dither4Bit(cg)!

    // Read raw pixels directly from the CGImage (avoid ctx.draw which may alter values)
    guard let dataProvider = dithered.dataProvider,
          let pixelData = dataProvider.data else {
        throw TestError("Failed to get pixel data from dithered image")
    }
    let data = CFDataGetBytePtr(pixelData)!
    let pixelCount = 128 * 128

    let validLevels: Set<UInt8> = Set((0...15).map { UInt8($0 * 255 / 15) })
    var seenLevels = Set<UInt8>()
    for i in 0..<pixelCount {
        let v = data[i]
        seenLevels.insert(v)
        guard validLevels.contains(v) else {
            throw TestError("Pixel \(v) not in valid 4-bit levels")
        }
    }
    try assertGreaterThanOrEqual(seenLevels.count, 3, "distinct levels count")
    print("    → \(seenLevels.count) distinct 4-bit levels seen")
}

test("solid black → all zeros") {
    let img = createTestImage(width: 64, height: 64, color: .black)
    let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let dithered = dither4Bit(cg)!
    let ctx = CGContext(data: nil, width: 64, height: 64,
                        bitsPerComponent: 8, bytesPerRow: 64,
                        space: CGColorSpaceCreateDeviceGray(),
                        bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    ctx.draw(dithered, in: CGRect(x: 0, y: 0, width: 64, height: 64))
    let data = ctx.data!.assumingMemoryBound(to: UInt8.self)
    for i in 0..<(64*64) {
        try assertEqual(data[i], 0, "pixel[\(i)]")
    }
}

test("solid white → all 255") {
    let img = createTestImage(width: 64, height: 64, color: .white)
    let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let dithered = dither4Bit(cg)!
    let ctx = CGContext(data: nil, width: 64, height: 64,
                        bitsPerComponent: 8, bytesPerRow: 64,
                        space: CGColorSpaceCreateDeviceGray(),
                        bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    ctx.draw(dithered, in: CGRect(x: 0, y: 0, width: 64, height: 64))
    let data = ctx.data!.assumingMemoryBound(to: UInt8.self)
    for i in 0..<(64*64) {
        try assertEqual(data[i], 255, "pixel[\(i)]")
    }
}

// processImage
print("\nprocessImage:")
test("respects target dimensions") {
    let img = createTestImage(width: 512, height: 512, color: .gray)
    let result = processImage(img, width: 200, height: 100)
    try assertNotNil(result, "result nil")
    try assertEqual(result!.size.width, 200, "width")
    try assertEqual(result!.size.height, 100, "height")
}

test("outputs valid PNG") {
    let img = createTestImage(width: 300, height: 300, color: .gray)
    let result = processImage(img, width: 288, height: 144)!
    guard let tiff = result.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff) else {
        throw TestError("No TIFF representation")
    }
    let png = rep.representation(using: .png, properties: [:])
    try assertNotNil(png, "png nil")
    try assertGreaterThan(png!.count, 0, "png empty")
    try assertLessThan(png!.count, 20000, "png too large")
    print("    → PNG size: \(png!.count) bytes")
}

test("minimum dimensions (20×20)") {
    let img = createTestImage(width: 100, height: 100, color: .gray)
    let result = processImage(img, width: 20, height: 20)
    try assertNotNil(result, "result nil")
    try assertEqual(result!.size.width, 20, "width")
    try assertEqual(result!.size.height, 20, "height")
}

test("maximum dimensions (288×144)") {
    let img = createTestImage(width: 600, height: 600, color: .gray)
    let result = processImage(img, width: 288, height: 144)
    try assertNotNil(result, "result nil")
    try assertEqual(result!.size.width, 288, "width")
    try assertEqual(result!.size.height, 144, "height")
}

// invertImage
print("\ninvertImage:")
test("preserves dimensions") {
    let img = createTestImage(width: 64, height: 64, color: .gray)
    let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    // Convert to greyscale first
    let greyCtx = CGContext(data: nil, width: 64, height: 64,
                            bitsPerComponent: 8, bytesPerRow: 64,
                            space: CGColorSpaceCreateDeviceGray(),
                            bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    greyCtx.draw(cg, in: CGRect(x: 0, y: 0, width: 64, height: 64))
    let grey = greyCtx.makeImage()!
    let inverted = invertImage(grey)!
    try assertEqual(inverted.width, 64, "width")
    try assertEqual(inverted.height, 64, "height")
}

test("inverts all pixels (black ↔ white)") {
    // Black → should become white (255)
    let black = createTestImage(width: 32, height: 32, color: .black)
    let cgB = black.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let greyCtxB = CGContext(data: nil, width: 32, height: 32,
                             bitsPerComponent: 8, bytesPerRow: 32,
                             space: CGColorSpaceCreateDeviceGray(),
                             bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    greyCtxB.draw(cgB, in: CGRect(x: 0, y: 0, width: 32, height: 32))
    let invBlack = invertImage(greyCtxB.makeImage()!)!
    let ctxB = CGContext(data: nil, width: 32, height: 32,
                         bitsPerComponent: 8, bytesPerRow: 32,
                         space: CGColorSpaceCreateDeviceGray(),
                         bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    ctxB.draw(invBlack, in: CGRect(x: 0, y: 0, width: 32, height: 32))
    let dataB = ctxB.data!.assumingMemoryBound(to: UInt8.self)
    for i in 0..<(32*32) {
        try assertEqual(dataB[i], 255, "black inverted pixel[\(i)]")
    }

    // White → should become black (0)
    let white = createTestImage(width: 32, height: 32, color: .white)
    let cgW = white.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let greyCtxW = CGContext(data: nil, width: 32, height: 32,
                             bitsPerComponent: 8, bytesPerRow: 32,
                             space: CGColorSpaceCreateDeviceGray(),
                             bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    greyCtxW.draw(cgW, in: CGRect(x: 0, y: 0, width: 32, height: 32))
    let invWhite = invertImage(greyCtxW.makeImage()!)!
    let ctxW = CGContext(data: nil, width: 32, height: 32,
                         bitsPerComponent: 8, bytesPerRow: 32,
                         space: CGColorSpaceCreateDeviceGray(),
                         bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    ctxW.draw(invWhite, in: CGRect(x: 0, y: 0, width: 32, height: 32))
    let dataW = ctxW.data!.assumingMemoryBound(to: UInt8.self)
    for i in 0..<(32*32) {
        try assertEqual(dataW[i], 0, "white inverted pixel[\(i)]")
    }
}

test("double invert = identity") {
    let grey = createTestImage(width: 32, height: 32, color: NSColor(white: 0.5, alpha: 1))
    let cg = grey.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    let greyCtx = CGContext(data: nil, width: 32, height: 32,
                            bitsPerComponent: 8, bytesPerRow: 32,
                            space: CGColorSpaceCreateDeviceGray(),
                            bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    greyCtx.draw(cg, in: CGRect(x: 0, y: 0, width: 32, height: 32))
    let original = greyCtx.makeImage()!

    let once = invertImage(original)!
    let twice = invertImage(once)!

    let ctxO = CGContext(data: nil, width: 32, height: 32,
                         bitsPerComponent: 8, bytesPerRow: 32,
                         space: CGColorSpaceCreateDeviceGray(),
                         bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    ctxO.draw(original, in: CGRect(x: 0, y: 0, width: 32, height: 32))
    let dataO = ctxO.data!.assumingMemoryBound(to: UInt8.self)

    let ctxT = CGContext(data: nil, width: 32, height: 32,
                         bitsPerComponent: 8, bytesPerRow: 32,
                         space: CGColorSpaceCreateDeviceGray(),
                         bitmapInfo: CGImageAlphaInfo.none.rawValue)!
    ctxT.draw(twice, in: CGRect(x: 0, y: 0, width: 32, height: 32))
    let dataT = ctxT.data!.assumingMemoryBound(to: UInt8.self)

    for i in 0..<(32*32) {
        try assertEqual(dataO[i], dataT[i], "double invert pixel[\(i)]")
    }
}

// processImage with crop — horizontal image diagnostic
print("\nprocessImage with crop (horizontal):")
test("crop left half of horizontal 800×200 → dark output") {
    // Create 800×200 image: left 400px black, right 400px white
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: 800, pixelsHigh: 200,
        bitsPerSample: 8, samplesPerPixel: 4,
        hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 800 * 4, bitsPerPixel: 32
    ) else { throw TestError("rep nil") }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSColor.black.setFill()
    NSRect(x: 0, y: 0, width: 400, height: 200).fill()
    NSColor.white.setFill()
    NSRect(x: 400, y: 0, width: 400, height: 200).fill()
    NSGraphicsContext.restoreGraphicsState()

    let srcImage = NSImage(size: NSSize(width: 800, height: 200))
    srcImage.addRepresentation(rep)

    // Crop left half: cropCenter.x=0.25 (centered at 25% of width)
    // sourceCropRect should be x=[0,400], y=[0,200] — the black half
    // Simulate sourceCropRect logic manually:
    let srcW: CGFloat = 800, srcH: CGFloat = 200
    let outW = 288, outH = 144
    let outRatio = CGFloat(outW) / CGFloat(outH)  // 2.0
    let cropScale: CGFloat = 1.0

    // srcRatio=4.0 > outRatio=2.0 → horizontal branch
    let cropH = srcH * cropScale  // 200
    let cropW = cropH * outRatio  // 400

    // cropCenter.x=0.25 (left quarter), cropCenter.y=0.5 (middle)
    let cx: CGFloat = 0.25, cy: CGFloat = 0.5
    let srcCenterX = cx * srcW  // 200
    let srcCenterY = srcH * (1 - cy)  // 100

    let ccx = Swift.max(cropW/2, Swift.min(srcW - cropW/2, srcCenterX))  // 200
    let ccy = Swift.max(cropH/2, Swift.min(srcH - cropH/2, srcCenterY))  // 100

    let cropRect = CGRect(x: ccx - cropW/2, y: ccy - cropH/2, width: cropW, height: cropH)
    // Expected: (0, 0, 400, 200) — the black half
    try assertEqual(Int(cropRect.origin.x), 0, "crop origin x")
    try assertEqual(Int(cropRect.origin.y), 0, "crop origin y")
    try assertEqual(Int(cropRect.width), 400, "crop width")
    try assertEqual(Int(cropRect.height), 200, "crop height")

    // Now actually run processImage with this crop
    let result = processImage(srcImage, width: outW, height: outH, cropRect: cropRect)
    try assertNotNil(result, "result nil")

    // Read output pixels to verify they're dark (black half)
    guard let tiff = result!.tiffRepresentation,
          let outRep = NSBitmapImageRep(data: tiff),
          let cgOut = outRep.cgImage else {
        throw TestError("Failed to get output CGImage")
    }
    guard let dataProvider = cgOut.dataProvider,
          let pixelData = dataProvider.data else {
        throw TestError("Failed to get output pixel data")
    }
    let data = CFDataGetBytePtr(pixelData)!
    let pixelCount = outW * outH

    var sum: Int = 0
    for i in 0..<pixelCount { sum += Int(data[i]) }
    let avg = Double(sum) / Double(pixelCount)

    // Should be very dark (the dither of black is all zeros)
    try assertLessThan(avg, 20, "left-half crop should be dark (avg \(Int(avg)))")
    print("    → avg pixel: \(Int(avg)) (expected near 0)")
}

test("crop right half of horizontal 800×200 → bright output") {
    // Same source image: left 400 black, right 400 white
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: 800, pixelsHigh: 200,
        bitsPerSample: 8, samplesPerPixel: 4,
        hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 800 * 4, bitsPerPixel: 32
    ) else { throw TestError("rep nil") }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSColor.black.setFill()
    NSRect(x: 0, y: 0, width: 400, height: 200).fill()
    NSColor.white.setFill()
    NSRect(x: 400, y: 0, width: 400, height: 200).fill()
    NSGraphicsContext.restoreGraphicsState()

    let srcImage = NSImage(size: NSSize(width: 800, height: 200))
    srcImage.addRepresentation(rep)

    let srcW: CGFloat = 800, srcH: CGFloat = 200
    let outW = 288, outH = 144
    let outRatio = CGFloat(outW) / CGFloat(outH)
    let cropScale: CGFloat = 1.0
    let cropH = srcH * cropScale
    let cropW = cropH * outRatio

    // cropCenter.x=0.75 (right quarter), cropCenter.y=0.5
    let cx: CGFloat = 0.75, cy: CGFloat = 0.5
    let srcCenterX = cx * srcW  // 600
    let srcCenterY = srcH * (1 - cy)  // 100

    let ccx = Swift.max(cropW/2, Swift.min(srcW - cropW/2, srcCenterX))  // 600
    let ccy = Swift.max(cropH/2, Swift.min(srcH - cropH/2, srcCenterY))  // 100

    let cropRect = CGRect(x: ccx - cropW/2, y: ccy - cropH/2, width: cropW, height: cropH)
    // Expected: (400, 0, 400, 200) — the white half
    try assertEqual(Int(cropRect.origin.x), 400, "crop origin x")
    try assertEqual(Int(cropRect.origin.y), 0, "crop origin y")

    let result = processImage(srcImage, width: outW, height: outH, cropRect: cropRect)
    try assertNotNil(result, "result nil")

    guard let tiff = result!.tiffRepresentation,
          let outRep = NSBitmapImageRep(data: tiff),
          let cgOut = outRep.cgImage,
          let dataProvider = cgOut.dataProvider,
          let pixelData = dataProvider.data else {
        throw TestError("Failed to get output pixel data")
    }
    let data = CFDataGetBytePtr(pixelData)!
    let pixelCount = outW * outH

    var sum: Int = 0
    for i in 0..<pixelCount { sum += Int(data[i]) }
    let avg = Double(sum) / Double(pixelCount)

    // Should be very bright (dither of white is all 255)
    try assertGreaterThan(avg, 235, "right-half crop should be bright (avg \(Int(avg)))")
    print("    → avg pixel: \(Int(avg)) (expected near 255)")
}

// Vertical crop Y-axis diagnostic
print("\nprocessImage with crop (vertical Y-axis):")
test("crop top half of vertical image → dark output") {
    // Create 200×800 image: top 400px black, bottom 400px white
    // Note: in Cocoa (bottom-left origin), "top" is high Y values
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: 200, pixelsHigh: 800,
        bitsPerSample: 8, samplesPerPixel: 4,
        hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 200 * 4, bitsPerPixel: 32
    ) else { throw TestError("rep nil") }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    // In Cocoa, y=0 is bottom. So top half = y in [400, 800]
    NSColor.black.setFill()
    NSRect(x: 0, y: 400, width: 200, height: 400).fill()
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: 200, height: 400).fill()
    NSGraphicsContext.restoreGraphicsState()

    let srcImage = NSImage(size: NSSize(width: 200, height: 800))
    srcImage.addRepresentation(rep)

    let srcW: CGFloat = 200, srcH: CGFloat = 800
    let outW = 288, outH = 144
    let outRatio = CGFloat(outW) / CGFloat(outH)  // 2.0
    let cropScale: CGFloat = 1.0

    // srcRatio=0.25 < outRatio=2.0 → "taller" branch
    let cropW = srcW * cropScale  // 200
    let cropH = cropW / outRatio  // 100

    // cropCenter.y=0.25 (near top in overlay)
    let cx: CGFloat = 0.5, cy: CGFloat = 0.25
    let srcCenterX = cx * srcW  // 100
    let srcCenterY = srcH * (1 - cy)  // 800 * 0.75 = 600

    let ccx = Swift.max(cropW/2, Swift.min(srcW - cropW/2, srcCenterX))  // 100
    let ccy = Swift.max(cropH/2, Swift.min(srcH - cropH/2, srcCenterY))  // max(50, min(750, 600)) = 600

    let cropRect = CGRect(x: ccx - cropW/2, y: ccy - cropH/2, width: cropW, height: cropH)
    // y=600-50=550 to y=600+50=650 → top portion in Cocoa → black region
    try assertEqual(Int(cropRect.origin.y), 550, "crop origin y (top → dark)")
    try assertEqual(Int(cropRect.height), 100, "crop height")

    let result = processImage(srcImage, width: outW, height: outH, cropRect: cropRect)
    try assertNotNil(result, "result nil")

    guard let tiff = result!.tiffRepresentation,
          let outRep = NSBitmapImageRep(data: tiff),
          let cgOut = outRep.cgImage,
          let dataProvider = cgOut.dataProvider,
          let pixelData = dataProvider.data else {
        throw TestError("Failed to get output pixel data")
    }
    let data = CFDataGetBytePtr(pixelData)!
    let pixelCount = outW * outH

    var sum: Int = 0
    for i in 0..<pixelCount { sum += Int(data[i]) }
    let avg = Double(sum) / Double(pixelCount)

    try assertLessThan(avg, 20, "top-half crop should be dark (avg \(Int(avg)))")
    print("    → avg pixel: \(Int(avg)) (expected near 0)")
}

test("crop bottom half of vertical image → bright output") {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: 200, pixelsHigh: 800,
        bitsPerSample: 8, samplesPerPixel: 4,
        hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 200 * 4, bitsPerPixel: 32
    ) else { throw TestError("rep nil") }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSColor.black.setFill()
    NSRect(x: 0, y: 400, width: 200, height: 400).fill()
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: 200, height: 400).fill()
    NSGraphicsContext.restoreGraphicsState()

    let srcImage = NSImage(size: NSSize(width: 200, height: 800))
    srcImage.addRepresentation(rep)

    let srcW: CGFloat = 200, srcH: CGFloat = 800
    let outW = 288, outH = 144
    let outRatio = CGFloat(outW) / CGFloat(outH)
    let cropScale: CGFloat = 1.0
    let cropW = srcW * cropScale
    let cropH = cropW / outRatio

    // cropCenter.y=0.75 (near bottom in overlay, low Y in Cocoa)
    let cx: CGFloat = 0.5, cy: CGFloat = 0.75
    let srcCenterX = cx * srcW  // 100
    let srcCenterY = srcH * (1 - cy)  // 800 * 0.25 = 200

    let ccx = Swift.max(cropW/2, Swift.min(srcW - cropW/2, srcCenterX))
    let ccy = Swift.max(cropH/2, Swift.min(srcH - cropH/2, srcCenterY))  // max(50, min(750, 200)) = 200

    let cropRect = CGRect(x: ccx - cropW/2, y: ccy - cropH/2, width: cropW, height: cropH)
    // y=200-50=150 to y=200+50=250 → bottom portion in Cocoa → white region
    try assertEqual(Int(cropRect.origin.y), 150, "crop origin y (bottom → bright)")

    let result = processImage(srcImage, width: outW, height: outH, cropRect: cropRect)
    try assertNotNil(result, "result nil")

    guard let tiff = result!.tiffRepresentation,
          let outRep = NSBitmapImageRep(data: tiff),
          let cgOut = outRep.cgImage,
          let dataProvider = cgOut.dataProvider,
          let pixelData = dataProvider.data else {
        throw TestError("Failed to get output pixel data")
    }
    let data = CFDataGetBytePtr(pixelData)!
    let pixelCount = outW * outH

    var sum: Int = 0
    for i in 0..<pixelCount { sum += Int(data[i]) }
    let avg = Double(sum) / Double(pixelCount)

    try assertGreaterThan(avg, 235, "bottom-half crop should be bright (avg \(Int(avg)))")
    print("    → avg pixel: \(Int(avg)) (expected near 255)")
}

// ===========================================================================
// Results
// ===========================================================================

print("\n─────────────────────────────")
let total = passed + failed
print("\(passed)/\(total) passed")
if failed > 0 {
    print("\(failed) FAILED")
    exit(1)
} else {
    print("All tests passed ✓")
}
