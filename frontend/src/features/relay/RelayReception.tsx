import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  LockKeyhole,
  PackagePlus,
  QrCode,
  ScanLine,
  ShieldAlert,
  Truck,
  X,
} from "lucide-react";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import { useQrCamera } from "@/lib/useQrCamera";
import SignaturePad from "@/components/ui/SignaturePad";
import { Panel, StatusPill } from "./RelayUi";

export interface RelayArrival {
  id: number;
  shipmentId: number;
  orderId: number;
  internalRef: string;
  courierRef: string;
  vehicleLabel: string;
  sizeLabel: string;
  buyerRef: string;
  pickupCode: string;
}

interface ReceiveInput {
  shipmentId: number;
  slotCode: string;
  proofNote: string;
}

export interface RefuseInput {
  shipmentId: number;
  reason: string;
  note: string;
  photo: File;
}

const REFUSAL_REASONS: Array<[string, string]> = [
  ["SEAL_BROKEN", "Scellé rompu ou absent"],
  ["PACKAGE_DAMAGED", "Colis visiblement endommagé"],
  ["WRONG_PARCEL", "Colis ne correspondant pas à l'annonce"],
  ["OTHER", "Autre motif"],
];

/** Les 11 etapes affichees au gerant, dans l'ordre exact du workflow V5. */
const RECEPTION_STEPS: Array<[string, string]> = [
  ["Le livreur arrive avec le ou les colis", ""],
  ["Scannez le QR de la mission", "depuis votre app"],
  ["L'app affiche les détails du colis", "réf interne, taille, code acheteur — sans vendeur"],
  ["Examinez le colis", "intégrité visuelle + étiquette"],
  ["Prenez 3 photos", "face · dos · côté avec étiquette"],
  ["Signez numériquement", "acceptation de garde"],
  ["Le livreur signe aussi", "transfert de responsabilité"],
  ["L'app génère un slot (casier)", "rangez le colis"],
  ["SMS + push à l'acheteur", "code retrait 6 chiffres + adresse + horaires"],
  ["+5 Avantages crédités", "réception validée"],
  ["Le colis apparaît dans « Colis en stock »", "prêt au retrait"],
];

const PHOTO_SLOTS = [
  { key: "face", label: "Face" },
  { key: "back", label: "Dos" },
  { key: "label", label: "Étiquette" },
] as const;

type PhotoKey = (typeof PHOTO_SLOTS)[number]["key"];
type PhotoMap = Partial<Record<PhotoKey, { file: File; url: string }>>;

/**
 * Le QR de mission peut transporter un JSON, une URL de suivi ou l'identifiant
 * brut : on extrait l'identifiant d'expedition dans les trois cas.
 */
function parseMissionId(raw: string): number | null {
  const trimmed = raw.trim();
  try {
    const payload = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of ["shipment_id", "shipmentId", "mission", "id"]) {
      const value = Number(payload[key]);
      if (Number.isInteger(value) && value > 0) return value;
    }
  } catch {
    // Charge utile non JSON : on retombe sur la lecture numerique.
  }
  const match = trimmed.match(/(\d{1,10})/);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Coquille commune aux deux modales : fond flouté, fermeture Échap, scroll interne. */
function ReceptionModal({
  label,
  onClose,
  children,
  size = "md",
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    /* Sur telephone la boite s'ancre en bas et occupe toute la largeur : c'est
       la forme attendue d'une feuille modale mobile, et elle laisse le contenu
       a portee de pouce. A partir de `sm` on retrouve la modale centree. */
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`animate-sheet-up overscroll-none-y safe-pb max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-[0_-8px_40px_rgba(2,6,23,.32)] dark:border-slate-800 dark:bg-slate-900 sm:animate-page-in sm:rounded-3xl sm:p-6 sm:shadow-[0_30px_80px_rgba(15,23,42,.35)] ${
          size === "sm" ? "sm:max-w-md" : "sm:max-w-2xl"
        }`}
      >
        {/* Poignee visuelle : signale que la feuille se ferme vers le bas. */}
        <div className="mx-auto mb-3 h-1.5 w-11 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" aria-hidden />
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon: Icon, title, subtitle, onClose }: { icon: typeof QrCode; title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          <Icon size={19} />
        </div>
        <div>
          <h2 className="text-lg font-black leading-tight text-slate-950 dark:text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="rounded-full bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
      >
        <X size={17} />
      </button>
    </div>
  );
}

