import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

const REFUSAL_REASONS: Array<{ value: string; labelKey: string }> = [
  { value: "SEAL_BROKEN", labelKey: "rl1_reception.reason_seal_broken" },
  { value: "PACKAGE_DAMAGED", labelKey: "rl1_reception.reason_package_damaged" },
  { value: "WRONG_PARCEL", labelKey: "rl1_reception.reason_wrong_parcel" },
  { value: "OTHER", labelKey: "rl1_reception.reason_other" },
];

/** Les 11 etapes affichees au gerant, dans l'ordre exact du workflow V5. */
const RECEPTION_STEPS: Array<{ titleKey: string; hintKey?: string }> = [
  { titleKey: "rl1_reception.step1_title" },
  { titleKey: "rl1_reception.step2_title", hintKey: "rl1_reception.step2_hint" },
  { titleKey: "rl1_reception.step3_title", hintKey: "rl1_reception.step3_hint" },
  { titleKey: "rl1_reception.step4_title", hintKey: "rl1_reception.step4_hint" },
  { titleKey: "rl1_reception.step5_title", hintKey: "rl1_reception.step5_hint" },
  { titleKey: "rl1_reception.step6_title", hintKey: "rl1_reception.step6_hint" },
  { titleKey: "rl1_reception.step7_title", hintKey: "rl1_reception.step7_hint" },
  { titleKey: "rl1_reception.step8_title", hintKey: "rl1_reception.step8_hint" },
  { titleKey: "rl1_reception.step9_title", hintKey: "rl1_reception.step9_hint" },
  { titleKey: "rl1_reception.step10_title", hintKey: "rl1_reception.step10_hint" },
  { titleKey: "rl1_reception.step11_title", hintKey: "rl1_reception.step11_hint" },
];

