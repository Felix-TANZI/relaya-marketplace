// frontend/src/features/vendors/SellerSettingsPage.tsx
// Page Paramètres — espace vendeur BelivaY.
// Sections : Profil · Préférences · Notifications · Sécurité (mot de passe fort)
//            2FA (email actif, SMS/WA prévus) · Statut vendeur · Mobile Money
//            Session & Appareils · Zone critique

import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings, User, Globe, Bell, Shield, Store,
  Smartphone, LogOut, AlertTriangle, Upload, Trash2,
  Save, RefreshCw, Eye, EyeOff, ChevronRight,
  Sun, Moon, Check, X, Award, CreditCard, ExternalLink,
  Copy, Monitor, Tablet, Lock, ShieldCheck, ShieldOff,
  Mail, Clock, Wifi, WifiOff,
} from 'lucide-react';
import { authApi, type User as AuthUser } from '@/services/api/auth';
import { http } from '@/services/api/http';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';

// ─── Thème ────────────────────────────────────────────────────────────────────
const T = {
  orange:  '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream:   '#F5F0E8', creamAlt: '#EDE7DC',
  white:   '#FFFFFF', border:   '#E8E2D9',
  text:    '#1A1209', muted:    '#7C6E5A', mutedL: '#B8A898',
  green:   '#16A34A', greenL:   'rgba(22,163,74,0.10)',
  red:     '#DC2626', redL:     'rgba(220,38,38,0.10)',
  amber:   '#D97706', amberL:   'rgba(217,119,6,0.10)',
  blue:    '#2563EB', blueL:    'rgba(37,99,235,0.10)',
  violet:  '#7C3AED', violetL:  'rgba(124,58,237,0.10)',
  sidebar: '#1C1209',
};

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32', SILVER: '#7C8490', GOLD: '#C8A000', DIAMOND: '#2563EB',
};
const TIER_LABELS: Record<string, string> = {
  BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', DIAMOND: 'Diamant',
};
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED:  { label: 'Approuvé',   color: T.green,  bg: T.greenL  },
  PENDING:   { label: 'En attente', color: T.amber,  bg: T.amberL  },
  REJECTED:  { label: 'Rejeté',     color: T.red,    bg: T.redL    },
  SUSPENDED: { label: 'Suspendu',   color: T.muted,  bg: T.creamAlt },
};

const inp: React.CSSProperties = {
  background: T.cream, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 12, padding: '10px 14px', fontSize: 13.5, outline: 'none', width: '100%',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface VendorData {
  shop_slug: string; business_name: string; status: string;
  approved_at: string | null; certification_tier: string; total_points: number;
  active_plan_code: string; current_plan_name: string; plan_expires_at: string | null;
  default_withdrawal_operator: string; default_withdrawal_phone: string;
}

interface Session {
  jti: string; device_name: string; browser: string; os_name: string;
  ip_address: string | null; created_at: string; last_activity: string; is_current: boolean;
}

interface TwoFAStatus {
  two_factor_enabled: boolean; two_factor_method: string;
  two_factor_phone: string; email: string;
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} jour${d > 1 ? 's' : ''}`;
}

// ─── Indicateur de force du mot de passe ──────────────────────────────────────
type StrengthInfo = { score: number; label: string; color: string; bars: string[] };

function getPasswordStrength(pwd: string): StrengthInfo {
  if (!pwd) return { score: 0, label: '', color: '', bars: ['','','','',''] };

  let score = 0;
  if (pwd.length >= 8)          score++;
  if (pwd.length >= 12)         score++;
  if (/[A-Z]/.test(pwd))        score++;
  if (/[0-9]/.test(pwd))        score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const levels = [
    { label: '',           color: '',       bars: [T.border, T.border, T.border, T.border, T.border] },
    { label: 'Très faible', color: T.red,   bars: [T.red,    T.border, T.border, T.border, T.border] },
    { label: 'Faible',      color: '#F97316',bars: ['#F97316','#F97316',T.border, T.border, T.border] },
    { label: 'Moyen',       color: T.amber, bars: [T.amber,  T.amber,  T.amber,  T.border, T.border] },
    { label: 'Fort',        color: T.blue,  bars: [T.blue,   T.blue,   T.blue,   T.blue,   T.border] },
    { label: 'Très fort',   color: T.green, bars: [T.green,  T.green,  T.green,  T.green,  T.green]  },
  ];

  return { score, ...levels[score] };
}



// ─── Composants réutilisables ─────────────────────────────────────────────────

function Section({ title, icon, children, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
}) {
  const a = accent || T.orange;
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.white, border: `1px solid ${a === T.orange ? T.border : a}` }}>
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${a}20` }}>
          <span style={{ color: a }}>{icon}</span>
        </div>
        <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
          {title}
        </p>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className="w-11 h-6 rounded-full transition-all relative flex-shrink-0 disabled:opacity-40"
      style={{ background: checked ? T.orange : T.border }}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? '24px' : '2px' }}/>
    </button>
  );
}

