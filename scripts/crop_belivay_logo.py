from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "frontend" / "public" / "belivay-logo.png"
TARGET = ROOT / "frontend" / "public" / "belivay-logo-mark.png"
SYMBOL_TARGET = ROOT / "frontend" / "public" / "belivay-logo-symbol.png"


def alpha_bbox(image: Image.Image):
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    return alpha.getbbox()


def main():
    source = Image.open(SOURCE).convert("RGBA")
    bbox = alpha_bbox(source)
    if not bbox:
        raise RuntimeError(f"No visible pixels found in {SOURCE}")

    cropped = source.crop(bbox)
    side = max(cropped.size)
    padding = round(side * 0.14)
    canvas_side = side + padding * 2
    canvas = Image.new("RGBA", (canvas_side, canvas_side), (255, 255, 255, 0))
    x = (canvas_side - cropped.width) // 2
    y = (canvas_side - cropped.height) // 2
    canvas.alpha_composite(cropped, (x, y))
    canvas = canvas.resize((512, 512), Image.Resampling.LANCZOS)
    canvas.save(TARGET)
    symbol = source.crop((bbox[0], bbox[1], min(bbox[0] + 84, bbox[2]), bbox[3]))
    symbol_bbox = alpha_bbox(symbol)
    if symbol_bbox:
        symbol = symbol.crop(symbol_bbox)
    symbol_side = max(symbol.size)
    symbol_padding = round(symbol_side * 0.18)
    symbol_canvas_side = symbol_side + symbol_padding * 2
    symbol_canvas = Image.new("RGBA", (symbol_canvas_side, symbol_canvas_side), (255, 255, 255, 0))
    sx = (symbol_canvas_side - symbol.width) // 2
    sy = (symbol_canvas_side - symbol.height) // 2
    symbol_canvas.alpha_composite(symbol, (sx, sy))
    symbol_canvas = symbol_canvas.resize((512, 512), Image.Resampling.LANCZOS)
    symbol_canvas.save(SYMBOL_TARGET)
    print(f"Created {TARGET}")
    print(f"Created {SYMBOL_TARGET}")


if __name__ == "__main__":
    main()
