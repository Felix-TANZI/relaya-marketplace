/**
 * Caméra du comptoir — un seul écran pour scanner et pour photographier.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN SEUL SCANNER POUR TROIS CODES
 *
 * Le gérant ne doit pas choisir entre « scanner une étiquette de colis »,
 * « scanner le code du client » et « scanner une étiquette de retour ». Il
 * vise, et c'est le portail qui reconnaît le type. Au comptoir, choisir un
 * mode avant de viser fait perdre le geste.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FOND NOIR, ET C'EST UN CHOIX
 *
 * Tout le reste du portail est clair. Ici l'écran s'efface : ce qui compte
 * est dans la pièce, pas sur le téléphone. Le noir évite aussi de rajouter
 * de la lumière sur une étiquette déjà difficile à lire.
 */
import { useState } from "react";
import { Eye, EyeOff, Keyboard, X } from "lucide-react";
import { useQrCamera } from "@/lib/useQrCamera";

type Mode = "qr" | "photo";

export default function RelayCamera({
  onClose,
  onDecoded,
  onManual,
  onCaptured,
  /** Ce que la photo doit montrer, affiché dans le cadre. */
  consigne = "Photo de remise · colis entier, étiquette visible",
  /** Combien de photos sont attendues à cette étape. */
  attendues = 1,
}: {
  onClose: () => void;
  onDecoded?: (value: string) => void;
  onManual?: () => void;
  onCaptured?: (file: File) => void;
  consigne?: string;
  attendues?: number;
}) {
  const [mode, setMode] = useState<Mode>("qr");
  const [torche, setTorche] = useState(false);
  const [prises, setPrises] = useState<string[]>([]);

  const { videoRef, canvasRef, error, streaming } = useQrCamera({
    // Le decodage ne tourne qu'en mode QR : analyser chaque image pendant
    // qu'on cadre une photo chaufferait le telephone pour rien.
    enabled: mode === "qr",
    onDecode: (valeur) => onDecoded?.(valeur),
  });

  /** Fige l'image courante et la rend au parent. */
  const declencher = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const fichier = new File([blob], `comptoir-${Date.now()}.jpg`, { type: "image/jpeg" });
      setPrises((actuelles) => [...actuelles, URL.createObjectURL(fichier)]);
      onCaptured?.(fichier);
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#0A1429] text-white">
      {/* ── Barre du haut ──────────────────────────────────────────────── */}
      <div className="safe-pt-header flex items-center justify-between gap-3 px-4 pb-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-white/10 transition active:scale-[.92]"
        >
          <X size={21} strokeWidth={2.4} />
        </button>

        <div role="tablist" aria-label="Mode" className="flex gap-1 rounded-[12px] bg-white/10 p-1">
          {(["qr", "photo"] as Mode[]).map((item) => {
            const on = item === mode;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMode(item)}
                className={`rounded-[9px] px-6 py-2 text-[14px] font-black transition ${
                  on ? "bg-white text-slate-900" : "text-white/70"
                }`}
              >
                {item === "qr" ? "QR" : "Photo"}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setTorche((actuel) => !actuel)}
          aria-label={torche ? "Éteindre la lampe" : "Allumer la lampe"}
          aria-pressed={torche}
          className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-white/10 transition active:scale-[.92]"
        >
          {torche ? <EyeOff size={21} strokeWidth={2.2} /> : <Eye size={21} strokeWidth={2.2} />}
        </button>
      </div>

      {/* ── L'image ────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Le voile assombrit l'image SANS masquer le cadre : on doit voir ce
            qu'on vise, pas une vitre teintee. */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_42%,rgba(255,255,255,.07)_0%,rgba(10,20,41,.72)_100%)]" />

        <div className="relative flex w-full max-w-[320px] flex-col items-center">
          {mode === "qr" ? (
            <>
              {/* Quatre coins, pas un rectangle plein : l'oeil cadre sur les
                  angles, et le centre reste degage pour l'etiquette. */}
              <div className="relative h-[260px] w-full">
                {[
                  "left-0 top-0 border-l-[5px] border-t-[5px] rounded-tl-[18px]",
                  "right-0 top-0 border-r-[5px] border-t-[5px] rounded-tr-[18px]",
                  "left-0 bottom-0 border-l-[5px] border-b-[5px] rounded-bl-[18px]",
                  "right-0 bottom-0 border-r-[5px] border-b-[5px] rounded-br-[18px]",
                ].map((coin) => (
                  <span key={coin} className={`absolute h-[58px] w-[58px] border-[#E8A10E] ${coin}`} aria-hidden />
                ))}
                <span
                  className="absolute left-1/2 top-1/2 h-[3px] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#E8A10E] via-[#EF6A00] to-[#E8A10E]"
                  aria-hidden
                />
              </div>

              <h2 className="mt-6 text-center text-[17px] font-black leading-tight">
                Visez le QR du colis ou du client
              </h2>
              <p className="mt-2 text-center text-[13.5px] font-medium leading-[1.5] text-[#8FB0FF]">
                Le scan se fait tout seul. Étiquette de colis, code de retrait du client ou étiquette
                de retour : le même scanner reconnaît le type. Le lot du livreur se reçoit avec son
                code de dépôt.
              </p>
            </>
          ) : (
            <>
              <div className="relative h-[330px] w-full rounded-[18px] border-[3px] border-dashed border-[#E8A10E] p-3">
                <span className="text-[13.5px] font-black leading-tight">{consigne}</span>
              </div>
              <p className="mt-4 text-center text-[13.5px] font-medium leading-[1.5] text-[#8FB0FF]">
                {/*
                  La maquette promet « envoi automatique, meme hors
                  connexion ». Le portail relais n'alimente PAS la file
                  d'attente hors ligne — seul le portail livreur le fait. On
                  annonce donc ce qui est vrai : la photo est exigee, et elle
                  part quand le reseau est la.
                */}
                L'étape reste bloquée tant que la photo n'est pas prise. Elle part dès que le réseau
                est disponible.
              </p>
            </>
          )}

          {error ? (
            <p className="mt-4 rounded-[12px] bg-[#B42318]/20 px-4 py-3 text-center text-[13px] font-semibold text-[#FF8A80]">
              {error}
            </p>
          ) : !streaming ? (
            <p className="mt-4 text-center text-[13px] font-medium text-white/50">
              Ouverture de la caméra…
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Barre du bas ───────────────────────────────────────────────── */}
      <div className="safe-pb px-6 pb-5 pt-2">
        {mode === "qr" ? (
          <button
            type="button"
            onClick={onManual}
            className="flex w-full items-center justify-center gap-2.5 rounded-[12px] bg-white/10 px-4 py-4 text-[16px] font-black text-white transition active:scale-[.97]"
          >
            <Keyboard size={18} strokeWidth={2.2} /> Saisir le code à la main
          </button>
        ) : (
          <div className="flex items-center justify-between gap-4">
            {/* La derniere prise, pour verifier qu'elle est lisible avant de
                quitter l'ecran. */}
            <span className="h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded-[12px] bg-white/10">
              {prises.length > 0 ? (
                <img src={prises[prises.length - 1]} alt="Dernière photo" className="h-full w-full object-cover" />
              ) : null}
            </span>

            <button
              type="button"
              onClick={declencher}
              disabled={!streaming}
              aria-label="Prendre la photo"
              className="flex h-[74px] w-[74px] flex-shrink-0 items-center justify-center rounded-full border-[4px] border-white transition active:scale-[.92] disabled:opacity-40"
            >
              <span className="h-[58px] w-[58px] rounded-full bg-white/0" />
            </button>

            <span className="w-[52px] flex-shrink-0 text-right text-[15px] font-black tabular-nums">
              {Math.min(prises.length, attendues)}/{attendues}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
