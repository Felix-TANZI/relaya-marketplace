import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  PackagePlus,
  QrCode,
  ShieldAlert,
  X,
} from "lucide-react";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import { useQrCamera } from "@/lib/useQrCamera";
import SignaturePad from "@/components/ui/SignaturePad";
import { RelaySheet, RelaySheetHeader, StatusPill } from "./RelayUi";
import RelayReceptionControl from "./RelayReceptionControl";
import RelayReceptionDone from "./RelayReceptionDone";
import { ZONES, placesOf, zoneOf } from "./relayShelf";

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

/**
 * Les trois temps de la reception, tels que le gerant les vit au comptoir.
 *
 * C'est un resume des 11 etapes detaillees plus bas : le fil du haut sert a se
 * situer, la liste sert a apprendre. Les deux ne disent pas la meme chose au
 * meme moment, donc les deux ont leur place.
 */
const RECEPTION_PHASES: Array<[string]> = [["Code"], ["Contrôler"], ["Valider"]];

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

/** Etape 2 : viseur camera, avec saisie manuelle de secours si le QR est illisible. */
function ScanDialog({
  presetLabel,
  manualFirst,
  onCancel,
  onConfirm,
}: {
  presetLabel: string;
  /** Le gerant a declare que le livreur n'a pas de QR : on lui donne le clavier. */
  manualFirst: boolean;
  onCancel: () => void;
  onConfirm: (missionId: number) => void;
}) {
  const { t } = useTranslation();
  const [detected, setDetected] = useState<number | null>(null);
  const [manualId, setManualId] = useState("");
  const manualRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (manualFirst) manualRef.current?.focus();
  }, [manualFirst]);
  const { videoRef, canvasRef, error, streaming } = useQrCamera({
    onDecode: (value) => {
      const missionId = parseMissionId(value);
      if (missionId) setDetected(missionId);
    },
  });

  const manualParsed = Number(manualId);
  const resolved = detected ?? (Number.isInteger(manualParsed) && manualParsed > 0 ? manualParsed : null);

  return (
    <RelaySheet label="Scanner le QR du livreur" onClose={onCancel} size="sm">
      <RelaySheetHeader
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
          ref={manualRef}
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
    </RelaySheet>
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
    <RelaySheet label="Refuser le colis" onClose={onCancel} size="sm">
      <RelaySheetHeader icon={ShieldAlert} title="Refuser ce colis" subtitle={`Mission ${missionId} — le colis ne sera pas mis en stock.`} onClose={onCancel} />

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
    </RelaySheet>
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
    <RelaySheet label="Réception, QR scanné" onClose={onCancel}>
      <RelaySheetHeader icon={PackagePlus} title="Réception · QR scanné" onClose={onCancel} />

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
    </RelaySheet>
  );
}

/**
 * Etape 1 : le code de depot.
 *
 * Le livreur annonce le lot qu'il remet ; le gerant le saisit avant d'ouvrir
 * quoi que ce soit. Tant que le code ne designe pas une arrivee reellement
 * attendue chez ce relais, le bouton reste ferme : c'est ce qui empeche de
 * receptionner le colis d'un autre point de depot.
 *
 * Le code est confronte aux arrivees deja annoncees par BelivaY — numero de
 * mission ou numero de commande. Le libelle de l'ecran parle de « 6 chiffres »
 * parce que c'est ce que le livreur lit dans son application ; ici on accepte
 * la forme courte comme la forme longue, un gerant presse ne compte pas ses
 * chiffres.
 */
