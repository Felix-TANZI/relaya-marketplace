// frontend/src/features/vendors/v2/catalogue/steps/StepPhotos.tsx
// Nouvelle offre · étape 2 (PHO-01 à PHO-04) : 3 à 8 photos réelles,
// 800×800 px minimum, compressées avant envoi. Compression réutilise
// ensureImagesUnderLimit (frontend/src/lib/imageCompression.ts, déjà utilisé
// par ProductFormPage.tsx) — pas de réécriture d'un second compresseur.
// EXIF heure/lieu (PHO-03) : non conservé par ce chemin (le canvas de
// compression ré-encode l'image et perd les métadonnées) — MANQUE FRONTEND,
// documenté plutôt que simulé.

import { useRef } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
import { ensureImagesUnderLimit } from '@/lib/imageCompression';
import type { VendorPalette } from '../../theme';
import { checkMinDimensions, MAX_PHOTOS, MIN_PHOTOS } from '../helpers';
import type { DraftPhoto } from '../types';

export default function StepPhotos({
  photos, onChange, onShowToast, p, t,
}: {
  photos: DraftPhoto[];
  onChange: (photos: DraftPhoto[]) => void;
  onShowToast: (msg: string) => void;
  p: VendorPalette;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    const candidates = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room);
    const accepted: DraftPhoto[] = [];
    for (const file of candidates) {
      const bigEnough = await checkMinDimensions(file);
      if (!bigEnough) {
        onShowToast(t('sl10_catalogue.step2_too_small'));
        continue;
      }
      const [compressed] = await ensureImagesUnderLimit([file]);
      accepted.push({ file: compressed, previewUrl: URL.createObjectURL(compressed) });
    }
    if (accepted.length > 0) onChange([...photos, ...accepted]);
  }

  function removeAt(i: number) {
    const next = [...photos];
    URL.revokeObjectURL(next[i].previewUrl);
    next.splice(i, 1);
    onChange(next);
  }

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <div>
      <p className="font-bold mb-1" style={{ fontSize: 15, color: p.text }}>{t('sl10_catalogue.step2_title')}</p>
      <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>
        {t('sl10_catalogue.step2_desc', { min: MIN_PHOTOS, max: MAX_PHOTOS })}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {photos.map((photo, i) => (
          <div key={photo.previewUrl} className="relative aspect-square rounded-xl overflow-hidden" style={{ border: `1px solid ${p.border}` }}>
            <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: p.red, color: '#fff' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {canAddMore ? (
          <>
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1"
              style={{ borderColor: p.border, background: p.cardAlt }}
            >
              <Upload size={16} color={p.textMuted} />
              <span style={{ fontSize: 10, color: p.textMuted }}>{t('sl10_catalogue.step2_add')}</span>
            </button>
          </>
        ) : null}
      </div>

      {canAddMore ? (
        <>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void addFiles(e.target.files)} />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-xl font-bold"
            style={{ padding: '12px', fontSize: 13, color: p.text, background: p.cardAlt, border: `1px solid ${p.border}` }}
          >
            <Camera size={15} /> {t('sl10_catalogue.step2_take_photo')}
          </button>
        </>
      ) : null}

      <p className="mt-3 text-center" style={{ fontSize: 11.5, color: p.textMuted }}>
        {t('sl10_catalogue.step2_counter', { count: photos.length, max: MAX_PHOTOS })}
      </p>
    </div>
  );
}
