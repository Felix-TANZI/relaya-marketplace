/**
 * Feuille « Profil & parametres » du portail organisation de livraison.
 *
 * Ouverte par l'avatar du bandeau (telephone comme bureau), elle rassemble ce
 * qu'un responsable vient verifier ponctuellement — l'identite de l'entreprise,
 * ses reglages de securite, son certificat verifiable et l'etat de
 * l'application — au lieu de le disperser dans les 13 destinations du menu.
 *
 * `DeliverySettingsContent` est exporte a part pour que l'onglet
 * « Parametres » affiche exactement le meme contenu que la feuille : un seul
 * rendu a maintenir, comme pour DeliverySidebarContent et le tiroir.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Download,
  Info,
  Loader2,
  LogOut,
  Settings2,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import * as QRCode from "qrcode";
import { http } from "@/services/api/http";
import type { OrgTab } from "./deliveryNav";

/**
 * Preference locale a l'appareil : demander confirmation avant d'affecter une
 * mission a un livreur. Filet de securite du dispatcher sur telephone, ou une
 * liste se fait tapoter par erreur bien plus souvent qu'a la souris.
 */
const DISPATCH_CONFIRM_KEY = "belivay-org-dispatch-confirm";

/** Evenement Chromium d'installation PWA, absent des types DOM standards. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface DeliverySettingsOrganization {
  /** Raison sociale declaree au dossier BelivaY. */
  name: string;
  manager: string;
  city: string;
  address: string;
  phone: string;
  /** Reference du contrat BelivaY — sert au certificat et au QR. */
  contract: string;
  status: string;
  /** Date ISO d'entree dans le reseau. */
  memberSince: string | null;
  zones: string[];
  /** Livreurs approuves / total, deja calcule par le portail. */
  fleetSummary: string;
}

export interface DeliverySettingsProps {
  locale: "fr" | "en";
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onChangeLanguage: (next: "fr" | "en") => void;
  organization: DeliverySettingsOrganization;
  username: string;
  email: string;
  avatarUrl?: string;
  onAvatarFile: (file: File) => void;
  onLogout: () => void;
  onNavigate: (tab: OrgTab) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  /** Mentions legales du pied de menu : version, conformite, chapitre anonymat. */
  footer: string[];
}