function CodeDialog({
  arrivals,
  onCancel,
  onConfirm,
  onNoCode,
}: {
  arrivals: RelayArrival[];
  onCancel: () => void;
  onConfirm: (missionId: number) => void;
  onNoCode: () => void;
}) {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matched = useMemo(() => {
    const typed = Number(code);
    if (!code || !Number.isInteger(typed) || typed <= 0) return null;
    return arrivals.find((arrival) => arrival.shipmentId === typed || arrival.orderId === typed) ?? null;
  }, [arrivals, code]);

  // On ne crie pas a l'erreur des le premier chiffre : le gerant tape encore.
  const notFound = code.length >= 3 && !matched;

  return (
    <RelaySheet label="Saisir le code de dépôt" onClose={onCancel} size="sm">
      <RelaySheetHeader
        icon={KeyRound}
        tone="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
        title="Code de dépôt"
        subtitle="Le livreur le lit dans sa mission. Il désigne le lot qu'il vous remet."
        onClose={onCancel}
      />

      <input
        ref={inputRef}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="off"
        placeholder="000000"
        className={`w-full rounded-2xl border-2 bg-white px-4 py-4 text-center text-[30px] font-black tracking-[0.3em] text-slate-950 outline-none transition dark:bg-slate-950 dark:text-white ${
          notFound
            ? "border-red-400 focus:border-red-500"
            : matched
              ? "border-emerald-400 focus:border-emerald-500"
              : "border-slate-200 focus:border-amber-500 dark:border-slate-700"
        }`}
      />

      {matched ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/50">
          <div className="flex items-center gap-2 text-[13px] font-black text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={15} strokeWidth={2.6} /> Arrivée reconnue
          </div>
          <div className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
            {matched.internalRef} · {matched.sizeLabel}
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {matched.courierRef || "Livreur à assigner"}
            {matched.vehicleLabel ? ` · ${matched.vehicleLabel}` : ""}
          </div>
        </div>
      ) : notFound ? (
        <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
          <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
          Aucune arrivée annoncée chez vous ne porte ce code. Vérifiez-le avec le livreur avant d'ouvrir le lot.
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {arrivals.length > 0
            ? `${arrivals.length} arrivée${arrivals.length > 1 ? "s" : ""} annoncée${arrivals.length > 1 ? "s" : ""} chez vous en ce moment.`
            : "Aucune arrivée n'est annoncée chez vous pour l'instant."}
        </p>
      )}

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
          disabled={!matched}
          onClick={() => matched && onConfirm(matched.shipmentId)}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-5 py-2.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700"
        >
          Continuer <ArrowRight size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={onNoCode}
        className="mt-4 w-full text-center text-sm font-semibold text-blue-700 underline underline-offset-4 transition active:scale-95 dark:text-blue-300"
      >
        Le livreur n'a pas de code ?
      </button>
    </RelaySheet>
  );
}

