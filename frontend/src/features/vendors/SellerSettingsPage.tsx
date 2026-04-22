// frontend/src/features/vendors/SellerSettingsPage.tsx
// Page Paramètres — espace vendeur BelivaY.
// 8 sections : profil, préférences, notifications, sécurité,
//              statut compte, mobile money, session, danger zone.

import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings, User, Globe, Bell, Shield, Store,
  Smartphone, LogOut, AlertTriangle, Upload, Trash2,
  Save, RefreshCw, Eye, EyeOff, ChevronRight,
  Sun, Moon, Check, X, Award, CreditCard, ExternalLink,
  Copy,
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
const VENDOR_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED:  { label: 'Approuvé',   color: T.green,  bg: T.greenL  },
  PENDING:   { label: 'En attente', color: T.amber,  bg: T.amberL  },
  REJECTED:  { label: 'Rejeté',     color: T.red,    bg: T.redL    },
  SUSPENDED: { label: 'Suspendu',   color: T.muted,  bg: T.creamAlt },
};

const inp: React.CSSProperties = {
  background: T.cream, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 12, padding: '10px 14px', fontSize: 13.5, outline: 'none', width: '100%',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface VendorSettingsData {
  // Profil boutique
  shop_slug:                   string;
  business_name:               string;
  status:                      string;
  approved_at:                 string | null;
  certification_tier:          string;
  total_points:                number;
  active_plan_code:            string;
  current_plan_name:           string;
  plan_expires_at:             string | null;
  is_online:                   boolean;
  // Mobile Money préférentiel
  default_withdrawal_operator: string;
  default_withdrawal_phone:    string;
}

// ─── COMPOSANT SECTION ────────────────────────────────────────────────────────

function Section({
  title, icon, children, accent,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.white, border: `1px solid ${accent || T.border}` }}>
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ background: accent ? `rgba(${hexToRgb(accent)},0.06)` : T.cream, borderBottom: `1px solid ${accent || T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: accent ? `rgba(${hexToRgb(accent)},0.12)` : T.orangeB }}>
          <span style={{ color: accent || T.orange }}>{icon}</span>
        </div>
        <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
          {title}
        </p>
      </div>
      <div className="px-5 py-5">
        {children}
      </div>
    </div>
  );
}

// Utilitaire pour convertir hex en RGB (pour les rgba dynamiques)
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,0,0';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, disabled,
}: {
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

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function SellerSettingsPage() {
  const { user, logout }   = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { i18n }           = useTranslation();
  const { showToast }      = useToast();
  const navigate           = useNavigate();
  const avatarRef          = useRef<HTMLInputElement>(null);

  // ── États chargement ──────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true);
  const [profile,  setProfile]  = useState<AuthUser | null>(null);
  const [vendor,   setVendor]   = useState<VendorSettingsData | null>(null);

  // ── Section 1 : Profil ────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [bio,         setBio]         = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Section 2 : Préférences (sans état serveur) ───────────────────────────
  // theme et i18n sont gérés par leurs contextes respectifs

  // ── Section 3 : Notifications ─────────────────────────────────────────────
  const [newsletter,     setNewsletter]     = useState(true);
  const [smsNotif,       setSmsNotif]       = useState(true);
  const [savingNotif,    setSavingNotif]    = useState(false);

  // ── Section 4 : Sécurité ─────────────────────────────────────────────────
  const [oldPwd,       setOldPwd]       = useState('');
  const [newPwd,       setNewPwd]       = useState('');
  const [newPwd2,      setNewPwd2]      = useState('');
  const [showOld,      setShowOld]      = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showNew2,     setShowNew2]     = useState(false);
  const [savingPwd,    setSavingPwd]    = useState(false);

  // ── Section 6 : Mobile Money préférentiel ─────────────────────────────────
  const [momoOp,       setMomoOp]       = useState('');
  const [momoPhone,    setMomoPhone]    = useState('');
  const [savingMomo,   setSavingMomo]   = useState(false);

  // ── Section 8 : Danger ────────────────────────────────────────────────────
  const [isOnline,     setIsOnline]     = useState(true);
  const [savingOnline, setSavingOnline] = useState(false);
  const [copiedSlug,   setCopiedSlug]   = useState(false);

  // ── Chargement initial ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, vendorData] = await Promise.all([
        authApi.getProfile(),
        http<VendorSettingsData>('/api/vendors/shop/'),
      ]);

      setProfile(profileData);
      setVendor(vendorData);

      // Hydrater les états éditables
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name   || '');
      setEmail(profileData.email          || '');
      setPhone(profileData.phone          || '');
      setBio((profileData as AuthUser & { bio?: string }).bio || '');
      setNewsletter(profileData.newsletter_subscribed ?? true);
      setSmsNotif(profileData.sms_notifications ?? true);
      setMomoOp(vendorData.default_withdrawal_operator || '');
      setMomoPhone(vendorData.default_withdrawal_phone || '');
      setIsOnline(vendorData.is_online !== false);
    } catch (e) {
      console.error('SellerSettingsPage load error:', e);
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Section 1 : Sauvegarder le profil ────────────────────────────────────
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await authApi.updateProfile({
        first_name: firstName,
        last_name:  lastName,
        email,
        phone:      phone || null,
        bio:        bio   || null,
      });
      showToast('Profil mis à jour', 'success');
      await load();
    } catch { showToast('Erreur lors de la mise à jour', 'error'); }
    finally  { setSavingProfile(false); }
  };

  // ── Section 1 : Avatar ────────────────────────────────────────────────────
  const handleAvatarUpload = async (file: File) => {
    try {
      await authApi.uploadAvatar(file);
      showToast('Photo de profil mise à jour', 'success');
      await load();
    } catch { showToast('Erreur upload avatar', 'error'); }
  };

  const handleAvatarRemove = async () => {
    try {
      await authApi.removeAvatar();
      showToast('Photo de profil supprimée', 'success');
      await load();
    } catch { showToast('Erreur suppression avatar', 'error'); }
  };

  // ── Section 3 : Sauvegarder les notifications ─────────────────────────────
  const handleSaveNotifications = async () => {
    try {
      setSavingNotif(true);
      await authApi.updateProfile({
        newsletter_subscribed: newsletter,
        sms_notifications:     smsNotif,
      });
      showToast('Préférences de notification mises à jour', 'success');
    } catch { showToast('Erreur lors de la mise à jour', 'error'); }
    finally  { setSavingNotif(false); }
  };

  // ── Section 4 : Changer le mot de passe ──────────────────────────────────
  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd || !newPwd2) {
      showToast('Remplissez tous les champs', 'error'); return;
    }
    if (newPwd !== newPwd2) {
      showToast('Les nouveaux mots de passe ne correspondent pas', 'error'); return;
    }
    if (newPwd.length < 8) {
      showToast('Le nouveau mot de passe doit contenir au moins 8 caractères', 'error'); return;
    }
    try {
      setSavingPwd(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/auth/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd, new_password2: newPwd2 }),
      });
      const data = await res.json() as { detail?: string; old_password?: string[]; new_password?: string[] };
      if (!res.ok) {
        const msg = data.old_password?.[0] || data.new_password?.[0] || data.detail || 'Erreur';
        throw new Error(msg);
      }
      showToast('Mot de passe modifié avec succès', 'success');
      setOldPwd(''); setNewPwd(''); setNewPwd2('');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally { setSavingPwd(false); }
  };

  // ── Section 6 : Sauvegarder Mobile Money ─────────────────────────────────
  const handleSaveMomo = async () => {
    try {
      setSavingMomo(true);
      const token = localStorage.getItem('access_token');
      await http('/api/vendors/settings/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          default_withdrawal_operator: momoOp,
          default_withdrawal_phone:    momoPhone,
        }),
      });
      showToast('Numéro Mobile Money préférentiel enregistré', 'success');
    } catch { showToast('Erreur lors de la mise à jour', 'error'); }
    finally  { setSavingMomo(false); }
  };

  // ── Section 8 : Toggle boutique en ligne ─────────────────────────────────
  const handleToggleOnline = async (val: boolean) => {
    try {
      setSavingOnline(true);
      setIsOnline(val);
      const token = localStorage.getItem('access_token');
      await http('/api/vendors/shop/update/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_online: val }),
      });
      showToast(val ? 'Boutique en ligne' : 'Boutique mise hors ligne', 'success');
    } catch {
      setIsOnline(!val); // Rollback
      showToast('Erreur lors de la mise à jour', 'error');
    } finally { setSavingOnline(false); }
  };

  // ── Section 8 : Déconnexion ───────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ── Copier slug ────────────────────────────────────────────────────────────
  const handleCopySlug = () => {
    if (!vendor?.shop_slug) return;
    navigator.clipboard.writeText(`https://belivay.com?ref=${vendor.shop_slug}`);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
    showToast('Lien copié', 'success');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || user?.username?.charAt(0).toUpperCase() || '?';
  const vendorStatus = vendor?.status || 'PENDING';
  const statusCfg = VENDOR_STATUS_CONFIG[vendorStatus] || VENDOR_STATUS_CONFIG.PENDING;
  const tier = vendor?.certification_tier || 'BRONZE';

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
          Gérez votre compte, vos préférences et votre sécurité
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
                <span className="font-black text-[24px]" style={{ color: T.orange, fontFamily: 'Poppins,sans-serif' }}>
                  {initials}
                </span>
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
                className="flex items-center gap-1.5 text-[11.5px] mt-2 font-semibold transition-all hover:opacity-70"
                style={{ color: T.red }}>
                <Trash2 size={11}/>Supprimer la photo
              </button>
            )}
          </div>
        </div>

        {/* Champ username — lecture seule */}
        <div className="mb-4 rounded-xl px-4 py-3" style={{ background: T.creamAlt }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.mutedL }}>
            Identifiant BelivaY
          </p>
          <p className="font-bold text-[13.5px]" style={{ color: T.text }}>
            @{user?.username || '—'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: T.mutedL }}>
            Identifiant unique — non modifiable
          </p>
        </div>

        {/* Formulaire */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Prénom</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="Prénom" style={inp}/>
          </div>
          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Nom</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)}
              placeholder="Nom" style={inp}/>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com" type="email" style={inp}/>
        </div>
        <div className="mb-3">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
            Téléphone personnel
          </label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+237 6XX XXX XXX" style={inp}/>
        </div>
        <div className="mb-5">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
            Bio <span style={{ color: T.mutedL }}>(optionnel)</span>
          </label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder="Présentez-vous brièvement…"
            style={{ ...inp, resize: 'none' }}/>
        </div>

        <button type="button" onClick={handleSaveProfile} disabled={savingProfile}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: T.orange, boxShadow: '0 3px 10px rgba(244,121,32,0.3)' }}>
          {savingProfile
            ? <><RefreshCw size={13} className="animate-spin"/>Enregistrement…</>
            : <><Save size={13}/>Enregistrer le profil</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — PRÉFÉRENCES INTERFACE
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Préférences" icon={<Globe size={15}/>} accent={T.blue}>
        {/* Langue */}
        <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="font-semibold text-[13.5px]" style={{ color: T.text }}>Langue de l'interface</p>
            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>Français / English</p>
          </div>
          <div className="flex gap-2">
            {(['fr', 'en'] as const).map(lang => (
              <button key={lang} type="button"
                onClick={() => i18n.changeLanguage(lang)}
                className="px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all"
                style={{
                  background: i18n.language === lang ? T.orange : T.cream,
                  color:      i18n.language === lang ? T.white  : T.muted,
                  border:     `1px solid ${i18n.language === lang ? T.orange : T.border}`,
                }}>
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Thème */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-semibold text-[13.5px]" style={{ color: T.text }}>Thème</p>
            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>Clair ou sombre</p>
          </div>
          <div className="flex gap-2">
            {([
              { key: 'light', label: 'Clair', icon: <Sun size={13}/> },
              { key: 'dark',  label: 'Sombre', icon: <Moon size={13}/> },
            ] as const).map(opt => (
              <button key={opt.key} type="button" onClick={() => { if (theme !== opt.key) toggleTheme(); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all"
                style={{
                  background: theme === opt.key ? T.sidebar : T.cream,
                  color:      theme === opt.key ? T.white   : T.muted,
                  border:     `1px solid ${theme === opt.key ? T.sidebar : T.border}`,
                }}>
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
            {
              label: 'Newsletter BelivaY',
              desc:  'Nouvelles fonctionnalités, promotions et conseils vendeur',
              value: newsletter,
              setter: setNewsletter,
            },
            {
              label: 'Notifications SMS',
              desc:  'Alertes de commandes, confirmations de paiement',
              value: smsNotif,
              setter: setSmsNotif,
            },
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
          {savingNotif
            ? <><RefreshCw size={13} className="animate-spin"/>Enregistrement…</>
            : <><Save size={13}/>Enregistrer</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — SÉCURITÉ
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Sécurité" icon={<Shield size={15}/>} accent={T.violet}>
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ background: T.blueL, border: `1px solid rgba(37,99,235,0.2)` }}>
            <p className="text-[12px]" style={{ color: T.blue }}>
              Utilisez un mot de passe fort (min. 8 caractères, mélange lettres/chiffres) pour sécuriser votre compte BelivaY.
            </p>
          </div>

          {/* Ancien mot de passe */}
          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
              Mot de passe actuel
            </label>
            <div className="relative">
              <input value={oldPwd} onChange={e => setOldPwd(e.target.value)}
                type={showOld ? 'text' : 'password'}
                placeholder="••••••••"
                style={{ ...inp, paddingRight: 42 }}/>
              <button type="button" onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: T.mutedL }}>
                {showOld ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input value={newPwd} onChange={e => setNewPwd(e.target.value)}
                type={showNew ? 'text' : 'password'}
                placeholder="••••••••"
                style={{ ...inp, paddingRight: 42 }}/>
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: T.mutedL }}>
                {showNew ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input value={newPwd2} onChange={e => setNewPwd2(e.target.value)}
                type={showNew2 ? 'text' : 'password'}
                placeholder="••••••••"
                style={{
                  ...inp, paddingRight: 42,
                  borderColor: newPwd2 && newPwd !== newPwd2 ? T.red : T.border,
                }}/>
              <button type="button" onClick={() => setShowNew2(!showNew2)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: T.mutedL }}>
                {showNew2 ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {newPwd2 && newPwd !== newPwd2 && (
              <p className="text-[11.5px] mt-1 flex items-center gap-1" style={{ color: T.red }}>
                <X size={11}/> Les mots de passe ne correspondent pas
              </p>
            )}
            {newPwd2 && newPwd === newPwd2 && newPwd.length >= 8 && (
              <p className="text-[11.5px] mt-1 flex items-center gap-1" style={{ color: T.green }}>
                <Check size={11}/> Les mots de passe correspondent
              </p>
            )}
          </div>
        </div>

        <button type="button" onClick={handleChangePassword} disabled={savingPwd || !oldPwd || !newPwd || !newPwd2}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white mt-5 disabled:opacity-50"
          style={{ background: T.violet, boxShadow: '0 3px 10px rgba(124,58,237,0.3)' }}>
          {savingPwd
            ? <><RefreshCw size={13} className="animate-spin"/>Modification…</>
            : <><Shield size={13}/>Changer le mot de passe</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — STATUT COMPTE VENDEUR
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Statut du compte vendeur" icon={<Store size={15}/>} accent={T.green}>
        <div className="space-y-3">

          {/* Statut + date approbation */}
          <div className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: T.creamAlt }}>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: T.mutedL }}>
                Statut
              </p>
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

          {/* URL boutique */}
          {vendor?.shop_slug && (
            <div className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: T.cream, border: `1px solid ${T.border}` }}>
              <Globe size={13} style={{ color: T.orange, flexShrink: 0 }}/>
              <span className="text-[12px] truncate flex-1" style={{ color: T.muted }}>
                belivay.com?ref={vendor.shop_slug}
              </span>
              <button type="button" onClick={handleCopySlug}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] font-bold transition-all flex-shrink-0"
                style={{ background: copiedSlug ? T.greenL : T.creamAlt, color: copiedSlug ? T.green : T.muted }}>
                {copiedSlug ? <><Check size={10}/>Copié</> : <><Copy size={10}/>Copier</>}
              </button>
            </div>
          )}

          {/* Certification */}
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: T.cream, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <Award size={14} style={{ color: TIER_COLORS[tier] }}/>
              <div>
                <p className="text-[12.5px] font-bold" style={{ color: T.text }}>
                  Certification {TIER_LABELS[tier]}
                </p>
                <p className="text-[11.5px]" style={{ color: T.mutedL }}>
                  {vendor?.total_points ?? 0} points cumulés
                </p>
              </div>
            </div>
            <Link to="/seller/certifications"
              className="flex items-center gap-1 text-[12px] font-bold"
              style={{ color: T.orange }}>
              Voir <ChevronRight size={12}/>
            </Link>
          </div>

          {/* Plan */}
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: T.cream, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <CreditCard size={14} style={{ color: T.orange }}/>
              <div>
                <p className="text-[12.5px] font-bold" style={{ color: T.text }}>
                  Plan {vendor?.current_plan_name || 'Gratuit'}
                </p>
                <p className="text-[11.5px]" style={{ color: T.mutedL }}>
                  {vendor?.plan_expires_at
                    ? `Expire le ${new Date(vendor.plan_expires_at).toLocaleDateString('fr-FR')}`
                    : 'Aucune expiration'}
                </p>
              </div>
            </div>
            <Link to="/seller/plans"
              className="flex items-center gap-1 text-[12px] font-bold"
              style={{ color: T.orange }}>
              Gérer <ChevronRight size={12}/>
            </Link>
          </div>

          {/* Date inscription */}
          <div className="px-4 py-2.5 rounded-xl" style={{ background: T.cream }}>
            <p className="text-[11.5px]" style={{ color: T.muted }}>
              Compte créé le{' '}
              <strong style={{ color: T.text }}>
                {user?.date_joined
                  ? new Date(user.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </strong>
            </p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — MOBILE MONEY PRÉFÉRENTIEL
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Mobile Money préférentiel" icon={<Smartphone size={15}/>} accent={T.green}>
        <div className="rounded-xl p-3 mb-4" style={{ background: T.greenL, border: `1px solid rgba(22,163,74,0.2)` }}>
          <p className="text-[12px]" style={{ color: T.green }}>
            Ces informations seront pré-remplies automatiquement lors de vos demandes de retrait depuis le Portefeuille. Vous pourrez toujours les modifier ponctuellement.
          </p>
        </div>

        {/* Opérateur */}
        <div className="mb-4">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
            Opérateur préférentiel
          </label>
          <div className="flex gap-3">
            {([
              { value: 'MTN_MOMO',     label: 'MTN MoMo',     color: '#FFC107' },
              { value: 'ORANGE_MONEY', label: 'Orange Money', color: '#FF6600' },
            ] as const).map(op => (
              <button key={op.value} type="button" onClick={() => setMomoOp(op.value)}
                className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl text-[13px] font-bold transition-all"
                style={{
                  background: momoOp === op.value ? op.color + '15' : T.cream,
                  border:     `2px solid ${momoOp === op.value ? op.color : T.border}`,
                  color:      momoOp === op.value ? op.color : T.muted,
                }}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: op.color }}/>
                {op.label}
                {momoOp === op.value && <Check size={13} className="ml-auto"/>}
              </button>
            ))}
          </div>
        </div>

        {/* Numéro */}
        <div className="mb-5">
          <label className="text-[12.5px] font-semibold mb-1.5 block" style={{ color: T.text }}>
            Numéro Mobile Money
          </label>
          <input value={momoPhone} onChange={e => setMomoPhone(e.target.value)}
            placeholder="+237 6XX XXX XXX" style={inp}/>
          <p className="text-[11px] mt-1.5" style={{ color: T.mutedL }}>
            Le numéro doit correspondre à votre compte {momoOp === 'MTN_MOMO' ? 'MTN MoMo' : momoOp === 'ORANGE_MONEY' ? 'Orange Money' : 'Mobile Money'}.
          </p>
        </div>

        <button type="button" onClick={handleSaveMomo} disabled={savingMomo || !momoOp || !momoPhone}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: T.green, boxShadow: '0 3px 10px rgba(22,163,74,0.3)' }}>
          {savingMomo
            ? <><RefreshCw size={13} className="animate-spin"/>Enregistrement…</>
            : <><Save size={13}/>Enregistrer le numéro</>}
        </button>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7 — SESSION & CONNEXION
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Session & connexion" icon={<LogOut size={15}/>}>
        <div className="space-y-3">
          {/* Récap compte */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl px-4 py-3" style={{ background: T.creamAlt }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.mutedL }}>
                Identifiant
              </p>
              <p className="font-bold text-[13px]" style={{ color: T.text }}>
                @{user?.username || '—'}
              </p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: T.creamAlt }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.mutedL }}>
                Membre depuis
              </p>
              <p className="font-bold text-[13px]" style={{ color: T.text }}>
                {user?.date_joined
                  ? new Date(user.date_joined).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Bouton déconnexion */}
          <button type="button" onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13.5px] font-bold transition-all hover:opacity-80"
            style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.25)`, color: T.red }}>
            <LogOut size={14}/> Se déconnecter
          </button>
          <p className="text-center text-[11px]" style={{ color: T.mutedL }}>
            Vous serez redirigé vers la page de connexion
          </p>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8 — ZONE DANGER
      ══════════════════════════════════════════════════════════════════════ */}
      <Section title="Zone critique" icon={<AlertTriangle size={15}/>} accent={T.red}>

        {/* Toggle boutique en ligne / hors ligne */}
        <div className="flex items-start justify-between gap-4 pb-4"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="font-semibold text-[13.5px]" style={{ color: T.text }}>Statut de la boutique</p>
            <p className="text-[12px] mt-0.5" style={{ color: T.muted }}>
              {isOnline
                ? 'Votre boutique est visible et accessible aux clients.'
                : 'Votre boutique est masquée — aucun client ne peut la voir.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[12px] font-semibold" style={{ color: isOnline ? T.green : T.muted }}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
            <Toggle checked={isOnline} onChange={handleToggleOnline} disabled={savingOnline}/>
          </div>
        </div>

        {/* Demande de suppression de compte */}
        <div className="pt-4">
          <p className="font-semibold text-[13.5px] mb-1" style={{ color: T.text }}>
            Supprimer le compte vendeur
          </p>
          <p className="text-[12px] mb-3" style={{ color: T.muted }}>
            La suppression est définitive. Vos produits, commandes et historique de paiement seront archivés conformément à la réglementation camerounaise.
          </p>
          <a href={`/contact?subject=Suppression%20compte%20vendeur&from=${encodeURIComponent(user?.username || '')}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-bold transition-all hover:opacity-80"
            style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.25)`, color: T.red }}>
            <AlertTriangle size={13}/>
            Contacter le support pour supprimer
            <ExternalLink size={11}/>
          </a>
        </div>
      </Section>

    </div>
  );
}