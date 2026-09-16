// frontend/src/features/admin/customers/CustomerDetailPage.tsx
// Fiche complète d'un client BelivaY — admin
// Données : GET /api/vendors/admin/users/:id/

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, RefreshCw, Shield, Store,
  ShoppingCart, DollarSign, Mail, Phone, MapPin,
  Calendar, Clock, UserX, UserCheck, ToggleLeft,
  ToggleRight, ExternalLink, CheckCircle, XCircle,
  Bell, Package, Award, ChevronRight,
} from 'lucide-react';
import { adminApi, type AdminUserDetail } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf  = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtRelative = (d: string | null, t: (key: string, opts?: Record<string, unknown>) => string) => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)     return t('ad2_customer_detail.relative_now');
  if (s < 3600)   return t('ad2_customer_detail.relative_minutes', { count: Math.floor(s / 60) });
  if (s < 86400)  return t('ad2_customer_detail.relative_hours', { count: Math.floor(s / 3600) });
  if (s < 604800) return t('ad2_customer_detail.relative_days', { count: Math.floor(s / 86400) });
  return fmtDate(d);
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES ENRICHIS (les champs ajoutés au serializer)
// ─────────────────────────────────────────────────────────────────────────────

interface RecentOrder {
  id: number;
  total_xaf: number;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
  items_count: number;
}

