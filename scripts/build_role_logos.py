from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "frontend/public/Beli.png"
OUTPUT_DIR = ROOT / "frontend/public/brand"


def trim_transparency(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha_box = rgba.getchannel("A").getbbox()
    if alpha_box:
        return rgba.crop(alpha_box)

    bg = Image.new("RGBA", rgba.size, rgba.getpixel((0, 0)))
    diff = ImageChops.difference(rgba, bg)
    box = diff.getbbox()
    return rgba.crop(box) if box else rgba


def make_square_badge(image: Image.Image, accent: tuple[int, int, int], out_path: Path) -> None:
    trimmed = trim_transparency(image)
    trimmed.thumbnail((92, 92), Image.Resampling.LANCZOS)

    badge = Image.new("RGBA", (128, 128), (255, 255, 255, 0))
    glow = Image.new("RGBA", (128, 128), (*accent, 52))
    glow_mask = Image.new("L", (128, 128), 0)
    glow_mask.paste(210, (20, 20, 108, 108))
    glow.putalpha(glow_mask.filter(ImageFilter.GaussianBlur(18)))
    badge.alpha_composite(glow)

    x = (128 - trimmed.width) // 2
    y = (128 - trimmed.height) // 2
    shadow = Image.new("RGBA", trimmed.size, (0, 0, 0, 0))
    shadow_alpha = ImageEnhance.Brightness(trimmed.getchannel("A")).enhance(0.32)
    shadow.putalpha(shadow_alpha)
    badge.alpha_composite(shadow, (x + 1, y + 3))
    badge.alpha_composite(trimmed, (x, y))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    badge.save(out_path)


def main() -> None:
    source = Image.open(SOURCE)
    make_square_badge(source, (14, 116, 144), OUTPUT_DIR / "belivay-org-logo.png")
    make_square_badge(source, (37, 99, 235), OUTPUT_DIR / "belivay-relay-logo.png")


if __name__ == "__main__":
    main()
