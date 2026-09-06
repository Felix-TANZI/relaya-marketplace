import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pave de signature manuscrite (souris, stylet ou doigt).
 *
 * La signature n'est jamais envoyee seule : l'appelant recoit un data URL PNG
 * qu'il joint a la preuve de transfert de responsabilite, ou null tant que rien
 * n'a ete trace.
 */
export default function SignaturePad({
  label,
  hint,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const stroked = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  // Le canvas est redimensionne a la taille reelle affichee (et au ratio ecran)
  // sinon le trace apparait decale et flou sur mobile.
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    const snapshot = stroked.current ? canvas.toDataURL("image/png") : null;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    if (snapshot) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = snapshot;
    }
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = pointFrom(event);
    context.beginPath();
    context.moveTo(x, y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const { x, y } = pointFrom(event);
    context.lineTo(x, y);
    context.stroke();
    stroked.current = true;
    if (!hasStroke) setHasStroke(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && stroked.current) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    stroked.current = false;
    setHasStroke(false);
    onChange(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-950 dark:text-white">{label}</p>
        {hasStroke ? <span className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">Signé</span> : null}
      </div>
      {hint ? <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{hint}</p> : null}
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        aria-label={label}
        /* Plus haut sur telephone : on signe au doigt, pas a la souris. */
        className={`mt-2 h-40 w-full touch-none rounded-2xl border-2 border-dashed bg-white transition dark:bg-slate-950 sm:h-32 ${
          hasStroke ? "border-emerald-300 dark:border-emerald-800" : "border-slate-300 dark:border-slate-700"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"}`}
      />
      <button
        type="button"
        onClick={clear}
        disabled={disabled || !hasStroke}
        className="tap-target mt-2 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:min-h-0 sm:py-1.5"
      >
        Effacer
      </button>
    </div>
  );
}
