from io import BytesIO
from uuid import uuid4

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError


class ImageOptimizationError(ValueError):
    pass


def optimize_uploaded_image(
    uploaded_file,
    *,
    max_input_bytes: int,
    max_dimension: int,
    quality: int = 80,
    filename_prefix: str = "image",
):
    """Validate an uploaded raster image and return an optimized WebP file."""
    if uploaded_file.size > max_input_bytes:
        raise ImageOptimizationError(
            f"Le fichier ne doit pas dépasser {max_input_bytes // (1024 * 1024)} Mo avant compression."
        )
    try:
        image = ImageOps.exif_transpose(Image.open(uploaded_file))
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise ImageOptimizationError("Le fichier doit être une image JPG, PNG ou WEBP valide.") from error
    if image.width * image.height > 40_000_000:
        raise ImageOptimizationError("La résolution de cette image est trop élevée.")

    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "transparency" in image.info else "RGB")
    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(output, format="WEBP", quality=quality, method=6, optimize=True)
    return ContentFile(
        output.getvalue(),
        name=f"{filename_prefix}-{uuid4().hex[:12]}.webp",
    )
