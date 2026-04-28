// frontend/src/features/admin/AdminDashboardPage.tsx
// Dashboard admin BelivaY — design premium
// Données : getDashboardStats() + getAnalytics()

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, Package, ShoppingCart, DollarSign,
  TrendingUp, TrendingDown, Store, AlertCircle,
  RefreshCw, ArrowRight, Activity, Percent,
  CheckCircle, Clock, XCircle, Award, Bell,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { adminApi, type AdminDashboardStats, type AdminAnalytics } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmt    = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const fmtXaf = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function greetingByHour(lang: string) {
  const h = new Date().getHours();
  if (lang === 'en') {
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER PREMIUM
// ─────────────────────────────────────────────────────────────────────────────

function DashboardHeader({
  stats, analytics, onRefresh, refreshing,
}: {
  stats: AdminDashboardStats | null;
  analytics: AdminAnalytics | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { user }      = useAuth();
  const { i18n }      = useTranslation();
  const lang          = i18n.language;
  const greeting      = greetingByHour(lang);
  const displayName   = user?.first_name || user?.username || 'Admin';

  // Alertes critiques
  const alerts: { label: string; count: number; href: string }[] = [];
  if (stats) {
    if (stats.pending_vendors > 0)
      alerts.push({ label: lang === 'en' ? 'vendors pending' : 'vendeurs en attente', count: stats.pending_vendors, href: '/admin/vendors/kyc' });
    if (stats.failed_payments > 0)
      alerts.push({ label: lang === 'en' ? 'failed payments' : 'paiements échoués', count: stats.failed_payments, href: '/admin/orders' });
  }

  // Date longue
  const longDate = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Initiales avatar
  const initials = ((user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '') || (user?.username?.[0] ?? 'A')).toUpperCase();

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6 relative"
      style={{
        background: 'linear-gradient(135deg, #111827 0%, #1a1f35 40%, #16213e 70%, #1a1225 100%)',
        border: '1px solid rgba(220,38,38,0.15)',
        boxShadow: '0 4px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Fond décoratif */}
      <div style={{
        position: 'absolute', top: -60, right: -60,
        width: 240, height: 240, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -40, left: '30%',
        width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative px-4 sm:px-6 pt-5 pb-5">

        {/* Ligne haute : avatar + greeting + [badge croissance mobile] + refresh */}
        <div className="flex items-start justify-between gap-3 mb-5">

          {/* Bloc gauche : avatar + texte */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-white text-[14px] sm:text-[15px] flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg,#DC2626,#991B1B)',
                boxShadow: '0 4px 16px rgba(220,38,38,0.5)',
              }}
            >
              {initials}
            </div>

            {/* Texte + badge croissance inline */}
            <div className="min-w-0">
              <p style={{ fontSize: 12, color: 'rgba(249,250,251,0.45)', fontWeight: 600, marginBottom: 1 }}>
                {greeting},
              </p>
              <h1 style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: 22, fontWeight: 800,
                color: '#F9FAFB', lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }} className="sm:text-2xl truncate">
                {displayName}
              </h1>
              {/* Date + badge croissance sur la même ligne */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <p style={{ fontSize: 11, color: 'rgba(249,250,251,0.32)', textTransform: 'capitalize', flexShrink: 0 }}>
                  {longDate}
                </p>
                {analytics && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      background: analytics.total_revenue_growth >= 0 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
                      border: `1px solid ${analytics.total_revenue_growth >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                    }}
                  >
                    {analytics.total_revenue_growth >= 0
                      ? <TrendingUp size={10} style={{ color: '#34D399', flexShrink: 0 }} />
                      : <TrendingDown size={10} style={{ color: '#F87171', flexShrink: 0 }} />
                    }
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: analytics.total_revenue_growth >= 0 ? '#34D399' : '#F87171',
                    }}>
                      {analytics.total_revenue_growth >= 0 ? '+' : ''}{analytics.total_revenue_growth.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(249,250,251,0.35)', fontWeight: 500 }}>
                      {lang === 'en' ? 'vs last mo.' : 'vs mois préc.'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bouton refresh — toujours à droite, jamais superposé */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-[12px] font-semibold transition-all flex-shrink-0 self-start mt-0.5"
            style={{
              background: 'rgba(220,38,38,0.15)',
              color: '#FCA5A5',
              border: '1px solid rgba(220,38,38,0.3)',
              opacity: refreshing ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.15)')}
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{lang === 'en' ? 'Refresh' : 'Actualiser'}</span>
          </button>
        </div>

        {/* Séparateur */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            {
              label: lang === 'en' ? 'Revenue today' : "Revenus aujourd'hui",
              value: fmtXaf(stats?.revenue_today ?? 0),
              icon: DollarSign,
              color: '#10B981',
            },
            {
              label: lang === 'en' ? 'Total orders' : 'Commandes totales',
              value: fmt(stats?.total_orders ?? 0),
              icon: ShoppingCart,
              color: '#3B82F6',
            },
            {
              label: lang === 'en' ? 'Active vendors' : 'Vendeurs actifs',
              value: fmt(stats?.approved_vendors ?? 0),
              icon: Store,
              color: '#8B5CF6',
            },
            {
              label: lang === 'en' ? 'Users' : 'Utilisateurs',
              value: fmt(stats?.total_users ?? 0),
              icon: Users,
              color: '#F59E0B',
            },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: s.color + '22' }}
                >
                  <Icon size={13} style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <p style={{ fontSize: 10, color: 'rgba(249,250,251,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1.2 }}>
                    {s.label}
                  </p>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: '#F9FAFB', lineHeight: 1.2 }} className="truncate">
                    {s.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alertes urgentes */}
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <Link
                key={i}
                to={a.href}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(220,38,38,0.15)',
                  border: '1px solid rgba(220,38,38,0.35)',
                  color: '#FCA5A5',
                  fontSize: 12, fontWeight: 600,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.15)')}
              >
                <Bell size={11} style={{ flexShrink: 0 }} />
                <span>{a.count} {a.label}</span>
                <ArrowUpRight size={11} style={{ flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        )}

        {/* Aucune alerte */}
        {stats && alerts.length === 0 && (
          <div className="flex items-center gap-2">
            <CheckCircle size={13} style={{ color: '#10B981' }} />
            <span style={{ fontSize: 12, color: 'rgba(249,250,251,0.4)', fontWeight: 500 }}>
              {lang === 'en' ? 'Everything is in order — no urgent alerts' : 'Tout est en ordre — aucune alerte urgente'}
            </span>
          </div>
        )}


      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, accent, href, trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  href?: string;
  trend?: { value: number };
}) {
  const T = useAdminTheme();

  const inner = (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 h-full"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
      onMouseEnter={e => { if (href) (e.currentTarget as HTMLElement).style.borderColor = accent + '55'; }}
      onMouseLeave={e => { if (href) (e.currentTarget as HTMLElement).style.borderColor = T.border; }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + '18' }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>
      <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-auto">
        {trend !== undefined && (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: trend.value >= 0 ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: 3 }}>
            {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 11.5, color: T.muted }}>{sub}</span>}
        {href && <ArrowRight size={13} style={{ color: T.muted, marginLeft: 'auto' }} />}
      </div>
    </div>
  );

  if (href) return <Link to={href} className="block h-full">{inner}</Link>;
  return inner;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP RECHARTS
// ─────────────────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) {
  const T = useAdminTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.card, border: `1px solid rgba(220,38,38,0.3)`,
      borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    }}>
      <p style={{ fontSize: 11, color: 'rgba(220,38,38,0.9)', fontWeight: 700, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>{fmtXaf(payload[0].value)}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIGNE ACTIVITÉ
// ─────────────────────────────────────────────────────────────────────────────

function ActivityRow({ item, T }: { item: AdminAnalytics['recent_activity'][0]; T: ReturnType<typeof useAdminTheme> }) {
  const icons: Record<string, { icon: React.ElementType; color: string }> = {
    order:   { icon: ShoppingCart, color: '#3B82F6' },
    vendor:  { icon: Store,        color: '#8B5CF6' },
    user:    { icon: Users,        color: '#10B981' },
    payment: { icon: DollarSign,   color: '#F59E0B' },
    dispute: { icon: AlertCircle,  color: '#EF4444' },
    product: { icon: Package,      color: '#06B6D4' },
  };
  const cfg  = icons[item.type] ?? { icon: Activity, color: '#6B7280' };
  const Icon = cfg.icon;

  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.color + '18' }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }} className="truncate">{item.description}</p>
        {item.user && <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{item.user}</p>}
      </div>
      <div className="flex-shrink-0 text-right">
        {item.amount != null && (
          <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', marginBottom: 2 }}>{fmtXaf(item.amount)}</p>
        )}
        <p style={{ fontSize: 11, color: T.muted }}>{fmtDateTime(item.timestamp)}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { showToast }  = useToast();
  const T              = useAdminTheme();
  const { i18n }       = useTranslation();
  const lang           = i18n.language;

  const [stats,      setStats]     = useState<AdminDashboardStats | null>(null);
  const [analytics,  setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing]= useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [s, a] = await Promise.all([adminApi.getDashboardStats(), adminApi.getAnalytics()]);
      setStats(s);
      setAnalytics(a);
    } catch {
      showToast('Erreur chargement dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid rgba(220,38,38,0.2)',
          borderTopColor: '#DC2626',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!stats || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-2xl p-10 text-center max-w-sm w-full" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <AlertCircle size={40} style={{ color: '#DC2626', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>
            {lang === 'en' ? 'Loading error' : 'Erreur de chargement'}
          </p>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
            {lang === 'en' ? 'Unable to load statistics.' : 'Impossible de charger les statistiques.'}
          </p>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold mx-auto"
            style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}
          >
            <RefreshCw size={14} /> {lang === 'en' ? 'Retry' : 'Réessayer'}
          </button>
        </div>
      </div>
    );
  }

  // ── Données charts ────────────────────────────────────────────────────────
  const chartData = analytics.revenue_chart.map(p => ({
    date: fmtDate(p.date),
    revenue: p.revenue,
    orders: (p as { date: string; revenue: number; orders?: number }).orders ?? 0,
  }));

  const pieData = [
    { name: lang === 'en' ? 'Pending'    : 'En attente',  value: stats.pending_orders,    color: '#F59E0B' },
    { name: lang === 'en' ? 'Processing' : 'En cours',    value: stats.processing_orders, color: '#3B82F6' },
    { name: lang === 'en' ? 'Shipped'    : 'Expédié',     value: stats.shipped_orders,    color: '#8B5CF6' },
    { name: lang === 'en' ? 'Delivered'  : 'Livré',       value: stats.delivered_orders,  color: '#10B981' },
    { name: lang === 'en' ? 'Cancelled'  : 'Annulé',      value: stats.cancelled_orders,  color: '#EF4444' },
  ].filter(d => d.value > 0);

  const cardBg   = T.card;
  const cardBord = T.border;

  return (
    <div className="space-y-5">

      {/* ── HEADER PREMIUM ──────────────────────────────────────────────── */}
      <DashboardHeader
        stats={stats}
        analytics={analytics}
        onRefresh={() => load(true)}
        refreshing={refreshing}
      />

      {/* ── KPIs Revenus ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={lang === 'en' ? 'Total revenue' : 'Revenu total'}
          value={fmtXaf(stats.revenue_total)}
          trend={{ value: analytics.total_revenue_growth }}
          icon={DollarSign}
          accent="#DC2626"
        />
        <KpiCard
          label={lang === 'en' ? "Today's revenue" : "Revenus aujourd'hui"}
          value={fmtXaf(stats.revenue_today)}
          sub={lang === 'en' ? 'paid orders' : 'commandes payées'}
          icon={TrendingUp}
          accent="#10B981"
        />
        <KpiCard
          label={lang === 'en' ? 'This week' : 'Cette semaine'}
          value={fmtXaf(stats.revenue_week)}
          sub={lang === 'en' ? 'last 7 days' : '7 derniers jours'}
          icon={Activity}
          accent="#3B82F6"
        />
        <KpiCard
          label={lang === 'en' ? 'This month' : 'Ce mois'}
          value={fmtXaf(stats.revenue_month)}
          sub={lang === 'en' ? 'last 30 days' : '30 derniers jours'}
          icon={Award}
          accent="#8B5CF6"
        />
      </div>

      {/* ── KPIs Entités ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={lang === 'en' ? 'Users' : 'Utilisateurs'}
          value={fmt(stats.total_users)}
          sub={`+${stats.new_users_today} ${lang === 'en' ? 'today' : "aujourd'hui"}`}
          icon={Users}
          accent="#06B6D4"
          href="/admin/customers"
        />
        <KpiCard
          label={lang === 'en' ? 'Vendors' : 'Vendeurs'}
          value={fmt(stats.total_vendors)}
          sub={`${stats.pending_vendors} ${lang === 'en' ? 'pending' : 'en attente'}`}
          icon={Store}
          accent="#F59E0B"
          href="/admin/vendors"
        />
        <KpiCard
          label={lang === 'en' ? 'Products' : 'Produits'}
          value={fmt(stats.total_products)}
          sub={`${stats.active_products} ${lang === 'en' ? 'active' : 'actifs'}`}
          icon={Package}
          accent="#8B5CF6"
          href="/admin/catalogue"
        />
        <KpiCard
          label={lang === 'en' ? 'Orders' : 'Commandes'}
          value={fmt(stats.total_orders)}
          sub={`${stats.pending_orders} ${lang === 'en' ? 'pending' : 'en attente'}`}
          icon={ShoppingCart}
          accent="#DC2626"
          href="/admin/orders"
        />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* AreaChart revenus */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: T.text }}>
                {lang === 'en' ? 'Revenue — last 30 days' : 'Revenus — 30 derniers jours'}
              </p>
              <p style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                {lang === 'en' ? 'Paid orders only' : 'Commandes payées uniquement'}
              </p>
            </div>
            <div className="text-right">
              <p style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>
                {lang === 'en' ? 'Average basket' : 'Panier moyen'}
              </p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: '#DC2626' }}>
                {fmtXaf(analytics.average_order_value)}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : `${Math.round(v / 1000)}k`} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#DC2626" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#DC2626' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie statuts commandes */}
        <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            {lang === 'en' ? 'Order statuses' : 'Statuts commandes'}
          </p>
          <p style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
            {fmt(stats.total_orders)} {lang === 'en' ? 'total' : 'au total'}
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={66} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                formatter={(v: number | undefined) => [fmt(v ?? 0), ''] as [string, string]}
                contentStyle={{ background: cardBg, border: `1px solid ${cardBord}`, borderRadius: 10, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: T.muted }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tables + Activité ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top Produits */}
        <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text }}>
              {lang === 'en' ? 'Top Products' : 'Top Produits'}
            </p>
            <Link to="/admin/catalogue" style={{ fontSize: 11.5, color: '#DC2626', fontWeight: 700 }}>
              {lang === 'en' ? 'See all' : 'Voir tout'}
            </Link>
          </div>
          <div className="space-y-3">
            {analytics.top_products.length === 0 && (
              <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '12px 0' }}>
                {lang === 'en' ? 'No data' : 'Aucune donnée'}
              </p>
            )}
            {analytics.top_products.map((p, i) => (
              <div key={p.product_id} className="flex items-center gap-3">
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: i === 0 ? 'rgba(220,38,38,0.15)' : T.border,
                  color: i === 0 ? '#DC2626' : T.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.text }} className="truncate">{p.product_title}</p>
                  <p style={{ fontSize: 11, color: T.muted }}>{fmt(p.total_quantity)} {lang === 'en' ? 'units' : 'unités'}</p>
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', flexShrink: 0 }}>{fmtXaf(p.total_revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vendeurs */}
        <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text }}>
              {lang === 'en' ? 'Top Vendors' : 'Top Vendeurs'}
            </p>
            <Link to="/admin/vendors" style={{ fontSize: 11.5, color: '#DC2626', fontWeight: 700 }}>
              {lang === 'en' ? 'See all' : 'Voir tout'}
            </Link>
          </div>
          <div className="space-y-3">
            {analytics.top_vendors.length === 0 && (
              <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '12px 0' }}>
                {lang === 'en' ? 'No data' : 'Aucune donnée'}
              </p>
            )}
            {analytics.top_vendors.map((v, i) => (
              <div key={v.vendor_id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-[11px] flex-shrink-0"
                  style={{ background: i === 0 ? 'linear-gradient(135deg,#DC2626,#991B1B)' : T.border }}
                >
                  {(v.business_name || v.vendor_name)?.[0]?.toUpperCase() ?? 'V'}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.text }} className="truncate">
                    {v.business_name || v.vendor_name}
                  </p>
                  <p style={{ fontSize: 11, color: T.muted }}>
                    {fmt(v.total_orders)} {lang === 'en' ? 'orders' : 'commandes'}
                  </p>
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', flexShrink: 0 }}>{fmtXaf(v.total_revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            {lang === 'en' ? 'Recent Activity' : 'Activité récente'}
          </p>
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            {analytics.recent_activity.length === 0 && (
              <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '20px 0' }}>
                {lang === 'en' ? 'No activity' : 'Aucune activité'}
              </p>
            )}
            {analytics.recent_activity.map((item, i) => (
              <ActivityRow key={i} item={item} T={T} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Métriques secondaires ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {lang === 'en' ? 'Conversion' : 'Conversion'}
            </p>
            <Percent size={14} style={{ color: '#F59E0B' }} />
          </div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: T.text }}>
            {analytics.conversion_rate.toFixed(1)}%
          </p>
          <p style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>
            {lang === 'en' ? 'paid / total orders' : 'commandes payées / total'}
          </p>
        </div>

        <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${cardBord}` }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {lang === 'en' ? 'Paid' : 'Payées'}
            </p>
            <CheckCircle size={14} style={{ color: '#10B981' }} />
          </div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: T.text }}>
            {fmt(stats.paid_orders)}
          </p>
          <p style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>
            {fmt(stats.unpaid_orders)} {lang === 'en' ? 'unpaid' : 'impayées'}
          </p>
        </div>

        <Link to="/admin/vendors?status=PENDING" className="block">
          <div className="rounded-2xl p-5 h-full" style={{
            background: stats.pending_vendors > 0 ? 'rgba(220,38,38,0.07)' : cardBg,
            border: `1px solid ${stats.pending_vendors > 0 ? 'rgba(220,38,38,0.35)' : cardBord}`,
          }}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {lang === 'en' ? 'KYC pending' : 'KYC en attente'}
              </p>
              <Clock size={14} style={{ color: stats.pending_vendors > 0 ? '#DC2626' : T.muted }} />
            </div>
            <p style={{
              fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800,
              color: stats.pending_vendors > 0 ? '#DC2626' : T.text,
            }}>
              {fmt(stats.pending_vendors)}
            </p>
            <p style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>
              {stats.approved_vendors} {lang === 'en' ? 'approved' : 'approuvés'}
            </p>
          </div>
        </Link>

        <div className="rounded-2xl p-5" style={{
          background: stats.failed_payments > 0 ? 'rgba(239,68,68,0.06)' : cardBg,
          border: `1px solid ${stats.failed_payments > 0 ? 'rgba(239,68,68,0.25)' : cardBord}`,
        }}>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {lang === 'en' ? 'Payment errors' : 'Échecs paiement'}
            </p>
            <XCircle size={14} style={{ color: stats.failed_payments > 0 ? '#EF4444' : T.muted }} />
          </div>
          <p style={{
            fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800,
            color: stats.failed_payments > 0 ? '#EF4444' : T.text,
          }}>
            {fmt(stats.failed_payments)}
          </p>
          <p style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>
            {lang === 'en' ? 'failed transactions' : 'transactions échouées'}
          </p>
        </div>

      </div>
    </div>
  );
}