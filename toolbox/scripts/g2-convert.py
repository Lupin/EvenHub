#!/usr/bin/env python3
"""
G2 Image Converter — resize, greyscale, 4-bit Floyd-Steinberg dither for Even Realities G2.

Usage:
    g2-convert input.png output.png [--width 288] [--height 144] [--contrast 1.5] [--crop] [--grey-only]

Outputs an 8-bit PNG quantized to 16 greyscale levels (4-bit). The Even Hub SDK accepts
these bytes directly via bridge.updateImageRawData() — but remember you MUST still
re-encode through a browser Canvas for the SDK to accept them (see even-hub-dev skill).

Part of the EvenHub Toolbox: /Users/gael/Documents/GitHub/EvenHub/toolbox/
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageEnhance
except ImportError:
    print("Pillow not installed. Run: pip install Pillow", file=sys.stderr)
    print("Or use the g2-convert wrapper which auto-creates a venv.", file=sys.stderr)
    sys.exit(1)


def floyd_steinberg_4bit(img: Image.Image) -> Image.Image:
    """
    Floyd-Steinberg error diffusion dithering to 4-bit greyscale (16 levels).
    Levels: 0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255

    Works on 'L' mode images (8-bit greyscale, 0-255).
    Returns a new 'L' mode image with each pixel quantized to one of 16 values.
    """
    if img.mode != 'L':
        img = img.convert('L')

    width, height = img.size
    pixels = list(img.get_flattened_data()) if hasattr(img, 'get_flattened_data') else list(img.getdata())
    total = width * height

    # 16 levels spanning the full 0-255 range
    levels = [int(i * 255 / 15) for i in range(16)]

    for idx in range(total):
        old = pixels[idx]
        # Find closest level
        new_val = min(levels, key=lambda l: abs(l - old))
        pixels[idx] = new_val
        err = old - new_val

        x = idx % width
        y = idx // width

        # Distribute error to neighbors (Floyd-Steinberg weights)
        if x + 1 < width:
            pixels[idx + 1] += int(err * 7 / 16)
        if y + 1 < height:
            if x - 1 >= 0:
                pixels[idx + width - 1] += int(err * 3 / 16)
            pixels[idx + width] += int(err * 5 / 16)
            if x + 1 < width:
                pixels[idx + width + 1] += int(err * 1 / 16)

    result = Image.new('L', (width, height))
    if hasattr(result, 'putflattened_data'):
        result.putflattened_data(pixels)
    else:
        result.putdata(pixels)
    return result


def resize_image(img: Image.Image, target_w: int, target_h: int, crop: bool) -> Image.Image:
    """Resize to target dimensions. crop=True crops to exact fit; False letterboxes."""
    if crop:
        # Scale to cover, then center-crop
        ratio = max(target_w / img.width, target_h / img.height)
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        img = img.crop((left, top, left + target_w, top + target_h))
    else:
        # Scale to fit, letterbox with black
        ratio = min(target_w / img.width, target_h / img.height)
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        canvas = Image.new('L', (target_w, target_h), 0)
        left = (target_w - new_w) // 2
        top = (target_h - new_h) // 2
        canvas.paste(img, (left, top))
        img = canvas

    return img


def main():
    parser = argparse.ArgumentParser(
        description='Convert any image for Even Realities G2 (4-bit greyscale)',
    )
    parser.add_argument('input', type=Path, help='Input image path')
    parser.add_argument('output', type=Path, help='Output PNG path')
    parser.add_argument('--width', type=int, default=288,
                        help='Target width in px (20-288, default: 288)')
    parser.add_argument('--height', type=int, default=144,
                        help='Target height in px (20-144, default: 144)')
    parser.add_argument('--contrast', type=float, default=1.0,
                        help='Contrast multiplier (1.0=none, 1.5=moderate, 2.0=aggressive)')
    parser.add_argument('--crop', action='store_true',
                        help='Crop to exact dimensions instead of letterbox')
    parser.add_argument('--grey-only', action='store_true',
                        help='Skip dithering (output 8-bit greyscale)')

    args = parser.parse_args()

    # Validate G2 constraints
    if not (20 <= args.width <= 288):
        print(f"ERROR: width must be 20–288 (got {args.width})", file=sys.stderr)
        sys.exit(1)
    if not (20 <= args.height <= 144):
        print(f"ERROR: height must be 20–144 (got {args.height})", file=sys.stderr)
        sys.exit(1)

    if not args.input.exists():
        print(f"ERROR: input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading: {args.input}")
    img = Image.open(args.input)

    # Convert to greyscale
    if img.mode != 'L':
        img = img.convert('L')
        print(f"  → greyscale ({img.width}×{img.height})")

    # Contrast boost
    if args.contrast != 1.0:
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(args.contrast)
        print(f"  → contrast ×{args.contrast}")

    # Resize
    img = resize_image(img, args.width, args.height, args.crop)
    print(f"  → resized to {args.width}×{args.height} {'(crop)' if args.crop else '(letterbox)'}")

    # Dither
    if not args.grey_only:
        img = floyd_steinberg_4bit(img)
        print(f"  → Floyd-Steinberg 4-bit dither (16 levels)")
    else:
        print(f"  → kept 8-bit greyscale (no dither)")

    # Save
    img.save(args.output, 'PNG')
    size_kb = args.output.stat().st_size / 1024
    print(f"Saved: {args.output} ({size_kb:.1f} KB)")
    print("Ready for G2 — feed bytes to bridge.updateImageRawData()")
    print("⚠️  Remember: canvas re-encode still required for SDK push (see even-hub-dev skill)")


if __name__ == '__main__':
    main()
