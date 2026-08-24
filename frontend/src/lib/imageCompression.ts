export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 Mo

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

async function loadImage(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await image.decode();
  return { image, url };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Ramene une image sous la limite `maxBytes` en reduisant d'abord la qualite
 * puis, si besoin, la resolution, en conservant le ratio d'origine.
 * Les fichiers non-image ou deja sous la limite sont retournes tels quels.
 */
export async function ensureImageUnderLimit(file: File, maxBytes: number = MAX_IMAGE_BYTES): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= maxBytes) {
    return file;
  }

  const { image, url } = await loadImage(file);
  try {
    const supportsQuality = file.type === "image/jpeg" || file.type === "image/webp";
    const outputType = supportsQuality ? file.type : "image/jpeg";

    let width = image.naturalWidth;
    let height = image.naturalHeight;
    let quality = 0.9;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 14; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("La compression d'image n'est pas prise en charge par ce navigateur.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      blob = await canvasToBlob(canvas, outputType, quality);
      if (blob && blob.size <= maxBytes) break;

      if (quality > 0.5) {
        quality -= 0.1;
      } else {
        width *= 0.85;
        height *= 0.85;
      }
    }

    if (!blob) throw new Error("Impossible de compresser cette image.");

    const extension = outputType === "image/webp" ? "webp" : outputType === "image/jpeg" ? "jpg" : "png";
    const name = file.name.replace(/\.[^./\\]+$/, "") + `.${extension}`;
    return new File([blob], name, { type: outputType, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Applique `ensureImageUnderLimit` a chaque image d'une liste ; les fichiers non-image passent inchanges. */
export async function ensureImagesUnderLimit(files: File[], maxBytes: number = MAX_IMAGE_BYTES): Promise<File[]> {
  return Promise.all(files.map((file) => ensureImageUnderLimit(file, maxBytes)));
}
