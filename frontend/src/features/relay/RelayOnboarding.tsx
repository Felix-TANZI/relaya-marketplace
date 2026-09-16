import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gem,
  GraduationCap,
  IdCard,
  Landmark,
  Lock,
  MapPin,
  Medal,
  PenLine,
  Scale,
  Search,
  ShieldCheck,
  Store,
  Target,
  UploadCloud,
} from "lucide-react";
import { http } from "@/services/api/http";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import SignaturePad from "@/components/ui/SignaturePad";
import { ModuleHeader, Panel, StatusPill } from "./RelayUi";

/**
 * Parcours d'inscription du point relais : 4 etapes, de la verification
 * d'identite a l'activation du compte.
 *
 * Le parcours n'est pas une brochure : l'etape 1 lit et alimente reellement les
 * documents de conformite du compte, l'etape 3 exige une signature manuscrite,
 * et la finalisation transmet le dossier au support BelivaY. Un compte deja
 * approuve affiche directement le parcours complet.
 */

interface ComplianceDocument {
  document_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  file_url: string | null;
}

interface RelayOnboardingProps {
  onError: (error: unknown) => void;
  relay: {
    name: string;
    email: string;
    phone: string;
    address: string;
    /** Statut serveur du point relais : APPROVED ferme le parcours. */
    status: "PENDING" | "APPROVED" | "SUSPENDED" | null;
  };
}

interface StepDefinition {
  key: string;
  labelKey: string;
  icon: typeof IdCard;
  /** Couleur de l'icone quand l'etape n'est ni faite ni active. */
  tone: string;
  titleKey: string;
  subtitleKey: string;
  sectionLabelKey: string;
}

const STEPS: StepDefinition[] = [
  {
    key: "kyc",
    labelKey: "rl1_onboarding.step_kyc_label",
    icon: IdCard,
    tone: "text-blue-600 dark:text-blue-300",
    titleKey: "rl1_onboarding.step_kyc_title",
    subtitleKey: "rl1_onboarding.step_kyc_subtitle",
    sectionLabelKey: "rl1_onboarding.step_kyc_section_label",
  },
  {
    key: "caution",
    labelKey: "rl1_onboarding.step_caution_label",
    icon: ShieldCheck,
    tone: "text-blue-600 dark:text-blue-300",
    titleKey: "rl1_onboarding.step_caution_title",
    subtitleKey: "rl1_onboarding.step_caution_subtitle",
    sectionLabelKey: "rl1_onboarding.step_caution_section_label",
  },
  {
    key: "convention",
    labelKey: "rl1_onboarding.step_convention_label",
    icon: PenLine,
    tone: "text-amber-600 dark:text-amber-300",
    titleKey: "rl1_onboarding.step_convention_title",
    subtitleKey: "rl1_onboarding.step_convention_subtitle",
    sectionLabelKey: "rl1_onboarding.step_convention_section_label",
  },
  {
    key: "activation",
    labelKey: "rl1_onboarding.step_activation_label",
    icon: CheckCircle2,
    tone: "text-emerald-600 dark:text-emerald-300",
    titleKey: "rl1_onboarding.step_activation_title",
    subtitleKey: "rl1_onboarding.step_activation_subtitle",
    sectionLabelKey: "rl1_onboarding.step_activation_section_label",
  },
];

interface RequiredPiece {
  key: string;
  icon: typeof IdCard;
  labelKey: string;
  noteKey: string | null;
  /** Type de document envoye au serveur, ou null si la piece est deduite du profil. */
  documentType: string | null;
}