/** Etape 2 : viseur camera, avec saisie manuelle de secours si le QR est illisible. */
function ScanDialog({
  presetLabel,
  onCancel,
  onConfirm,
}: {
  presetLabel: string;
  onCancel: () => void;
  onConfirm: (missionId: number) => void;
}) {
  const [detected, setDetected] = useState<number | null>(null);
  const [manualId, setManualId] = useState("");
  const { videoRef, canvasRef, error, streaming } = useQrCamera({
    onDecode: (value) => {
      const missionId = parseMissionId(value);
      if (missionId) setDetected(missionId);
    },
  });

  const manualParsed = Number(manualId);
  const resolved = detected ?? (Number.isInteger(manualParsed) && manualParsed > 0 ? manualParsed : null);

  return (
    <ReceptionModal label="Scanner le QR du livreur" onClose={onCancel} size="sm">
      <ModalHeader
        icon={Camera}
        title="Scanner le QR du livreur"
        subtitle="Présentez le QR code de la mission affiché par le livreur dans le viseur."
        onClose={onCancel}
      />

      {presetLabel ? (
        <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
          Arrivée sélectionnée · {presetLabel}
        </div>
      ) : null}

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-950">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {!streaming ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-blue-200/70">
            <QrCode size={72} strokeWidth={1.2} />
            <span className="px-6 text-center text-xs font-bold">
              {error ? "Caméra indisponible — utilisez la saisie manuelle" : "Activation de la caméra..."}
            </span>
          </div>
        ) : null}

        {/* Viseur : coins bleus + ligne de scan qui balaie le cadre. */}
        <div className="pointer-events-none absolute inset-6 rounded-2xl">
          <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-blue-400" />
          <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-blue-400" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-blue-400" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-blue-400" />
          <span className="animate-qr-scan absolute inset-x-4 h-0.5 rounded-full bg-gradient-to-r from-transparent via-blue-300 to-transparent shadow-[0_0_18px_rgba(96,165,250,.9)]" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-black">
        <span className={`h-2.5 w-2.5 rounded-full ${detected ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
        {detected ? (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle2 size={14} /> QR code détecté · mission {detected}
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">Recherche du QR de mission...</span>
        )}
      </div>

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        QR illisible ? Saisissez l'ID de mission
        <input
          value={manualId}
          onChange={(event) => setManualId(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="Ex. 42"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-bold text-slate-950 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      {error ? <p className="mt-2 text-xs font-semibold text-amber-600">{error}</p> : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!resolved}
          onClick={() => resolved && onConfirm(resolved)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuer <ArrowRight size={16} />
        </button>
      </div>
    </ReceptionModal>
  );
}

/** Refus motive au controle — Addendum Decisions v1.0 §9 : scelle rompu, colis endommage... */
function RefusalDialog({
  missionId,
  busy,
  onCancel,
  onConfirm,
}: {
  missionId: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (input: { reason: string; note: string; photo: File }) => void;
}) {
  const [reason, setReason] = useState(REFUSAL_REASONS[0][0]);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const addPhoto = async (file: File | null) => {
    if (!file) return;
    setError("");
    try {
      const optimized = await ensureImageUnderLimit(file);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ file: optimized, url: URL.createObjectURL(optimized) });
    } catch {
      setError("Cette image n'a pas pu être préparée. Reprenez la photo.");
    }
  };

  return (
    <ReceptionModal label="Refuser le colis" onClose={onCancel} size="sm">
      <ModalHeader icon={ShieldAlert} title="Refuser ce colis" subtitle={`Mission ${missionId} — le colis ne sera pas mis en stock.`} onClose={onCancel} />

      <label className="mt-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Motif du refus
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {REFUSAL_REASONS.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Précisions (optionnel)
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <p className="mt-5 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
        <Camera size={16} /> Photo du colis refusé <span className="text-red-600">(obligatoire)</span>
      </p>
      {photo ? (
        <div className="relative mt-2 h-40 overflow-hidden rounded-2xl border-2 border-red-300 dark:border-red-800">
          <img src={photo.url} alt="Colis refusé" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setPhoto(null)}
            aria-label="Retirer la photo"
            className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow-sm transition hover:bg-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="mt-2 flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-red-700 transition hover:border-red-400 hover:bg-red-50/60 dark:border-slate-700 dark:bg-slate-950 dark:text-red-300">
          <Camera size={22} />
          <span className="text-xs font-black text-slate-600 dark:text-slate-300">Prendre la photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              void addPhoto(event.target.files?.[0] || null);
              event.currentTarget.value = "";
            }}
          />
        </label>
      )}
      {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!photo || busy}
          onClick={() => photo && onConfirm({ reason, note: note.trim(), photo: photo.file })}
          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldAlert size={16} /> {busy ? "Envoi..." : "Confirmer le refus"}
        </button>
      </div>
    </ReceptionModal>
  );
}

/** Etapes 3 a 7 : details anonymises, 3 photos preuve et double signature. */
function ReceptionDialog({
  arrival,
  missionId,
  slot,
  onSlotChange,
  busy,
  onCancel,
  onValidate,
  onOpenRefusal,
}: {
  arrival: RelayArrival | null;
  missionId: number;
  slot: string;
  onSlotChange: (value: string) => void;
  busy: boolean;
  onCancel: () => void;
  onOpenRefusal: () => void;
  onValidate: (photos: PhotoMap, signatures: { manager: string | null; courier: string | null }) => void;
}) {
  const [photos, setPhotos] = useState<PhotoMap>({});
  const [managerSignature, setManagerSignature] = useState<string | null>(null);
  const [courierSignature, setCourierSignature] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const photosRef = useRef<PhotoMap>({});

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(
    () => () => {
      Object.values(photosRef.current).forEach((photo) => photo && URL.revokeObjectURL(photo.url));
    },
    [],
  );

  const addPhoto = async (key: PhotoKey, file: File | null) => {
    if (!file) return;
    setPhotoError("");
    try {
      const optimized = await ensureImageUnderLimit(file);
      const replaced = photosRef.current[key];
      setPhotos((current) => ({ ...current, [key]: { file: optimized, url: URL.createObjectURL(optimized) } }));
      if (replaced) URL.revokeObjectURL(replaced.url);
    } catch {
      setPhotoError("Cette image n'a pas pu être préparée. Reprenez la photo.");
    }
  };

  const removePhoto = (key: PhotoKey) => {
    const removed = photosRef.current[key];
    setPhotos((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (removed) URL.revokeObjectURL(removed.url);
  };

  const photoCount = PHOTO_SLOTS.filter((slotDef) => photos[slotDef.key]).length;
  const complete = photoCount === PHOTO_SLOTS.length && Boolean(managerSignature) && Boolean(courierSignature);

  return (
    <ReceptionModal label="Réception, QR scanné" onClose={onCancel}>
      <ModalHeader icon={PackagePlus} title="Réception · QR scanné" onClose={onCancel} />

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <CheckCircle2 className="mt-0.5 flex-shrink-0 text-emerald-600" size={18} />
        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
          QR mission reconnu · Mission <strong>{missionId}</strong>
          {arrival?.courierRef ? <> · Livreur <strong>{arrival.courierRef}</strong></> : null} · 1 colis
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenRefusal}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-red-600 transition hover:text-red-700 disabled:opacity-50"
      >
        <ShieldAlert size={14} /> Scellé rompu ou colis endommagé ? Refuser au contrôle
      </button>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Référence interne BelivaY</dt>
            <dd className="font-black text-slate-950 dark:text-white">{arrival?.internalRef || `BV-${missionId}`}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Taille estimée</dt>
            <dd><StatusPill tone="blue">{arrival?.sizeLabel || "Non renseignée"}</StatusPill></dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Acheteur (anonymisé)</dt>
            <dd className="font-black text-slate-950 dark:text-white">{arrival?.buyerRef || "BV-ACH-••••"} · code à 6 chiffres</dd>
          </div>
        </dl>
        <p className="mt-3 flex items-center gap-2 text-xs font-black text-blue-800 dark:text-blue-200">
          <LockKeyhole size={14} /> Vendeur masqué — vous ne gérez que la référence BelivaY
        </p>
      </div>

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Slot de stockage attribué
        <input
          value={slot}
          onChange={(event) => onSlotChange(event.target.value.toUpperCase())}
          placeholder="Ex. A-12"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-bold text-slate-950 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <p className="mt-5 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
        <Camera size={16} /> Photos preuve
        <span className={photoCount === 3 ? "text-emerald-600" : "text-slate-400"}>({photoCount}/3 obligatoires)</span>
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {PHOTO_SLOTS.map((slotDef) => {
          const photo = photos[slotDef.key];
          return (
            <div key={slotDef.key} className="relative">
              {photo ? (
                <div className="relative h-36 overflow-hidden rounded-2xl border-2 border-emerald-300 dark:border-emerald-800">
                  <img src={photo.url} alt={slotDef.label} className="h-full w-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/65 py-1 text-center text-[11px] font-black text-white">{slotDef.label}</span>
                  <button
                    type="button"
                    onClick={() => removePhoto(slotDef.key)}
                    aria-label={`Retirer la photo ${slotDef.label}`}
                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow-sm transition hover:bg-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-blue-700 transition hover:border-blue-400 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-800">
                  <Camera size={22} />
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">{slotDef.label}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                      void addPhoto(slotDef.key, event.target.files?.[0] || null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
      {photoError ? <p className="mt-2 text-xs font-semibold text-red-600">{photoError}</p> : null}

      <div className="mt-5 space-y-5">
        <SignaturePad label="Signature gérant PR" hint="acceptation de garde" onChange={setManagerSignature} disabled={busy} />
        <SignaturePad label="Signature livreur" hint="transfert de responsabilité" onChange={setCourierSignature} disabled={busy} />
      </div>

      {!complete ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
          Les 3 photos et les deux signatures sont requises avant le transfert de responsabilité.
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!complete || busy}
          onClick={() => onValidate(photos, { manager: managerSignature, courier: courierSignature })}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 size={16} /> {busy ? "Validation..." : "Valider la réception"}
        </button>
      </div>
    </ReceptionModal>
  );
}

export default function RelayReception({
  arrivals,
  loading,
  busy,
  suggestedSlot,
  managerName,
  onReceive,
  onRefuse,
}: {
  arrivals: RelayArrival[];
  loading: boolean;
  busy: boolean;
  suggestedSlot: string;
  managerName: string;
  onReceive: (input: ReceiveInput) => Promise<boolean>;
  onRefuse: (input: RefuseInput) => Promise<boolean>;
}) {
  const [scanOpen, setScanOpen] = useState(false);
  const [selected, setSelected] = useState<RelayArrival | null>(null);
  const [missionId, setMissionId] = useState<number | null>(null);
  const [slot, setSlot] = useState(suggestedSlot);
  const [refusalOpen, setRefusalOpen] = useState(false);

  const openScan = (arrival: RelayArrival | null) => {
    setSelected(arrival);
    setMissionId(null);
    setScanOpen(true);
  };

  const confirmScan = (scannedId: number) => {
    // Le QR fait foi : s'il pointe une autre arrivee que celle pre-selectionnee,
    // on bascule sur la mission reellement scannee.
    const matched = arrivals.find((arrival) => arrival.shipmentId === scannedId) ?? null;
    setSelected(matched ?? (selected?.shipmentId === scannedId ? selected : null));
    setSlot(suggestedSlot);
    setMissionId(scannedId);
    setScanOpen(false);
  };

  const closeReception = () => {
    setMissionId(null);
    setSelected(null);
    setRefusalOpen(false);
  };

  const validate = async (photos: PhotoMap, signatures: { manager: string | null; courier: string | null }) => {
    if (!missionId) return;
    const captured = PHOTO_SLOTS.filter((slotDef) => photos[slotDef.key]).map((slotDef) => slotDef.label.toLowerCase());
    const proofNote = [
      `Réception V5 · mission ${missionId}`,
      `photos preuve : ${captured.join(", ")}`,
      `double signature : gérant ${managerName}${signatures.courier ? ` + livreur ${selected?.courierRef || "présent"}` : ""}`,
      `horodatage ${new Date().toLocaleString("fr-FR")}`,
    ].join(" · ");

    const success = await onReceive({ shipmentId: missionId, slotCode: slot.trim(), proofNote });
    if (success) closeReception();
  };

  const confirmRefusal = async (input: { reason: string; note: string; photo: File }) => {
    if (!missionId) return;
    const success = await onRefuse({ shipmentId: missionId, ...input });
    if (success) {
      setRefusalOpen(false);
      closeReception();
    }
  };

  const arrivalCount = arrivals.length;
  const selectedLabel = useMemo(
    () => (selected ? `${selected.courierRef || selected.internalRef} · ${selected.sizeLabel}` : ""),
    [selected],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            <PackagePlus size={21} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Réception colis</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Scannez le QR du livreur à son arrivée · workflow sécurisé V5
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openScan(null)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
        >
          <ScanLine size={16} /> Scanner le QR
        </button>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <LockKeyhole className="mt-0.5 flex-shrink-0 text-blue-700 dark:text-blue-300" size={18} />
        <p className="text-sm leading-6 text-blue-950/80 dark:text-blue-100/80">
          Vous ne voyez <strong>jamais</strong> le vendeur ni la provenance commerciale du colis — uniquement la{" "}
          <strong>référence interne BelivaY</strong> et le QR associé. (Anonymat constitutionnel V5 ch.1)
        </p>
      </div>

      <Panel
        kicker="Arrivées en cours"
        title="Livreurs en approche"
        action={<StatusPill tone={arrivalCount > 0 ? "blue" : "slate"}>{arrivalCount}</StatusPill>}
      >
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              Chargement des arrivées...
            </div>
          ) : arrivalCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
              Aucune arrivée annoncée pour le moment. Vous pouvez réceptionner directement en scannant le QR du livreur.
            </div>
          ) : (
            arrivals.map((arrival) => (
              <div
                key={arrival.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    <Truck size={20} />
                  </div>
                  <div className="min-w-0">
                    <StatusPill tone="emerald">
                      <Truck size={12} className="mr-1.5" />
                      {arrival.courierRef || "Livreur à assigner"}
                    </StatusPill>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {arrival.internalRef} · {arrival.sizeLabel}
                      {arrival.vehicleLabel ? ` · ${arrival.vehicleLabel}` : ""}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openScan(arrival)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  Réceptionner
                </button>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel kicker="Procédure" title="Les 11 étapes de la réception" action={<ClipboardList className="text-blue-700 dark:text-blue-300" size={19} />}>
        <ol className="space-y-0">
          {RECEPTION_STEPS.map(([title, hint], index) => (
            <li key={title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                  {index + 1}
                </span>
                {index < RECEPTION_STEPS.length - 1 ? <span className="w-0.5 flex-1 bg-emerald-500/35" /> : null}
              </div>
              <div className={index < RECEPTION_STEPS.length - 1 ? "pb-5" : ""}>
                <div className="font-black leading-tight text-slate-950 dark:text-white">{title}</div>
                {hint ? <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</div> : null}
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <button
        type="button"
        onClick={() => openScan(null)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,99,235,.28)] transition hover:bg-blue-700"
      >
        <ScanLine size={17} /> Démarrer une réception
      </button>

      {scanOpen ? (
        <ScanDialog presetLabel={selectedLabel} onCancel={() => setScanOpen(false)} onConfirm={confirmScan} />
      ) : null}

      {missionId && !refusalOpen ? (
        <ReceptionDialog
          arrival={selected}
          missionId={missionId}
          slot={slot}
          onSlotChange={setSlot}
          busy={busy}
          onCancel={closeReception}
          onValidate={(photos, signatures) => void validate(photos, signatures)}
          onOpenRefusal={() => setRefusalOpen(true)}
        />
      ) : null}

      {missionId && refusalOpen ? (
        <RefusalDialog
          missionId={missionId}
          busy={busy}
          onCancel={() => setRefusalOpen(false)}
          onConfirm={(input) => void confirmRefusal(input)}
        />
      ) : null}
    </div>
  );
}