export default function RelayReception({
  arrivals,
  busy,
  occupiedSlots,
  managerName,
  onReceive,
  onRefuse,
  onReserve,
  onReportGap,
  placesUsed,
  capacityMax,
  outbound,
  onOpenOutbound,
}: {
  arrivals: RelayArrival[];
  busy: boolean;
  /** Casiers deja pris : le calcul d'emplacement ne doit pas les reproposer. */
  occupiedSlots: string[];
  managerName: string;
  onReceive: (input: ReceiveInput) => Promise<boolean>;
  onRefuse: (input: RefuseInput) => Promise<boolean>;
  /** Accepter un colis en le signalant : la photo part en preuve de reception. */
  onReserve: (input: { parcelId: number; photo: File; note: string }) => Promise<boolean>;
  /** Ecart de comptage, trace aupres du support pendant que le livreur est la. */
  onReportGap: (note: string) => Promise<boolean>;
  /** Places occupees et declarees : l'ecran de fin annonce le nouveau taux. */
  placesUsed: number;
  capacityMax: number;
  /** Colis que le livreur doit emporter en repartant. */
  outbound: number;
  /** Ouvre l'ecran des sorties, livreur encore present. */
  onOpenOutbound: () => void;
}) {
  const { t } = useTranslation();
  const [codeOpen, setCodeOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [selected, setSelected] = useState<RelayArrival | null>(null);
  const [missionId, setMissionId] = useState<number | null>(null);
  const [refusalOpen, setRefusalOpen] = useState(false);
  /** Colis du lot dont le scelle a ete verifie, par identifiant d'expedition. */
  const [checked, setChecked] = useState<number[]>([]);
  /** Les preuves ne s'ouvrent qu'une fois le lot entierement controle. */
  const [proofOpen, setProofOpen] = useState(false);
  /**
   * Le lot qui vient d'entrer.
   *
   * On garde un resume plutot que de fermer : le livreur est encore la, et
   * l'ecran doit lui dire ce qu'il emporte avant de repartir.
   */
  const [done, setDone] = useState<{
    count: number;
    places: number;
    at: string;
    buyers: number;
    waiting: number;
  } | null>(null);
  /** Le scan s'ouvre directement sur la saisie manuelle quand le QR est hors jeu. */
  const [manualFirst, setManualFirst] = useState(false);

  const openScan = (arrival: RelayArrival | null, manual = false) => {
    setSelected(arrival);
    setMissionId(null);
    setManualFirst(manual);
    setScanOpen(true);
  };

  const confirmScan = (scannedId: number) => {
    // Le code fait foi : s'il pointe une autre arrivee que celle
    // pre-selectionnee, on bascule sur celle reellement designee.
    const matched = arrivals.find((arrival) => arrival.shipmentId === scannedId) ?? null;
    setSelected(matched ?? (selected?.shipmentId === scannedId ? selected : null));
    setMissionId(scannedId);
    setChecked([]);
    setProofOpen(false);
    setScanOpen(false);
  };

  const closeReception = () => {
    setMissionId(null);
    setSelected(null);
    setRefusalOpen(false);
    setProofOpen(false);
    setChecked([]);
    setDone(null);
  };

  /**
   * Le lot : tous les colis annonces par le meme livreur.
   *
   * Le serveur n'a pas de notion de mission — il a des expeditions et un
   * transporteur. Regrouper par transporteur redonne ce que le gerant voit
   * arriver : un homme, plusieurs cartons.
   */
  const lot = useMemo(() => {
    if (!missionId) return [] as RelayArrival[];
    const pivot = arrivals.find((arrival) => arrival.shipmentId === missionId);
    if (!pivot) return selected ? [selected] : [];
    if (!pivot.courierRef) return [pivot];
    return arrivals.filter((arrival) => arrival.courierRef === pivot.courierRef);
  }, [arrivals, missionId, selected]);

  /**
   * Un casier par colis, calcule une fois pour tout le lot.
   *
   * La zone vient de la taille, l'index est le premier libre de cette zone —
   * en tenant compte des casiers deja occupes ET de ceux qu'on vient
   * d'attribuer dans ce meme lot.
   */
  const slots = useMemo(() => {
    const pris = new Set(occupiedSlots.map((code) => code.toUpperCase().replace("-", "")));
    const attribues: Record<number, string> = {};
    lot.forEach((arrival) => {
      const zone = zoneOf(arrival.sizeLabel);
      const max = ZONES.find((candidate) => candidate.key === zone)?.places ?? 1;
      void max;
      for (let index = 1; index <= 999; index += 1) {
        const code = `${zone}-${String(index).padStart(2, "0")}`;
        if (pris.has(code.replace("-", ""))) continue;
        pris.add(code.replace("-", ""));
        attribues[arrival.shipmentId] = code;
        break;
      }
    });
    return attribues;
  }, [lot, occupiedSlots]);

  const toggle = (shipmentId: number) =>
    setChecked((current) =>
      current.includes(shipmentId) ? current.filter((item) => item !== shipmentId) : [...current, shipmentId],
    );

  const validate = async (photos: PhotoMap, signatures: { manager: string | null; courier: string | null }) => {
    if (!missionId) return;
    const captured = PHOTO_SLOTS.filter((slotDef) => photos[slotDef.key]).map((slotDef) => t(slotDef.labelKey).toLowerCase());
    const proofNote = [
      `Réception V5 · mission ${missionId} · ${lot.length} colis`,
      `photos preuve : ${captured.join(", ")}`,
      `double signature : gérant ${managerName}${signatures.courier ? ` + livreur ${selected?.courierRef || "présent"}` : ""}`,
      `horodatage ${new Date().toLocaleString("fr-FR")}`,
    ].join(" · ");

    // Un appel par colis : le serveur receptionne une expedition a la fois,
    // et chacune porte son propre casier.
    let tout = true;
    for (const arrival of lot) {
      const ok = await onReceive({
        shipmentId: arrival.shipmentId,
        slotCode: slots[arrival.shipmentId] || "",
        proofNote,
      });
      if (!ok) tout = false;
    }
    if (!tout) return;

    // Un client par commande : deux colis d'une meme commande ne font qu'un
    // destinataire, et il ne recoit son code qu'au colis complet.
    const commandes = new Set(lot.map((arrival) => arrival.orderId));
    const restants = arrivals.filter(
      (arrival) => !lot.includes(arrival) && commandes.has(arrival.orderId),
    );
    setDone({
      count: lot.length,
      places: lot.reduce((total, arrival) => total + placesOf(arrival.sizeLabel), 0),
      at: new Date().toISOString(),
      buyers: commandes.size,
      waiting: new Set(restants.map((arrival) => arrival.orderId)).size,
    });
    setProofOpen(false);
    setChecked([]);
  };

  const confirmRefusal = async (input: { reason: string; note: string; photo: File }) => {
    if (!missionId) return;
    const success = await onRefuse({ shipmentId: missionId, ...input });
    if (success) {
      setRefusalOpen(false);
      closeReception();
    }
  };

  const selectedLabel = useMemo(
    () => (selected ? `${selected.courierRef || selected.internalRef} · ${selected.sizeLabel}` : ""),
    [selected],
  );

  return (
    <div className="space-y-4">
      {done ? (
        <RelayReceptionDone
          count={done.count}
          places={done.places}
          at={done.at}
          buyers={done.buyers}
          waiting={done.waiting}
          placesUsed={placesUsed}
          capacityMax={capacityMax}
          outbound={outbound}
          onOutbound={onOpenOutbound}
          onNew={closeReception}
        />
      ) : missionId && !refusalOpen && !proofOpen ? (
        <RelayReceptionControl
          lot={lot}
          checked={checked}
          slots={slots}
          courier={selected?.courierRef || ""}
          missionRef={`M-${missionId}`}
          outbound={outbound}
          busy={busy}
          onToggle={toggle}
          onValidate={() => setProofOpen(true)}
          onRefuse={() => setRefusalOpen(true)}
          onCancel={closeReception}
          onReserve={onReserve}
          onReportGap={onReportGap}
        />
      ) : (
        <>
      {/* ── Entree du workflow ───────────────────────────────────────────────
          Bandeau pleine largeur, colle sous le bandeau du portail : il n'est
          pas une carte posee sur la page, il EST le haut de l'ecran. C'est ce
          qui le rend impossible a manquer — et cet ecran n'a qu'un geste.

          `-mx-4 -mt-4` annule la gouttiere du conteneur pour que le bleu
          touche les bords, comme une barre d'en-tete. Le degrade : bleu nuit
          en diagonale, traverse d'une lueur chaude au coin haut droit — les
          deux couleurs de BelivaY se rejoignent la ou le travail commence. */}
      <section
        className="-mx-4 -mt-4 px-4 pb-5 pt-4 text-white sm:-mx-6 sm:-mt-6 sm:px-6"
        style={{
          backgroundImage:
            "radial-gradient(75% 110% at 99% -6%, rgba(214,116,62,.42) 0%, rgba(160,80,60,.14) 40%, rgba(160,80,60,0) 68%),"
            + " linear-gradient(132deg, #0B1734 0%, #12254C 46%, #1B3570 100%)",
        }}
      >
        {/* Le fil ① ② ③ n'est pas decoratif : il dit au gerant, avant meme
            qu'il commence, que le livreur ne repartira pas apres la saisie —
            il reste pour le controle et la double signature. */}
        <ol className="flex items-center justify-between gap-2">
          {RECEPTION_PHASES.map(([label], index) => (
            <li key={label} className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11.5px] font-black ${
                  index === 0 ? "bg-[#E9A93A] text-[#1B2540]" : "bg-[#1E2F55] text-[#8A97B8]"
                }`}
              >
                {index + 1}
              </span>
              <span className={`truncate text-[13px] font-black ${index === 0 ? "text-white" : "text-[#C3CCE2]"}`}>
                {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex items-start gap-4">
          {/* Cadre pointille : la place du code, montree vide tant que rien
              n'est saisi. Il retrecit avec l'ecran plutot que de disparaitre —
              c'est lui qui dit d'un coup d'oeil de quoi parle ce bloc. */}
          <div
            aria-hidden
            className="flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center rounded-[14px] border-2 border-dashed border-[#E9A93A] text-[#E9A93A]"
          >
            <KeyRound size={38} strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-black leading-tight tracking-[-0.01em]">Saisissez le code de dépôt</h2>
            <p className="mt-1.5 text-[13.5px] font-medium leading-[1.45] text-white/65">
              6 chiffres donnés par le livreur. Pas de code, pas de lot.
            </p>

            <button
              type="button"
              onClick={() => setCodeOpen(true)}
              className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-4 py-3 text-[17px] font-black text-white shadow-[0_4px_14px_rgba(232,89,12,.4)] transition active:scale-[.97]"
            >
              <KeyRound size={19} strokeWidth={2.5} /> Saisir le code
            </button>

            {/* Le code peut etre illisible, l'ecran du livreur casse, la
                batterie vide. Sans cette porte de sortie, la reception
                s'arrete la. */}
            <button
              type="button"
              onClick={() => openScan(null, true)}
              className="mt-3 text-[13.5px] font-semibold text-[#8AB4F8] underline underline-offset-4 transition active:scale-95"
            >
              Le livreur n'a pas de code ?
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-[#EFF4FE] p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <LockKeyhole className="mt-0.5 flex-shrink-0 text-[#5B7FC7] dark:text-blue-300" size={18} />
        <p className="text-[13.5px] font-medium leading-[1.5] text-[#4A5E8A] dark:text-blue-100/80">
          Vous ne voyez jamais le vendeur ni le client : uniquement la référence BelivaY, la taille et l'emplacement.
        </p>
      </div>
        </>
      )}

            {codeOpen ? (
        <CodeDialog
          arrivals={arrivals}
          onCancel={() => setCodeOpen(false)}
          onConfirm={(missionId) => {
            setCodeOpen(false);
            confirmScan(missionId);
          }}
          onNoCode={() => {
            setCodeOpen(false);
            openScan(null, true);
          }}
        />
      ) : null}

      {scanOpen ? (
        <ScanDialog presetLabel={selectedLabel} manualFirst={manualFirst} onCancel={() => setScanOpen(false)} onConfirm={confirmScan} />
      ) : null}

      {missionId && proofOpen && !refusalOpen ? (
        <ReceptionDialog
          arrival={selected}
          missionId={missionId}
          slot={slots[missionId] || ""}
          onSlotChange={() => undefined}
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