// ─── Icône d'appareil ─────────────────────────────────────────────────────────
function DeviceIcon({ name }: { name: string }) {
  if (name.includes('Mobile'))   return <Smartphone size={16}/>;
  if (name.includes('Tablette')) return <Tablet size={16}/>;
  return <Monitor size={16}/>;
}

// ─── Modale OTP ───────────────────────────────────────────────────────────────
function OTPModal({ email, purpose, onVerified, onClose }: {
  email: string; purpose: '2FA_ENABLE' | '2FA_DISABLE';
  onVerified: (code: string) => void; onClose: () => void;
}) {
  const { showToast } = useToast();
  const [code,     setCode]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [verifying,setVerifying]= useState(false);
  const [countdown,setCountdown]= useState(0);

  // Guard contre le double-appel de React StrictMode en développement.
  // StrictMode monte les composants deux fois — sans ce ref, sendCode() serait
  // appelé deux fois d'affilée, envoyant deux emails et deux toast "code envoyé".
  const hasSentRef = useRef(false);
  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    sendCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async () => {
    try {
      setSending(true);
      const token = localStorage.getItem('access_token');
      // Utiliser http() (qui inclut API_BASE_URL) plutôt que fetch() natif
      // pour garantir que la requête passe bien par le backend Django (port 8000).
      await http('/api/auth/2fa/send-code/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ purpose }),
      });
      showToast(`Code envoyé à ${email}`, 'success');
      setCountdown(60);
    } catch { showToast('Erreur lors de l\'envoi du code', 'error'); }
    finally  { setSending(false); }
  };

  // Countdown renvoi
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) { showToast('Entrez le code à 6 chiffres', 'error'); return; }
    try {
      setVerifying(true);
      onVerified(code);
    } finally { setVerifying(false); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: T.white, boxShadow: '0 24px 60px rgba(28,18,9,0.3)' }}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: T.cream, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2">
            <Mail size={15} style={{ color: T.orange }}/>
            <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              Vérification par email
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: T.creamAlt }}>
            <X size={14} style={{ color: T.muted }}/>
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-[12.5px]" style={{ color: T.muted }}>
            Un code à 6 chiffres a été envoyé à <strong style={{ color: T.text }}>{email}</strong>.
            Vérifiez votre boîte de réception et vos spams.
          </p>

          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
              Code de vérification
            </label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{
                ...inp,
                fontSize: 22, textAlign: 'center', letterSpacing: '0.3em', fontWeight: 700,
              }}
              autoComplete="one-time-code"
            />
          </div>

          <button type="button" onClick={handleVerify}
            disabled={verifying || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13.5px] text-white disabled:opacity-50"
            style={{ background: T.violet, boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
            {verifying
              ? <><RefreshCw size={13} className="animate-spin"/>Vérification…</>
              : <><Check size={13}/>Confirmer</>}
          </button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-[12px]" style={{ color: T.mutedL }}>
                Renvoyer dans {countdown}s
              </p>
            ) : (
              <button type="button" onClick={sendCode} disabled={sending}
                className="text-[12px] font-semibold disabled:opacity-50"
                style={{ color: T.orange }}>
                {sending ? 'Envoi…' : 'Renvoyer le code'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function SellerSettingsPage() {
  const { user, logout }       = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { i18n }               = useTranslation();
  const { showToast }          = useToast();
  const navigate               = useNavigate();
  const avatarRef              = useRef<HTMLInputElement>(null);

  const [loading,  setLoading]  = useState(true);
  const [profile,  setProfile]  = useState<AuthUser | null>(null);
  const [vendor,   setVendor]   = useState<VendorData | null>(null);

  // Section 1 — Profil
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [bio,       setBio]       = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Section 3 — Notifications
  const [newsletter, setNewsletter] = useState(true);
  const [smsNotif,   setSmsNotif]   = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  // Section 4 — Sécurité
  const [oldPwd,    setOldPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [newPwd2,   setNewPwd2]   = useState('');
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showNew2,  setShowNew2]  = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const strength = getPasswordStrength(newPwd);

  // Section 5 — 2FA
  const [twoFA,         setTwoFA]         = useState<TwoFAStatus | null>(null);
  const [twoFAMethod,   setTwoFAMethod]   = useState('EMAIL');
  const [twoFAPhone,    setTwoFAPhone]    = useState('');
  const [showOTPModal,  setShowOTPModal]  = useState(false);
  const [otpPurpose,    setOtpPurpose]    = useState<'2FA_ENABLE'|'2FA_DISABLE'>('2FA_ENABLE');
  const [disablePwd,    setDisablePwd]    = useState('');
  const [showDisablePwd,setShowDisablePwd]= useState(false);
  const [disabling2FA,  setDisabling2FA]  = useState(false);

  // Section 6 — Mobile Money
  const [momoOp,     setMomoOp]     = useState('');
  const [momoPhone,  setMomoPhone]  = useState('');
  const [savingMomo, setSavingMomo] = useState(false);

  // Section 7 — Sessions
  const [sessions,       setSessions]       = useState<Session[]>([]);
  const [loadingSessions,setLoadingSessions] = useState(false);
  const [revokingJti,    setRevokingJti]     = useState<string | null>(null);
  const [revokingAll,    setRevokingAll]     = useState(false);

  // Section 8 — Divers
  const [copiedSlug, setCopiedSlug] = useState(false);

  // Ref stable vers showToast — évite de recréer `load` à chaque render si
  // showToast change de référence, ce qui causerait une boucle infinie de requêtes.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, vendorData, twoFAData] = await Promise.all([
        authApi.getProfile(),
        http<VendorData>('/api/vendors/shop/'),
        http<TwoFAStatus>('/api/auth/2fa/status/').catch(() => null),
      ]);
      setProfile(profileData);
      setVendor(vendorData);
      if (twoFAData) {
        setTwoFA(twoFAData);
        setTwoFAMethod(twoFAData.two_factor_method || 'EMAIL');
        setTwoFAPhone(twoFAData.two_factor_phone || '');
      }
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name   || '');
      setEmail(profileData.email          || '');
      setPhone(profileData.phone          || '');
      setBio((profileData as AuthUser & { bio?: string }).bio || '');
      setNewsletter(profileData.newsletter_subscribed ?? true);
      setSmsNotif(profileData.sms_notifications       ?? true);
      setMomoOp(vendorData.default_withdrawal_operator || '');
      setMomoPhone(vendorData.default_withdrawal_phone || '');
    } catch (e) { console.error(e); showToastRef.current('Erreur de chargement', 'error'); }
    finally  { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dépendances vides — load est stable pour toute la durée de vie du composant

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const data = await http<Session[]>('/api/auth/sessions/');
      setSessions(data);
    } catch { /* silencieux */ }
    finally  { setLoadingSessions(false); }
  }, []);

  useEffect(() => { load(); loadSessions(); }, [load, loadSessions]);

  // ── Profil ──────────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await authApi.updateProfile({ first_name: firstName, last_name: lastName, email, phone: phone||null, bio: bio||null });
      showToast('Profil mis à jour', 'success');
    } catch { showToast('Erreur lors de la mise à jour', 'error'); }
    finally  { setSavingProfile(false); }
  };

  const handleAvatarUpload = async (file: File) => {
    try { await authApi.uploadAvatar(file); showToast('Photo mise à jour', 'success'); await load(); }
    catch { showToast('Erreur upload avatar', 'error'); }
  };

  const handleAvatarRemove = async () => {
    try { await authApi.removeAvatar(); showToast('Photo supprimée', 'success'); await load(); }
    catch { showToast('Erreur suppression avatar', 'error'); }
  };

  // ── Notifications ────────────────────────────────────────────────────────────
  const handleSaveNotifications = async () => {
    try {
      setSavingNotif(true);
      await authApi.updateProfile({ newsletter_subscribed: newsletter, sms_notifications: smsNotif });
      showToast('Notifications mises à jour', 'success');
    } catch { showToast('Erreur lors de la mise à jour', 'error'); }
    finally  { setSavingNotif(false); }
  };

  // ── Sécurité ─────────────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd || !newPwd2) { showToast('Remplissez tous les champs', 'error'); return; }
    if (newPwd !== newPwd2)             { showToast('Les mots de passe ne correspondent pas', 'error'); return; }
    if (strength.score < 3)            { showToast('Choisissez un mot de passe plus fort', 'error'); return; }
    try {
      setSavingPwd(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/auth/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd, new_password2: newPwd2 }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        const msg = (data.old_password as string[])?.[0] || (data.new_password as string[])?.[0] || data.detail || 'Erreur';
        throw new Error(msg as string);
      }
      showToast('Mot de passe modifié avec succès', 'success');
      setOldPwd(''); setNewPwd(''); setNewPwd2('');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Erreur', 'error'); }
    finally    { setSavingPwd(false); }
  };

  // ── 2FA ──────────────────────────────────────────────────────────────────────
  const handleOTPVerified = async (code: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (otpPurpose === '2FA_ENABLE') {
        const res = await fetch('/api/auth/2fa/enable/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code, method: twoFAMethod, phone: twoFAPhone }),
        });
        const data = await res.json() as Record<string, unknown>;
        if (!res.ok) { showToast((data.detail as string) || 'Code incorrect', 'error'); return; }
        showToast('Double authentification activée', 'success');
      }
      setShowOTPModal(false);
      load(); loadSessions();
    } catch { showToast('Erreur lors de la vérification', 'error'); }
  };

  const handleDisable2FA = async () => {
    if (!disablePwd) { showToast('Entrez votre mot de passe pour confirmer', 'error'); return; }
    try {
      setDisabling2FA(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/auth/2fa/disable/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: disablePwd }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) { showToast((data.detail as string) || 'Mot de passe incorrect', 'error'); return; }
      showToast('Double authentification désactivée', 'success');
      setDisablePwd('');
      load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setDisabling2FA(false); }
  };

  // ── Mobile Money ────────────────────────────────────────────────────────────
  const handleSaveMomo = async () => {
    try {
      setSavingMomo(true);
      const token = localStorage.getItem('access_token');
      await http('/api/vendors/settings/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ default_withdrawal_operator: momoOp, default_withdrawal_phone: momoPhone }),
      });
      showToast('Numéro Mobile Money enregistré', 'success');
    } catch { showToast('Erreur lors de la mise à jour', 'error'); }
    finally  { setSavingMomo(false); }
  };

  // ── Sessions ─────────────────────────────────────────────────────────────────
  const handleRevokeSession = async (jti: string) => {
    try {
      setRevokingJti(jti);
      const token = localStorage.getItem('access_token');
      await http(`/api/auth/sessions/${jti}/revoke/`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Session révoquée', 'success');
      loadSessions();
    } catch { showToast('Erreur révocation session', 'error'); }
    finally  { setRevokingJti(null); }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('Révoquer toutes les autres sessions ?')) return;
    try {
      setRevokingAll(true);
      const token = localStorage.getItem('access_token');
      await http('/api/auth/sessions/revoke-all/', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Toutes les autres sessions ont été révoquées', 'success');
      loadSessions();
    } catch { showToast('Erreur', 'error'); }
    finally  { setRevokingAll(false); }
  };

  // ── Déconnexion ──────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const token   = localStorage.getItem('access_token');
      const refresh = localStorage.getItem('refresh_token');
      if (token) {
        await fetch('/api/auth/logout/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ refresh }),
        }).catch(() => {});
      }
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleCopySlug = () => {
    if (!vendor?.shop_slug) return;
    navigator.clipboard.writeText(`https://belivay.com?ref=${vendor.shop_slug}`);
    setCopiedSlug(true); setTimeout(() => setCopiedSlug(false), 2000);
    showToast('Lien copié', 'success');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  const initials  = `${firstName?.charAt(0)||''}${lastName?.charAt(0)||''}`.toUpperCase() || user?.username?.charAt(0).toUpperCase() || '?';
  const tier      = vendor?.certification_tier || 'BRONZE';
  const statusCfg = STATUS_CFG[vendor?.status || 'PENDING'] || STATUS_CFG.PENDING;
  const canSavePwd = oldPwd && newPwd && newPwd2 && newPwd === newPwd2 && strength.score >= 3;

  return (
    <div className="space-y-5 pb-12 max-w-3xl mx-auto">

      {/* ── EN-TÊTE ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="flex items-center gap-2 font-black text-[22px]"
          style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
          <Settings size={20} style={{ color: T.orange }}/>
          Paramètres
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
          Compte, sécurité et préférences
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — PROFIL PERSONNEL
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Profil personnel" icon={<User size={15}/>}>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ border: `3px solid ${T.orange}`, background: T.creamAlt }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
              ) : (
                <span className="font-black text-[24px]"
                  style={{ color: T.orange, fontFamily: 'Poppins,sans-serif' }}>{initials}</span>
              )}
            </div>
            <input type="file" ref={avatarRef} className="hidden" accept="image/*"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }}/>
            <button type="button" onClick={() => avatarRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white"
              style={{ background: T.orange, boxShadow: '0 2px 6px rgba(244,121,32,0.4)' }}>
              <Upload size={11}/>
            </button>
          </div>
          <div>
            <p className="font-bold text-[15px]" style={{ color: T.text }}>
              {`${firstName} ${lastName}`.trim() || user?.username || '—'}
            </p>
            <p className="text-[12.5px] mt-0.5" style={{ color: T.muted }}>{email}</p>
            {profile?.avatar_url && (
              <button type="button" onClick={handleAvatarRemove}
                className="flex items-center gap-1.5 text-[11.5px] mt-1.5 font-semibold"
                style={{ color: T.red }}>
                <Trash2 size={11}/>Supprimer la photo
              </button>
            )}
          </div>
        </div>

        {/* Username lecture seule */}
        <div className="mb-4 rounded-xl px-4 py-3" style={{ background: T.creamAlt }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.mutedL }}>
            Identifiant BelivaY
          </p>
          <p className="font-bold text-[13.5px]" style={{ color: T.text }}>@{user?.username || '—'}</p>
          <p className="text-[11px] mt-0.5" style={{ color: T.mutedL }}>Identifiant unique — non modifiable</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Prénom</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" style={inp}/>
          </div>
          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Nom</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" style={inp}/>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="votre@email.com" style={inp}/>
        </div>
        <div className="mb-3">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Téléphone personnel</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" style={inp}/>
        </div>
        <div className="mb-5">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
            Bio <span style={{ color: T.mutedL }}>(optionnel)</span>
          </label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder="Présentez-vous brièvement…" style={{ ...inp, resize: 'none' }}/>
        </div>

        <button type="button" onClick={handleSaveProfile} disabled={savingProfile}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: T.orange, boxShadow: '0 3px 10px rgba(244,121,32,0.3)' }}>
          {savingProfile ? <><RefreshCw size={13} className="animate-spin"/>Enregistrement…</> : <><Save size={13}/>Enregistrer</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — PRÉFÉRENCES INTERFACE
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Préférences" icon={<Globe size={15}/>} accent={T.blue}>
        <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="font-semibold text-[13.5px]" style={{ color: T.text }}>Langue</p>
            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>Français / English</p>
          </div>
          <div className="flex gap-2">
            {(['fr', 'en'] as const).map(lang => (
              <button key={lang} type="button" onClick={() => i18n.changeLanguage(lang)}
                className="px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all"
                style={{ background: i18n.language === lang ? T.orange : T.cream, color: i18n.language === lang ? T.white : T.muted, border: `1px solid ${i18n.language === lang ? T.orange : T.border}` }}>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-semibold text-[13.5px]" style={{ color: T.text }}>Thème</p>
            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>Clair ou sombre</p>
          </div>
          <div className="flex gap-2">
            {([{ key: 'light', label: 'Clair', icon: <Sun size={13}/> }, { key: 'dark', label: 'Sombre', icon: <Moon size={13}/> }] as const).map(opt => (
              <button key={opt.key} type="button" onClick={() => { if (theme !== opt.key) toggleTheme(); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all"
                style={{ background: theme === opt.key ? T.sidebar : T.cream, color: theme === opt.key ? T.white : T.muted, border: `1px solid ${theme === opt.key ? T.sidebar : T.border}` }}>
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — NOTIFICATIONS
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Notifications" icon={<Bell size={15}/>}>
        <div className="space-y-4">
          {[
            { label: 'Newsletter BelivaY', desc: 'Nouvelles fonctionnalités, conseils vendeur', value: newsletter, setter: setNewsletter },
            { label: 'Notifications SMS',  desc: 'Alertes commandes, confirmations paiement',  value: smsNotif, setter: setSmsNotif },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[13.5px]" style={{ color: T.text }}>{item.label}</p>
                <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>{item.desc}</p>
              </div>
              <Toggle checked={item.value} onChange={item.setter}/>
            </div>
          ))}
        </div>
        <button type="button" onClick={handleSaveNotifications} disabled={savingNotif}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white mt-5 disabled:opacity-50"
          style={{ background: T.orange, boxShadow: '0 3px 10px rgba(244,121,32,0.3)' }}>
          {savingNotif ? <><RefreshCw size={13} className="animate-spin"/>Enregistrement…</> : <><Save size={13}/>Enregistrer</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — SÉCURITÉ (mot de passe)
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Changer le mot de passe" icon={<Shield size={15}/>} accent={T.violet}>

        {/* Ancien mot de passe */}
        <div className="mb-3">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
            Mot de passe actuel
          </label>
          <div className="relative">
            <input value={oldPwd} onChange={e => setOldPwd(e.target.value)}
              type={showOld ? 'text' : 'password'}
              placeholder="Saisissez votre mot de passe actuel"
              autoComplete="off"
              style={{ ...inp, paddingRight: 42 }}/>
            <button type="button" onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }}>
              {showOld ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>

        {/* Nouveau mot de passe */}
        <div className="mb-3">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input value={newPwd} onChange={e => setNewPwd(e.target.value)}
              type={showNew ? 'text' : 'password'}
              placeholder="Nouveau mot de passe"
              autoComplete="new-password"
              style={{ ...inp, paddingRight: 42 }}/>
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }}>
              {showNew ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>

          {/* Barre de force */}
          {newPwd && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-1 mr-3">
                  {strength.bars.map((color, i) => (
                    <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
                      style={{ background: color }}/>
                  ))}
                </div>
                {strength.label && (
                  <span className="text-[11.5px] font-bold flex-shrink-0"
                    style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                )}
              </div>
              {/* Critères */}
              <div className="grid grid-cols-1 gap-1">
                {[
                  { ok: newPwd.length >= 8,          text: 'Minimum 8 caractères'        },
                  { ok: /[A-Z]/.test(newPwd),        text: 'Au moins une majuscule'       },
                  { ok: /[0-9]/.test(newPwd),        text: 'Au moins un chiffre'          },
                  { ok: /[^A-Za-z0-9]/.test(newPwd), text: 'Un caractère spécial (!@#$…)' },
                ].map(c => (
                  <div key={c.text} className="flex items-center gap-1.5">
                    {c.ok
                      ? <Check size={11} style={{ color: T.green, flexShrink: 0 }}/>
                      : <X     size={11} style={{ color: T.mutedL, flexShrink: 0 }}/>}
                    <span className="text-[11.5px]"
                      style={{ color: c.ok ? T.green : T.mutedL }}>{c.text}</span>
                  </div>
                ))}
              </div>
              {strength.score < 3 && (
                <p className="text-[11.5px] font-semibold" style={{ color: T.amber }}>
                  Mot de passe insuffisant — au moins 3 critères requis pour continuer.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Confirmation */}
        <div className="mb-5">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
            Confirmer le nouveau mot de passe
          </label>
          <div className="relative">
            <input value={newPwd2} onChange={e => setNewPwd2(e.target.value)}
              type={showNew2 ? 'text' : 'password'}
              placeholder="Confirmez le nouveau mot de passe"
              autoComplete="new-password"
              style={{ ...inp, paddingRight: 42, borderColor: newPwd2 && newPwd !== newPwd2 ? T.red : T.border }}/>
            <button type="button" onClick={() => setShowNew2(!showNew2)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }}>
              {showNew2 ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          {newPwd2 && newPwd !== newPwd2 && (
            <p className="text-[11.5px] mt-1 flex items-center gap-1" style={{ color: T.red }}>
              <X size={11}/> Les mots de passe ne correspondent pas
            </p>
          )}
          {newPwd2 && newPwd === newPwd2 && (
            <p className="text-[11.5px] mt-1 flex items-center gap-1" style={{ color: T.green }}>
              <Check size={11}/> Les mots de passe correspondent
            </p>
          )}
        </div>

        <button type="button" onClick={handleChangePassword} disabled={savingPwd || !canSavePwd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-40"
          style={{ background: T.violet, boxShadow: canSavePwd ? '0 3px 10px rgba(124,58,237,0.3)' : 'none' }}>
          {savingPwd ? <><RefreshCw size={13} className="animate-spin"/>Modification…</> : <><Shield size={13}/>Changer le mot de passe</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — DOUBLE AUTHENTIFICATION
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Double authentification (2FA)" icon={<ShieldCheck size={15}/>} accent={T.green}>

        {/* Statut */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl"
          style={{ background: twoFA?.two_factor_enabled ? T.greenL : T.creamAlt }}>
          {twoFA?.two_factor_enabled
            ? <ShieldCheck size={18} style={{ color: T.green }}/>
            : <ShieldOff   size={18} style={{ color: T.muted }}/>}
          <div>
            <p className="font-bold text-[13.5px]" style={{ color: twoFA?.two_factor_enabled ? T.green : T.text }}>
              {twoFA?.two_factor_enabled ? 'Double authentification activée' : 'Double authentification désactivée'}
            </p>
            <p className="text-[12px]" style={{ color: T.muted }}>
              {twoFA?.two_factor_enabled
                ? `Via ${twoFA.two_factor_method === 'EMAIL' ? 'email' : twoFA.two_factor_method === 'SMS' ? 'SMS' : 'WhatsApp'}`
                : 'Activez-la pour protéger votre compte contre les accès non autorisés.'}
            </p>
          </div>
        </div>

        {!twoFA?.two_factor_enabled ? (
          <div className="space-y-4">
            {/* Méthode */}
            <div>
              <p className="text-[12.5px] font-semibold mb-2" style={{ color: T.text }}>
                Méthode de vérification
              </p>
              <div className="space-y-2">
                {[
                  { value: 'EMAIL',    label: 'Email', desc: `Code envoyé à ${email}`, available: true },
                  { value: 'SMS',      label: 'SMS',   desc: 'Bientôt disponible', available: false },
                  { value: 'WHATSAPP', label: 'WhatsApp', desc: 'Bientôt disponible', available: false },
                ].map(m => (
                  <label key={m.value}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: twoFAMethod === m.value ? T.orangeL : T.cream,
                      border: `1.5px solid ${twoFAMethod === m.value ? T.orange : T.border}`,
                      opacity: m.available ? 1 : 0.5,
                      cursor: m.available ? 'pointer' : 'not-allowed',
                    }}>
                    <input type="radio" name="2fa-method" value={m.value}
                      checked={twoFAMethod === m.value}
                      onChange={() => m.available && setTwoFAMethod(m.value)}
                      className="flex-shrink-0" style={{ accentColor: T.orange }}/>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px]" style={{ color: T.text }}>{m.label}</span>
                        {!m.available && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: T.amberL, color: T.amber }}>
                            Bientôt
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px]" style={{ color: T.muted }}>{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Numéro pour SMS/WA */}
            {(twoFAMethod === 'SMS' || twoFAMethod === 'WHATSAPP') && (
              <div>
                <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                  Numéro {twoFAMethod === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
                  <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: T.amberL, color: T.amber }}>
                    Vérification à venir
                  </span>
                </label>
                <input value={twoFAPhone} onChange={e => setTwoFAPhone(e.target.value)}
                  placeholder="+237 6XX XXX XXX" style={inp}/>
                <p className="text-[11px] mt-1" style={{ color: T.mutedL }}>
                  Ce numéro sera vérifié par code SMS lors de l'activation complète.
                </p>
              </div>
            )}

            <button type="button"
              onClick={() => { setOtpPurpose('2FA_ENABLE'); setShowOTPModal(true); }}
              disabled={!twoFAMethod}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
              style={{ background: T.green, boxShadow: '0 3px 10px rgba(22,163,74,0.3)' }}>
              <ShieldCheck size={13}/> Activer la double authentification
            </button>
          </div>
        ) : (
          /* 2FA déjà activée → désactivation */
          <div className="space-y-3">
            <div className="rounded-xl p-3" style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.2)` }}>
              <p className="text-[12px]" style={{ color: T.red }}>
                Désactiver la 2FA réduit la sécurité de votre compte. Confirmez avec votre mot de passe.
              </p>
            </div>
            <div className="relative">
              <input value={disablePwd} onChange={e => setDisablePwd(e.target.value)}
                type={showDisablePwd ? 'text' : 'password'}
                placeholder="Votre mot de passe actuel"
                autoComplete="off"
                style={{ ...inp, paddingRight: 42 }}/>
              <button type="button" onClick={() => setShowDisablePwd(!showDisablePwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }}>
                {showDisablePwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            <button type="button" onClick={handleDisable2FA}
              disabled={disabling2FA || !disablePwd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-50"
              style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.25)`, color: T.red }}>
              {disabling2FA ? <><RefreshCw size={13} className="animate-spin"/>Désactivation…</> : <><ShieldOff size={13}/>Désactiver la 2FA</>}
            </button>
          </div>
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — STATUT COMPTE VENDEUR
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Statut du compte vendeur" icon={<Store size={15}/>} accent={T.green}>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: T.creamAlt }}>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: T.mutedL }}>Statut</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12.5px] font-bold"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusCfg.color }}/>
                  {statusCfg.label}
                </span>
                {vendor?.approved_at && (
                  <span className="text-[11.5px]" style={{ color: T.mutedL }}>
                    Depuis le {new Date(vendor.approved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {vendor?.shop_slug && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: T.cream, border: `1px solid ${T.border}` }}>
              <Globe size={13} style={{ color: T.orange, flexShrink: 0 }}/>
              <span className="text-[12px] truncate flex-1" style={{ color: T.muted }}>belivay.com?ref={vendor.shop_slug}</span>
              <button type="button" onClick={handleCopySlug}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] font-bold flex-shrink-0"
                style={{ background: copiedSlug ? T.greenL : T.creamAlt, color: copiedSlug ? T.green : T.muted }}>
                {copiedSlug ? <><Check size={10}/>Copié</> : <><Copy size={10}/>Copier</>}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: T.cream, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <Award size={14} style={{ color: TIER_COLORS[tier] }}/>
              <div>
                <p className="text-[12.5px] font-bold" style={{ color: T.text }}>Certification {TIER_LABELS[tier]}</p>
                <p className="text-[11.5px]" style={{ color: T.mutedL }}>{vendor?.total_points ?? 0} points</p>
              </div>
            </div>
            <Link to="/seller/certifications" className="flex items-center gap-1 text-[12px] font-bold" style={{ color: T.orange }}>
              Voir <ChevronRight size={12}/>
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: T.cream, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <CreditCard size={14} style={{ color: T.orange }}/>
              <div>
                <p className="text-[12.5px] font-bold" style={{ color: T.text }}>Plan {vendor?.current_plan_name || 'Gratuit'}</p>
                <p className="text-[11.5px]" style={{ color: T.mutedL }}>
                  {vendor?.plan_expires_at
                    ? `Expire le ${new Date(vendor.plan_expires_at).toLocaleDateString('fr-FR')}`
                    : 'Aucune expiration'}
                </p>
              </div>
            </div>
            <Link to="/seller/plans" className="flex items-center gap-1 text-[12px] font-bold" style={{ color: T.orange }}>
              Gérer <ChevronRight size={12}/>
            </Link>
          </div>

          <div className="px-4 py-2.5 rounded-xl" style={{ background: T.cream }}>
            <p className="text-[11.5px]" style={{ color: T.muted }}>
              Compte créé le{' '}
              <strong style={{ color: T.text }}>
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </strong>
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7 — MOBILE MONEY PRÉFÉRENTIEL
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Mobile Money préférentiel" icon={<Smartphone size={15}/>} accent={T.green}>
        <div className="rounded-xl p-3 mb-4" style={{ background: T.greenL, border: `1px solid rgba(22,163,74,0.2)` }}>
          <p className="text-[12px]" style={{ color: T.green }}>
            Pré-rempli automatiquement lors de vos demandes de retrait. Modifiable à chaque retrait si besoin.
          </p>
        </div>
        <div className="mb-4">
          <p className="text-[12.5px] font-semibold mb-2" style={{ color: T.text }}>Opérateur préférentiel</p>
          <div className="flex gap-3">
            {([{ value: 'MTN_MOMO', label: 'MTN MoMo', color: '#FFC107' }, { value: 'ORANGE_MONEY', label: 'Orange Money', color: '#FF6600' }] as const).map(op => (
              <button key={op.value} type="button" onClick={() => setMomoOp(op.value)}
                className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl text-[13px] font-bold transition-all"
                style={{ background: momoOp === op.value ? op.color + '15' : T.cream, border: `2px solid ${momoOp === op.value ? op.color : T.border}`, color: momoOp === op.value ? op.color : T.muted }}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: op.color }}/>
                {op.label}
                {momoOp === op.value && <Check size={13} className="ml-auto"/>}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Numéro Mobile Money</label>
          <input value={momoPhone} onChange={e => setMomoPhone(e.target.value)} placeholder="+237 6XX XXX XXX" style={inp}/>
        </div>
        <button type="button" onClick={handleSaveMomo} disabled={savingMomo || !momoOp || !momoPhone}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: T.green, boxShadow: '0 3px 10px rgba(22,163,74,0.3)' }}>
          {savingMomo ? <><RefreshCw size={13} className="animate-spin"/>Enregistrement…</> : <><Save size={13}/>Enregistrer le numéro</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8 — SESSION & APPAREILS CONNECTÉS
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Session & Appareils connectés" icon={<Lock size={15}/>}>

        {/* Déconnexion */}
        <div className="flex items-center justify-between mb-5 pb-5"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="font-semibold text-[13.5px]" style={{ color: T.text }}>Session courante</p>
            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>
              @{user?.username} — Compte créé {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
          <button type="button" onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-80"
            style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.25)`, color: T.red }}>
            <LogOut size={13}/> Se déconnecter
          </button>
        </div>

        {/* Liste des appareils */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-[13px]" style={{ color: T.text }}>
            Appareils connectés
            {sessions.length > 0 && (
              <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: T.orangeB, color: T.orange }}>
                {sessions.length}
              </span>
            )}
          </p>
          {sessions.filter(s => !s.is_current).length > 0 && (
            <button type="button" onClick={handleRevokeAll} disabled={revokingAll}
              className="text-[12px] font-bold disabled:opacity-50"
              style={{ color: T.red }}>
              {revokingAll ? 'Révocation…' : 'Tout révoquer'}
            </button>
          )}
        </div>

        {loadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={18} className="animate-spin" style={{ color: T.orange }}/>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-6 rounded-2xl" style={{ background: T.creamAlt }}>
            <Wifi size={24} className="mx-auto mb-2" style={{ color: T.mutedL }}/>
            <p className="text-[12.5px]" style={{ color: T.muted }}>Aucune session active retrouvée</p>
            <p className="text-[11.5px] mt-0.5" style={{ color: T.mutedL }}>
              Les sessions sont enregistrées à partir de maintenant
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.jti}
                className="flex items-start gap-3 p-4 rounded-2xl transition-all"
                style={{
                  background: s.is_current ? T.orangeL : T.cream,
                  border: `1px solid ${s.is_current ? T.orangeB : T.border}`,
                }}>
                {/* Icône */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.is_current ? T.orangeB : T.creamAlt }}>
                  <span style={{ color: s.is_current ? T.orange : T.muted }}>
                    <DeviceIcon name={s.device_name}/>
                  </span>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[13px]" style={{ color: T.text }}>
                      {s.device_name || 'Appareil inconnu'}
                    </p>
                    {s.is_current && (
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: T.orange, color: T.white }}>
                        Session actuelle
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-[11.5px]" style={{ color: T.mutedL }}>
                    {s.ip_address && <span>IP : {s.ip_address}</span>}
                    <span className="flex items-center gap-1">
                      <Clock size={10}/> {timeAgo(s.last_activity)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe size={10}/> Connexion le {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Action */}
                {!s.is_current && (
                  <button type="button" onClick={() => handleRevokeSession(s.jti)}
                    disabled={revokingJti === s.jti}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold flex-shrink-0 transition-all hover:opacity-80 disabled:opacity-40"
                    style={{ background: T.redL, color: T.red, border: `1px solid rgba(220,38,38,0.2)` }}>
                    {revokingJti === s.jti
                      ? <RefreshCw size={11} className="animate-spin"/>
                      : <><WifiOff size={11}/>Révoquer</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 9 — ZONE CRITIQUE
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Zone critique" icon={<AlertTriangle size={15}/>} accent={T.red}>
        <p className="font-semibold text-[13.5px] mb-1" style={{ color: T.text }}>Supprimer le compte vendeur</p>
        <p className="text-[12px] mb-3" style={{ color: T.muted }}>
          La suppression est définitive. Vos données sont archivées selon la réglementation camerounaise.
          Contactez le support pour initier la procédure.
        </p>
        <a href={`/contact?subject=Suppression%20compte%20vendeur&from=${encodeURIComponent(user?.username || '')}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-80"
          style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.25)`, color: T.red }}>
          <AlertTriangle size={13}/> Contacter le support pour supprimer
          <ExternalLink size={11}/>
        </a>
      </Section>

      {/* ── MODALE OTP 2FA ────────────────────────────────────────────────────── */}
      {showOTPModal && twoFA && (
        <OTPModal
          email={twoFA.email}
          purpose={otpPurpose}
          onVerified={handleOTPVerified}
          onClose={() => setShowOTPModal(false)}
        />
      )}

    </div>
  );
}