const REQUIRED_PIECES: RequiredPiece[] = [
  { key: "cni", icon: IdCard, labelKey: "rl1_onboarding.piece_cni_label", noteKey: "rl1_onboarding.piece_cni_note", documentType: "MANAGER_ID" },
  { key: "patente", icon: FileText, labelKey: "rl1_onboarding.piece_patente_label", noteKey: "rl1_onboarding.piece_patente_note", documentType: "BUSINESS_LICENSE" },
  { key: "rccm", icon: Landmark, labelKey: "rl1_onboarding.piece_rccm_label", noteKey: null, documentType: "RCCM" },
  { key: "bail", icon: Building2, labelKey: "rl1_onboarding.piece_bail_label", noteKey: null, documentType: "LEASE" },
  {
    key: "photos",
    icon: Camera,
    labelKey: "rl1_onboarding.piece_photos_label",
    noteKey: "rl1_onboarding.piece_photos_note",
    documentType: "PREMISES_PHOTOS",
  },
  { key: "geo", icon: MapPin, labelKey: "rl1_onboarding.piece_geo_label", noteKey: "rl1_onboarding.piece_geo_note", documentType: null },
  { key: "casier", icon: Scale, labelKey: "rl1_onboarding.piece_casier_label", noteKey: "rl1_onboarding.piece_casier_note", documentType: "CRIMINAL_RECORD" },
];

const LEVELS: Array<{ levelKey: string; cautionKey: string }> = [
  { levelKey: "rl1_onboarding.level_starter", cautionKey: "rl1_onboarding.no_deposit" },
  { levelKey: "rl1_onboarding.level_confirmed", cautionKey: "rl1_onboarding.no_deposit" },
  { levelKey: "rl1_onboarding.level_premium", cautionKey: "rl1_onboarding.no_deposit" },
];

const ACTIVATION_ROWS: Array<[typeof Search, string, string]> = [
  [Search, "rl1_onboarding.activation_admin_label", "rl1_onboarding.activation_admin_detail"],
  [GraduationCap, "rl1_onboarding.activation_training_label", "rl1_onboarding.activation_training_detail"],
  [BadgeCheck, "rl1_onboarding.activation_account_label", "rl1_onboarding.activation_account_detail"],
];

const PACT_BENEFITS: Array<[typeof Target, string, string, string]> = [
  [Target, "rl1_onboarding.pact_exclusivity_title", "rl1_onboarding.pact_exclusivity_body", "text-rose-600 dark:text-rose-400"],
  [Gem, "rl1_onboarding.pact_deposit_title", "rl1_onboarding.pact_deposit_body", "text-emerald-600 dark:text-emerald-400"],
  [Store, "rl1_onboarding.pact_subsidy_title", "rl1_onboarding.pact_subsidy_body", "text-indigo-600 dark:text-indigo-400"],
  [Lock, "rl1_onboarding.pact_pricing_title", "rl1_onboarding.pact_pricing_body", "text-blue-600 dark:text-blue-400"],
];

const STORAGE_KEY = "belivay.relay.onboarding";

/**
 * Etat du parcours. `validated` porte la progression reelle : une etape
 * franchie le reste, meme si le gerant revient en arriere pour relire une
 * etape precedente. C'est cette liste, et non la position du curseur, qui
 * alimente la barre de progression.
 */
interface OnboardingState {
  step: number;
  validated: number[];
  signed: boolean;
  submitted: boolean;
}

function readStoredStep(): OnboardingState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<OnboardingState>) : null;
    return {
      step: parsed?.step ?? 0,
      validated: Array.isArray(parsed?.validated) ? parsed.validated : [],
      signed: Boolean(parsed?.signed),
      submitted: Boolean(parsed?.submitted),
    };
  } catch {
    return { step: 0, validated: [], signed: false, submitted: false };
  }
}

function writeStoredStep(state: OnboardingState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible : le parcours reste utilisable, sans reprise. */
  }
}