interface EnrichedUserDetail extends AdminUserDetail {
  loyalty_points: number;
  loyalty_tier:   'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  city:           string | null;
  recent_orders:  RecentOrder[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG VISUELLE
// ─────────────────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  BRONZE:  { labelKey: 'ad2_customer_detail.tier_bronze',  color: '#CD7F32', nextKey: 'ad2_customer_detail.tier_silver',  pts: 500  },
  SILVER:  { labelKey: 'ad2_customer_detail.tier_silver',  color: '#A8A9AD', nextKey: 'ad2_customer_detail.tier_gold',      pts: 1000 },
  GOLD:    { labelKey: 'ad2_customer_detail.tier_gold',    color: '#FFD700', nextKey: 'ad2_customer_detail.tier_diamond', pts: 2000 },
  DIAMOND: { labelKey: 'ad2_customer_detail.tier_diamond', color: '#60A5FA', nextKey: null as string | null,      pts: 9999 },
};

const PAYMENT_STATUS: Record<string, { labelKey: string; color: string; bg: string }> = {
  PAID:    { labelKey: 'ad2_customer_detail.payment_paid',    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  PENDING: { labelKey: 'ad2_customer_detail.payment_pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  FAILED:  { labelKey: 'ad2_customer_detail.payment_failed', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  REFUNDED:{ labelKey: 'ad2_customer_detail.payment_refunded', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};

const FULFILLMENT_STATUS: Record<string, { labelKey: string; color: string }> = {
  PENDING:    { labelKey: 'ad2_customer_detail.fulfillment_pending',   color: '#F59E0B' },
  PROCESSING: { labelKey: 'ad2_customer_detail.fulfillment_processing', color: '#3B82F6' },
  SHIPPED:    { labelKey: 'ad2_customer_detail.fulfillment_shipped',     color: '#8B5CF6' },
  DELIVERED:  { labelKey: 'ad2_customer_detail.fulfillment_delivered',       color: '#10B981' },
  CANCELLED:  { labelKey: 'ad2_customer_detail.fulfillment_cancelled',      color: '#EF4444' },
};

const VENDOR_STATUS: Record<string, { labelKey: string; color: string; bg: string }> = {
  PENDING:   { labelKey: 'ad2_customer_detail.vendor_status_pending',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  APPROVED:  { labelKey: 'ad2_customer_detail.vendor_status_approved',   color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:  { labelKey: 'ad2_customer_detail.vendor_status_rejected',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  SUSPENDED: { labelKey: 'ad2_customer_detail.vendor_status_suspended',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Section card générique */
function Section({ title, icon: Icon, children, T, action }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  T: ReturnType<typeof useAdminTheme>;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: T.red }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</span>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Ligne info label + valeur */
function InfoRow({ label, value, T }: { label: string; value: React.ReactNode; T: ReturnType<typeof useAdminTheme> }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12.5, color: T.muted, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.text, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { id }        = useParams<{ id: string }>();
  const T             = useAdminTheme();
  const { t }          = useTranslation();
  const navigate      = useNavigate();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  const [user,    setUser]    = useState<EnrichedUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminApi.getUserDetail(Number(id));
      setUser(data as EnrichedUserDetail);
    } catch {
      showToast(t('ad2_customer_detail.toast_not_found'), 'error');
      navigate('/admin/customers');
    } finally {
      setLoading(false);
    }
  }, [id, showToast, navigate, t]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const doAction = async (action: 'ban' | 'unban' | 'activate' | 'deactivate') => {
    if (!user) return;
    const name = user.first_name || user.username;
    const cfgs = {
      ban:        { title: t('ad2_customer_detail.confirm_ban_title', { name }),       message: t('ad2_customer_detail.confirm_ban_message'),   type: 'danger'  as const, confirmText: t('ad2_customer_detail.confirm_ban_confirm')      },
      unban:      { title: t('ad2_customer_detail.confirm_unban_title', { name }),     message: t('ad2_customer_detail.confirm_unban_message'), type: 'warning' as const, confirmText: t('ad2_customer_detail.confirm_unban_confirm')    },
      deactivate: { title: t('ad2_customer_detail.confirm_deactivate_title', { name }),   message: t('ad2_customer_detail.confirm_deactivate_message'),      type: 'warning' as const, confirmText: t('ad2_customer_detail.confirm_deactivate_confirm')  },
      activate:   { title: t('ad2_customer_detail.confirm_activate_title', { name }),    message: t('ad2_customer_detail.confirm_activate_message'),         type: 'warning' as const, confirmText: t('ad2_customer_detail.confirm_activate_confirm')   },
    };
    const ok = await confirm({ ...cfgs[action], cancelText: t('ad2_customer_detail.confirm_cancel') });
    if (!ok) return;
    setActing(true);
    try {
      if (action === 'ban')        await adminApi.banUser(user.id, 'Décision admin');
      else if (action === 'unban') await adminApi.unbanUser(user.id);
      else                         await adminApi.updateUser(user.id, { is_active: action === 'activate' });
      showToast(t('ad2_customer_detail.toast_action_done'), 'success');
      await load();
    } catch { showToast(t('ad2_customer_detail.toast_error'), 'error'); }
    finally  { setActing(false); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const isBanned    = user.profile?.is_banned ?? false;
  const fullName    = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
  const initials    = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '') || user.username[0]).toUpperCase();
  const tier        = TIER_CONFIG[user.loyalty_tier ?? 'BRONZE'];
  const tierColor   = tier.color;
  const ptsMax      = user.loyalty_tier === 'DIAMOND' ? user.loyalty_points : tier.pts;
  const ptsProgress = Math.min(100, Math.round((user.loyalty_points / ptsMax) * 100));

  const avatarBg =
    user.is_superuser ? 'linear-gradient(135deg,#DC2626,#991B1B)' :
    user.is_staff     ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' :
    user.is_vendor    ? 'linear-gradient(135deg,#F47920,#C2590A)' :
                        'linear-gradient(135deg,#374151,#1F2937)';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Breadcrumb + Actions rapides ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/customers"
            className="flex items-center gap-1.5 text-[12.5px] font-medium transition-all"
            style={{ color: T.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          >
            <ArrowLeft size={14} /> {t('ad2_customer_detail.breadcrumb_customers')}
          </Link>
          <ChevronRight size={12} style={{ color: T.muted }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{fullName}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {!user.is_superuser && (
            <>
              {isBanned ? (
                <button
                  onClick={() => doAction('unban')}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  <UserCheck size={13} /> {t('ad2_customer_detail.action_unban')}
                </button>
              ) : (
                <button
                  onClick={() => doAction('ban')}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <UserX size={13} /> {t('ad2_customer_detail.action_ban')}
                </button>
              )}

              {user.is_active ? (
                <button
                  onClick={() => doAction('deactivate')}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
                  style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                >
                  <ToggleLeft size={13} /> {t('ad2_customer_detail.action_deactivate')}
                </button>
              ) : (
                <button
                  onClick={() => doAction('activate')}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
                  style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <ToggleRight size={13} /> {t('ad2_customer_detail.action_activate')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Header profil ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{
          background: 'linear-gradient(135deg,#111827 0%,#1a1f35 50%,#16213e 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Décoration fond */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(220,38,38,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div className="flex items-start gap-5 flex-wrap relative">
          {/* Avatar */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-white text-2xl flex-shrink-0"
            style={{ background: avatarBg, boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}
          >
            {initials}
          </div>

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap mb-2">
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: '#F9FAFB', lineHeight: 1.1 }}>
                {fullName}
              </h1>
              {/* Badges rôles */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {user.is_superuser && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(220,38,38,0.2)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.4)' }}>{t('ad2_customer_detail.badge_super_admin')}</span>}
                {user.is_staff && !user.is_superuser && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.2)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.4)' }}>{t('ad2_customer_detail.badge_staff')}</span>}
                {user.is_vendor && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(244,121,32,0.2)', color: '#FED7AA', border: '1px solid rgba(244,121,32,0.4)' }}>{t('ad2_customer_detail.badge_vendor')}</span>}
                {!user.is_staff && !user.is_superuser && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.2)', color: '#BAE6FD', border: '1px solid rgba(59,130,246,0.4)' }}>{t('ad2_customer_detail.badge_buyer')}</span>}
                {/* Statut */}
                {isBanned
                  ? <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.2)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.4)' }}>{t('ad2_customer_detail.badge_banned')}</span>
                  : !user.is_active
                    ? <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(107,114,128,0.2)', color: '#D1D5DB', border: '1px solid rgba(107,114,128,0.3)' }}>{t('ad2_customer_detail.badge_inactive')}</span>
                    : <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.2)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.4)' }}>{t('ad2_customer_detail.badge_active')}</span>
                }
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: 'rgba(249,250,251,0.55)', marginBottom: 12 }}>
              @{user.username}
            </p>

            {/* Coordonnées */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(249,250,251,0.45)' }}>
                <Mail size={12} /> {user.email}
              </span>
              {user.profile?.phone && (
                <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(249,250,251,0.45)' }}>
                  <Phone size={12} /> {user.profile.phone}
                </span>
              )}
              {user.city && (
                <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(249,250,251,0.45)' }}>
                  <MapPin size={12} /> {user.city}
                </span>
              )}
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(249,250,251,0.45)' }}>
                <Calendar size={12} /> {t('ad2_customer_detail.joined_on', { date: fmtDate(user.date_joined) })}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(249,250,251,0.45)' }}>
                <Clock size={12} /> {fmtRelative(user.last_login, t)}
              </span>
            </div>
          </div>

          {/* Lien commandes */}
          <Link
            to={`/admin/orders?user=${user.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(249,250,251,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLElement).style.color = '#F9FAFB'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(249,250,251,0.6)'; }}
          >
            <ShoppingCart size={13} /> {t('ad2_customer_detail.view_orders')} <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: t('ad2_customer_detail.kpi_total_orders'),
            value: user.stats.total_orders,
            sub: t('ad2_customer_detail.kpi_total_orders_sub', { count: user.stats.paid_orders }),
            icon: ShoppingCart, accent: '#3B82F6',
            display: user.stats.total_orders.toString(),
          },
          {
            label: t('ad2_customer_detail.kpi_total_spent'),
            value: user.stats.total_spent,
            sub: t('ad2_customer_detail.kpi_total_spent_sub', { value: fmtXaf(user.stats.average_order_value) }),
            icon: DollarSign, accent: '#10B981',
            display: fmtXaf(user.stats.total_spent),
          },
          {
            label: t('ad2_customer_detail.kpi_loyalty'),
            value: user.loyalty_points ?? 0,
            sub: tier.nextKey
              ? t('ad2_customer_detail.kpi_loyalty_sub_next', { count: tier.pts - (user.loyalty_points ?? 0), tier: t(tier.nextKey) })
              : t('ad2_customer_detail.kpi_loyalty_sub_max'),
            icon: Award, accent: tierColor,
            display: `${(user.loyalty_points ?? 0).toLocaleString('fr-FR')} pts`,
          },
          {
            label: user.is_vendor ? t('ad2_customer_detail.kpi_vendor_plan') : t('ad2_customer_detail.kpi_products_sold'),
            value: 0,
            sub: user.is_vendor
              ? (user.vendor_profile?.status ?? 'N/A')
              : t('ad2_customer_detail.kpi_not_vendor'),
            icon: user.is_vendor ? Store : Package,
            accent: '#F47920',
            display: user.is_vendor
              ? (user.stats.total_products !== undefined ? t('ad2_customer_detail.kpi_products_count', { count: user.stats.total_products }) : '—')
              : '—',
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {kpi.label}
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: kpi.accent + '18' }}>
                  <Icon size={14} style={{ color: kpi.accent }} />
                </div>
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1, marginBottom: 4 }}>
                {kpi.display}
              </p>
              <p style={{ fontSize: 11, color: T.muted }}>{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Barre progression fidélité ────────────────────────────────── */}
      <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={14} style={{ color: tierColor }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              {t('ad2_customer_detail.tier_level_label')} <span style={{ color: tierColor }}>{t(tier.labelKey)}</span>
            </span>
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>
            {(user.loyalty_points ?? 0).toLocaleString('fr-FR')} pts
            {tier.nextKey && t('ad2_customer_detail.tier_pts_of', { max: tier.pts.toLocaleString('fr-FR') })}
          </span>
        </div>
        <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, width: `${ptsProgress}%`,
            background: `linear-gradient(90deg, ${tierColor}88, ${tierColor})`,
            transition: 'width 0.6s ease',
          }} />
        </div>
        {tier.nextKey && (
          <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
            {t('ad2_customer_detail.tier_pts_to_next', { count: Math.max(0, tier.pts - (user.loyalty_points ?? 0)), tier: t(tier.nextKey) })}
          </p>
        )}
      </div>

      {/* ── Layout 2 colonnes ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* COLONNE GAUCHE */}
        <div className="space-y-5">

          {/* Informations compte */}
          <Section title={t('ad2_customer_detail.section_account_info')} icon={Shield} T={T}>
            <div style={{ marginBottom: -10 }}>
              <InfoRow label={t('ad2_customer_detail.info_username')} value={`@${user.username}`} T={T} />
              <InfoRow label={t('ad2_customer_detail.info_email')} value={user.email} T={T} />
              <InfoRow label={t('ad2_customer_detail.info_phone')} value={user.profile?.phone ?? t('ad2_customer_detail.empty_value')} T={T} />
              <InfoRow label={t('ad2_customer_detail.info_city')} value={user.city ?? t('ad2_customer_detail.empty_value')} T={T} />
              <InfoRow label={t('ad2_customer_detail.info_joined_date')} value={fmtDate(user.date_joined)} T={T} />
              <InfoRow label={t('ad2_customer_detail.info_last_login')} value={fmtDateTime(user.last_login)} T={T} />
              <InfoRow
                label={t('ad2_customer_detail.info_newsletter')}
                value={
                  user.profile?.newsletter_subscribed
                    ? <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={13} /> {t('ad2_customer_detail.newsletter_active')}</span>
                    : <span style={{ color: T.muted,   display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={13} /> {t('ad2_customer_detail.newsletter_inactive')}</span>
                }
                T={T}
              />
              <InfoRow
                label={t('ad2_customer_detail.info_account_status')}
                value={
                  isBanned ? <span style={{ color: '#EF4444' }}>{t('ad2_customer_detail.status_banned')}</span> :
                  !user.is_active ? <span style={{ color: '#9CA3AF' }}>{t('ad2_customer_detail.status_inactive')}</span> :
                  <span style={{ color: '#10B981' }}>{t('ad2_customer_detail.status_active')}</span>
                }
                T={T}
              />
            </div>
          </Section>

          {/* Info bannissement (si banni) */}
          {isBanned && user.profile && (
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} style={{ color: '#EF4444' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{t('ad2_customer_detail.banned_account')}</span>
              </div>
              <div className="space-y-2">
                <p style={{ fontSize: 12.5, color: T.text }}>
                  <span style={{ color: T.muted }}>{t('ad2_customer_detail.banned_reason_label')}</span>
                  {user.profile.ban_reason ?? t('ad2_customer_detail.banned_reason_none')}
                </p>
                {user.profile.banned_at && (
                  <p style={{ fontSize: 12, color: T.muted }}>
                    {t('ad2_customer_detail.banned_on', { date: fmtDateTime(user.profile.banned_at) })}
                    {user.profile.banned_by && t('ad2_customer_detail.banned_by', { name: user.profile.banned_by })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {user.profile?.bio && (
            <Section title={t('ad2_customer_detail.section_bio')} icon={Mail} T={T}>
              <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>{user.profile.bio}</p>
            </Section>
          )}
        </div>

        {/* COLONNE DROITE */}
        <div className="space-y-5">

          {/* Section vendeur (si applicable) */}
          {user.is_vendor && user.vendor_profile && (
            <Section
              title={t('ad2_customer_detail.section_vendor_profile')}
              icon={Store}
              T={T}
              action={
                <Link
                  to={`/admin/vendors/${user.vendor_profile.id}`}
                  className="flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: T.red }}
                >
                  {t('ad2_customer_detail.view_vendor_sheet')} <ExternalLink size={10} />
                </Link>
              }
            >
              <div style={{ marginBottom: -10 }}>
                <InfoRow
                  label={t('ad2_customer_detail.vendor_shop')}
                  value={<span style={{ fontWeight: 700 }}>{user.vendor_profile.business_name}</span>}
                  T={T}
                />
                <InfoRow
                  label={t('ad2_customer_detail.vendor_status_label')}
                  value={
                    <span style={{
                      fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                      background: VENDOR_STATUS[user.vendor_profile.status]?.bg ?? T.border,
                      color:      VENDOR_STATUS[user.vendor_profile.status]?.color ?? T.muted,
                    }}>
                      {VENDOR_STATUS[user.vendor_profile.status] ? t(VENDOR_STATUS[user.vendor_profile.status].labelKey) : user.vendor_profile.status}
                    </span>
                  }
                  T={T}
                />
                <InfoRow label={t('ad2_customer_detail.vendor_joined_on')} value={fmtDate(user.vendor_profile.created_at)} T={T} />
                {user.vendor_profile.approved_at && (
                  <InfoRow label={t('ad2_customer_detail.vendor_approved_on')} value={fmtDate(user.vendor_profile.approved_at)} T={T} />
                )}
                {user.stats.total_products !== undefined && (
                  <InfoRow label={t('ad2_customer_detail.vendor_products')} value={t('ad2_customer_detail.vendor_products_detail', { active: user.stats.active_products ?? 0, total: user.stats.total_products })} T={T} />
                )}
              </div>
            </Section>
          )}

          {/* Commandes récentes */}
          <Section
            title={t('ad2_customer_detail.section_recent_orders')}
            icon={ShoppingCart}
            T={T}
            action={
              <Link to={`/admin/orders?user=${user.id}`} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: T.red }}>
                {t('ad2_customer_detail.view_all')} <ExternalLink size={10} />
              </Link>
            }
          >
            {(!user.recent_orders || user.recent_orders.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <ShoppingCart size={24} style={{ color: T.muted }} />
                <p style={{ fontSize: 13, color: T.muted }}>{t('ad2_customer_detail.no_orders')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {user.recent_orders.map((order, i) => {
                  const ps = PAYMENT_STATUS[order.payment_status];
                  const fs = FULFILLMENT_STATUS[order.fulfillment_status];
                  return (
                    <Link
                      key={order.id}
                      to={`/admin/orders/${order.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all"
                      style={{
                        background: T.cardAlt,
                        border: `1px solid ${T.border}`,
                        borderBottom: i < user.recent_orders.length - 1 ? undefined : 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = T.red + '40')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
                    >
                      {/* ID + items */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>
                            #{order.id}
                          </p>
                          <span style={{ fontSize: 10.5, color: T.muted }}>
                            {t(order.items_count > 1 ? 'ad2_customer_detail.order_items_plural' : 'ad2_customer_detail.order_items', { count: order.items_count })}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: T.muted }}>{fmtDate(order.created_at)}</p>
                      </div>
                      {/* Montant */}
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#10B981', flexShrink: 0 }}>
                        {fmtXaf(order.total_xaf)}
                      </p>
                      {/* Statuts */}
                      <div className="flex flex-col gap-1 items-end flex-shrink-0">
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: ps?.bg, color: ps?.color }}>
                          {ps ? t(ps.labelKey) : order.payment_status}
                        </span>
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: fs?.color + '18', color: fs?.color }}>
                          {fs ? t(fs.labelKey) : order.fulfillment_status}
                        </span>
                      </div>
                      <ExternalLink size={12} style={{ color: T.muted, flexShrink: 0 }} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}