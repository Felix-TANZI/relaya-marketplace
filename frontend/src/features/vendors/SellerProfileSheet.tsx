/**
 * Feuille « Mon compte » du portail vendeur.
 *
 * Ouverte par l'avatar du bandeau (telephone comme bureau), elle rassemble ce
 * qu'un vendeur vient verifier ponctuellement — l'identite de sa boutique, ses
 * reglages de securite, son certificat verifiable et l'etat de l'application.
 *
 * Elle ne double pas l'ecran « Ma boutique » : celui-ci garde l'edition de la
 * vitrine, la feuille prend le compte et la securite.
 *
 * Meme structure que les feuilles point relais, organisation et livreur ; seule
 * la palette change — l'orange BelivaY du portail vendeur.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  LogOut,
  Settings2,
  ShieldCheck,
  Smartphone,
  Store,
  X,
} from 'lucide-react';
import * as QRCode from 'qrcode';
import { http } from '@/services/api/http';

/** Evenement Chromium d'installation PWA, absent des types DOM standards. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Jetons de couleur du portail vendeur, passes par le layout. */
export interface SellerSheetTheme {
  orange: string;
  cream: string;
  creamAlt: string;
  topbar: string;
  border: string;
  text: string;
  muted: string;
}

export interface SellerSheetShop {
  name: string;
  username: string;
  email: string;
  city: string;
  address: string;
  phone: string;
  /** « Approuve », « En attente »... */
  status: string;
  /** Bronze / Argent / Or / Diamant. */
  tier: string;
  points: number;
  /** Slug public : base du QR de verification. */
  slug: string;
  memberSince: string | null;
}

export interface SellerProfileSheetProps {
  open: boolean;
  onClose: () => void;
  locale: 'fr' | 'en';
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onChangeLanguage: (next: 'fr' | 'en') => void;
  shop: SellerSheetShop;
  avatarUrl?: string;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onFeedback: (message: string) => void;
  T: SellerSheetTheme;
  footer: string[];
}

/** « Fevrier 2025 · 1 an 4 mois » — repere d'anciennete lisible d'un coup d'oeil. */
function formatMembership(iso: string | null, locale: 'fr' | 'en', t: (key: string, opts?: Record<string, unknown>) => string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const month = date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric' });
  const months = Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth());
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearPart = years ? t(years > 1 ? 'sl2_profile_sheet.years_plural' : 'sl2_profile_sheet.years', { count: years }) : '';
  const monthPart = rest ? t(rest > 1 ? 'sl2_profile_sheet.months_plural' : 'sl2_profile_sheet.months', { count: rest }) : '';
  const age = [yearPart, monthPart].filter(Boolean).join(' ');
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return age ? `${capitalized} · ${age}` : capitalized;
}

