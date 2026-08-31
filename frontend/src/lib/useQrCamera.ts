import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Acces camera + decodage QR frame par frame via jsQR.
 *
 * Le decodage continue tant que le hook est actif : c'est l'appelant qui decide
 * quoi faire du premier code lu (fermer, figer l'apercu, enchainer une etape).
 * Aucun service externe n'est appele, la video ne quitte jamais le navigateur.
 */
export function useQrCamera({
  enabled = true,
  onDecode,
}: {
  enabled?: boolean;
  onDecode?: (value: string) => void;
} = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodeRef = useRef(onDecode);
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    decodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let frame: number | null = null;
    let stream: MediaStream | null = null;

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frame = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result?.data) decodeRef.current?.(result.data);
      }
      frame = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStreaming(true);
        tick();
      } catch {
        if (!cancelled) setError("Impossible d'accéder à la caméra. Vérifie les autorisations du navigateur.");
      }
    }

    void start();

    return () => {
      cancelled = true;
      setStreaming(false);
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [enabled]);

  return { videoRef, canvasRef, error, streaming };
}