const COPY = {
  fr: {
    title: "Paramètres",
    subtitle: "Entreprise, sécurité, langue et application",
    profileTitle: "Profil de l'entreprise",
    rows: {
      name: "Raison sociale",
      manager: "Responsable",
      kind: "Type",
      address: "Adresse agence",
      zone: "Zones couvertes",
      phone: "Téléphone",
      contract: "Référence contrat",
      fleet: "Flotte approuvée",
      since: "Partenaire depuis",
    },
    todo: "À compléter",
    kind: "Entreprise de livraison partenaire",
    legalHint: "Registre de commerce, pièce du responsable et moyen de paiement sont collectés dans le dossier Contrat & KYC.",
    editProfile: "Modifier les zones & la capacité",
    securityTitle: "Sécurité",
    twoFactor: "Double authentification (2FA)",
    twoFactorHint: "Code à usage unique à chaque connexion sensible",
    dispatch: "Confirmation avant affectation",
    dispatchHint: "Demander validation avant d'assigner une mission",
    darkTheme: "Thème sombre",
    darkThemeHint: "Confort visuel en faible lumière",
    language: "Langue",
    languageHint: "Français / English",
    otpSent: "Code envoyé à",
    otpPlaceholder: "Code à 6 chiffres",
    otpConfirm: "Activer la 2FA",
    passwordPlaceholder: "Mot de passe actuel",
    otpDisable: "Désactiver la 2FA",
    twoFactorOn: "Double authentification activée.",
    twoFactorOff: "Double authentification désactivée.",
    cancel: "Annuler",
    certTitle: "Entreprise Partenaire Vérifiée BelivaY",
    certCaption: "Scannez pour vérifier l'authenticité",
    certPending: "Certificat disponible dès la validation du contrat.",
    appTitle: "Application",
    pwaBody: "Installer l'app (PWA) sur votre téléphone ou tablette pour un accès hors-connexion rapide.",
    pwaAction: "Installer l'application",
    pwaUnavailable: "Déjà installée ou non proposée par ce navigateur.",
    version: "Version",
    compliance: "Conformité",
    logout: "Se déconnecter",
    changePhoto: "Changer la photo",
    close: "Fermer",
    sendFailed: "Envoi du code impossible.",
    actionFailed: "Opération impossible.",
  },
  en: {
    title: "Settings",
    subtitle: "Company, security, language and app",
    profileTitle: "Company profile",
    rows: {
      name: "Legal name",
      manager: "Manager",
      kind: "Type",
      address: "Agency address",
      zone: "Covered zones",
      phone: "Phone",
      contract: "Contract reference",
      fleet: "Approved fleet",
      since: "Partner since",
    },
    todo: "To complete",
    kind: "Partner delivery company",
    legalHint: "Trade register, manager ID and payout method are collected in the Contract & KYC file.",
    editProfile: "Edit zones & capacity",
    securityTitle: "Security",
    twoFactor: "Two-factor authentication (2FA)",
    twoFactorHint: "One-time code on every sensitive sign-in",
    dispatch: "Confirm before dispatch",
    dispatchHint: "Ask for validation before assigning a mission",
    darkTheme: "Dark theme",
    darkThemeHint: "Easier on the eyes in low light",
    language: "Language",
    languageHint: "Français / English",
    otpSent: "Code sent to",
    otpPlaceholder: "6-digit code",
    otpConfirm: "Enable 2FA",
    passwordPlaceholder: "Current password",
    otpDisable: "Disable 2FA",
    twoFactorOn: "Two-factor authentication enabled.",
    twoFactorOff: "Two-factor authentication disabled.",
    cancel: "Cancel",
    certTitle: "BelivaY verified partner company",
    certCaption: "Scan to check authenticity",
    certPending: "Certificate available once the contract is approved.",
    appTitle: "Application",
    pwaBody: "Install the app (PWA) on your phone or tablet for fast offline access.",
    pwaAction: "Install the app",
    pwaUnavailable: "Already installed, or not offered by this browser.",
    version: "Version",
    compliance: "Compliance",
    logout: "Log out",
    changePhoto: "Change photo",
    close: "Close",
    sendFailed: "Could not send the code.",
    actionFailed: "Action failed.",
  },
};

/** Carte de la feuille : meme cadre que `Panel`, mais compacte pour le mobile. */
function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 flex items-center gap-2 text-[15px] font-black text-slate-950 dark:text-white">
        <Icon size={17} strokeWidth={2.4} className="flex-shrink-0 text-cyan-700 dark:text-cyan-300" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Ligne libelle/valeur du bloc profil, alignee a droite comme une fiche. */
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
      <span className="flex-shrink-0 text-[13px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`min-w-0 text-right text-[13px] font-black ${
          muted ? "text-slate-400 dark:text-slate-500" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Interrupteur des reglages. `busy` bloque le doigt pendant un aller-retour
 * reseau : sans lui, deux appuis rapides lanceraient deux envois d'OTP.
 */
function Toggle({
  checked,
  onChange,
  label,
  busy,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={onChange}
      className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-300 disabled:opacity-60 ${
        checked ? "bg-cyan-600" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {busy ? <Loader2 size={12} className="animate-spin text-cyan-600" /> : null}
      </span>
    </button>
  );
}

/** Ligne de reglage : titre + explication a gauche, controle a droite. */
function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="min-w-0">
        <div className="text-[14px] font-black text-slate-950 dark:text-white">{title}</div>
        <p className="mt-0.5 text-[12px] font-semibold leading-snug text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      {children}
    </div>
  );
}

/** « Février 2025 · 1 an 4 mois » — repere d'anciennete lisible d'un coup d'oeil. */
function formatMembership(iso: string | null, locale: "fr" | "en") {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const month = date.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" });
  const months = Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth());
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearWord = locale === "en" ? (years > 1 ? "years" : "year") : years > 1 ? "ans" : "an";
  const monthWord = locale === "en" ? (rest > 1 ? "months" : "month") : "mois";
  const age = [years ? `${years} ${yearWord}` : "", rest ? `${rest} ${monthWord}` : ""].filter(Boolean).join(" ");
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return age ? `${capitalized} · ${age}` : capitalized;
}

