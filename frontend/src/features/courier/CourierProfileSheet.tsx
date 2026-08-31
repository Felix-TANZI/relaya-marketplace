/**
 * Feuille « Profil & compte » du portail livreur.
 *
 * Ouverte par l'avatar du bandeau (telephone comme bureau), elle rassemble ce
 * qu'un livreur vient verifier ponctuellement — son identite, ses permissions
 * d'appareil, son certificat verifiable et l'etat de l'application.
 *
 * Elle ne double pas l'onglet « Parametres » : celui-ci garde les reglages
 * operationnels (mode disponible, ville, zones, vehicule), la feuille prend le
 * compte et la securite.
 *
 * Comme les modales notification et litige du portail, elle reste sombre quel
 * que soit le theme : c'est le parti pris du chrome livreur.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  LogOut,
  MapPin,
  Settings2,
  ShieldCheck,
  Smartphone,
  User,
  X,
} from "lucide-react";
import * as QRCode from "qrcode";
import { http } from "@/services/api/http";
import type { CourierTab } from "./courierNav";

/** Evenement Chromium d'installation PWA, absent des types DOM standards. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface CourierSettingsCourier {
  name: string;
  username: string;
  email: string;
  city: string;
  vehicle: string;
  zones: string[];
  /** « Approuve » ou « En validation ». */
  accountStatus: string;
  online: boolean;
  /** Score de confiance formate, ou null tant que le tableau de bord n'a rien. */
  trustScore: string | null;
  /** Reference publique du livreur (BV-LIV-0042), base du QR de verification. */
  courierRef: string;
  /** Date ISO d'entree dans le reseau. */
  memberSince: string | null;
}

export interface CourierSettingsProps {
  locale: "fr" | "en";
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onChangeLanguage: (next: "fr" | "en") => void;
  courier: CourierSettingsCourier;
  avatarUrl?: string;
  onAvatarFile: (file: File) => void;
  /** Permissions d'appareil, reellement portees par le profil livreur. */
  gpsGranted: boolean;
  cameraGranted: boolean;
  onToggleGps: () => void;
  onToggleCamera: () => void;
  /** Libelle du reglage en cours de synchronisation, ou null. */
  savingLabel: string | null;
  onLogout: () => void;
  onNavigate: (tab: CourierTab) => void;
  onFeedback: (message: string) => void;
  /** Mentions legales du pied de menu : version, conformite, chapitre anonymat. */
  footer: string[];
}

/** Carte de la feuille : meme cadre sombre que les modales du portail. */
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
    <section className="rounded-[18px] border border-emerald-500/12 bg-[#0D1117] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-white">
        <Icon size={17} strokeWidth={2.3} className="flex-shrink-0 text-emerald-300" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Ligne libelle/valeur du bloc profil, alignee a droite comme une fiche. */
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2.5 last:border-0">
      <span className="flex-shrink-0 text-[13px] text-[#8B949E]">{label}</span>
      <span className={`min-w-0 text-right text-[13px] font-bold ${muted ? "text-[#8B949E]" : "text-white"}`}>{value}</span>
    </div>
  );
}

/**
 * Interrupteur des reglages. `busy` bloque le doigt pendant un aller-retour
 * reseau : sans lui, deux appuis rapides lanceraient deux appels.
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
        checked ? "bg-emerald-500" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {busy ? <Loader2 size={12} className="animate-spin text-emerald-600" /> : null}
      </span>
    </button>
  );
}

/** Ligne de reglage : titre + explication a gauche, controle a droite. */
function SettingRow({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-0">
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-white">{title}</div>
        <p className="mt-0.5 text-[12px] leading-snug text-[#8B949E]">{hint}</p>
      </div>
      {children}
    </div>
  );
}

/** « Fevrier 2025 · 1 an 4 mois » — repere d'anciennete lisible d'un coup d'oeil. */
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