export default function RelayOnboarding({ onError, relay }: RelayOnboardingProps) {
  const { t } = useTranslation();
  const alreadyApproved = relay.status === "APPROVED";
  const stored = useMemo(readStoredStep, []);
  const [step, setStep] = useState(alreadyApproved ? STEPS.length - 1 : stored.step);
  // Un compte deja approuve a franchi tout le parcours : la barre est pleine.
  const [validated, setValidated] = useState<number[]>(
    alreadyApproved ? STEPS.map((_, index) => index) : stored.validated,
  );
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [signed, setSigned] = useState(alreadyApproved || stored.signed);
  const [submitted, setSubmitted] = useState(alreadyApproved || stored.submitted);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const payload = await http<ComplianceDocument[]>("/api/auth/compliance-documents/");
      setDocuments(Array.isArray(payload) ? payload : []);
    } catch (error) {
      onError(error);
    }
  }, [onError]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    writeStoredStep({ step, validated, signed, submitted });
  }, [signed, step, submitted, validated]);

  /** Etat d'une piece : le serveur fait foi, sauf pour la geolocalisation. */
  const pieceState = (piece: RequiredPiece): { done: boolean; label: string; tone: "emerald" | "amber" | "red" | "slate" } => {
    if (!piece.documentType) {
      const located = Boolean(relay.address?.trim());
      return located
        ? { done: true, label: t("rl1_onboarding.status_address_declared"), tone: "emerald" }
        : { done: false, label: t("rl1_onboarding.status_to_fill"), tone: "amber" };
    }
    const document = documents.find((item) => item.document_type === piece.documentType);
    if (!document) return { done: false, label: t("rl1_onboarding.status_to_send"), tone: "slate" };
    if (document.status === "APPROVED") return { done: true, label: t("rl1_onboarding.status_validated"), tone: "emerald" };
    if (document.status === "REJECTED") return { done: false, label: t("rl1_onboarding.status_rejected"), tone: "red" };
    return { done: true, label: t("rl1_onboarding.status_in_review"), tone: "amber" };
  };

  const piecesDone = REQUIRED_PIECES.filter((piece) => pieceState(piece).done).length;
  const kycComplete = alreadyApproved || piecesDone === REQUIRED_PIECES.length;

  const upload = async (piece: RequiredPiece, file?: File) => {
    if (!file || !piece.documentType) return;
    setBusy(true);
    setNotice(null);
    try {
      const compressed = await ensureImageUnderLimit(file);
      const body = new FormData();
      body.append("document_type", piece.documentType);
      body.append("file", compressed);
      await http<ComplianceDocument>("/api/auth/compliance-documents/", { method: "POST", body });
      await loadDocuments();
      setNotice({ tone: "success", text: t("rl1_onboarding.upload_success", { label: t(piece.labelKey) }) });
    } catch (error) {
      onError(error);
      setNotice({ tone: "error", text: t("rl1_onboarding.upload_error", { label: t(piece.labelKey) }) });
    } finally {
      setBusy(false);
    }
  };

  /** Verrou d'etape : on ne passe pas la convention sans signature manuscrite. */
  const blockedReason = (() => {
    if (alreadyApproved) return null;
    if (step === 2 && !signature && !signed) return t("rl1_onboarding.sign_to_continue");
    return null;
  })();

  /** Marque une etape franchie : la pastille et le segment passent au vert. */
  const markValidated = (index: number) =>
    setValidated((previous) => (previous.includes(index) ? previous : [...previous, index]));

  const next = () => {
    if (blockedReason) {
      setNotice({ tone: "error", text: blockedReason });
      return;
    }
    if (step === 2) setSigned(true);
    markValidated(step);
    setNotice(null);
    setStep((previous) => Math.min(previous + 1, STEPS.length - 1));
  };

  const previous = () => {
    setNotice(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const finalize = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: relay.name,
          email: relay.email,
          phone: relay.phone,
          subject: `[Point relais] Dossier d'inscription — ${relay.name}`,
          message: [
            `Point relais : ${relay.name}`,
            `Adresse déclarée : ${relay.address || "non renseignée"}`,
            `Pièces KYC fournies : ${piecesDone}/${REQUIRED_PIECES.length}`,
            `Convention signée électroniquement : ${signature || signed ? "oui" : "non"}`,
            "Demande : planification de la visite physique (SLA 48 h) et de la formation initiale 2 h.",
          ].join("\n"),
        }),
      });
      setSubmitted(true);
      markValidated(STEPS.length - 1);
      setNotice({
        tone: "success",
        text: t("rl1_onboarding.finalize_success"),
      });
    } catch (error) {
      onError(error);
      setNotice({ tone: "error", text: t("rl1_onboarding.finalize_error") });
    } finally {
      setBusy(false);
    }
  };

  /** Source unique de la progression : la pastille, le segment et le compteur en dependent. */
  const stepDone = (index: number) => validated.includes(index);
  const doneCount = STEPS.filter((_, index) => stepDone(index)).length;
  const current = STEPS[step];
  const CurrentIcon = current.icon;

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={FileText}
        title={t("rl1_onboarding.header_title")}
        subtitle={t("rl1_onboarding.header_subtitle")}
      />

      <div className="flex items-start gap-4 rounded-2xl border border-blue-200 bg-white p-5 dark:border-blue-900 dark:bg-slate-900">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-[0_8px_18px_-8px_rgba(29,78,216,.9)]">
          <Store size={20} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <h3 className="font-black text-slate-950 dark:text-white">{t("rl1_onboarding.intro_title")}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            {t("rl1_onboarding.intro_subtitle")}
          </p>
        </div>
      </div>

      {alreadyApproved ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0" />
          {t("rl1_onboarding.already_approved_notice")}
        </div>
      ) : null}

      <Panel
        icon={ClipboardList}
        title={t("rl1_onboarding.journey_title")}
        action={
          <div className="flex items-center gap-2">
            <StatusPill tone={doneCount > 0 ? "emerald" : "slate"}>
              {t(doneCount > 1 ? "rl1_onboarding.steps_done_plural" : "rl1_onboarding.steps_done", { count: doneCount, total: STEPS.length })}
            </StatusPill>
            <StatusPill tone="blue">
              {t("rl1_onboarding.step_counter", { current: step + 1, total: STEPS.length })}
            </StatusPill>
          </div>
        }
      >
        {/* Chaque etape porte ses deux demi-segments : le gauche est vert quand
            l'etape precedente est validee, le droit quand elle-meme l'est. La
            ligne suit donc exactement l'avancement affiche en dessous. */}
        <ol className="flex items-start gap-0">
          {STEPS.map((definition, index) => {
            const Icon = definition.icon;
            const done = stepDone(index);
            const active = index === step && !done;
            const beforeDone = index > 0 && stepDone(index - 1);
            return (
              <li key={definition.key} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <span
                    className={`h-0.5 flex-1 transition-colors duration-500 ${
                      index === 0 ? "bg-transparent" : beforeDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => !alreadyApproved && setStep(index)}
                    aria-current={index === step ? "step" : undefined}
                    aria-label={done ? t("rl1_onboarding.step_aria_done", { label: t(definition.labelKey) }) : t(definition.labelKey)}
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition duration-300 ${
                      done
                        ? "bg-emerald-500 text-white shadow-[0_8px_16px_-8px_rgba(16,185,129,.9)]"
                        : active
                          ? "bg-blue-600 text-white shadow-[0_8px_16px_-8px_rgba(37,99,235,.9)]"
                          : `bg-slate-100 dark:bg-slate-800 ${definition.tone}`
                    }`}
                  >
                    {done ? <Check size={19} strokeWidth={3} /> : <Icon size={19} strokeWidth={2.4} />}
                  </button>
                  <span
                    className={`h-0.5 flex-1 transition-colors duration-500 ${
                      index === STEPS.length - 1 ? "bg-transparent" : done ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                </div>
                <span className="mt-2 px-1 text-center text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  {t(definition.labelKey)}
                </span>
                {done ? (
                  <span className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                    {t("rl1_onboarding.validated_badge")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel icon={CurrentIcon} title={t(current.titleKey)}>
        <p className="-mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{t(current.subtitleKey)}</p>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{t(current.sectionLabelKey)}</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        {step === 0 ? (
          <div>
            {REQUIRED_PIECES.map((piece) => {
              const Icon = piece.icon;
              const state = pieceState(piece);
              return (
                <div
                  key={piece.key}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3.5 last:border-b-0 dark:border-slate-800"
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Icon size={17} strokeWidth={2.3} className={`flex-shrink-0 ${state.done ? "text-emerald-600" : "text-slate-400"}`} />
                    {t(piece.labelKey)}
                  </span>
                  <span className="flex items-center gap-2.5">
                    {piece.noteKey ? (
                      <span className="text-sm font-black text-slate-950 dark:text-white">{t(piece.noteKey)}</span>
                    ) : null}
                    <StatusPill tone={state.tone}>{state.label}</StatusPill>
                    {piece.documentType && !alreadyApproved ? (
                      <label className="cursor-pointer rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">
                        <UploadCloud size={13} strokeWidth={2.6} className="mr-1 inline" />
                        {state.done ? t("rl1_onboarding.replace_document") : t("rl1_onboarding.send_document")}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          disabled={busy}
                          className="sr-only"
                          onChange={(event) => void upload(piece, event.target.files?.[0])}
                        />
                      </label>
                    ) : null}
                  </span>
                </div>
              );
            })}
            <div
              className={`mt-5 rounded-2xl border p-4 text-sm font-bold leading-6 ${
                kycComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100"
              }`}
            >
              {t("rl1_onboarding.pieces_provided_count", { done: piecesDone, total: REQUIRED_PIECES.length })}{" "}
              {kycComplete
                ? t("rl1_onboarding.kyc_complete_notice")
                : t("rl1_onboarding.kyc_incomplete_notice")}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            {LEVELS.map((level) => (
              <div
                key={level.levelKey}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3.5 last:border-b-0 dark:border-slate-800"
              >
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t(level.levelKey)}</span>
                <span className="text-sm font-black text-slate-950 dark:text-white">{t(level.cautionKey)}</span>
              </div>
            ))}
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                {t("rl1_onboarding.no_deposit_prefix")}{" "}
                <strong className="font-black">{t("rl1_onboarding.no_deposit_bold")}</strong> {t("rl1_onboarding.no_deposit_suffix")}
              </p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <PenLine size={17} strokeWidth={2.4} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-300" />
              <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                {t("rl1_onboarding.sign_prefix")} <strong className="font-black">{t("rl1_onboarding.sign_bold1")}</strong> {t("rl1_onboarding.sign_middle")}{" "}
                <strong className="font-black">{t("rl1_onboarding.sign_bold2")}</strong> {t("rl1_onboarding.sign_suffix")}
              </p>
            </div>
            <div className="mt-5">
              <SignaturePad
                label={t("rl1_onboarding.manager_signature_label")}
                onChange={(dataUrl) => {
                  setSignature(dataUrl);
                  if (dataUrl) setNotice(null);
                }}
                disabled={alreadyApproved}
              />
            </div>
            {signed && !signature ? (
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-600">
                {t("rl1_onboarding.already_signed_notice")}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            {ACTIVATION_ROWS.map(([Icon, labelKey, detailKey]) => (
              <div
                key={labelKey}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3.5 last:border-b-0 dark:border-slate-800"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <Icon size={17} strokeWidth={2.3} className="flex-shrink-0 text-slate-400" />
                  {t(labelKey)}
                </span>
                <span className="text-sm font-black text-slate-950 dark:text-white">{t(detailKey)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {notice ? (
          <div
            className={`mt-5 rounded-2xl border p-4 text-sm font-bold leading-6 ${
              notice.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                : "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
            }`}
          >
            {notice.text}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={previous}
            disabled={step === 0}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {t("rl1_onboarding.previous_button")}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_20px_-12px_rgba(37,99,235,.9)] transition hover:bg-blue-700"
            >
              {t("rl1_onboarding.next_button")}
            </button>
          ) : (
            <button
              type="button"
              onClick={finalize}
              disabled={busy || submitted}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_20px_-12px_rgba(5,150,105,.9)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={15} strokeWidth={3} />
              {submitted ? t("rl1_onboarding.finalized_label") : busy ? t("rl1_onboarding.submitting_label") : t("rl1_onboarding.finalize_button")}
            </button>
          )}
        </div>
      </Panel>

      <Panel
        icon={Medal}
        title={t("rl1_onboarding.pact_title")}
        action={
          <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-black text-white shadow-sm">
            {t("rl1_onboarding.founding_partner_badge")}
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {PACT_BENEFITS.map(([Icon, titleKey, bodyKey, tone]) => (
            <div key={titleKey} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
              <h3 className="flex items-center gap-2 font-black text-slate-950 dark:text-white">
                <Icon size={17} strokeWidth={2.4} className={`flex-shrink-0 ${tone}`} />
                {t(titleKey)}
              </h3>
              <p className="mt-1.5 pl-6 text-sm font-semibold text-slate-500 dark:text-slate-400">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
