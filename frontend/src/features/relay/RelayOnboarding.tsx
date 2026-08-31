import { useCallback, useEffect, useMemo, useState } from "react";
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
  label: string;
  icon: typeof IdCard;
  /** Couleur de l'icone quand l'etape n'est ni faite ni active. */
  tone: string;
  title: string;
  subtitle: string;
  sectionLabel: string;
}

const STEPS: StepDefinition[] = [
  {
    key: "kyc",
    label: "Vérification d'identité (KYC)",
    icon: IdCard,
    tone: "text-blue-600 dark:text-blue-300",
    title: "Étape 1 — Vérification d'identité (KYC)",
    subtitle: "CNI + cross-check ANTIC, patente, RCCM, bail commercial.",
    sectionLabel: "Pièces requises",
  },
  {
    key: "caution",
    label: "Sans caution",
    icon: ShieldCheck,
    tone: "text-blue-600 dark:text-blue-300",
    title: "Étape 2 — Sans caution",
    subtitle: "Aucun dépôt requis · vérification KYC + Trust Score.",
    sectionLabel: "Niveaux (sans caution · KYC + Trust Score)",
  },
  {
    key: "convention",
    label: "Signature de la convention",
    icon: PenLine,
    tone: "text-amber-600 dark:text-amber-300",
    title: "Étape 3 — Signature de la convention",
    subtitle: "Règlement PR + convention partenariat (signature électronique).",
    sectionLabel: "Convention de partenariat",
  },
  {
    key: "activation",
    label: "Validation Admin & activation",
    icon: CheckCircle2,
    tone: "text-emerald-600 dark:text-emerald-300",
    title: "Étape 4 — Validation Admin & activation",
    subtitle: "Visite physique 48 h + formation 2 h obligatoire.",
    sectionLabel: "Validation & activation",
  },
];

interface RequiredPiece {
  key: string;
  icon: typeof IdCard;
  label: string;
  note: string;
  /** Type de document envoye au serveur, ou null si la piece est deduite du profil. */
  documentType: string | null;
}

const REQUIRED_PIECES: RequiredPiece[] = [
  { key: "cni", icon: IdCard, label: "CNI du gérant", note: "cross-check ANTIC obligatoire", documentType: "MANAGER_ID" },
  { key: "patente", icon: FileText, label: "Patente commerciale CMR", note: "à jour", documentType: "BUSINESS_LICENSE" },
  { key: "rccm", icon: Landmark, label: "RCCM du commerce", note: "", documentType: "RCCM" },
  { key: "bail", icon: Building2, label: "Bail commercial ou titre de propriété", note: "", documentType: "LEASE" },
  {
    key: "photos",
    icon: Camera,
    label: "Photos du local",
    note: "extérieur (enseigne) + intérieur (stockage)",
    documentType: "PREMISES_PHOTOS",
  },
  { key: "geo", icon: MapPin, label: "Géolocalisation", note: "le local est à l'adresse déclarée", documentType: null },
  { key: "casier", icon: Scale, label: "Casier judiciaire", note: "bulletin n°3", documentType: "CRIMINAL_RECORD" },
];

const LEVELS: Array<[string, string]> = [
  ["Starter · 1–30 colis simultanés", "Sans caution"],
  ["Confirmé · 31–100 colis", "Sans caution"],
  ["Premium · 101+ colis", "Sans caution"],
];

const ACTIVATION_ROWS: Array<[typeof Search, string, string]> = [
  [Search, "Validation Admin BelivaY", "SLA 48 h · visite physique surprise"],
  [GraduationCap, "Formation initiale", "2 h obligatoire (réception, CNI, sécurité)"],
  [BadgeCheck, "Activation du compte", "ouverture immédiate après validation"],
];

