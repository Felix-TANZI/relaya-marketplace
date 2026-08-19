import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X } from "lucide-react";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setError("Impossible d'accéder à la caméra. Vérifie les autorisations du navigateur.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result?.data) {
        onScan(result.data);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    void start();
    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