export function DeliverySettingsContent({
  locale,
  theme,
  onToggleTheme,
  onChangeLanguage,
  organization,
  username,
  email,
  avatarUrl,
  onAvatarFile,
  onLogout,
  onNavigate,
  onError,
  onSuccess,
  footer,
}: DeliverySettingsProps) {
  const t = COPY[locale];
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  /** null = aucun formulaire ouvert ; sinon on attend un OTP ou un mot de passe. */
  const [twoFactorStep, setTwoFactorStep] = useState<"enable" | "disable" | null>(null);
  const [twoFactorInput, setTwoFactorInput] = useState("");
  const [dispatchConfirm, setDispatchConfirm] = useState(() => localStorage.getItem(DISPATCH_CONFIRM_KEY) === "1");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  // Etat reel de la 2FA : la bascule ne doit jamais afficher une securite
  // active qui ne l'est pas cote serveur.
  useEffect(() => {
    let cancelled = false;
    http<{ two_factor_enabled: boolean }>("/api/auth/2fa/status/")
      .then((data) => {
        if (!cancelled) setTwoFactor(Boolean(data?.two_factor_enabled));
      })
      .catch(() => {
        /* Reglage secondaire : un echec ne doit pas casser la feuille. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Le certificat n'a de sens qu'une fois le contrat signe : sans reference,
  // le QR pointerait vers une fiche partenaire inexistante.
  useEffect(() => {
    const reference = organization.contract.trim();
    if (!reference) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(`https://belivay.com/partenaires/${encodeURIComponent(reference)}`, {
      width: 320,
      margin: 1,
      color: { dark: "#0E7490", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(""));
    return () => {
      cancelled = true;
    };
  }, [organization.contract]);

  // Chromium n'expose l'installation qu'apres cet evenement : on le garde pour
  // declencher l'invite au moment ou le responsable appuie sur le bouton.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const toggleDispatchConfirm = useCallback(() => {
    setDispatchConfirm((previous) => {
      const next = !previous;
      localStorage.setItem(DISPATCH_CONFIRM_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  /** Ouvre le formulaire 2FA : activer demande un OTP, desactiver un mot de passe. */
  const startTwoFactor = useCallback(async () => {
    if (twoFactor) {
      setTwoFactorStep("disable");
      setTwoFactorInput("");
      return;
    }
    setTwoFactorBusy(true);
    try {
      await http("/api/auth/2fa/send-code/", { method: "POST", body: JSON.stringify({ purpose: "2FA_ENABLE" }) });
      setTwoFactorStep("enable");
      setTwoFactorInput("");
      onSuccess(`${t.otpSent} ${email}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : t.sendFailed);
    } finally {
      setTwoFactorBusy(false);
    }
  }, [twoFactor, email, onError, onSuccess, t.otpSent, t.sendFailed]);

  const confirmTwoFactor = useCallback(async () => {
    const enabling = twoFactorStep === "enable";
    setTwoFactorBusy(true);
    try {
      if (enabling) {
        await http("/api/auth/2fa/enable/", {
          method: "POST",
          body: JSON.stringify({ code: twoFactorInput.trim(), method: "EMAIL" }),
        });
      } else {
        await http("/api/auth/2fa/disable/", {
          method: "POST",
          body: JSON.stringify({ password: twoFactorInput }),
        });
      }
      setTwoFactor(enabling);
      setTwoFactorStep(null);
      setTwoFactorInput("");
      onSuccess(enabling ? t.twoFactorOn : t.twoFactorOff);
    } catch (error) {
      onError(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setTwoFactorBusy(false);
    }
  }, [twoFactorStep, twoFactorInput, onError, onSuccess, t.twoFactorOn, t.twoFactorOff, t.actionFailed]);

  const install = useCallback(async () => {
    if (!installEvent) {
      onError(t.pwaUnavailable);
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstallEvent(null);
  }, [installEvent, onError, t.pwaUnavailable]);

  const membership = formatMembership(organization.memberSince, locale);
  const zone = organization.zones.filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <Card icon={Building2} title={t.profileTitle}>
        <div>
          <Row label={t.rows.name} value={organization.name} />
          <Row label={t.rows.manager} value={organization.manager} />
          <Row label={t.rows.kind} value={t.kind} />
          <Row label={t.rows.address} value={organization.address} />
          <Row label={t.rows.zone} value={zone || t.todo} muted={!zone} />
          <Row label={t.rows.phone} value={organization.phone} />
          <Row label={t.rows.contract} value={organization.contract} />
          <Row label={t.rows.fleet} value={organization.fleetSummary} />
          <Row label={t.rows.since} value={membership || t.todo} muted={!membership} />
        </div>

        <button
          type="button"
          onClick={() => onNavigate("contract")}
          className="mt-3 flex w-full items-start gap-2 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-left transition active:scale-[.99] dark:border-cyan-900 dark:bg-cyan-950/40"
        >
          <Info size={15} className="mt-0.5 flex-shrink-0 text-cyan-700 dark:text-cyan-300" />
          <span className="text-[12px] font-semibold leading-snug text-cyan-950/80 dark:text-cyan-100/80">{t.legalHint}</span>
          <ChevronRight size={15} className="mt-0.5 flex-shrink-0 text-cyan-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("zones")}
          className="tap-target mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-black text-slate-700 transition active:scale-[.98] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {t.editProfile}
        </button>
      </Card>

      <Card icon={ShieldCheck} title={t.securityTitle}>
        <SettingRow title={t.twoFactor} hint={t.twoFactorHint}>
          <Toggle checked={twoFactor} onChange={startTwoFactor} label={t.twoFactor} busy={twoFactorBusy} />
        </SettingRow>

        {twoFactorStep ? (
          <div className="mb-3 rounded-xl border border-cyan-100 bg-cyan-50 p-3 dark:border-cyan-900 dark:bg-cyan-950/40">
            <input
              value={twoFactorInput}
              onChange={(event) => setTwoFactorInput(event.target.value)}
              type={twoFactorStep === "enable" ? "text" : "password"}
              inputMode={twoFactorStep === "enable" ? "numeric" : undefined}
              autoComplete={twoFactorStep === "enable" ? "one-time-code" : "current-password"}
              placeholder={twoFactorStep === "enable" ? t.otpPlaceholder : t.passwordPlaceholder}
              className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none dark:border-cyan-800 dark:bg-slate-900 dark:text-white"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={confirmTwoFactor}
                disabled={twoFactorBusy || twoFactorInput.trim().length < 4}
                className="flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-[13px] font-black text-white disabled:opacity-50"
              >
                {twoFactorStep === "enable" ? t.otpConfirm : t.otpDisable}
              </button>
              <button
                type="button"
                onClick={() => setTwoFactorStep(null)}
                className="rounded-lg border border-cyan-200 px-3 py-2 text-[13px] font-black text-cyan-700 dark:border-cyan-800 dark:text-cyan-200"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : null}

        <SettingRow title={t.dispatch} hint={t.dispatchHint}>
          <Toggle checked={dispatchConfirm} onChange={toggleDispatchConfirm} label={t.dispatch} />
        </SettingRow>

        <SettingRow title={t.darkTheme} hint={t.darkThemeHint}>
          <Toggle checked={theme === "dark"} onChange={onToggleTheme} label={t.darkTheme} />
        </SettingRow>

        <SettingRow title={t.language} hint={t.languageHint}>
          <div className="flex flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            {(["fr", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeLanguage(code)}
                aria-pressed={locale === code}
                className={`px-3 py-2 text-[12px] font-black transition ${
                  locale === code
                    ? "bg-cyan-600 text-white"
                    : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>

      {/* Certificat : le responsable l'affiche a l'agence, un donneur d'ordre le
          scanne pour verifier que l'entreprise est bien sous contrat BelivaY. */}
      <section className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5 text-center dark:border-cyan-900 dark:bg-cyan-950/30">
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-cyan-700 ring-4 ring-white dark:ring-slate-900">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-white">{organization.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h3 className="mt-3 flex items-center justify-center gap-1.5 text-[15px] font-black text-slate-950 dark:text-white">
          <BadgeCheck size={16} className="flex-shrink-0 text-cyan-600 dark:text-cyan-300" />
          {t.certTitle}
        </h3>
        <p className="mt-1 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
          {organization.name} · {organization.status}
        </p>
        {qrDataUrl ? (
          <>
            <img src={qrDataUrl} alt={t.certCaption} className="mx-auto mt-4 h-36 w-36 rounded-xl bg-white p-1.5" />
            <p className="mt-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{t.certCaption}</p>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-cyan-200 p-4 text-[12px] font-semibold text-cyan-900/70 dark:border-cyan-800 dark:text-cyan-100/70">
            {t.certPending}
          </p>
        )}
        <label className="tap-target mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2 text-[13px] font-black text-cyan-700 transition active:scale-95 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-200">
          <Camera size={15} />
          {t.changePhoto}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) onAvatarFile(file);
            }}
          />
        </label>
      </section>

      <Card icon={Smartphone} title={t.appTitle}>
        <div className="flex items-start gap-2 rounded-xl border border-cyan-100 bg-cyan-50 p-3 dark:border-cyan-900 dark:bg-cyan-950/40">
          <Download size={15} className="mt-0.5 flex-shrink-0 text-cyan-700 dark:text-cyan-300" />
          <p className="text-[12px] font-semibold leading-snug text-cyan-950/80 dark:text-cyan-100/80">{t.pwaBody}</p>
        </div>
        <button
          type="button"
          onClick={install}
          disabled={!installEvent}
          className="tap-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-[13px] font-black text-white transition active:scale-[.98] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          <Smartphone size={15} />
          {t.pwaAction}
        </button>
        {!installEvent ? (
          <p className="mt-1.5 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">{t.pwaUnavailable}</p>
        ) : null}

        <div className="mt-3">
          <Row label={t.version} value={footer[0] || "—"} />
          <div className="flex items-start justify-between gap-4 py-2.5">
            <span className="flex-shrink-0 text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t.compliance}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <CheckCircle2 size={12} />
              ANTIC · OHADA · Anonymat V5
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="tap-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-[13px] font-black text-red-700 transition active:scale-[.98] hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <LogOut size={15} />
          {t.logout}
        </button>
      </Card>

      <p className="px-1 pb-1 text-center text-[10px] leading-4 text-slate-400 dark:text-slate-600">
        {username} · {email}
        {footer.slice(1).map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * Presentation modale de la feuille : elle glisse depuis la droite, du cote de
 * l'avatar qui l'ouvre, comme les ecrans de compte des applications mobiles.
 */
export default function DeliveryProfileSheet({
  open,
  onClose,
  ...content
}: DeliverySettingsProps & { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const t = COPY[content.locale];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.scrollTo({ top: 0 });
  }, [open]);

  return (
    <div className={`fixed inset-0 z-[80] ${open ? "" : "pointer-events-none"}`} aria-hidden={open ? undefined : true}>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={t.close}
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label={t.title}
        /* Fermee, la feuille reste montee pour s'animer ; `inert` la sort de
           l'ordre de tabulation le temps qu'elle est hors de l'ecran. */
        inert={!open}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-[#f4f7fb] shadow-[-8px_0_40px_rgba(2,6,23,.45)] transition-transform duration-300 ease-out dark:bg-slate-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* En-tete collant : le titre et la sortie restent atteignables meme au
            bas d'une feuille de quatre cartes. */}
        <header className="safe-pt sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
              <Settings2 size={20} strokeWidth={2.4} className="flex-shrink-0 text-cyan-700 dark:text-cyan-300" />
              {t.title}
            </h2>
            <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="tap-target -mr-1 flex flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition active:scale-90 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </header>

        <div ref={panelRef} className="safe-pb flex-1 overflow-y-auto p-4">
          <DeliverySettingsContent {...content} />
        </div>
      </div>
    </div>
  );
}
