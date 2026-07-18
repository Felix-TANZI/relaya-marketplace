#!/usr/bin/env python3
from pathlib import Path

from PIL import Image


SOURCE = Path("frontend/public/belivay-logo.png")
OUTPUTS = {
    "frontend/public/belivay-logo-delivery-org.png": (8, 145, 178),  # cyan/sky actor color
    "frontend/public/belivay-logo-relay-point.png": (30, 64, 175),   # deep blue actor color
}


def main():
    image = Image.open(SOURCE).convert("RGBA")
    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)

    pixels = image.load()
    for output, color in OUTPUTS.items():
        recolored = Image.new("RGBA", image.size, (0, 0, 0, 0))
        recolored_pixels = recolored.load()
        for y in range(image.height):
            for x in range(image.width):
                _, _, _, alpha = pixels[x, y]
                if alpha:
                    recolored_pixels[x, y] = (*color, alpha)

        Path(output).parent.mkdir(parents=True, exist_ok=True)
        recolored.save(output)
        print(output)


if __name__ == "__main__":
    main()