const PACT_BENEFITS: Array<[typeof Target, string, string, string]> = [
  [Target, "Exclusivité 1 km", "rayon protégé pendant 12 mois", "text-rose-600 dark:text-rose-400"],
  [Gem, "Zéro caution", "aucun dépôt requis, accès 100 % gratuit", "text-emerald-600 dark:text-emerald-400"],
  [Store, "Subvention installation", "kit enseigne + étagères de stockage", "text-indigo-600 dark:text-indigo-400"],
  [Lock, "Tarification figée", "grille garantie 12 mois, non révisable", "text-blue-600 dark:text-blue-400"],
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
        ? { done: true, label: "Adresse déclarée", tone: "emerald" }
        : { done: false, label: "À renseigner", tone: "amber" };
    }
    const document = documents.find((item) => item.document_type === piece.documentType);
    if (!document) return { done: false, label: "À envoyer", tone: "slate" };
    if (document.status === "APPROVED") return { done: true, label: "Validé", tone: "emerald" };
    if (document.status === "REJECTED") return { done: false, label: "Rejeté", tone: "red" };
    return { done: true, label: "En vérification", tone: "amber" };
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
      setNotice({ tone: "success", text: `${piece.label} envoyé pour vérification BelivaY.` });
    } catch (error) {
      onError(error);
      setNotice({ tone: "error", text: `L'envoi de « ${piece.label} » a échoué. Réessayez.` });
    } finally {
      setBusy(false);
    }
  };

  /** Verrou d'etape : on ne passe pas la convention sans signature manuscrite. */
  const blockedReason = (() => {
    if (alreadyApproved) return null;
    if (step === 2 && !signature && !signed) return "Signez la convention pour continuer.";
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
        text: "Dossier transmis. BelivaY planifie la visite physique sous 48 h, puis la formation initiale de 2 h.",
      });
    } catch (error) {
      onError(error);
      setNotice({ tone: "error", text: "Le dossier n'a pas pu être transmis. Réessayez dans un instant." });
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
        title="Inscription & cycle de vie"
        subtitle="Le parcours pour devenir Point Relais partenaire BelivaY"
      />

      <div className="flex items-start gap-4 rounded-2xl border border-blue-200 bg-white p-5 dark:border-blue-900 dark:bg-slate-900">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-[0_8px_18px_-8px_rgba(29,78,216,.9)]">
          <Store size={20} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <h3 className="font-black text-slate-950 dark:text-white">Devenez partenaire indépendant BelivaY</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            Une nouvelle source de revenus pour votre commerce de quartier — 4 étapes, validation sous 48 h.
          </p>
        </div>
      </div>

      {alreadyApproved ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0" />
          Votre point relais est déjà validé et activé par BelivaY. Ce parcours reste consultable comme référence du cycle de vie
          partenaire.
        </div>
      ) : null}

      <Panel
        icon={ClipboardList}
        title="Parcours d'inscription"
        action={
          <div className="flex items-center gap-2">
            <StatusPill tone={doneCount > 0 ? "emerald" : "slate"}>
              {doneCount}/{STEPS.length} validée{doneCount > 1 ? "s" : ""}
            </StatusPill>
            <StatusPill tone="blue">
              Étape {step + 1} / {STEPS.length}
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
                    aria-label={`${definition.label}${done ? " (validée)" : ""}`}
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
                  {definition.label}
                </span>
                {done ? (
                  <span className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                    Validée
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel icon={CurrentIcon} title={current.title}>
        <p className="-mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{current.subtitle}</p>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{current.sectionLabel}</span>
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
                    {piece.label}
                  </span>
                  <span className="flex items-center gap-2.5">
                    {piece.note ? (
                      <span className="text-sm font-black text-slate-950 dark:text-white">{piece.note}</span>
                    ) : null}
                    <StatusPill tone={state.tone}>{state.label}</StatusPill>
                    {piece.documentType && !alreadyApproved ? (
                      <label className="cursor-pointer rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">
                        <UploadCloud size={13} strokeWidth={2.6} className="mr-1 inline" />
                        {state.done ? "Remplacer" : "Envoyer"}
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
              {piecesDone}/{REQUIRED_PIECES.length} pièces fournies.{" "}
              {kycComplete
                ? "Dossier KYC complet : BelivaY lance le cross-check ANTIC."
                : "Les pièces manquantes peuvent être envoyées à tout moment, y compris après cette étape."}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            {LEVELS.map(([level, caution]) => (
              <div
                key={level}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3.5 last:border-b-0 dark:border-slate-800"
              >
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{level}</span>
                <span className="text-sm font-black text-slate-950 dark:text-white">{caution}</span>
              </div>
            ))}
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                Aucune caution n'est demandée. La sécurité repose sur la vérification{" "}
                <strong className="font-black">KYC + Trust Score</strong> — accès 100 % gratuit.
              </p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <PenLine size={17} strokeWidth={2.4} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-300" />
              <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                Vous signez électroniquement le <strong className="font-black">Règlement Point Relais</strong> et la{" "}
                <strong className="font-black">convention de partenariat</strong>. Engagement clé : remise des colis exclusivement
                au porteur du code valide.
              </p>
            </div>
            <div className="mt-5">
              <SignaturePad
                label="Signature du gérant"
                onChange={(dataUrl) => {
                  setSignature(dataUrl);
                  if (dataUrl) setNotice(null);
                }}
                disabled={alreadyApproved}
              />
            </div>
            {signed && !signature ? (
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-600">
                Convention déjà signée lors d'une session précédente.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            {ACTIVATION_ROWS.map(([Icon, label, detail]) => (
              <div
                key={label}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3.5 last:border-b-0 dark:border-slate-800"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <Icon size={17} strokeWidth={2.3} className="flex-shrink-0 text-slate-400" />
                  {label}
                </span>
                <span className="text-sm font-black text-slate-950 dark:text-white">{detail}</span>
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
            ← Précédent
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_20px_-12px_rgba(37,99,235,.9)] transition hover:bg-blue-700"
            >
              Étape suivante →
            </button>
          ) : (
            <button
              type="button"
              onClick={finalize}
              disabled={busy || submitted}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_20px_-12px_rgba(5,150,105,.9)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={15} strokeWidth={3} />
              {submitted ? "Inscription finalisée" : busy ? "Transmission…" : "Finaliser l'inscription"}
            </button>
          )}
        </div>
      </Panel>

      <Panel
        icon={Medal}
        title="Pacte de proximité — 50 premiers PR"
        action={
          <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-black text-white shadow-sm">
            Partenaire Fondateur
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {PACT_BENEFITS.map(([Icon, title, body, tone]) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
              <h3 className="flex items-center gap-2 font-black text-slate-950 dark:text-white">
                <Icon size={17} strokeWidth={2.4} className={`flex-shrink-0 ${tone}`} />
                {title}
              </h3>
              <p className="mt-1.5 pl-6 text-sm font-semibold text-slate-500 dark:text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
