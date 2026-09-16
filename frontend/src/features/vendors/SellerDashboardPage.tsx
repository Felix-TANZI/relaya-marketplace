// frontend/src/features/vendors/SellerDashboardPage.tsx
// Dashboard vendeur BelivaY
// Fond crème, cartes blanches arrondies, orange dominant, typographie forte.

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import AppDownloadBanner from '@/components/AppDownloadBanner';
import {
  Package, ShoppingBag, TrendingUp, Plus, Edit2,
  Trash2, Eye, Clock, XCircle, AlertCircle, RefreshCw,
  ArrowUpRight, ArrowDownRight, Star, BarChart2,
  Target, ChevronRight, Truck, Pencil, X, Zap, Award,
  CheckCircle, CreditCard, Store, Share2, BadgeCheck, Lock,
  TriangleAlert, Sparkles, Flame,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorProfile,
  type VendorProduct,
  type VendorOrder,
} from '@/services/api/vendors';
import {
  vendorChartApi,
  type FullStatsResponse,
  type ChartBar,
  type ChartPeriod,
  type HeatmapHour,
  type HeatmapDay,
  type TopProduct,
  type LowStockItem,
} from '@/services/api/vendorChart';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';


// TOKENS — même palette que l'espace client


const C = {
  orange:   '#F47920',
  orangeD:  '#E06510',
  orangeL:  '#FFF3E8',
  orangeB:  'rgba(244,121,32,0.12)',
  cream:    '#F5F0E8',
  creamAlt: '#EDE7DC',
  white:    '#FFFFFF',
  border:   '#E8E2D9',
  text:     '#1A1209',
  muted:    '#7C6E5A',
  mutedL:   '#B8A898',
  green:    '#16A34A',
  greenL:   'rgba(22,163,74,0.1)',
  red:      '#DC2626',
  redL:     'rgba(220,38,38,0.1)',
  amber:    '#D97706',
  amberL:   'rgba(217,119,6,0.1)',
  blue:     '#2563EB',
  blueL:    'rgba(37,99,235,0.1)',
  violet:   '#7C3AED',
  violetL:  'rgba(124,58,237,0.1)',
  sidebar:  '#1C1209',
};

const PLANS = [
  { id: 'gratuit',  nameKey: 'sl1_dashboard.plan_free',     price: 0,    commission: 20, color: '#7C6E5A' },
  { id: 'starter',  nameKey: 'sl1_dashboard.plan_starter',  price: 4900, commission: 18, color: '#2563EB' },
  { id: 'pro',      nameKey: 'sl1_dashboard.plan_pro',      price: 9900, commission: 10, color: '#7C3AED' },
  { id: 'business', nameKey: 'sl1_dashboard.plan_business', price: 24900,commission: 7,  color: '#D97706' },
] as const;

const FULFILL: Record<string, { labelKey: string; color: string; bg: string }> = {
  PENDING:    { labelKey: 'sl1_dashboard.fulfill_pending',    color: C.amber,  bg: C.amberL },
  PROCESSING: { labelKey: 'sl1_dashboard.fulfill_processing', color: C.blue,   bg: C.blueL  },
  SHIPPED:    { labelKey: 'sl1_dashboard.fulfill_shipped',    color: C.violet, bg: C.violetL},
  DELIVERED:  { labelKey: 'sl1_dashboard.fulfill_delivered',  color: C.green,  bg: C.greenL },
  CANCELLED:  { labelKey: 'sl1_dashboard.fulfill_cancelled',  color: C.red,    bg: C.redL   },
};

const GOAL_KEY = 'belivay_seller_goal';


// HELPERS


function fmtXAF(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' M';
  if (n >= 1_000) return Math.round(n / 1_000) + ' K';
  return Math.round(n).toLocaleString('fr-FR');
}
function fmtDate(iso: string, locale: string = 'fr-FR'): string {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}
function orderRef(id: number): string { return `#BLV-${String(id).padStart(5, '0')}`; }
function loadGoal(): number { const s = localStorage.getItem(GOAL_KEY); return s ? parseInt(s, 10) : 500_000; }
function saveGoal(v: number) { localStorage.setItem(GOAL_KEY, String(v)); }

function heatColor(intensity: number): string {
  if (intensity === 0)  return 'rgba(244,121,32,0.06)';
  if (intensity < 0.2)  return 'rgba(244,121,32,0.16)';
  if (intensity < 0.4)  return 'rgba(244,121,32,0.33)';
  if (intensity < 0.65) return 'rgba(244,121,32,0.56)';
  if (intensity < 0.85) return 'rgba(244,121,32,0.78)';
  return C.orange;
}


// PRIMITIVE CARD


function Card({
  children, className = '', style = {},
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        boxShadow: '0 1px 4px rgba(28,18,9,0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Pill badge coloré
function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="text-[10px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap"
      style={{ color, background: bg }}>
      {label}
    </span>
  );
}

// Section header
function SHead({ icon, title, to }: { icon: React.ReactNode; title: string; to?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: C.orangeL, color: C.orange }}>
          {icon}
        </div>
        <span className="font-bold text-[14px]" style={{ color: C.text }}>
          {title}
        </span>
      </div>
      {to && (
        <Link to={to} className="text-[12px] font-bold flex items-center gap-1 hover:underline" style={{ color: C.orange }}>
          {t('sl1_dashboard.see_all')} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}


// SKELETON


function Bone({ w = 'w-full', h = 'h-4', r = 'rounded-xl' }: { w?: string; h?: string; r?: string }) {
  return <div className={`${w} ${h} ${r} animate-pulse`} style={{ background: C.creamAlt }} />;
}
function SkeletonPage() {
  return (
    <div className="space-y-2 sm:space-y-5">
      <Bone h="h-[200px]" r="rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[0,1,2,3].map(i => <Bone key={i} h="h-32" r="rounded-2xl" />)}
      </div>
      <Bone h="h-14" r="rounded-2xl" />
      <Bone h="h-72" r="rounded-2xl" />
    </div>
  );
}


// SVG RING


function Ring({ pct, size = 84, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={C.orange} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.34,1.2,.64,1)' }} />
    </svg>
  );
}


// GRAPHIQUE BAR


