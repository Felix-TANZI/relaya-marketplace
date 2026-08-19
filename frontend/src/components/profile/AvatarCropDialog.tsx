import { useEffect, useState } from 'react';
import { Crop, Move, UploadCloud, X, ZoomIn } from 'lucide-react';
import { authApi, type User } from '@/services/api/auth';
import { setStoredProfileAvatar } from '@/lib/profileAvatar';

type Props = {
  file: File;
  accent?: string;
  onClose: () => void;
  onUploaded: (user: User) => void;
};

const VIEW_SIZE = 320;
const OUTPUT_SIZE = 512;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

async function cropAndCompress(
  sourceUrl: string,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const image = await loadImage(sourceUrl);
  const baseScale = Math.max(VIEW_SIZE / image.naturalWidth, VIEW_SIZE / image.naturalHeight);
  const scale = baseScale * zoom;
  const displayedWidth = image.naturalWidth * scale;
  const displayedHeight = image.naturalHeight * scale;
  const translateX = (offsetX / 100) * Math.max(0, displayedWidth - VIEW_SIZE) / 2;
  const translateY = (offsetY / 100) * Math.max(0, displayedHeight - VIEW_SIZE) / 2;
  const sourceSize = VIEW_SIZE / scale;
  const sourceX = Math.max(0, Math.min(
    image.naturalWidth - sourceSize,
    (image.naturalWidth - sourceSize) / 2 - translateX / scale,
  ));
  const sourceY = Math.max(0, Math.min(
    image.naturalHeight - sourceSize,
    (image.naturalHeight - sourceSize) / 2 - translateY / scale,
  ));

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error("Votre navigateur ne peut pas préparer cette image.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.78));
  if (!blob) throw new Error("Impossible de compresser l'image.");
  return new File([blob], `avatar-${Date.now()}.webp`, { type: 'image/webp' });
}

export default function AvatarCropDialog({ file, accent = '#F47920', onClose, onUploaded }: Props) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [progress, setProgress] = useState(0);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!sourceUrl) return;
    loadImage(sourceUrl).then((image) => {
      setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    }).catch(() => setError("Ce fichier image ne peut pas être lu."));
  }, [sourceUrl]);

  const baseScale = Math.max(VIEW_SIZE / dimensions.width, VIEW_SIZE / dimensions.height);
  const scale = baseScale * zoom;
  const previewWidth = dimensions.width * scale;
  const previewHeight = dimensions.height * scale;

  const submit = async () => {
    setBusy(true);
    setError('');
    setProgress(1);
    try {
      if (!sourceUrl) throw new Error("La prévisualisation n'est pas encore prête.");
      const compressed = await cropAndCompress(sourceUrl, zoom, offsetX, offsetY);
      setCompressedSize(compressed.size);
      const user = await authApi.uploadAvatar(compressed, setProgress);
      setStoredProfileAvatar(user.avatar_url || null);
      window.dispatchEvent(new Event('belivay-avatar-updated'));
      onUploaded(user);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "L'envoi a échoué.");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-label="Rogner la photo de profil">
      <div className="w-full max-w-[760px] overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-950">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950 dark:text-white"><Crop size={19} style={{ color: accent }} /> Modifier la photo</h2>
            <p className="mt-1 text-xs text-gray-500">Rognez puis compressez la photo avant son transfert.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="grid h-9 w-9 place-items-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Fermer"><X size={19} /></button>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-[340px_1fr]">
          <div className="mx-auto">
            <div className="relative h-[320px] w-[320px] overflow-hidden rounded-full bg-gray-900 shadow-inner">
              <img
                src={sourceUrl}
                alt="Aperçu à rogner"
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: previewWidth,
                  height: previewHeight,
                  transform: `translate(calc(-50% + ${offsetX / 100 * Math.max(0, previewWidth - VIEW_SIZE) / 2}px), calc(-50% + ${offsetY / 100 * Math.max(0, previewHeight - VIEW_SIZE) / 2}px))`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white/90" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-200"><span className="flex items-center gap-2"><ZoomIn size={16} /> Zoom</span><span>{zoom.toFixed(1)}×</span></label>
              <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full" style={{ accentColor: accent }} />
            </div>
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-200"><span className="flex items-center gap-2"><Move size={16} /> Position horizontale</span><span>{offsetX}</span></label>
              <input type="range" min="-100" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} className="w-full" style={{ accentColor: accent }} />
            </div>
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-200"><span className="flex items-center gap-2"><Move size={16} /> Position verticale</span><span>{offsetY}</span></label>
              <input type="range" min="-100" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} className="w-full" style={{ accentColor: accent }} />
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              <div className="flex justify-between"><span>Fichier original</span><strong>{formatBytes(file.size)}</strong></div>
              <div className="mt-1 flex justify-between"><span>Format final</span><strong>WebP · 512 × 512</strong></div>
              {compressedSize !== null && <div className="mt-1 flex justify-between text-green-700 dark:text-green-400"><span>Taille transférée</span><strong>{formatBytes(compressedSize)}</strong></div>}
            </div>

            {busy && (
              <div aria-live="polite">
                <div className="mb-1 flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300"><span>{progress < 5 ? 'Compression…' : 'Transfert vers votre profil…'}</span><span>{progress}%</span></div>
                <div className="h-2 overflow-hidden rounded bg-gray-200 dark:bg-gray-800"><div className="h-full transition-[width] duration-200" style={{ width: `${progress}%`, background: accent }} /></div>
              </div>
            )}
            {error && <p className="rounded-md bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">Annuler</button>
          <button type="button" onClick={submit} disabled={busy || !!error || !sourceUrl} className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: accent }}><UploadCloud size={17} />{busy ? 'Transfert…' : 'Rogner et enregistrer'}</button>
        </footer>
      </div>
    </div>
  );
}
