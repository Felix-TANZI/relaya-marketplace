// frontend/src/features/vendors/v2/catalogue/steps/ScanBarcodeScreen.tsx
// Nouvelle offre · étape 1, raccourci "Code-barres" (NOF-01, VD-08 §3.1) :
// écran plein écran qui vise un code, le décode et retrouve la fiche maître
// correspondante côté serveur. Reprend useQrCamera (frontend/src/lib, déjà
// utilisé par les écrans caméra du portail relais — même convention plutôt
// qu'une nouvelle lib) : jsQR ne décode que des QR codes, donc ce scanner
// reconnaît un SKU/EAN encodé en QR (étiquette interne) ; un vrai
// code-barres linéaire imprimé par le fabricant n'est pas décodable sans une
// seconde librairie, volontairement non ajoutée.

import { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useQrCamera } from '@/lib/useQrCamera';
import { vendorsApi, type MasterFiche } from '@/services/api/vendors';
import type { VendorPalette } from '../../theme';

const CORNERS = [
  'left-0 top-0 border-l-[5px] border-t-[5px] rounded-tl-[16px]',
  'right-0 top-0 border-r-[5px] border-t-[5px] rounded-tr-[16px]',
  'left-0 bottom-0 border-l-[5px] border-b-[5px] rounded-bl-[16px]',
  'right-0 bottom-0 border-r-[5px] border-b-[5px] rounded-br-[16px]',
];

export default function ScanBarcodeScreen({
  onClose, onFound, onNotFound, p, t,
}: {
  onClose: () => void;
  onFound: (master: MasterFiche) => void;
  onNotFound: (code: string) => void;
  p: VendorPalette;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState('');

  const { videoRef, canvasRef, error, streaming } = useQrCamera({
    enabled: !busy,
    onDecode: (code) => {
      if (busy || code === lastCode) return;
      setLastCode(code);
      setBusy(true);
      vendorsApi.searchMasterByBarcode(code)
        .then((results) => {
          if (results[0]) onFound(results[0]);
          else onNotFound(code);
        })
        .catch(() => onNotFound(code))
        .finally(() => setBusy(false));
    },
  });

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
      <div className="safe-pt-header flex items-center justify-between gap-3 px-4 pb-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('sl10_catalogue.scan_close')}
          className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-white/10 transition active:scale-[.92]"
        >
          <X size={21} strokeWidth={2.4} />
        </button>
        <p className="font-black text-[15px]">{t('sl10_catalogue.scan_title')}</p>
        <span className="w-[42px] flex-shrink-0" aria-hidden />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_42%,rgba(255,255,255,.07)_0%,rgba(0,0,0,.75)_100%)]" />

        <div className="relative w-full max-w-[300px]">
          <div className="relative h-[220px] w-full">
            {CORNERS.map((corner) => (
              <span key={corner} className={`absolute h-[50px] w-[50px] ${corner}`} style={{ borderColor: p.amber }} aria-hidden />
            ))}
          </div>

          <p className="mt-6 text-center text-[13.5px] font-medium leading-relaxed text-white/70">
            {t('sl10_catalogue.scan_hint')}
          </p>

          {error ? (
            <p className="mt-4 rounded-xl px-4 py-3 text-center text-[13px] font-semibold" style={{ background: `${p.red}33`, color: p.red }}>
              {error}
            </p>
          ) : busy ? (
            <p className="mt-4 text-center text-[13px] font-medium text-white/60">{t('sl10_catalogue.scan_checking')}</p>
          ) : !streaming ? (
            <p className="mt-4 text-center text-[13px] font-medium text-white/50">{t('sl10_catalogue.scan_opening')}</p>
          ) : null}
        </div>
      </div>

      <div className="safe-pb px-6 pb-5 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white/10 px-4 py-4 text-[15px] font-black transition active:scale-[.97]"
        >
          <Keyboard size={18} strokeWidth={2.2} /> {t('sl10_catalogue.scan_manual')}
        </button>
      </div>
    </div>
  );
}