const COPY = {
  fr: {
    title: "Mon compte",
    subtitle: "Profil, permissions, langue et application",
    profileTitle: "Profil du livreur",
    rows: {
      name: "Nom",
      username: "Identifiant",
      city: "Ville",
      vehicle: "Vehicule",
      zones: "Zones",
      account: "Statut du compte",
      availability: "Disponibilite",
      trust: "Trust Score",
      since: "Livreur depuis",
    },
    todo: "A completer",
    online: "Disponible",
    offline: "Hors ligne",
    operationalHint: "Mode disponible, ville, zones et vehicule se reglent dans l'onglet Parametres.",
    securityTitle: "Securite & permissions",
    twoFactor: "Double authentification (2FA)",
    twoFactorHint: "Code a usage unique a chaque connexion sensible",
    gps: "Localisation GPS",
    gpsHint: "Requise pour le suivi de tournee et les preuves",
    camera: "Appareil photo",
    cameraHint: "Requis pour scanner les QR et photographier les preuves",
    darkTheme: "Theme sombre",
    darkThemeHint: "Confort visuel en faible lumiere",
    language: "Langue",
    languageHint: "Francais / English",
    otpSent: "Code envoye a",
    otpPlaceholder: "Code a 6 chiffres",
    otpConfirm: "Activer la 2FA",
    passwordPlaceholder: "Mot de passe actuel",
    otpDisable: "Desactiver la 2FA",
    twoFactorOn: "Double authentification activee.",
    twoFactorOff: "Double authentification desactivee.",
    cancel: "Annuler",
    certTitle: "Livreur Verifie BelivaY",
    certCaption: "Scannez pour verifier l'authenticite",
    certPending: "Certificat disponible des la validation du dossier livreur.",
    appTitle: "Application",
    pwaBody: "Installer l'app (PWA) sur votre telephone pour un acces hors-connexion rapide en tournee.",
    pwaAction: "Installer l'application",
    pwaUnavailable: "Deja installee ou non proposee par ce navigateur.",
    version: "Version",
    compliance: "Conformite",
    logout: "Se deconnecter",
    changePhoto: "Changer la photo",
    close: "Fermer",
    sendFailed: "Envoi du code impossible.",
    actionFailed: "Operation impossible.",
  },
  en: {
    title: "My account",
    subtitle: "Profile, permissions, language and app",
    profileTitle: "Courier profile",
    rows: {
      name: "Name",
      username: "Username",
      city: "City",
      vehicle: "Vehicle",
      zones: "Areas",
      account: "Account status",
      availability: "Availability",
      trust: "Trust score",
      since: "Courier since",
    },
    todo: "To complete",
    online: "Available",
    offline: "Offline",
    operationalHint: "Availability, city, areas and vehicle are set in the Settings tab.",
    securityTitle: "Security & permissions",
    twoFactor: "Two-factor authentication (2FA)",
    twoFactorHint: "One-time code on every sensitive sign-in",
    gps: "GPS location",
    gpsHint: "Required for route tracking and proofs",
    camera: "Camera",
    cameraHint: "Required to scan QR codes and capture proofs",
    darkTheme: "Dark theme",
    darkThemeHint: "Easier on the eyes in low light",
    language: "Language",
    languageHint: "Francais / English",
    otpSent: "Code sent to",
    otpPlaceholder: "6-digit code",
    otpConfirm: "Enable 2FA",
    passwordPlaceholder: "Current password",
    otpDisable: "Disable 2FA",
    twoFactorOn: "Two-factor authentication enabled.",
    twoFactorOff: "Two-factor authentication disabled.",
    cancel: "Cancel",
    certTitle: "BelivaY verified courier",
    certCaption: "Scan to check authenticity",
    certPending: "Certificate available once the courier file is approved.",
    appTitle: "Application",
    pwaBody: "Install the app (PWA) on your phone for fast offline access on the road.",
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

export function CourierSettingsContent({
  locale,
  theme,
  onToggleTheme,
  onChangeLanguage,
  courier,
  avatarUrl,
  onAvatarFile,
  gpsGranted,
  cameraGranted,
  onToggleGps,
  onToggleCamera,
  savingLabel,
  onLogout,
  onNavigate,
  onFeedback,
  footer,
}: CourierSettingsProps) {
  const t = COPY[locale];
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  /** null = aucun formulaire ouvert ; sinon on attend un OTP ou un mot de passe. */
  const [twoFactorStep, setTwoFactorStep] = useState<"enable" | "disable" | null>(null);
  const [twoFactorInput, setTwoFactorInput] = useState("");
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

  // Le certificat n'a de sens qu'une fois le dossier approuve : sans reference
  // publique, le QR pointerait vers une fiche inexistante.
  useEffect(() => {
    if (!courier.courierRef) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(`https://belivay.com/livreurs/${encodeURIComponent(courier.courierRef)}`, {
      width: 320,
      margin: 1,
      color: { dark: "#065F46", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(""));
    return () => {
      cancelled = true;
    };
  }, [courier.courierRef]);

  // Chromium n'expose l'installation qu'apres cet evenement : on le garde pour
  // declencher l'invite au moment ou le livreur appuie sur le bouton.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
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
      onFeedback(`${t.otpSent} ${courier.email}.`);
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : t.sendFailed);
    } finally {
      setTwoFactorBusy(false);
    }
  }, [twoFactor, courier.email, onFeedback, t.otpSent, t.sendFailed]);

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
        await http("/api/auth/2fa/disable/", { method: "POST", body: JSON.stringify({ password: twoFactorInput }) });
      }
      setTwoFactor(enabling);
      setTwoFactorStep(null);
      setTwoFactorInput("");
      onFeedback(enabling ? t.twoFactorOn : t.twoFactorOff);
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setTwoFactorBusy(false);
    }
  }, [twoFactorStep, twoFactorInput, onFeedback, t.twoFactorOn, t.twoFactorOff, t.actionFailed]);

  const install = useCallback(async () => {
    if (!installEvent) {
      onFeedback(t.pwaUnavailable);
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstallEvent(null);
  }, [installEvent, onFeedback, t.pwaUnavailable]);

  const membership = formatMembership(courier.memberSince, locale);
  const zones = courier.zones.filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <Card icon={User} title={t.profileTitle}>
        <div>
          <Row label={t.rows.name} value={courier.name} />
          <Row label={t.rows.username} value={courier.username} />
          <Row label={t.rows.city} value={courier.city} />
          <Row label={t.rows.vehicle} value={courier.vehicle} />
          <Row label={t.rows.zones} value={zones || t.todo} muted={!zones} />
          <Row label={t.rows.account} value={courier.accountStatus} />
          <Row label={t.rows.availability} value={courier.online ? t.online : t.offline} />
          <Row label={t.rows.trust} value={courier.trustScore || t.todo} muted={!courier.trustScore} />
          <Row label={t.rows.since} value={membership || t.todo} muted={!membership} />
        </div>

        {/* La feuille ne double pas l'onglet Parametres : on y renvoie plutot
            que de dupliquer des reglages qui y vivent deja. */}
        <button
          type="button"
          onClick={() => onNavigate("parametres")}
          className="mt-3 flex w-full items-start gap-2 rounded-[14px] border border-emerald-500/15 bg-emerald-500/5 p-3 text-left transition active:scale-[.99] hover:bg-emerald-500/10"
        >
          <MapPin size={15} className="mt-0.5 flex-shrink-0 text-emerald-300" />
          <span className="text-[12px] leading-snug text-white/75">{t.operationalHint}</span>
          <ChevronRight size={15} className="mt-0.5 flex-shrink-0 text-white/35" />
        </button>
      </Card>

      <Card icon={ShieldCheck} title={t.securityTitle}>
        <SettingRow title={t.twoFactor} hint={t.twoFactorHint}>
          <Toggle checked={twoFactor} onChange={startTwoFactor} label={t.twoFactor} busy={twoFactorBusy} />
        </SettingRow>

        {twoFactorStep ? (
          <div className="mb-3 rounded-[14px] border border-emerald-500/15 bg-emerald-500/5 p-3">
            <input
              value={twoFactorInput}
              onChange={(event) => setTwoFactorInput(event.target.value)}
              type={twoFactorStep === "enable" ? "text" : "password"}
              inputMode={twoFactorStep === "enable" ? "numeric" : undefined}
              autoComplete={twoFactorStep === "enable" ? "one-time-code" : "current-password"}
              placeholder={twoFactorStep === "enable" ? t.otpPlaceholder : t.passwordPlaceholder}
              className="w-full rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-[#8B949E]"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={confirmTwoFactor}
                disabled={twoFactorBusy || twoFactorInput.trim().length < 4}
                className="flex-1 rounded-[10px] bg-emerald-500 px-3 py-2 text-[13px] font-black text-[#022c22] disabled:opacity-50"
              >
                {twoFactorStep === "enable" ? t.otpConfirm : t.otpDisable}
              </button>
              <button
                type="button"
                onClick={() => setTwoFactorStep(null)}
                className="rounded-[10px] border border-white/15 px-3 py-2 text-[13px] font-bold text-white/80"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : null}

        {/* GPS et camera sont de vraies permissions du profil livreur : la
            bascule les synchronise avec le backend, comme l'onglet Parametres. */}
        <SettingRow title={t.gps} hint={t.gpsHint}>
          <Toggle checked={gpsGranted} onChange={onToggleGps} label={t.gps} busy={savingLabel === "gps"} />
        </SettingRow>

        <SettingRow title={t.camera} hint={t.cameraHint}>
          <Toggle checked={cameraGranted} onChange={onToggleCamera} label={t.camera} busy={savingLabel === "camera"} />
        </SettingRow>

        <SettingRow title={t.darkTheme} hint={t.darkThemeHint}>
          <Toggle checked={theme === "dark"} onChange={onToggleTheme} label={t.darkTheme} />
        </SettingRow>

        <SettingRow title={t.language} hint={t.languageHint}>
          <div className="flex flex-shrink-0 overflow-hidden rounded-[10px] border border-white/15">
            {(["fr", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeLanguage(code)}
                aria-pressed={locale === code}
                disabled={savingLabel === "language"}
                className={`px-3 py-2 text-[12px] font-black transition disabled:opacity-60 ${
                  locale === code ? "bg-emerald-500 text-[#022c22]" : "bg-white/5 text-[#8B949E]"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>

      {/* Certificat : le livreur le presente au vendeur ou au point relais, qui
          scanne pour verifier qu'il remet bien le colis a un livreur du reseau. */}
      <section className="rounded-[18px] border border-emerald-500/15 bg-emerald-500/5 p-5 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] ring-4 ring-[#0A1020]">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-extrabold text-white">{courier.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h3 className="mt-3 flex items-center justify-center gap-1.5 text-[15px] font-extrabold text-white">
          <BadgeCheck size={16} className="flex-shrink-0 text-emerald-300" />
          {t.certTitle}
        </h3>
        <p className="mt-1 text-[12px] text-[#8B949E]">
          {courier.name}
          {courier.courierRef ? ` · ${courier.courierRef}` : ""}
        </p>
        {qrDataUrl ? (
          <>
            <img src={qrDataUrl} alt={t.certCaption} className="mx-auto mt-4 h-36 w-36 rounded-[14px] bg-white p-1.5" />
            <p className="mt-2 text-[11px] text-[#8B949E]">{t.certCaption}</p>
          </>
        ) : (
          <p className="mt-4 rounded-[14px] border border-dashed border-emerald-500/25 p-4 text-[12px] text-white/60">
            {t.certPending}
          </p>
        )}
        <label className="tap-target mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-emerald-500/25 bg-white/5 px-4 py-2 text-[13px] font-bold text-emerald-300 transition active:scale-95 hover:bg-white/10">
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
        <div className="flex items-start gap-2 rounded-[14px] border border-emerald-500/15 bg-emerald-500/5 p-3">
          <Download size={15} className="mt-0.5 flex-shrink-0 text-emerald-300" />
          <p className="text-[12px] leading-snug text-white/75">{t.pwaBody}</p>
        </div>
        <button
          type="button"
          onClick={install}
          disabled={!installEvent}
          className="tap-target mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-emerald-500 px-4 py-2.5 text-[13px] font-black text-[#022c22] transition active:scale-[.98] disabled:bg-white/10 disabled:text-[#8B949E]"
        >
          <Smartphone size={15} />
          {t.pwaAction}
        </button>
        {!installEvent ? <p className="mt-1.5 text-center text-[11px] text-[#8B949E]">{t.pwaUnavailable}</p> : null}

        <div className="mt-3">
          <Row label={t.version} value={footer[0] || "—"} />
          <div className="flex items-start justify-between gap-4 py-2.5">
            <span className="flex-shrink-0 text-[13px] text-[#8B949E]">{t.compliance}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-300">
              <CheckCircle2 size={12} />
              ANTIC · OHADA · Anonymat V5
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="tap-target mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-[13px] font-black text-red-300 transition active:scale-[.98] hover:bg-red-500/15"
        >
          <LogOut size={15} />
          {t.logout}
        </button>
      </Card>

      <p className="px-1 pb-1 text-center text-[10px] leading-4 text-[#8B949E]/70">
        {courier.username} · {courier.email}
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
export default function CourierProfileSheet({
  open,
  onClose,
  ...content
}: CourierSettingsProps & { open: boolean; onClose: () => void }) {
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
    <div className={`fixed inset-0 z-[1400] ${open ? "" : "pointer-events-none"}`} aria-hidden={open ? undefined : true}>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={t.close}
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
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
        className={`absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-emerald-500/10 bg-[#0A1020] shadow-[-8px_0_40px_rgba(0,0,0,.55)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* En-tete collant : le titre et la sortie restent atteignables meme au
            bas d'une feuille de quatre cartes. */}
        <header className="safe-pt sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-emerald-500/10 bg-[linear-gradient(135deg,#02120d,#05261c_55%,#0b2f25)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-white">
              <Settings2 size={20} strokeWidth={2.3} className="flex-shrink-0 text-emerald-300" />
              {t.title}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-[#8B949E]">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="tap-target -mr-1 flex flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition active:scale-90 hover:bg-white/20 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div ref={panelRef} className="safe-pb flex-1 overflow-y-auto p-4">
          <CourierSettingsContent {...content} />
        </div>
      </div>
    </div>
  );
}