function BarItem({
  bar, max, active, onEnter, onLeave,
}: { bar: ChartBar; max: number; active: boolean; onEnter: () => void; onLeave: () => void }) {
  const { t } = useTranslation();
  const pct = max > 0 ? (bar.value / max) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5 relative min-w-0">
      {active && bar.value > 0 && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap text-[9.5px] font-bold text-white rounded-xl px-2.5 py-1.5 pointer-events-none"
          style={{ background: C.orange, boxShadow: `0 4px 12px rgba(244,121,32,0.4)` }}>
          {fmtXAF(bar.value)} · {bar.orders} {t('sl1_dashboard.orders_abbr')}
        </div>
      )}
      <div className="w-full rounded-xl overflow-hidden flex items-end cursor-pointer"
        style={{ height: 110, background: active ? C.orangeB : 'rgba(244,121,32,0.06)' }}
        onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <div className="w-full rounded-xl transition-all duration-700"
          style={{
            height: `${pct}%`,
            minHeight: bar.value > 0 ? 4 : 0,
            background: active
              ? `linear-gradient(180deg,${C.orange},${C.orangeD})`
              : `linear-gradient(180deg,${C.orange},#C2410C)`,
            boxShadow: active ? `0 0 16px rgba(244,121,32,0.35)` : 'none',
          }} />
      </div>
      <span className="text-[9.5px] font-medium" style={{ color: C.mutedL }}>{bar.label}</span>
    </div>
  );
}


// HEATMAP CELL


