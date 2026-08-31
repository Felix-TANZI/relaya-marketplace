import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { useQrCamera } from "@/lib/useQrCamera";

type Props = {
  onScan: (value: string) => void;
  onClose: () => void;
  title?: string;
};

/**
 * Scanner QR base navigateur : demande l'acces camera (telephone ou webcam),
 * puis decode chaque frame video via jsQR. Aucun service externe requis.
 */
export default function QrScanner({ onScan, onClose, title = "Scanner le QR" }: Props) {
  const handled = useRef(false);
  const { videoRef, canvasRef, error } = useQrCamera({
    onDecode: (value) => {
      if (handled.current) return;
      handled.current = true;
      onScan(value);
    },
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-950">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Camera size={17} /> {title}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>
        <div className="relative aspect-square bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80" />
        </div>
        {error ? (
          <p className="px-4 py-3 text-sm font-semibold text-red-600">{error}</p>
        ) : (
          <p className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
            Cadre le QR présenté par ton livreur.
          </p>
        )}
      </div>
    </div>
  );
}