const PHOTO_SLOTS = [
  { key: "face", labelKey: "rl1_reception.photo_face" },
  { key: "back", labelKey: "rl1_reception.photo_back" },
  { key: "label", labelKey: "rl1_reception.photo_label" },
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
  const { t } = useTranslation();
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
        aria-label={t("rl1_reception.close")}
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
  const { t } = useTranslation();
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
    <ReceptionModal label={t("rl1_reception.scan_modal_label")} onClose={onCancel} size="sm">
      <ModalHeader
        icon={Camera}
        title={t("rl1_reception.scan_modal_label")}
        subtitle={t("rl1_reception.scan_modal_subtitle")}
        onClose={onCancel}
      />

      {presetLabel ? (
        <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
          {t("rl1_reception.selected_arrival", { label: presetLabel })}
        </div>
      ) : null}

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-950">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {!streaming ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-blue-200/70">
            <QrCode size={72} strokeWidth={1.2} />
            <span className="px-6 text-center text-xs font-bold">
              {error ? t("rl1_reception.camera_unavailable") : t("rl1_reception.camera_activating")}
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
            <CheckCircle2 size={14} /> {t("rl1_reception.qr_detected", { id: detected })}
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">{t("rl1_reception.qr_searching")}</span>
        )}
      </div>

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {t("rl1_reception.manual_id_label")}
        <input
          value={manualId}
          onChange={(event) => setManualId(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder={t("rl1_reception.manual_id_placeholder")}
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
          {t("rl1_reception.cancel")}
        </button>
        <button
          type="button"
          disabled={!resolved}
          onClick={() => resolved && onConfirm(resolved)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("rl1_reception.continue")} <ArrowRight size={16} />
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
  const { t } = useTranslation();
  const [reason, setReason] = useState(REFUSAL_REASONS[0].value);
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
      setError(t("rl1_reception.photo_prepare_error"));
    }
  };

  return (
    <ReceptionModal label={t("rl1_reception.refuse_modal_label")} onClose={onCancel} size="sm">
      <ModalHeader icon={ShieldAlert} title={t("rl1_reception.refuse_modal_title")} subtitle={t("rl1_reception.refuse_modal_subtitle", { id: missionId })} onClose={onCancel} />

      <label className="mt-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {t("rl1_reception.refuse_reason_label")}
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {REFUSAL_REASONS.map((option) => (
            <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {t("rl1_reception.refuse_notes_label")}
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <p className="mt-5 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
        <Camera size={16} /> {t("rl1_reception.refused_photo_label")} <span className="text-red-600">{t("rl1_reception.mandatory")}</span>
      </p>
      {photo ? (
        <div className="relative mt-2 h-40 overflow-hidden rounded-2xl border-2 border-red-300 dark:border-red-800">
          <img src={photo.url} alt={t("rl1_reception.refused_photo_alt")} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setPhoto(null)}
            aria-label={t("rl1_reception.remove_photo")}
            className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow-sm transition hover:bg-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="mt-2 flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-red-700 transition hover:border-red-400 hover:bg-red-50/60 dark:border-slate-700 dark:bg-slate-950 dark:text-red-300">
          <Camera size={22} />
          <span className="text-xs font-black text-slate-600 dark:text-slate-300">{t("rl1_reception.take_photo")}</span>
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
          {t("rl1_reception.cancel")}
        </button>
        <button
          type="button"
          disabled={!photo || busy}
          onClick={() => photo && onConfirm({ reason, note: note.trim(), photo: photo.file })}
          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldAlert size={16} /> {busy ? t("rl1_reception.sending") : t("rl1_reception.confirm_refusal")}
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
  const { t } = useTranslation();
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
      setPhotoError(t("rl1_reception.photo_prepare_error"));
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
    <ReceptionModal label={t("rl1_reception.reception_modal_label")} onClose={onCancel}>
      <ModalHeader icon={PackagePlus} title={t("rl1_reception.reception_modal_title")} onClose={onCancel} />

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <CheckCircle2 className="mt-0.5 flex-shrink-0 text-emerald-600" size={18} />
        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
          {t("rl1_reception.qr_recognized_prefix")} <strong>{missionId}</strong>
          {arrival?.courierRef ? <> {t("rl1_reception.qr_recognized_courier_prefix")} <strong>{arrival.courierRef}</strong></> : null} {t("rl1_reception.qr_recognized_suffix")}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenRefusal}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-red-600 transition hover:text-red-700 disabled:opacity-50"
      >
        <ShieldAlert size={14} /> {t("rl1_reception.refuse_control_prompt")}
      </button>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">{t("rl1_reception.internal_ref_label")}</dt>
            <dd className="font-black text-slate-950 dark:text-white">{arrival?.internalRef || `BV-${missionId}`}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">{t("rl1_reception.estimated_size_label")}</dt>
            <dd><StatusPill tone="blue">{arrival?.sizeLabel || t("rl1_reception.size_not_specified")}</StatusPill></dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">{t("rl1_reception.buyer_anonymized_label")}</dt>
            <dd className="font-black text-slate-950 dark:text-white">{arrival?.buyerRef || "BV-ACH-••••"} {t("rl1_reception.six_digit_code_suffix")}</dd>
          </div>
        </dl>
        <p className="mt-3 flex items-center gap-2 text-xs font-black text-blue-800 dark:text-blue-200">
          <LockKeyhole size={14} /> {t("rl1_reception.seller_hidden_notice")}
        </p>
      </div>

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {t("rl1_reception.slot_label")}
        <input
          value={slot}
          onChange={(event) => onSlotChange(event.target.value.toUpperCase())}
          placeholder={t("rl1_reception.slot_placeholder")}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-bold text-slate-950 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <p className="mt-5 flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
        <Camera size={16} /> {t("rl1_reception.proof_photos_label")}
        <span className={photoCount === 3 ? "text-emerald-600" : "text-slate-400"}>{t("rl1_reception.photo_count", { count: photoCount })}</span>
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {PHOTO_SLOTS.map((slotDef) => {
          const photo = photos[slotDef.key];
          return (
            <div key={slotDef.key} className="relative">
              {photo ? (
                <div className="relative h-36 overflow-hidden rounded-2xl border-2 border-emerald-300 dark:border-emerald-800">
                  <img src={photo.url} alt={t(slotDef.labelKey)} className="h-full w-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/65 py-1 text-center text-[11px] font-black text-white">{t(slotDef.labelKey)}</span>
                  <button
                    type="button"
                    onClick={() => removePhoto(slotDef.key)}
                    aria-label={t("rl1_reception.remove_photo_named", { label: t(slotDef.labelKey) })}
                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow-sm transition hover:bg-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-blue-700 transition hover:border-blue-400 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-800">
                  <Camera size={22} />
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">{t(slotDef.labelKey)}</span>
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
        <SignaturePad label={t("rl1_reception.manager_signature_label")} hint={t("rl1_reception.manager_signature_hint")} onChange={setManagerSignature} disabled={busy} />
        <SignaturePad label={t("rl1_reception.courier_signature_label")} hint={t("rl1_reception.courier_signature_hint")} onChange={setCourierSignature} disabled={busy} />
      </div>

      {!complete ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
          {t("rl1_reception.incomplete_notice")}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {t("rl1_reception.cancel")}
        </button>
        <button
          type="button"
          disabled={!complete || busy}
          onClick={() => onValidate(photos, { manager: managerSignature, courier: courierSignature })}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 size={16} /> {busy ? t("rl1_reception.validating") : t("rl1_reception.validate_reception")}
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
  const { t } = useTranslation();
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
    const captured = PHOTO_SLOTS.filter((slotDef) => photos[slotDef.key]).map((slotDef) => t(slotDef.labelKey).toLowerCase());
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
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t("rl1_reception.header_title")}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t("rl1_reception.header_subtitle")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openScan(null)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
        >
          <ScanLine size={16} /> {t("rl1_reception.scan_qr_button")}
        </button>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <LockKeyhole className="mt-0.5 flex-shrink-0 text-blue-700 dark:text-blue-300" size={18} />
        <p className="text-sm leading-6 text-blue-950/80 dark:text-blue-100/80">
          {t("rl1_reception.never_prefix")} <strong>{t("rl1_reception.never_bold")}</strong> {t("rl1_reception.never_middle")}{" "}
          <strong>{t("rl1_reception.never_bold2")}</strong> {t("rl1_reception.never_suffix")}
        </p>
      </div>

      <Panel
        kicker={t("rl1_reception.arrivals_kicker")}
        title={t("rl1_reception.arrivals_title")}
        action={<StatusPill tone={arrivalCount > 0 ? "blue" : "slate"}>{arrivalCount}</StatusPill>}
      >
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              {t("rl1_reception.loading_arrivals")}
            </div>
          ) : arrivalCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
              {t("rl1_reception.no_arrivals")}
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
                      {arrival.courierRef || t("rl1_reception.courier_to_assign")}
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
                  {t("rl1_reception.receive_button")}
                </button>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel kicker={t("rl1_reception.procedure_kicker")} title={t("rl1_reception.procedure_title")} action={<ClipboardList className="text-blue-700 dark:text-blue-300" size={19} />}>
        <ol className="space-y-0">
          {RECEPTION_STEPS.map((stepDef, index) => (
            <li key={stepDef.titleKey} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                  {index + 1}
                </span>
                {index < RECEPTION_STEPS.length - 1 ? <span className="w-0.5 flex-1 bg-emerald-500/35" /> : null}
              </div>
              <div className={index < RECEPTION_STEPS.length - 1 ? "pb-5" : ""}>
                <div className="font-black leading-tight text-slate-950 dark:text-white">{t(stepDef.titleKey)}</div>
                {stepDef.hintKey ? <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(stepDef.hintKey)}</div> : null}
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
        <ScanLine size={17} /> {t("rl1_reception.start_reception_button")}
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