function HCell({ intensity, tooltip }: { intensity: number; tooltip: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative rounded cursor-default"
      style={{ height: 20, background: heatColor(intensity) }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {show && (
        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap text-[9px] font-bold text-white rounded-lg px-2 py-1 pointer-events-none"
          style={{ background: C.sidebar }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}


// PLAN SIMULATOR


function PlanSim({ totalRevenue }: { totalRevenue: number }) {
  const { t } = useTranslation();
  const [sel, setSel] = useState<string>('gratuit');
  const plan = PLANS.find(p => p.id === sel) ?? PLANS[0];
  const net  = Math.round(totalRevenue * (1 - plan.commission / 100));
  const save = Math.round(totalRevenue * (PLANS[0].commission - plan.commission) / 100);
  return (
    <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.16em] mb-3" style={{ color: C.mutedL }}>
        {t('sl1_dashboard.plan_sim_title')}
      </p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PLANS.map(p => (
          <button key={p.id} onClick={() => setSel(p.id)}
            className="rounded-xl p-2.5 text-center transition-all"
            style={{
              background: sel === p.id ? `${p.color}12` : C.cream,
              border: sel === p.id ? `1.5px solid ${p.color}50` : `1px solid ${C.border}`,
            }}>
            <p className="text-[11.5px] font-extrabold"
              style={{ color: sel === p.id ? p.color : C.muted }}>
              {t(p.nameKey)}
            </p>
            <p className="text-[9.5px] mt-0.5" style={{ color: C.mutedL }}>
              {p.price === 0 ? t('sl1_dashboard.plan_free') : `${(p.price / 1000).toFixed(1)}K/m`}
            </p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: t('sl1_dashboard.sim_revenue_label'), v: `${fmtXAF(net)} XAF`, color: C.orange },
          { l: t('sl1_dashboard.sim_commission_label'), v: `${plan.commission}%`, color: plan.color },
          { l: t('sl1_dashboard.sim_savings_label'), v: save > 0 ? `+${fmtXAF(save)} XAF` : '—', color: C.green },
        ].map(s => (
          <div key={s.l} className="rounded-xl p-3 text-center" style={{ background: C.cream }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: C.mutedL }}>{s.l}</p>
            <p className="text-[13.5px] font-extrabold" style={{ color: s.color }}>
              {s.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}


// COMPOSANT PRINCIPAL


export default function SellerDashboardPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profile,   setProfile]   = useState<VendorProfile | null>(null);
  const [fullStats, setFullStats] = useState<FullStatsResponse | null>(null);
  const [products,  setProducts]  = useState<VendorProduct[]>([]);
  const [orders,    setOrders]    = useState<VendorOrder[]>([]);
  const [chartData, setChartData] = useState<ChartBar[]>([]);
  const [heatH,     setHeatH]     = useState<HeatmapHour[]>([]);
  const [heatD,     setHeatD]     = useState<HeatmapDay[]>([]);

  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefresh]   = useState(false);
  const [period,     setPeriod]    = useState<ChartPeriod>('7d');
  const [chartLoad,  setChartLoad] = useState(false);
  const [hovBar,     setHovBar]    = useState<number | null>(null);
  const [goal,       setGoal]      = useState<number>(loadGoal);
  const [editGoal,   setEditGoal]  = useState(false);
  const [goalInput,  setGoalInput] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const goalRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefresh(true);
      const p = await vendorsApi.getProfile();
      setProfile(p);
      if (p.status === 'APPROVED') {
        const [stats, prods, ords, hm] = await Promise.all([
          vendorChartApi.getFullStats(),
          vendorsApi.getProducts(),
          vendorsApi.getOrders({}),
          vendorChartApi.getHeatmap(),
        ]);
        setFullStats(stats);
        setProducts(prods);
        setOrders(ords);
        setHeatH(hm.hours);
        setHeatD(hm.days);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('404')) navigate('/become-seller');
      else if (!silent) showToast(t('sl1_dashboard.toast_load_error'), 'error');
    } finally { setLoading(false); setRefresh(false); }
  }, [navigate, showToast, t]);

  const loadChart = useCallback(async (p: ChartPeriod) => {
    try { setChartLoad(true); const r = await vendorChartApi.getChartData(p); setChartData(r.data); }
    catch { setChartData([]); }
    finally { setChartLoad(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (profile?.status === 'APPROVED') loadChart(period); }, [period, profile?.status, loadChart]);
  useEffect(() => { if (editGoal && goalRef.current) goalRef.current.focus(); }, [editGoal]);

  const delProduct = async (id: number) => {
    if (!confirm(t('sl1_dashboard.confirm_delete_product'))) return;
    try { await vendorsApi.deleteProduct(id); setProducts(p => p.filter(x => x.id !== id)); showToast(t('sl1_dashboard.toast_deleted'), 'success'); }
    catch { showToast(t('sl1_dashboard.toast_error'), 'error'); }
  };

  const commitGoal = () => {
    const v = parseInt(goalInput.replace(/\D/g, ''), 10);
    if (!isNaN(v) && v > 0) { setGoal(v); saveGoal(v); }
    setEditGoal(false);
  };

  const shareShop = async () => {
    const url = `${window.location.origin}/shop/${profile?.id ?? ''}`;
    if (navigator.share) await navigator.share({ title: profile?.business_name, url }).catch(() => null);
    else { await navigator.clipboard.writeText(url); showToast(t('sl1_dashboard.toast_link_copied'), 'success'); }
  };

  //  ÉTATS APPROBATION 
  if (loading) return <SkeletonPage />;

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] gap-4 text-center">
      <AlertCircle size={40} style={{ color: C.red }} />
      <button onClick={() => loadData()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
        style={{ background: C.orange }}>
        <RefreshCw size={13} />{t('sl1_dashboard.retry')}
      </button>
    </div>
  );

  if (profile.status === 'PENDING') return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: C.orangeL }}>
        <Clock size={28} style={{ color: C.orange }} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: C.text }}>
          {t('sl1_dashboard.pending_title')}
        </h2>
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: C.muted }}>
          {t('sl1_dashboard.pending_desc_before')}<strong style={{ color: C.text }}>{profile.business_name}</strong>{t('sl1_dashboard.pending_desc_after')}
        </p>
      </div>
      <button onClick={() => loadData(true)} disabled={refreshing}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
        style={{ background: C.white, border: `1px solid ${C.border}`, color: C.muted }}>
        <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />{t('sl1_dashboard.refresh')}
      </button>
    </div>
  );

  if (profile.status === 'REJECTED') return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: C.redL }}>
        <XCircle size={28} style={{ color: C.red }} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: C.text }}>{t('sl1_dashboard.rejected_title')}</h2>
        <p className="text-sm max-w-xs" style={{ color: C.muted }}>
          {t('sl1_dashboard.rejected_desc_before')}<strong style={{ color: C.text }}>{profile.business_name}</strong> {t('sl1_dashboard.rejected_desc_after')}
        </p>
      </div>
      <a href="mailto:support@belivay.cm"
        className="px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
        style={{ background: C.orange }}>
        {t('sl1_dashboard.contact_support')}
      </a>
    </div>
  );

  if (profile.status === 'SUSPENDED') return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: C.amberL }}>
        <AlertCircle size={28} style={{ color: C.amber }} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: C.text }}>{t('sl1_dashboard.suspended_title')}</h2>
        <p className="text-sm max-w-xs" style={{ color: C.muted }}>
          <strong style={{ color: C.text }}>{profile.business_name}</strong> {t('sl1_dashboard.suspended_desc_after')}
        </p>
      </div>
      <a href="mailto:support@belivay.cm" className="px-5 py-2.5 rounded-2xl text-white text-sm font-bold" style={{ background: C.orange }}>
        {t('sl1_dashboard.contact_support')}
      </a>
    </div>
  );

  
  // DASHBOARD COMPLET
  

  const s           = fullStats;
  const monthlyRev  = s?.monthly_revenue      ?? 0;
  const totalRev    = s?.total_revenue         ?? 0;
  const monthlyOrds = s?.monthly_orders        ?? 0;
  const totalOrds   = s?.total_orders          ?? 0;
  const pendingOrds = s?.pending_orders_count  ?? 0;
  const totalProds  = s?.total_products        ?? 0;
  const lowItems: LowStockItem[] = s?.low_stock_items ?? [];
  const uniqueCust  = s?.unique_customers      ?? 0;
  const totalSales  = s?.total_sales_count     ?? 0;
  const avgOrder    = s?.avg_order_value        ?? 0;
  const shopRating  = s?.shop_rating           ?? null;
  const reviewCount = s?.reviews_count         ?? 0;
  const fulfRate    = s?.fulfillment_rate       ?? 0;
  const returnRate  = s?.return_rate            ?? 0;
  const topProds: TopProduct[] = s?.top_products ?? [];

  const goalPct    = goal > 0 ? Math.min(Math.round((monthlyRev / goal) * 100), 100) : 0;
  const maxBar     = chartData.length > 0 ? Math.max(...chartData.map(b => b.value), 1) : 1;
  const chartTotal = chartData.reduce((a, b) => a + b.value, 0);
  const chartAvg   = chartData.filter(b => b.value > 0).length > 0
    ? Math.round(chartTotal / chartData.filter(b => b.value > 0).length) : 0;
  const h1  = chartData.slice(0, Math.floor(chartData.length / 2)).reduce((a, b) => a + b.value, 0);
  const h2  = chartData.slice(Math.floor(chartData.length / 2)).reduce((a, b) => a + b.value, 0);
  const evo = h1 > 0 ? Math.round(((h2 - h1) / h1) * 100) : null;

  const firstName = user?.first_name || profile.business_name;
  const today = new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });

  const milestones = [
    { label: t('sl1_dashboard.milestone_shop_created'),  done: true,           icon: BadgeCheck },
    { label: t('sl1_dashboard.milestone_first_product'), done: totalProds > 0, icon: Package },
    { label: t('sl1_dashboard.milestone_first_sale'),    done: totalOrds > 0,  icon: TrendingUp },
    { label: t('sl1_dashboard.milestone_first_review'),  done: reviewCount > 0,icon: Star },
    { label: t('sl1_dashboard.milestone_first_boost'),   done: false,          icon: Zap },
    { label: t('sl1_dashboard.milestone_pro_plan'),      done: false,          icon: Award },
  ];

  return (
    <div className="space-y-2 sm:space-y-5">

      {/* 
          HERO — CA MENSUEL + GREETING
       */}
      <div className="rounded-3xl overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${C.sidebar} 0%, #2D1A0A 40%, #3A200C 100%)`,
          boxShadow: `0 8px 40px rgba(28,18,9,0.25)`,
        }}>

        {/* Tache lumineuse orange */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(244,121,32,0.18) 0%,transparent 70%)', transform: 'translate(30%,-30%)' }} />

        <div className="relative px-5 py-6 sm:px-8 sm:py-7">
          {/* Date + badge plan */}
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <p className="text-[11.5px] font-medium capitalize sm:text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{today}</p>
            <div className="flex flex-shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full sm:px-3"
              style={{ background: 'rgba(244,121,32,0.2)', border: '1px solid rgba(244,121,32,0.3)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.orange }} />
              <span className="text-[10px] font-bold sm:text-[10.5px]" style={{ color: C.orange }}>{t('sl1_dashboard.badge_plan_free')}</span>
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-[21px] font-black text-white leading-tight mb-4 sm:text-[30px] sm:mb-5"
            style={{ letterSpacing: '-0.5px' }}>
            {t('sl1_dashboard.greeting', { name: firstName })}
          </h1>

          {/* CA mensuel — la metrique que le vendeur vient chercher en premier.
              `items-baseline` colle « FCFA » au chiffre : en `ml-1` sur un bloc
              de 44px, l'unite basculait a la ligne des que le montant depassait
              trois chiffres. */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1 sm:text-[10.5px]"
              style={{ color: 'rgba(244,121,32,0.7)' }}>
              {t('sl1_dashboard.monthly_revenue_kicker')}
            </p>
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-[34px] font-black leading-none text-white sm:text-[52px]">
              {fmtXAF(monthlyRev)}
              <span className="text-[16px] font-bold sm:text-[22px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                FCFA
              </span>
            </p>
            {s?.revenue_trend !== null && s?.revenue_trend !== undefined && (
              <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold rounded-full px-2.5 py-1"
                style={{
                  background: s.revenue_trend >= 0 ? 'rgba(22,163,74,0.18)' : 'rgba(220,38,38,0.18)',
                  color: s.revenue_trend >= 0 ? '#4ADE80' : '#F87171',
                }}>
                {s.revenue_trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {t('sl1_dashboard.vs_last_month', { value: Math.abs(s.revenue_trend) })}
              </span>
            )}
          </div>

          {/* Commandes et clients uniques : deux tuiles cote a cote. Empilees
              ou etirees par `justify-between`, les deux chiffres se retrouvaient
              aux extremites de l'ecran, sans lien visuel entre eux. */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 sm:mt-5 sm:gap-3">
            <div className="rounded-2xl px-3.5 py-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="text-[9.5px] font-bold uppercase tracking-widest mb-1 sm:text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {t('sl1_dashboard.orders_label')}
              </p>
              <p className="text-[24px] font-black leading-none text-white sm:text-[26px]">{monthlyOrds}</p>
              {pendingOrds > 0 && (
                <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: C.amberL, color: C.amber }}>
                  {t('sl1_dashboard.orders_pending', { count: pendingOrds })}
                </span>
              )}
            </div>
            <div className="rounded-2xl px-3.5 py-3"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="text-[9.5px] font-bold uppercase tracking-widest mb-1 sm:text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {t('sl1_dashboard.unique_customers_label')}
              </p>
              <p className="text-[24px] font-black leading-none text-white sm:text-[26px]">
                {uniqueCust > 0 ? uniqueCust : '—'}
              </p>
            </div>
          </div>

          {/* Actions : les deux boutons remplissent la largeur au lieu de se
              renvoyer a la ligne, comme les actions principales d'une app. */}
          <div className="flex gap-2.5 mt-4 sm:mt-6">
            <Link to="/seller/products/new"
              className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-white text-[13px] transition-all active:scale-[.97] sm:flex-none sm:px-5 sm:py-2.5 sm:hover:-translate-y-px"
              style={{ background: C.orange, boxShadow: `0 4px 18px rgba(244,121,32,0.5)` }}>
              <Plus size={16} />{t('sl1_dashboard.add_product')}
            </Link>
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="flex flex-shrink-0 items-center justify-center gap-2 px-4 py-3 rounded-2xl font-semibold text-[13px] transition-all active:scale-[.97] sm:py-2.5"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {t('sl1_dashboard.refresh')}
            </button>
          </div>
        </div>

        {/* Barre plan info : les deux blocs restent sur une seule ligne meme sur
            un ecran de 360px — `min-w-0` + `truncate` sur le recapitulatif, le
            lien Pro ne passe jamais a la ligne. */}
        <div className="px-5 sm:px-8 py-2.5 sm:py-3 flex items-center gap-3"
          style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium sm:text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t(totalProds > 1 ? 'sl1_dashboard.plan_summary_line_plural' : 'sl1_dashboard.plan_summary_line', { count: totalProds })}
          </span>
          <Link to="/seller/plans"
            className="flex flex-shrink-0 items-center gap-1 text-[11px] font-bold hover:underline sm:text-[11.5px]"
            style={{ color: C.orange }}>
            {t('sl1_dashboard.upgrade_to_pro')} <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>

      {!Capacitor.isNativePlatform() && <AppDownloadBanner portal="VENDOR" />}

      {/*  MILESTONES  */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {milestones.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11.5px] font-semibold whitespace-nowrap flex-shrink-0 transition-all"
              style={m.done ? {
                background: 'rgba(22,163,74,0.1)',
                border: '1px solid rgba(22,163,74,0.25)',
                color: C.green,
              } : {
                background: C.white,
                border: `1px solid ${C.border}`,
                color: C.mutedL,
              }}>
              <Icon size={11} className={m.done ? '' : ''} style={{ color: m.done ? C.green : C.mutedL }} />
              {m.label}
              {m.done && <CheckCircle size={9} style={{ color: C.green }} />}
              {!m.done && <Lock size={8} style={{ color: C.mutedL }} />}
            </div>
          );
        })}
      </div>

      {/*  BANNIÈRE PRO  */}
      {showBanner && (
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg,#2E1065,#4C1D95,#5B21B6)',
            boxShadow: '0 8px 28px rgba(124,58,237,0.25)',
          }}>
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <Sparkles size={20} className="text-purple-300 flex-shrink-0 relative" />
          <div className="flex-1 min-w-0 relative">
            <p className="text-[13.5px] font-bold text-white" style={{  }}>
              {t('sl1_dashboard.pro_banner_title')}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(196,181,253,0.65)' }}>
              {t('sl1_dashboard.pro_banner_desc')}
            </p>
          </div>
          <Link to="/seller/plans"
            className="flex-shrink-0 px-3.5 py-2 rounded-xl text-[11.5px] font-bold text-white whitespace-nowrap relative"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
            {t('sl1_dashboard.view_plans')}
          </Link>
          <button onClick={() => setShowBanner(false)}
            className="relative w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      {/*  4 KPI CARDS  */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          {
            label: t('sl1_dashboard.monthly_revenue_kicker'),
            value: `${fmtXAF(monthlyRev)} FCFA`,
            sub: avgOrder > 0 ? t('sl1_dashboard.avg_order_sub', { amount: `${fmtXAF(avgOrder)} FCFA` }) : undefined,
            trend: s?.revenue_trend ?? null,
            accentColor: C.orange,
            accentBg: C.orangeL,
          },
          {
            label: t('sl1_dashboard.orders_label'),
            value: `${monthlyOrds}`,
            sub: pendingOrds > 0 ? t('sl1_dashboard.orders_pending', { count: pendingOrds }) : t('sl1_dashboard.orders_total', { count: totalOrds }),
            subWarn: pendingOrds > 0,
            trend: s?.orders_trend ?? null,
            accentColor: C.green,
            accentBg: C.greenL,
          },
          {
            label: t('sl1_dashboard.unique_customers_label'),
            value: uniqueCust > 0 ? String(uniqueCust) : '—',
            sub: totalSales > 0 ? t('sl1_dashboard.units_sold', { count: totalSales }) : undefined,
            accentColor: C.blue,
            accentBg: C.blueL,
          },
          {
            label: t('sl1_dashboard.shop_rating_label'),
            value: shopRating !== null ? `${shopRating}/5` : '—',
            sub: reviewCount > 0 ? t('sl1_dashboard.reviews_count', { count: reviewCount }) : t('sl1_dashboard.total_sales', { count: totalSales }),
            accentColor: C.amber,
            accentBg: C.amberL,
          },
        ].map((kpi, i) => (
          <Card key={i} className="p-3.5 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default relative overflow-hidden group">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl transition-opacity opacity-0 group-hover:opacity-100"
              style={{ background: kpi.accentColor }} />

            {/* Valeur */}
            <p className="text-[28px] font-black leading-none tracking-tight mb-1.5"
              style={{ color: C.text }}>
              {kpi.value}
            </p>

            {/* Label */}
            <p className="text-[12px] font-medium mb-2" style={{ color: C.muted }}>{kpi.label}</p>

            {/* Sub */}
            {kpi.sub && (
              <span className="inline-block text-[10.5px] font-semibold rounded-full px-2.5 py-1"
                style={(kpi as { subWarn?: boolean }).subWarn
                  ? { background: C.amberL, color: C.amber }
                  : { background: C.cream, color: C.muted }}>
                {kpi.sub}
              </span>
            )}

            {/* Trend */}
            {kpi.trend !== null && kpi.trend !== undefined && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ml-1.5"
                style={kpi.trend >= 0
                  ? { background: C.greenL, color: C.green }
                  : { background: C.redL, color: C.red }}>
                {kpi.trend >= 0 ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                {Math.abs(kpi.trend)}%
              </span>
            )}
          </Card>
        ))}
      </div>

      {/*  ACTIONS RAPIDES  */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { label: t('sl1_dashboard.action_add_product'), to: '/seller/products/new', primary: true },
          { label: `${t('sl1_dashboard.orders_label')}${pendingOrds > 0 ? ` (${pendingOrds})` : ''}`, to: '/seller/orders' },
          { label: t('sl1_dashboard.action_payments'),  to: '/seller/payments' },
          { label: t('sl1_dashboard.action_disputes'),    to: '/seller/disputes' },
          { label: `${t('sl1_dashboard.action_reviews')}${reviewCount > 0 ? ` (${reviewCount})` : ''}`, to: '/seller/shop' },
          { label: t('sl1_dashboard.action_boost'),    to: '/seller/boost' },
        ].map((btn, i) => (
          <Link key={i} to={btn.to}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12.5px] font-semibold whitespace-nowrap flex-shrink-0 transition-all hover:-translate-y-px"
            style={btn.primary
              ? { background: C.orange, color: '#fff', boxShadow: `0 4px 14px rgba(244,121,32,0.35)` }
              : { background: C.white, border: `1px solid ${C.border}`, color: C.muted, boxShadow: '0 1px 3px rgba(28,18,9,0.06)' }}>
            {btn.primary && <Plus size={14} />}
            {btn.label}
          </Link>
        ))}
        <button onClick={shareShop}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12.5px] font-semibold whitespace-nowrap flex-shrink-0 transition-all hover:-translate-y-px"
          style={{ background: C.white, border: `1px solid ${C.border}`, color: C.muted }}>
          <Share2 size={14} />{t('sl1_dashboard.share_shop')}
        </button>
      </div>

      {/* Plan chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: t(totalProds > 1 ? 'sl1_dashboard.chip_products_plural' : 'sl1_dashboard.chip_products', { count: totalProds }), ok: true },
          { label: t('sl1_dashboard.chip_commission'), ok: false },
          { label: t('sl1_dashboard.chip_boost'),        ok: false },
          { label: t('sl1_dashboard.chip_analytics_ai'),   locked: true },
          { label: t('sl1_dashboard.chip_heatmap'),        locked: true },
        ].map((chip, i) => (
          <span key={i} className="flex items-center gap-1 text-[11px] font-semibold rounded-full px-3 py-1"
            style={chip.locked
              ? { background: C.cream, border: `1px solid ${C.border}`, color: C.mutedL, textDecoration: 'line-through' }
              : chip.ok
              ? { background: C.greenL, border: '1px solid rgba(22,163,74,0.2)', color: C.green }
              : { background: C.white, border: `1px solid ${C.border}`, color: C.muted }}>
            {chip.locked && <Lock size={8} />}
            {chip.label}
          </span>
        ))}
      </div>

      {/*  BENTO — OBJECTIF + ACTIONS  */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4">

        {/* Objectif avec anneau */}
        <Card className="sm:col-span-2 p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={14} style={{ color: C.orange }} />
              <span className="font-bold text-[13.5px]" style={{ color: C.text }}>
                {t('sl1_dashboard.goal_title')}
              </span>
            </div>
            {editGoal ? (
              <div className="flex items-center gap-1.5">
                <input ref={goalRef} type="number" value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitGoal(); if (e.key === 'Escape') setEditGoal(false); }}
                  className="w-24 h-7 px-2.5 text-[12px] font-semibold rounded-xl bg-white outline-none"
                  style={{ border: `1.5px solid ${C.orange}`, color: C.text }}
                  placeholder="500000" />
                <button onClick={commitGoal}><CheckCircle size={15} style={{ color: C.green }} /></button>
                <button onClick={() => setEditGoal(false)}><X size={15} style={{ color: C.muted }} /></button>
              </div>
            ) : (
              <button onClick={() => { setGoalInput(String(goal)); setEditGoal(true); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all"
                style={{ background: C.cream, color: C.muted }}>
                <Pencil size={10} />{t('sl1_dashboard.edit')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-5">
            {/* SVG Ring */}
            <div className="relative flex-shrink-0">
              <Ring pct={goalPct} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[18px] font-black" style={{ color: C.text }}>
                  {goalPct}%
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[13.5px] mb-0.5" style={{ color: C.text }}>
                {fmtXAF(monthlyRev)} FCFA
              </p>
              <p className="text-[10.5px] mb-2" style={{ color: C.muted }}>
                {t('sl1_dashboard.goal_target', { amount: `${fmtXAF(goal)} FCFA` })}
              </p>
              {goalPct < 100 && (
                <p className="text-[10px]" style={{ color: C.muted }}>
                  {t('sl1_dashboard.goal_remaining_label')} <strong style={{ color: C.text }}>{fmtXAF(Math.max(0, goal - monthlyRev))} FCFA</strong>
                </p>
              )}
              {goalPct >= 100 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1"
                  style={{ background: C.greenL, color: C.green }}>
                  <CheckCircle size={10} />{t('sl1_dashboard.goal_reached')}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Plan upgrade tip */}
        <div className="sm:col-span-3 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1"
            style={{ background: C.blueL, border: '1px solid rgba(37,99,235,0.15)' }}>
            <CreditCard size={15} style={{ color: C.blue }} className="flex-shrink-0" />
            <p className="text-[12px] font-medium flex-1" style={{ color: '#1E40AF' }}>
              {t('sl1_dashboard.upgrade_tip_before')}<strong>{t('sl1_dashboard.plan_starter')}</strong>{t('sl1_dashboard.upgrade_tip_after')}
            </p>
            <Link to="/seller/plans"
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap"
              style={{ background: C.white, border: '1px solid rgba(37,99,235,0.2)', color: C.blue }}>
              {t('sl1_dashboard.view_plans')}
            </Link>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              { label: t('sl1_dashboard.fulfillment_rate_short'), value: `${fulfRate}%`, ok: fulfRate >= 80 },
              { label: t('sl1_dashboard.return_rate_short'),   value: `${returnRate}%`, ok: returnRate <= 5 },
            ].map((stat, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: stat.ok ? C.green : C.amber }} />
                  <p className="text-[11px] font-medium" style={{ color: C.muted }}>{stat.label}</p>
                </div>
                <p className="text-[20px] font-black" style={{ color: stat.ok ? C.green : C.amber }}>
                  {stat.value}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/*  GRAPHIQUE VENTES  */}
      <Card className="p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.orangeL }}>
                <BarChart2 size={15} style={{ color: C.orange }} />
              </div>
              <p className="font-bold text-[14.5px]" style={{ color: C.text }}>
                {t('sl1_dashboard.revenue_chart_title')}
              </p>
            </div>
            {chartData.length > 0 && (
              <div className="flex items-center gap-3 ml-10 text-[10.5px] flex-wrap" style={{ color: C.mutedL }}>
                <span>{t('sl1_dashboard.chart_total')} <strong style={{ color: C.orange }}>{fmtXAF(chartTotal)} FCFA</strong></span>
                <span>·</span>
                <span>{t('sl1_dashboard.chart_avg')} <strong style={{ color: C.muted }}>{fmtXAF(chartAvg)} FCFA</strong></span>
                {evo !== null && (
                  <>
                    <span>·</span>
                    <strong style={{ color: evo >= 0 ? C.green : C.red }}>
                      {evo >= 0 ? '+' : ''}{evo}%
                    </strong>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Période */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {(['7d', '30d', '12m'] as ChartPeriod[]).map((p, i) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 text-[12px] font-bold transition-all ${i > 0 ? '' : ''}`}
                style={{
                  background: period === p ? C.orange : 'transparent',
                  color: period === p ? '#fff' : C.muted,
                  borderLeft: i > 0 ? `1px solid ${C.border}` : 'none',
                }}>
                {p === '7d' ? t('sl1_dashboard.period_7d') : p === '30d' ? t('sl1_dashboard.period_30d') : t('sl1_dashboard.period_12m')}
              </button>
            ))}
          </div>
        </div>

        {chartLoad ? (
          <div className="flex items-end gap-1.5 h-[110px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-xl animate-pulse" style={{ height: `${20 + i * 10}%`, background: C.creamAlt }} />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[110px] gap-2">
            <BarChart2 size={24} style={{ color: C.border }} />
            <p className="text-[12px]" style={{ color: C.mutedL }}>{t('sl1_dashboard.no_sales_period')}</p>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            {chartData.map((bar, i) => (
              <BarItem key={i} bar={bar} max={maxBar} active={hovBar === i}
                onEnter={() => setHovBar(i)} onLeave={() => setHovBar(null)} />
            ))}
          </div>
        )}

        <PlanSim totalRevenue={totalRev} />
      </Card>

      {/*  HEATMAP  */}
      <Card className="p-3.5 sm:p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.orangeL }}>
            <Flame size={15} style={{ color: C.orange }} />
          </div>
          <div>
            <p className="font-bold text-[14.5px]" style={{ color: C.text }}>
              {t('sl1_dashboard.heatmap_title')}
            </p>
            <p className="text-[10.5px]" style={{ color: C.mutedL }}>{t('sl1_dashboard.heatmap_subtitle')}</p>
          </div>
        </div>

        <p className="text-[9.5px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: C.mutedL }}>
          {t('sl1_dashboard.heatmap_days_label')}
        </p>
        {heatD.length > 0 ? (
          <div className="grid grid-cols-7 gap-2 mb-5">
            {heatD.map(d => (
              <div key={d.day} className="flex flex-col items-center gap-1.5">
                <HCell intensity={d.intensity} tooltip={`${d.day} · ${fmtXAF(d.revenue)} XAF · ${d.orders} ${t('sl1_dashboard.orders_abbr')}`} />
                <span className="text-[9px] font-medium" style={{ color: C.mutedL }}>{d.day}</span>
              </div>
            ))}
          </div>
        ) : <Bone h="h-8" r="rounded-xl" />}

        <p className="text-[9.5px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: C.mutedL }}>
          {t('sl1_dashboard.heatmap_hours_label')}
        </p>
        {heatH.length > 0 ? (
          <div className="grid gap-1 mb-3" style={{ gridTemplateColumns: 'repeat(12,1fr)' }}>
            {heatH.map(h => (
              <HCell key={h.hour} intensity={h.intensity} tooltip={`${h.hour}h · ${fmtXAF(h.revenue)} XAF · ${h.orders} ${t('sl1_dashboard.orders_abbr')}`} />
            ))}
          </div>
        ) : <Bone h="h-5" />}

        <div className="flex items-center gap-2">
          <span className="text-[9px]" style={{ color: C.mutedL }}>{t('sl1_dashboard.heat_low')}</span>
          <div className="flex gap-1">
            {[0, 0.2, 0.4, 0.65, 0.85, 1].map((v, i) => (
              <div key={i} className="w-5 h-3 rounded-sm" style={{ background: heatColor(v) }} />
            ))}
          </div>
          <span className="text-[9px]" style={{ color: C.mutedL }}>{t('sl1_dashboard.heat_high')}</span>
        </div>
      </Card>

      {/*  ALERTES STOCK + PERFORMANCE  */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4">
        {/* Alertes stock */}
        <Card className="overflow-hidden">
          <SHead icon={<TriangleAlert size={14} />} title={t('sl1_dashboard.stock_alerts_title')} to="/seller/products" />
          {lowItems.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle size={22} style={{ color: C.green }} className="mx-auto mb-2" />
              <p className="text-[12px]" style={{ color: C.muted }}>{t('sl1_dashboard.stock_all_ok')}</p>
            </div>
          ) : lowItems.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={item.stock_quantity === 0 ? { background: C.redL } : { background: C.amberL }}>
                {item.stock_quantity === 0
                  ? <XCircle size={14} style={{ color: C.red }} />
                  : <Package size={14} style={{ color: C.amber }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate" style={{ color: C.text }}>{item.title}</p>
                <p className="text-[10.5px]" style={{ color: C.muted }}>
                  {item.stock_quantity === 0 ? t('sl1_dashboard.out_of_stock') : t(item.stock_quantity > 1 ? 'sl1_dashboard.units_remaining_plural' : 'sl1_dashboard.units_remaining', { count: item.stock_quantity })}
                </p>
              </div>
              <Link to={`/seller/products/${item.id}/edit`}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold transition-all"
                style={{ background: C.cream, border: `1px solid ${C.border}`, color: C.muted }}>
                {t('sl1_dashboard.restock_short')}
              </Link>
            </div>
          ))}
        </Card>

        {/* Performance rapide */}
        <Card className="overflow-hidden">
          <SHead icon={<TrendingUp size={14} />} title={t('sl1_dashboard.performance_title')} />
          <div className="px-5 py-2">
            {[
              { label: t('sl1_dashboard.fulfillment_rate_full'), sub: t('sl1_dashboard.fulfillment_rate_sub'), value: `${fulfRate}%`,  ok: fulfRate >= 80 },
              { label: t('sl1_dashboard.return_rate_full'),   sub: t('sl1_dashboard.return_rate_sub'),               value: `${returnRate}%`, ok: returnRate <= 5 },
              { label: t('sl1_dashboard.satisfaction_label'),     sub: reviewCount > 0 ? t('sl1_dashboard.reviews_count', { count: reviewCount }) : t('sl1_dashboard.no_reviews_yet'), value: shopRating !== null ? `${shopRating}/5` : '—', ok: shopRating !== null && shopRating >= 4 },
              { label: t('sl1_dashboard.avg_cart_label'),     sub: t('sl1_dashboard.avg_cart_sub'),  value: avgOrder > 0 ? `${fmtXAF(avgOrder)} XAF` : '—', ok: avgOrder > 10_000 },
            ].map((row, i, arr) => (
              <div key={i} className="flex items-center justify-between py-3"
                style={i < arr.length - 1 ? { borderBottom: `1px solid ${C.border}` } : {}}>
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: row.ok ? C.green : C.amber, boxShadow: `0 0 6px ${row.ok ? 'rgba(22,163,74,0.4)' : 'rgba(217,119,6,0.4)'}` }} />
                  <div>
                    <p className="text-[12.5px] font-semibold" style={{ color: C.text }}>{row.label}</p>
                    <p className="text-[10.5px]" style={{ color: C.muted }}>{row.sub}</p>
                  </div>
                </div>
                <p className="text-[15px] font-extrabold" style={{ color: row.ok ? C.green : C.amber }}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/*  COMMANDES + TOP PRODUITS  */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4">

        {/* Commandes récentes */}
        <Card className="overflow-hidden">
          <SHead icon={<ShoppingBag size={14} />} title={t('sl1_dashboard.recent_orders_title')} to="/seller/orders" />
          {orders.slice(0, 5).length === 0 ? (
            <div className="py-8 text-center"><p className="text-[12px]" style={{ color: C.muted }}>{t('sl1_dashboard.no_orders_yet')}</p></div>
          ) : orders.slice(0, 5).map(order => {
            const pName  = order.items?.[0]?.product_title ?? `Commande ${order.id}`;
            const pImg   = order.items?.[0]?.product_image ?? null;
            const vTotal = order.vendor_net_amount ?? Number(order.total_xaf);
            const fSt    = order.fulfillment_status ?? 'PENDING';
            const badge  = FULFILL[fSt] ? { label: t(FULFILL[fSt].labelKey), color: FULFILL[fSt].color, bg: FULFILL[fSt].bg } : { label: fSt, color: C.muted, bg: C.cream };
            return (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: C.orangeL }}>
                  {pImg ? <img src={pImg} alt={pName} className="w-full h-full object-cover" /> : <Truck size={15} style={{ color: C.orange }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold" style={{ color: C.text }}>{orderRef(order.id)}</p>
                  <p className="text-[10.5px] truncate" style={{ color: C.muted }}>{pName} · {fmtDate(order.created_at, dateLocale)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Pill label={badge.label} color={badge.color} bg={badge.bg} />
                  <p className="text-[13px] font-extrabold" style={{ color: C.orange }}>
                    {fmtXAF(vTotal)} FCFA
                  </p>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Top produits */}
        <Card className="overflow-hidden">
          <SHead icon={<TrendingUp size={14} />} title={t('sl1_dashboard.top_products_title')} to="/seller/products" />
          {topProds.length === 0 ? (
            <div className="py-8 text-center"><p className="text-[12px]" style={{ color: C.muted }}>{t('sl1_dashboard.no_sales_recorded')}</p></div>
          ) : topProds.map((p, rank) => {
            const barPct = topProds[0].revenue > 0 ? (p.revenue / topProds[0].revenue) * 100 : 0;
            const rankColors = [C.orange, C.violet, C.mutedL];
            return (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: `1px solid ${C.border}` }}>
                <span className="text-[12px] font-black w-5 text-center flex-shrink-0"
                  style={{ color: rankColors[Math.min(rank, 2)] }}>
                  #{rank + 1}
                </span>
                <div className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: C.creamAlt }}>
                  {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" /> : <Package size={13} style={{ color: C.muted }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold truncate" style={{ color: C.text }}>{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.creamAlt }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${barPct}%`, background: `linear-gradient(90deg,${C.orange},${C.orangeD})` }} />
                    </div>
                    <span className="text-[9.5px] flex-shrink-0" style={{ color: C.mutedL }}>{t('sl1_dashboard.sales_count', { count: p.sales_count })}</span>
                  </div>
                </div>
                <p className="text-[13px] font-extrabold flex-shrink-0" style={{ color: C.orange }}>
                  {fmtXAF(p.revenue)} FCFA
                </p>
              </div>
            );
          })}
        </Card>
      </div>

      {/*  TABLE PRODUITS  */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.orangeL }}>
              <Package size={14} style={{ color: C.orange }} />
            </div>
            <span className="font-bold text-[14.5px]" style={{ color: C.text }}>
              {t('sl1_dashboard.my_products_title')}
            </span>
            <span className="text-[10px] font-black text-white rounded-full px-2 py-0.5"
              style={{ background: C.orange }}>
              {totalProds}
            </span>
          </div>
          <Link to="/seller/products" className="text-[12px] font-bold flex items-center gap-1 hover:underline" style={{ color: C.orange }}>
            {t('sl1_dashboard.see_all')} <ChevronRight size={12} />
          </Link>
        </div>
        {products.slice(0, 5).length === 0 ? (
          <div className="py-10 text-center">
            <Package size={24} style={{ color: C.border }} className="mx-auto mb-3" />
            <p className="text-[12px] mb-4" style={{ color: C.muted }}>{t('sl1_dashboard.no_products_yet')}</p>
            <Link to="/seller/products/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12.5px] font-bold text-white"
              style={{ background: C.orange }}>
              <Plus size={14} />{t('sl1_dashboard.create_first_product')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[t('sl1_dashboard.th_product'), t('sl1_dashboard.th_price'), t('sl1_dashboard.th_stock'), t('sl1_dashboard.th_status'), ''].map((h, i) => (
                    <th key={i} className={`py-3 px-4 text-[10px] font-black uppercase tracking-[0.12em] ${i === 4 ? 'text-right' : 'text-left'}`}
                      style={{ color: C.mutedL }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 5).map(p => {
                  const sq = p.stock_quantity ?? 0;
                  return (
                    <tr key={p.id} className="group transition-colors"
                      style={{ borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.cream; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                            style={{ background: C.creamAlt }}>
                            {p.images?.[0]?.image_url
                              ? <img src={p.images[0].image_url} alt={p.title} className="w-full h-full object-cover" />
                              : <Package size={12} style={{ color: C.muted }} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold truncate max-w-[140px]" style={{ color: C.text }}>{p.title}</p>
                            <p className="text-[10.5px] truncate max-w-[140px]" style={{ color: C.muted }}>{p.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-[12.5px] font-semibold whitespace-nowrap" style={{ color: C.text }}>
                          {Number(p.price_xaf).toLocaleString('fr-FR')} XAF
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12.5px] font-bold"
                          style={{ color: sq > 5 ? C.green : sq > 0 ? C.amber : C.red }}>
                          {sq}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10.5px] font-semibold rounded-full px-2.5 py-1"
                          style={p.is_active
                            ? { background: C.greenL, color: C.green }
                            : { background: C.cream, color: C.muted }}>
                          {p.is_active ? t('sl1_dashboard.status_active') : t('sl1_dashboard.status_inactive')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/product/${p.id}`}>
                            <button className="p-1.5 rounded-xl transition-all"
                              style={{ background: C.cream, border: `1px solid ${C.border}` }}>
                              <Eye size={12} style={{ color: C.muted }} />
                            </button>
                          </Link>
                          <Link to={`/seller/products/${p.id}/edit`}>
                            <button className="p-1.5 rounded-xl transition-all"
                              style={{ background: C.cream, border: `1px solid ${C.border}` }}>
                              <Edit2 size={12} style={{ color: C.muted }} />
                            </button>
                          </Link>
                          <button onClick={() => delProduct(p.id)} className="p-1.5 rounded-xl transition-all"
                            style={{ background: C.redL, border: '1px solid rgba(220,38,38,0.2)' }}>
                            <Trash2 size={12} style={{ color: C.red }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/*  NOTE BOUTIQUE  */}
      {shopRating !== null && reviewCount > 0 && (
        <Card className="p-3.5 sm:p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.amberL }}>
              <Star size={14} style={{ color: C.amber }} />
            </div>
            <p className="font-bold text-[14.5px]" style={{ color: C.text }}>
              {t('sl1_dashboard.customer_reviews_title')}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div>
              <p className="text-[48px] font-black leading-none" style={{ color: C.text }}>
                {shopRating.toFixed(1)}
              </p>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={14} style={i <= Math.round(shopRating)
                    ? { color: C.amber, fill: C.amber }
                    : { color: C.border, fill: C.border }} />
                ))}
              </div>
              <p className="text-[10.5px] mt-1" style={{ color: C.muted }}>{t('sl1_dashboard.reviews_short', { count: reviewCount })}</p>
            </div>
            <Link to="/seller/shop"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-semibold transition-all"
              style={{ background: C.cream, border: `1px solid ${C.border}`, color: C.muted }}>
              <Store size={13} />{t('sl1_dashboard.view_my_shop')}
            </Link>
          </div>
        </Card>
      )}

    </div>
  );
}