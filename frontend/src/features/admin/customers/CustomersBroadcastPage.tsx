// frontend/src/features/admin/customers/CustomersBroadcastPage.tsx
// Broadcast notifications ciblées — Clients BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Megaphone, Send, Users, MapPin, Award, User,
  RefreshCw, Clock, CheckCircle, ChevronLeft,
  Eye, AlertTriangle, Bell,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Audience = 'all' | 'city' | 'tier' | 'user';
type NotifType = 'PROMOTION' | 'SYSTEM' | 'ORDER';

interface PreviewResult {
  count:  number;
  sample: Array<{ id: number; username: string; email: string }>;
}

interface BroadcastEntry {
  id:       number;
  title:    string;
  message:  string;
  audience: string;
  city:     string;
  tier:     string;
  type:     string;
  sent_to:  number;
  sent_by:  string;
  sent_at:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS: Array<{ key: Audience; labelKey: string; descKey: string; icon: React.ElementType; color: string }> = [
  { key: 'all',  labelKey: 'ad2_customers_broadcast.audience_all_label',  descKey: 'ad2_customers_broadcast.audience_all_desc',          icon: Users,   color: '#3B82F6' },
  { key: 'city', labelKey: 'ad2_customers_broadcast.audience_city_label',  descKey: 'ad2_customers_broadcast.audience_city_desc',       icon: MapPin,  color: '#10B981' },
  { key: 'tier', labelKey: 'ad2_customers_broadcast.audience_tier_label',  descKey: 'ad2_customers_broadcast.audience_tier_desc',         icon: Award,   color: '#C8A000' },
  { key: 'user', labelKey: 'ad2_customers_broadcast.audience_user_label', descKey: 'ad2_customers_broadcast.audience_user_desc', icon: User,    color: '#8B5CF6' },
];

const NOTIF_TYPES: Array<{ key: NotifType; labelKey: string; color: string }> = [
  { key: 'PROMOTION', labelKey: 'ad2_customers_broadcast.notif_type_promotion',  color: '#F47920' },
  { key: 'SYSTEM',    labelKey: 'ad2_customers_broadcast.notif_type_system',    color: '#6B7280' },
  { key: 'ORDER',     labelKey: 'ad2_customers_broadcast.notif_type_order',   color: '#3B82F6' },
];

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];
const CITIES = [
  'Yaoundé', 'Douala', 'Bafoussam', 'Bamenda', 'Garoua',
  'Maroua', 'Ngaoundéré', 'Bertoua', 'Ebolowa', 'Kribi', 'Limbé',
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomersBroadcastPage() {
  const T             = useAdminTheme();
  const { t }          = useTranslation();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  // Formulaire
  const [audience,   setAudience]   = useState<Audience>('all');
  const [city,       setCity]       = useState('');
  const [tier,       setTier]       = useState('BRONZE');
  const [userId,     setUserId]     = useState('');
  const [title,      setTitle]      = useState('');
  const [message,    setMessage]    = useState('');
  const [notifType,  setNotifType]  = useState<NotifType>('PROMOTION');
  const [actionUrl,  setActionUrl]  = useState('');

  // Aperçu & envoi
  const [preview,    setPreview]    = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending,    setSending]    = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);

  // Historique
  const [history,    setHistory]    = useState<BroadcastEntry[]>([]);
  const [loadingHist,setLoadingHist]= useState(true);

  // Charger l'historique
  const loadHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const data = await http<{ history: BroadcastEntry[] }>(
        '/api/vendors/admin/customers/broadcast/history/',
        { headers: authHeader() }
      );
      setHistory(data.history);
    } catch {
      // Silencieux
    } finally {
      setLoadingHist(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Aperçu — appelé quand les filtres changent (debounced)
  const loadPreview = useCallback(async () => {
    setPreviewing(true);
    setPreview(null);
    try {
      const data = await http<PreviewResult>(
        '/api/vendors/admin/customers/broadcast/preview/',
        {
          method: 'POST',
          headers: authHeader(),
          body: JSON.stringify({ audience, city, tier, user_id: userId ? parseInt(userId) : null }),
        }
      );
      setPreview(data);
    } catch {
      // Silencieux
    } finally {
      setPreviewing(false);
    }
  }, [audience, city, tier, userId]);

  useEffect(() => {
    const timeoutId = setTimeout(loadPreview, 500);
    return () => clearTimeout(timeoutId);
  }, [loadPreview]);

  // Envoi
  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toastRef.current(t('ad2_customers_broadcast.toast_title_message_required'), 'error');
      return;
    }
    setSending(true);
    setShowConfirm(false);
    try {
      const data = await http<{ detail: string; sent_to: number }>(
        '/api/vendors/admin/customers/broadcast/',
        {
          method: 'POST',
          headers: authHeader(),
          body: JSON.stringify({
            audience, city, tier,
            user_id:    userId ? parseInt(userId) : null,
            title, message,
            type:       notifType,
            action_url: actionUrl,
          }),
        }
      );
      toastRef.current(`${data.detail}`, 'success');
      // Réinitialiser le formulaire
      setTitle('');
      setMessage('');
      setActionUrl('');
      setPreview(null);
      loadHistory();
    } catch {
      toastRef.current(t('ad2_customers_broadcast.toast_send_error'), 'error');
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim().length > 0 && message.trim().length > 0 && (preview?.count ?? 0) > 0;
  const charLeft = 500 - message.length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/admin/customers"
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
              <ChevronLeft size={14} />
            </Link>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>
              {t('ad2_customers_broadcast.heading')}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: T.muted, paddingLeft: 44 }}>
            {t('ad2_customers_broadcast.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Formulaire (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Audience */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Users size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad2_customers_broadcast.section_audience_title')}</span>
            </div>
            <div className="p-5 space-y-4">
              {/* Sélection audience */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AUDIENCE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const active = audience === opt.key;
                  return (
                    <button key={opt.key} onClick={() => { setAudience(opt.key); setPreview(null); }}
                      className="rounded-xl p-3 text-left transition-all"
                      style={{ background: active ? opt.color + '15' : T.cardAlt, border: `2px solid ${active ? opt.color + '50' : T.border}` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                        style={{ background: opt.color + '20' }}>
                        <Icon size={13} style={{ color: opt.color }} />
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: active ? opt.color : T.text, marginBottom: 2 }}>{t(opt.labelKey)}</p>
                      <p style={{ fontSize: 10.5, color: T.muted, lineHeight: 1.4 }}>{t(opt.descKey)}</p>
                    </button>
                  );
                })}
              </div>

              {/* Filtre ville */}
              {audience === 'city' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>
                    {t('ad2_customers_broadcast.label_city')}
                  </label>
                  <select value={city} onChange={e => setCity(e.target.value)}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none' }}>
                    <option value="">{t('ad2_customers_broadcast.option_select_city')}</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* Filtre tier */}
              {audience === 'tier' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>
                    {t('ad2_customers_broadcast.label_tier')}
                  </label>
                  <div className="flex gap-2">
                    {TIERS.map(tr => {
                      const colors: Record<string, string> = { BRONZE: '#CD7F32', SILVER: '#8B909A', GOLD: '#C8A000', DIAMOND: '#2563EB' };
                      const active = tier === tr;
                      const tierLabelKey: Record<string, string> = {
                        BRONZE: 'ad2_customers_broadcast.tier_bronze',
                        SILVER: 'ad2_customers_broadcast.tier_silver',
                        GOLD: 'ad2_customers_broadcast.tier_gold',
                        DIAMOND: 'ad2_customers_broadcast.tier_diamond',
                      };
                      return (
                        <button key={tr} onClick={() => setTier(tr)}
                          className="flex-1 py-2 rounded-xl text-[12px] font-bold"
                          style={{ background: active ? colors[tr] + '20' : T.cardAlt, border: `2px solid ${active ? colors[tr] + '50' : T.border}`, color: active ? colors[tr] : T.muted }}>
                          {t(tierLabelKey[tr])}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filtre utilisateur */}
              {audience === 'user' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>
                    {t('ad2_customers_broadcast.label_user_id')}
                  </label>
                  <input
                    type="number" value={userId} onChange={e => setUserId(e.target.value)}
                    placeholder={t('ad2_customers_broadcast.placeholder_user_id')}
                    style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none' }}
                  />
                </div>
              )}

              {/* Compteur aperçu */}
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: previewing ? T.cardAlt : (preview ? '#10B98115' : T.cardAlt), border: `1px solid ${preview && !previewing ? '#10B98130' : T.border}` }}>
                {previewing ? (
                  <>
                    <RefreshCw size={14} style={{ color: T.muted, animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 13, color: T.muted }}>{t('ad2_customers_broadcast.preview_calculating')}</span>
                  </>
                ) : preview ? (
                  <>
                    <CheckCircle size={14} style={{ color: '#10B981' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>
                      {t(preview.count > 1 ? 'ad2_customers_broadcast.preview_recipient_plural' : 'ad2_customers_broadcast.preview_recipient', { count: preview.count })}
                    </span>
                    {preview.count > 0 && preview.sample.length > 0 && (
                      <span style={{ fontSize: 12, color: T.muted }}>
                        {t('ad2_customers_broadcast.preview_example', { list: preview.sample.slice(0, 2).map(u => `@${u.username}`).join(', ') })}
                        {preview.sample.length > 2 ? '…' : ''}
                      </span>
                    )}
                    {preview.count === 0 && (
                      <span style={{ fontSize: 12, color: '#F59E0B' }}>{t('ad2_customers_broadcast.preview_none')}</span>
                    )}
                  </>
                ) : (
                  <>
                    <Eye size={14} style={{ color: T.muted }} />
                    <span style={{ fontSize: 13, color: T.muted }}>{t('ad2_customers_broadcast.preview_placeholder')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Bell size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad2_customers_broadcast.section_content_title')}</span>
            </div>
            <div className="p-5 space-y-4">
              {/* Type */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>{t('ad2_customers_broadcast.label_type')}</label>
                <div className="flex gap-2">
                  {NOTIF_TYPES.map(nt => (
                    <button key={nt.key} onClick={() => setNotifType(nt.key)}
                      className="px-4 py-2 rounded-xl text-[12px] font-bold"
                      style={{ background: notifType === nt.key ? nt.color + '20' : T.cardAlt, border: `2px solid ${notifType === nt.key ? nt.color + '50' : T.border}`, color: notifType === nt.key ? nt.color : T.muted }}>
                      {t(nt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{t('ad2_customers_broadcast.label_title')} <span style={{ color: T.red }}>*</span></label>
                  <span style={{ fontSize: 11, color: T.muted }}>{title.length}/80</span>
                </div>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value.slice(0, 80))}
                  placeholder={t('ad2_customers_broadcast.placeholder_title')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${title ? T.red + '40' : T.inputBorder}`, color: T.text, borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none' }}
                />
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>{t('ad2_customers_broadcast.label_message')} <span style={{ color: T.red }}>*</span></label>
                  <span style={{ fontSize: 11, color: charLeft < 50 ? '#F59E0B' : T.muted }}>{t('ad2_customers_broadcast.chars_left', { count: charLeft })}</span>
                </div>
                <textarea
                  value={message} onChange={e => setMessage(e.target.value.slice(0, 500))}
                  rows={4}
                  placeholder={t('ad2_customers_broadcast.placeholder_message')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${message ? T.red + '40' : T.inputBorder}`, color: T.text, borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Lien action (optionnel) */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 6 }}>
                  {t('ad2_customers_broadcast.label_action_url')} <span style={{ fontSize: 11, color: T.muted }}>{t('ad2_customers_broadcast.optional')}</span>
                </label>
                <input
                  type="text" value={actionUrl} onChange={e => setActionUrl(e.target.value)}
                  placeholder={t('ad2_customers_broadcast.placeholder_action_url')}
                  style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none' }}
                />
              </div>

              {/* Bouton envoi */}
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!canSend}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px]"
                  style={{ background: canSend ? T.red : T.border, color: canSend ? '#fff' : T.muted, cursor: canSend ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                  <Send size={15} /> {t('ad2_customers_broadcast.btn_send')}
                </button>
              ) : (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} style={{ color: T.red, flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 13, color: T.text }}>
                      {t((preview?.count ?? 0) > 1 ? 'ad2_customers_broadcast.confirm_send_warning_plural' : 'ad2_customers_broadcast.confirm_send_warning', { count: preview?.count ?? 0 })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowConfirm(false)}
                      className="flex-1 py-2 rounded-xl text-[13px] font-semibold"
                      style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                      {t('ad2_customers_broadcast.confirm_cancel')}
                    </button>
                    <button onClick={handleSend} disabled={sending}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-bold"
                      style={{ background: T.red, color: '#fff', opacity: sending ? 0.7 : 1 }}>
                      {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                      {sending ? t('ad2_customers_broadcast.sending') : t('ad2_customers_broadcast.confirm_send_label')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panneau droit — Aperçu + Historique */}
        <div className="space-y-5">

          {/* Aperçu notification */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <Eye size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad2_customers_broadcast.preview_section_title')}</span>
            </div>
            <div className="p-4">
              {/* Maquette notification mobile */}
              <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#1C1209,#2D1E0D)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: NOTIF_TYPES.find(n => n.key === notifType)?.color + '30' }}>
                    <Megaphone size={16} style={{ color: NOTIF_TYPES.find(n => n.key === notifType)?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{t('ad2_customers_broadcast.preview_brand')}</span>
                      <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>{t('ad2_customers_broadcast.preview_now')}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                      {title || <span style={{ opacity: 0.3 }}>{t('ad2_customers_broadcast.preview_title_placeholder')}</span>}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                      {message || <span style={{ opacity: 0.3 }}>{t('ad2_customers_broadcast.preview_message_placeholder')}</span>}
                    </p>
                  </div>
                </div>
                {actionUrl && (
                  <div className="mt-2 px-3 py-1.5 rounded-lg text-center"
                    style={{ background: 'rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {t('ad2_customers_broadcast.preview_action_label')}
                  </div>
                )}
              </div>
              <p style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 8 }}>
                {t('ad2_customers_broadcast.preview_footer_note')}
              </p>
            </div>
          </div>

          {/* Historique */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: T.red }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad2_customers_broadcast.history_title')}</span>
              </div>
              <button onClick={loadHistory} style={{ color: T.muted, display: 'flex', alignItems: 'center' }}>
                <RefreshCw size={12} className={loadingHist ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingHist ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={20} style={{ color: T.muted, animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Megaphone size={28} style={{ color: T.muted }} />
                <p style={{ fontSize: 13, color: T.muted }}>{t('ad2_customers_broadcast.history_empty')}</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: T.border, scrollbarWidth: 'thin' }}>
                {history.map((h, i) => (
                  <div key={i} className="px-4 py-3"
                    onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text }} className="truncate">{h.title}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', flexShrink: 0 }}>{h.sent_to}</span>
                    </div>
                    <p style={{ fontSize: 11.5, color: T.muted }} className="truncate">{h.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span style={{ fontSize: 10.5, color: T.muted }}>{fmtDate(h.sent_at)}</span>
                      <span style={{ fontSize: 10.5, color: T.muted }}>{t('ad2_customers_broadcast.history_sent_by', { username: h.sent_by })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}