export default function SellerProfileSheet({
  open,
  onClose,
  locale,
  theme,
  onToggleTheme,
  onChangeLanguage,
  shop,
  avatarUrl,
  onLogout,
  onNavigate,
  onFeedback,
  T,
  footer,
}: SellerProfileSheetProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  /** null = aucun formulaire ouvert ; sinon on attend un OTP ou un mot de passe. */
  const [twoFactorStep, setTwoFactorStep] = useState<'enable' | 'disable' | null>(null);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  // Etat reel de la 2FA : la bascule ne doit jamais afficher une securite
  // active qui ne l'est pas cote serveur.
  useEffect(() => {
    let cancelled = false;
    http<{ two_factor_enabled: boolean }>('/api/auth/2fa/status/')
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

  // Le certificat n'a de sens qu'une fois la boutique publiee : sans slug, le
  // QR renverrait vers une vitrine inexistante.
  useEffect(() => {
    if (!shop.slug) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(`https://belivay.com/boutique/${encodeURIComponent(shop.slug)}`, {
      width: 320,
      margin: 1,
      color: { dark: '#7C2D12', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => setQrDataUrl(''));
    return () => {
      cancelled = true;
    };
  }, [shop.slug]);

  // Chromium n'expose l'installation qu'apres cet evenement : on le garde pour
  // declencher l'invite au moment ou le vendeur appuie sur le bouton.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.scrollTo({ top: 0 });
  }, [open]);

  /** Ouvre le formulaire 2FA : activer demande un OTP, desactiver un mot de passe. */
  const startTwoFactor = useCallback(async () => {
    if (twoFactor) {
      setTwoFactorStep('disable');
      setTwoFactorInput('');
      return;
    }
    setTwoFactorBusy(true);
    try {
      await http('/api/auth/2fa/send-code/', { method: 'POST', body: JSON.stringify({ purpose: '2FA_ENABLE' }) });
      setTwoFactorStep('enable');
      setTwoFactorInput('');
      onFeedback(t('sl2_profile_sheet.otp_sent_to', { email: shop.email }));
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : t('sl2_profile_sheet.send_failed'));
    } finally {
      setTwoFactorBusy(false);
    }
  }, [twoFactor, shop.email, onFeedback, t]);

  const confirmTwoFactor = useCallback(async () => {
    const enabling = twoFactorStep === 'enable';
    setTwoFactorBusy(true);
    try {
      if (enabling) {
        await http('/api/auth/2fa/enable/', {
          method: 'POST',
          body: JSON.stringify({ code: twoFactorInput.trim(), method: 'EMAIL' }),
        });
      } else {
        await http('/api/auth/2fa/disable/', { method: 'POST', body: JSON.stringify({ password: twoFactorInput }) });
      }
      setTwoFactor(enabling);
      setTwoFactorStep(null);
      setTwoFactorInput('');
      onFeedback(enabling ? t('sl2_profile_sheet.two_factor_on') : t('sl2_profile_sheet.two_factor_off'));
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : t('sl2_profile_sheet.action_failed'));
    } finally {
      setTwoFactorBusy(false);
    }
  }, [twoFactorStep, twoFactorInput, onFeedback, t]);

  const install = useCallback(async () => {
    if (!installEvent) {
      onFeedback(t('sl2_profile_sheet.pwa_unavailable'));
      return;
    }
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstallEvent(null);
  }, [installEvent, onFeedback, t]);

  const membership = formatMembership(shop.memberSince, locale, t);

  /** Carte de la feuille : meme cadre creme que les ecrans du portail. */
  const Card = ({ icon: Icon, title, children }: { icon: typeof Store; title: string; children: React.ReactNode }) => (
    <section className="rounded-[18px] p-4" style={{ background: T.topbar, border: `1px solid ${T.border}` }}>
      <h3 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold" style={{ color: T.text }}>
        <Icon size={17} className="flex-shrink-0" style={{ color: T.orange }} />
        {title}
      </h3>
      {children}
    </section>
  );

  /** Ligne libelle/valeur, alignee a droite comme une fiche. */
  const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
      <span className="flex-shrink-0 text-[13px]" style={{ color: T.muted }}>{label}</span>
      <span className="min-w-0 text-right text-[13px] font-bold" style={{ color: muted ? T.muted : T.text }}>{value}</span>
    </div>
  );

  /**
   * Interrupteur des reglages. `busy` bloque le doigt pendant un aller-retour
   * reseau : sans lui, deux appuis rapides lanceraient deux envois d'OTP.
   */
  const Toggle = ({ checked, onChange, label, busy }: { checked: boolean; onChange: () => void; label: string; busy?: boolean }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={onChange}
      className="relative h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-300 disabled:opacity-60"
      style={{ background: checked ? T.orange : T.creamAlt }}
    >
      <span
        className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {busy ? <Loader2 size={12} className="animate-spin" style={{ color: T.orange }} /> : null}
      </span>
    </button>
  );

  const SettingRow = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
      <div className="min-w-0">
        <div className="text-[14px] font-bold" style={{ color: T.text }}>{title}</div>
        <p className="mt-0.5 text-[12px] leading-snug" style={{ color: T.muted }}>{hint}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className={`fixed inset-0 z-[1600] ${open ? '' : 'pointer-events-none'}`} aria-hidden={open ? undefined : true}>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={t('sl2_profile_sheet.close')}
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(4px)' }}
      />

      <div
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label={t('sl2_profile_sheet.title')}
        /* Fermee, la feuille reste montee pour s'animer ; `inert` la sort de
           l'ordre de tabulation le temps qu'elle est hors de l'ecran. */
        inert={!open}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: T.cream, boxShadow: '-8px 0 40px rgba(28,18,9,0.28)' }}
      >
        {/* En-tete collant : le titre et la sortie restent atteignables meme au
            bas d'une feuille de quatre cartes. */}
        <header
          className="safe-pt sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3"
          style={{ background: T.topbar, borderBottom: `1px solid ${T.border}` }}
        >
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight" style={{ color: T.text }}>
              <Settings2 size={20} className="flex-shrink-0" style={{ color: T.orange }} />
              {t('sl2_profile_sheet.title')}
            </h2>
            <p className="mt-0.5 truncate text-[12px]" style={{ color: T.muted }}>{t('sl2_profile_sheet.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('sl2_profile_sheet.close')}
            className="tap-target -mr-1 flex flex-shrink-0 items-center justify-center rounded-xl transition active:scale-90"
            style={{ color: T.muted }}
          >
            <X size={20} />
          </button>
        </header>

        <div ref={panelRef} className="safe-pb flex-1 space-y-4 overflow-y-auto p-4">
          <Card icon={Store} title={t('sl2_profile_sheet.shop_title')}>
            <div>
              <Row label={t('sl2_profile_sheet.row_name')} value={shop.name} />
              <Row label={t('sl2_profile_sheet.row_owner')} value={shop.username} />
              <Row label={t('sl2_profile_sheet.row_city')} value={shop.city || t('sl2_profile_sheet.todo')} muted={!shop.city} />
              <Row label={t('sl2_profile_sheet.row_address')} value={shop.address || t('sl2_profile_sheet.todo')} muted={!shop.address} />
              <Row label={t('sl2_profile_sheet.row_phone')} value={shop.phone || t('sl2_profile_sheet.todo')} muted={!shop.phone} />
              <Row label={t('sl2_profile_sheet.row_status')} value={shop.status} />
              <Row label={t('sl2_profile_sheet.row_tier')} value={shop.tier} />
              <Row label={t('sl2_profile_sheet.row_points')} value={String(shop.points)} />
              <Row label={t('sl2_profile_sheet.row_since')} value={membership || t('sl2_profile_sheet.todo')} muted={!membership} />
            </div>

            {/* La feuille ne double pas « Ma boutique » : on y renvoie plutot
                que de dupliquer l'edition de la vitrine. */}
            <button
              type="button"
              onClick={() => onNavigate('/seller/shop')}
              className="mt-3 flex w-full items-start gap-2 rounded-[14px] p-3 text-left transition active:scale-[.99]"
              style={{ background: 'rgba(244,121,32,0.08)', border: '1px solid rgba(244,121,32,0.2)' }}
            >
              <Award size={15} className="mt-0.5 flex-shrink-0" style={{ color: T.orange }} />
              <span className="text-[12px] leading-snug" style={{ color: T.text }}>{t('sl2_profile_sheet.shop_hint')}</span>
              <ChevronRight size={15} className="mt-0.5 flex-shrink-0" style={{ color: T.muted }} />
            </button>
          </Card>

          <Card icon={ShieldCheck} title={t('sl2_profile_sheet.security_title')}>
            <SettingRow title={t('sl2_profile_sheet.two_factor')} hint={t('sl2_profile_sheet.two_factor_hint')}>
              <Toggle checked={twoFactor} onChange={startTwoFactor} label={t('sl2_profile_sheet.two_factor')} busy={twoFactorBusy} />
            </SettingRow>

            {twoFactorStep ? (
              <div className="mb-3 rounded-[14px] p-3" style={{ background: 'rgba(244,121,32,0.08)', border: '1px solid rgba(244,121,32,0.2)' }}>
                <input
                  value={twoFactorInput}
                  onChange={(event) => setTwoFactorInput(event.target.value)}
                  type={twoFactorStep === 'enable' ? 'text' : 'password'}
                  inputMode={twoFactorStep === 'enable' ? 'numeric' : undefined}
                  autoComplete={twoFactorStep === 'enable' ? 'one-time-code' : 'current-password'}
                  placeholder={twoFactorStep === 'enable' ? t('sl2_profile_sheet.otp_placeholder') : t('sl2_profile_sheet.password_placeholder')}
                  className="w-full rounded-[10px] px-3 py-2 text-sm font-bold outline-none"
                  style={{ background: T.topbar, border: `1px solid ${T.border}`, color: T.text }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={confirmTwoFactor}
                    disabled={twoFactorBusy || twoFactorInput.trim().length < 4}
                    className="flex-1 rounded-[10px] px-3 py-2 text-[13px] font-extrabold text-white disabled:opacity-50"
                    style={{ background: T.orange }}
                  >
                    {twoFactorStep === 'enable' ? t('sl2_profile_sheet.otp_confirm') : t('sl2_profile_sheet.otp_disable')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTwoFactorStep(null)}
                    className="rounded-[10px] px-3 py-2 text-[13px] font-bold"
                    style={{ border: `1px solid ${T.border}`, color: T.muted }}
                  >
                    {t('sl2_profile_sheet.cancel')}
                  </button>
                </div>
              </div>
            ) : null}

            <SettingRow title={t('sl2_profile_sheet.dark_theme')} hint={t('sl2_profile_sheet.dark_theme_hint')}>
              <Toggle checked={theme === 'dark'} onChange={onToggleTheme} label={t('sl2_profile_sheet.dark_theme')} />
            </SettingRow>

            <SettingRow title={t('sl2_profile_sheet.language')} hint={t('sl2_profile_sheet.language_hint')}>
              <div className="flex flex-shrink-0 overflow-hidden rounded-[10px]" style={{ border: `1px solid ${T.border}` }}>
                {(['fr', 'en'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeLanguage(code)}
                    aria-pressed={locale === code}
                    className="px-3 py-2 text-[12px] font-extrabold transition"
                    style={
                      locale === code
                        ? { background: T.orange, color: '#fff' }
                        : { background: T.topbar, color: T.muted }
                    }
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </SettingRow>
          </Card>

          {/* Certificat : le vendeur l'affiche en boutique, l'acheteur le scanne
              pour tomber directement sur sa vitrine BelivaY. */}
          <section
            className="rounded-[18px] p-5 text-center"
            style={{ background: 'rgba(244,121,32,0.07)', border: '1px solid rgba(244,121,32,0.2)' }}
          >
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-2xl font-extrabold text-white"
              style={{ background: `linear-gradient(135deg, ${T.orange}, #9A3412)`, boxShadow: `0 0 0 4px ${T.cream}` }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                shop.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <h3 className="mt-3 flex items-center justify-center gap-1.5 text-[15px] font-extrabold" style={{ color: T.text }}>
              <BadgeCheck size={16} className="flex-shrink-0" style={{ color: T.orange }} />
              {t('sl2_profile_sheet.cert_title')}
            </h3>
            <p className="mt-1 text-[12px]" style={{ color: T.muted }}>
              {shop.name} · {shop.tier}
            </p>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt={t('sl2_profile_sheet.cert_caption')} className="mx-auto mt-4 h-36 w-36 rounded-[14px] bg-white p-1.5" />
                <p className="mt-2 text-[11px]" style={{ color: T.muted }}>{t('sl2_profile_sheet.cert_caption')}</p>
              </>
            ) : (
              <p className="mt-4 rounded-[14px] p-4 text-[12px]" style={{ border: `1px dashed ${T.border}`, color: T.muted }}>
                {t('sl2_profile_sheet.cert_pending')}
              </p>
            )}
          </section>

          <Card icon={Smartphone} title={t('sl2_profile_sheet.app_title')}>
            <div
              className="flex items-start gap-2 rounded-[14px] p-3"
              style={{ background: 'rgba(244,121,32,0.08)', border: '1px solid rgba(244,121,32,0.2)' }}
            >
              <Download size={15} className="mt-0.5 flex-shrink-0" style={{ color: T.orange }} />
              <p className="text-[12px] leading-snug" style={{ color: T.text }}>{t('sl2_profile_sheet.pwa_body')}</p>
            </div>
            <button
              type="button"
              onClick={install}
              disabled={!installEvent}
              className="tap-target mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-extrabold text-white transition active:scale-[.98] disabled:opacity-40"
              style={{ background: T.orange }}
            >
              <Smartphone size={15} />
              {t('sl2_profile_sheet.pwa_action')}
            </button>
            {!installEvent ? (
              <p className="mt-1.5 text-center text-[11px]" style={{ color: T.muted }}>{t('sl2_profile_sheet.pwa_unavailable')}</p>
            ) : null}

            <div className="mt-3">
              <Row label={t('sl2_profile_sheet.version')} value={footer[0] || '—'} />
              <div className="flex items-start justify-between gap-4 py-2.5">
                <span className="flex-shrink-0 text-[13px]" style={{ color: T.muted }}>{t('sl2_profile_sheet.compliance')}</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                  style={{ background: 'rgba(22,163,74,0.10)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.25)' }}
                >
                  <CheckCircle2 size={12} />
                  ANTIC · OHADA · Anonymat V5
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="tap-target mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-extrabold transition active:scale-[.98]"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <LogOut size={15} />
              {t('sl2_profile_sheet.logout')}
            </button>
          </Card>

          <p className="px-1 pb-1 text-center text-[10px] leading-4" style={{ color: T.muted }}>
            {shop.username} · {shop.email}
            {footer.slice(1).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
