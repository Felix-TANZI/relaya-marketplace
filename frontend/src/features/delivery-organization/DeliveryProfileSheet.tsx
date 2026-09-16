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
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
function formatMembership(iso: string | null, locale: "fr" | "en", t: TFunction) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const month = date.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" });
  const months = Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth());
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearWord = years > 1 ? t("do1_profile_sheet.membership.years") : t("do1_profile_sheet.membership.year");
  const monthWord = rest > 1 ? t("do1_profile_sheet.membership.months") : t("do1_profile_sheet.membership.month");
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
  const { t } = useTranslation();
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
      onSuccess(`${t("do1_profile_sheet.otp_sent")} ${email}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : t("do1_profile_sheet.send_failed"));
    } finally {
      setTwoFactorBusy(false);
    }
  }, [twoFactor, email, onError, onSuccess, t]);

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
      onSuccess(enabling ? t("do1_profile_sheet.two_factor_on") : t("do1_profile_sheet.two_factor_off"));
    } catch (error) {
      onError(error instanceof Error ? error.message : t("do1_profile_sheet.action_failed"));
    } finally {
      setTwoFactorBusy(false);
    }
  }, [twoFactorStep, twoFactorInput, onError, onSuccess, t]);

  const install = useCallback(async () => {
    if (!installEvent) {
      onError(t("do1_profile_sheet.pwa_unavailable"));
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstallEvent(null);
  }, [installEvent, onError, t]);

  const membership = formatMembership(organization.memberSince, locale, t);
  const zone = organization.zones.filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <Card icon={Building2} title={t("do1_profile_sheet.profile_title")}>
        <div>
          <Row label={t("do1_profile_sheet.rows.name")} value={organization.name} />
          <Row label={t("do1_profile_sheet.rows.manager")} value={organization.manager} />
          <Row label={t("do1_profile_sheet.rows.kind")} value={t("do1_profile_sheet.kind")} />
          <Row label={t("do1_profile_sheet.rows.address")} value={organization.address} />
          <Row label={t("do1_profile_sheet.rows.zone")} value={zone || t("do1_profile_sheet.todo")} muted={!zone} />
          <Row label={t("do1_profile_sheet.rows.phone")} value={organization.phone} />
          <Row label={t("do1_profile_sheet.rows.contract")} value={organization.contract} />
          <Row label={t("do1_profile_sheet.rows.fleet")} value={organization.fleetSummary} />
          <Row label={t("do1_profile_sheet.rows.since")} value={membership || t("do1_profile_sheet.todo")} muted={!membership} />
        </div>

        <button
          type="button"
          onClick={() => onNavigate("contract")}
          className="mt-3 flex w-full items-start gap-2 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-left transition active:scale-[.99] dark:border-cyan-900 dark:bg-cyan-950/40"
        >
          <Info size={15} className="mt-0.5 flex-shrink-0 text-cyan-700 dark:text-cyan-300" />
          <span className="text-[12px] font-semibold leading-snug text-cyan-950/80 dark:text-cyan-100/80">{t("do1_profile_sheet.legal_hint")}</span>
          <ChevronRight size={15} className="mt-0.5 flex-shrink-0 text-cyan-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("zones")}
          className="tap-target mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-black text-slate-700 transition active:scale-[.98] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {t("do1_profile_sheet.edit_profile")}
        </button>
      </Card>

      <Card icon={ShieldCheck} title={t("do1_profile_sheet.security_title")}>
        <SettingRow title={t("do1_profile_sheet.two_factor")} hint={t("do1_profile_sheet.two_factor_hint")}>
          <Toggle checked={twoFactor} onChange={startTwoFactor} label={t("do1_profile_sheet.two_factor")} busy={twoFactorBusy} />
        </SettingRow>

        {twoFactorStep ? (
          <div className="mb-3 rounded-xl border border-cyan-100 bg-cyan-50 p-3 dark:border-cyan-900 dark:bg-cyan-950/40">
            <input
              value={twoFactorInput}
              onChange={(event) => setTwoFactorInput(event.target.value)}
              type={twoFactorStep === "enable" ? "text" : "password"}
              inputMode={twoFactorStep === "enable" ? "numeric" : undefined}
              autoComplete={twoFactorStep === "enable" ? "one-time-code" : "current-password"}
              placeholder={twoFactorStep === "enable" ? t("do1_profile_sheet.otp_placeholder") : t("do1_profile_sheet.password_placeholder")}
              className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none dark:border-cyan-800 dark:bg-slate-900 dark:text-white"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={confirmTwoFactor}
                disabled={twoFactorBusy || twoFactorInput.trim().length < 4}
                className="flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-[13px] font-black text-white disabled:opacity-50"
              >
                {twoFactorStep === "enable" ? t("do1_profile_sheet.otp_confirm") : t("do1_profile_sheet.otp_disable")}
              </button>
              <button
                type="button"
                onClick={() => setTwoFactorStep(null)}
                className="rounded-lg border border-cyan-200 px-3 py-2 text-[13px] font-black text-cyan-700 dark:border-cyan-800 dark:text-cyan-200"
              >
                {t("do1_profile_sheet.cancel")}
              </button>
            </div>
          </div>
        ) : null}

        <SettingRow title={t("do1_profile_sheet.dispatch")} hint={t("do1_profile_sheet.dispatch_hint")}>
          <Toggle checked={dispatchConfirm} onChange={toggleDispatchConfirm} label={t("do1_profile_sheet.dispatch")} />
        </SettingRow>

        <SettingRow title={t("do1_profile_sheet.dark_theme")} hint={t("do1_profile_sheet.dark_theme_hint")}>
          <Toggle checked={theme === "dark"} onChange={onToggleTheme} label={t("do1_profile_sheet.dark_theme")} />
        </SettingRow>

        <SettingRow title={t("do1_profile_sheet.language")} hint={t("do1_profile_sheet.language_hint")}>
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
          {t("do1_profile_sheet.cert_title")}
        </h3>
        <p className="mt-1 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
          {organization.name} · {organization.status}
        </p>
        {qrDataUrl ? (
          <>
            <img src={qrDataUrl} alt={t("do1_profile_sheet.cert_caption")} className="mx-auto mt-4 h-36 w-36 rounded-xl bg-white p-1.5" />
            <p className="mt-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{t("do1_profile_sheet.cert_caption")}</p>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-cyan-200 p-4 text-[12px] font-semibold text-cyan-900/70 dark:border-cyan-800 dark:text-cyan-100/70">
            {t("do1_profile_sheet.cert_pending")}
          </p>
        )}
        <label className="tap-target mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2 text-[13px] font-black text-cyan-700 transition active:scale-95 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-200">
          <Camera size={15} />
          {t("do1_profile_sheet.change_photo")}
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

      <Card icon={Smartphone} title={t("do1_profile_sheet.app_title")}>
        <div className="flex items-start gap-2 rounded-xl border border-cyan-100 bg-cyan-50 p-3 dark:border-cyan-900 dark:bg-cyan-950/40">
          <Download size={15} className="mt-0.5 flex-shrink-0 text-cyan-700 dark:text-cyan-300" />
          <p className="text-[12px] font-semibold leading-snug text-cyan-950/80 dark:text-cyan-100/80">{t("do1_profile_sheet.pwa_body")}</p>
        </div>
        <button
          type="button"
          onClick={install}
          disabled={!installEvent}
          className="tap-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-[13px] font-black text-white transition active:scale-[.98] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          <Smartphone size={15} />
          {t("do1_profile_sheet.pwa_action")}
        </button>
        {!installEvent ? (
          <p className="mt-1.5 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">{t("do1_profile_sheet.pwa_unavailable")}</p>
        ) : null}

        <div className="mt-3">
          <Row label={t("do1_profile_sheet.version")} value={footer[0] || "—"} />
          <div className="flex items-start justify-between gap-4 py-2.5">
            <span className="flex-shrink-0 text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t("do1_profile_sheet.compliance")}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <CheckCircle2 size={12} />
              {t("do1_profile_sheet.compliance_value")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="tap-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-[13px] font-black text-red-700 transition active:scale-[.98] hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <LogOut size={15} />
          {t("do1_profile_sheet.logout")}
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
  const { t } = useTranslation();

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
        aria-label={t("do1_profile_sheet.close")}
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label={t("do1_profile_sheet.title")}
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
              {t("do1_profile_sheet.title")}
            </h2>
            <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-500 dark:text-slate-400">{t("do1_profile_sheet.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("do1_profile_sheet.close")}
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
