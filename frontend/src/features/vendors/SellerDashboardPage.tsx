// frontend/src/features/vendors/SellerDashboardPage.tsx
// Dashboard vendeur BelivaY
// Fond crème, cartes blanches arrondies, orange dominant, typographie forte.

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  { id: 'gratuit',  name: 'Gratuit',  price: 0,    commission: 20, color: '#7C6E5A' },
  { id: 'starter',  name: 'Starter',  price: 4900, commission: 18, color: '#2563EB' },
  { id: 'pro',      name: 'Pro',      price: 9900, commission: 10, color: '#7C3AED' },
  { id: 'business', name: 'Business', price: 24900,commission: 7,  color: '#D97706' },
] as const;

const FULFILL: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'À confirmer',    color: C.amber,  bg: C.amberL },
  PROCESSING: { label: 'En préparation', color: C.blue,   bg: C.blueL  },
  SHIPPED:    { label: 'Prêt',           color: C.violet, bg: C.violetL},
  DELIVERED:  { label: 'Livré',          color: C.green,  bg: C.greenL },
  CANCELLED:  { label: 'Annulé',         color: C.red,    bg: C.redL   },
};

const GOAL_KEY = 'belivay_seller_goal';


// HELPERS


function fmtXAF(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' M';
  if (n >= 1_000) return Math.round(n / 1_000) + ' K';
  return Math.round(n).toLocaleString('fr-FR');
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
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
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: C.orangeL, color: C.orange }}>
          {icon}
        </div>
        <span className="font-bold text-[14px]" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
          {title}
        </span>
      </div>
      {to && (
        <Link to={to} className="text-[12px] font-bold flex items-center gap-1 hover:underline" style={{ color: C.orange }}>
          Tout voir <ChevronRight size={12} />
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
    <div className="space-y-5">
      <Bone h="h-[200px]" r="rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
  const pct = max > 0 ? (bar.value / max) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5 relative min-w-0">
      {active && bar.value > 0 && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap text-[9.5px] font-bold text-white rounded-xl px-2.5 py-1.5 pointer-events-none"
          style={{ background: C.orange, boxShadow: `0 4px 12px rgba(244,121,32,0.4)` }}>
          {fmtXAF(bar.value)} · {bar.orders} cmd
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
  const [sel, setSel] = useState<string>('gratuit');
  const plan = PLANS.find(p => p.id === sel) ?? PLANS[0];
  const net  = Math.round(totalRevenue * (1 - plan.commission / 100));
  const save = Math.round(totalRevenue * (PLANS[0].commission - plan.commission) / 100);
  return (
    <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.16em] mb-3" style={{ color: C.mutedL }}>
        Simuler un autre plan
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
              style={{ color: sel === p.id ? p.color : C.muted, fontFamily: 'Poppins,sans-serif' }}>
              {p.name}
            </p>
            <p className="text-[9.5px] mt-0.5" style={{ color: C.mutedL }}>
              {p.price === 0 ? 'Gratuit' : `${(p.price / 1000).toFixed(1)}K/m`}
            </p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: 'CA estimé', v: `${fmtXAF(net)} XAF`, color: C.orange },
          { l: 'Commission', v: `${plan.commission}%`, color: plan.color },
          { l: 'Économie', v: save > 0 ? `+${fmtXAF(save)} XAF` : '—', color: C.green },
        ].map(s => (
          <div key={s.l} className="rounded-xl p-3 text-center" style={{ background: C.cream }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: C.mutedL }}>{s.l}</p>
            <p className="text-[13.5px] font-extrabold" style={{ color: s.color, fontFamily: 'Poppins,sans-serif' }}>
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
      else if (!silent) showToast('Erreur de chargement', 'error');
    } finally { setLoading(false); setRefresh(false); }
  }, [navigate, showToast]);

  const loadChart = useCallback(async (p: ChartPeriod) => {
    try { setChartLoad(true); const r = await vendorChartApi.getChartData(p); setChartData(r.data); }
    catch { setChartData([]); }
    finally { setChartLoad(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (profile?.status === 'APPROVED') loadChart(period); }, [period, profile?.status, loadChart]);
  useEffect(() => { if (editGoal && goalRef.current) goalRef.current.focus(); }, [editGoal]);

  const delProduct = async (id: number) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try { await vendorsApi.deleteProduct(id); setProducts(p => p.filter(x => x.id !== id)); showToast('Supprimé', 'success'); }
    catch { showToast('Erreur', 'error'); }
  };

  const commitGoal = () => {
    const v = parseInt(goalInput.replace(/\D/g, ''), 10);
    if (!isNaN(v) && v > 0) { setGoal(v); saveGoal(v); }
    setEditGoal(false);
  };

  const shareShop = async () => {
    const url = `${window.location.origin}/shop/${profile?.id ?? ''}`;
    if (navigator.share) await navigator.share({ title: profile?.business_name, url }).catch(() => null);
    else { await navigator.clipboard.writeText(url); showToast('Lien copié !', 'success'); }
  };

  //  ÉTATS APPROBATION 
  if (loading) return <SkeletonPage />;

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] gap-4 text-center">
      <AlertCircle size={40} style={{ color: C.red }} />
      <button onClick={() => loadData()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
        style={{ background: C.orange }}>
        <RefreshCw size={13} />Réessayer
      </button>
    </div>
  );

  if (profile.status === 'PENDING') return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: C.orangeL }}>
        <Clock size={28} style={{ color: C.orange }} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
          Demande en cours d'examen
        </h2>
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: C.muted }}>
          Notre équipe examine votre candidature pour <strong style={{ color: C.text }}>{profile.business_name}</strong>. Délai : 24–48h ouvrées.
        </p>
      </div>
      <button onClick={() => loadData(true)} disabled={refreshing}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
        style={{ background: C.white, border: `1px solid ${C.border}`, color: C.muted }}>
        <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />Actualiser
      </button>
    </div>
  );

  if (profile.status === 'REJECTED') return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: C.redL }}>
        <XCircle size={28} style={{ color: C.red }} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>Demande refusée</h2>
        <p className="text-sm max-w-xs" style={{ color: C.muted }}>
          La candidature pour <strong style={{ color: C.text }}>{profile.business_name}</strong> n'a pas été retenue.
        </p>
      </div>
      <a href="mailto:support@belivay.cm"
        className="px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
        style={{ background: C.orange }}>
        Contacter le support
      </a>
    </div>
  );

  if (profile.status === 'SUSPENDED') return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: C.amberL }}>
        <AlertCircle size={28} style={{ color: C.amber }} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>Boutique suspendue</h2>
        <p className="text-sm max-w-xs" style={{ color: C.muted }}>
          <strong style={{ color: C.text }}>{profile.business_name}</strong> est temporairement suspendue.
        </p>
      </div>
      <a href="mailto:support@belivay.cm" className="px-5 py-2.5 rounded-2xl text-white text-sm font-bold" style={{ background: C.orange }}>
        Contacter le support
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
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const milestones = [
    { label: 'Boutique créée',  done: true,           icon: BadgeCheck },
    { label: 'Premier produit', done: totalProds > 0, icon: Package },
    { label: '1ère vente',      done: totalOrds > 0,  icon: TrendingUp },
    { label: '1er avis',        done: reviewCount > 0,icon: Star },
    { label: '1er Boost',       done: false,          icon: Zap },
    { label: 'Plan Pro',        done: false,          icon: Award },
  ];

  return (
    <div className="space-y-5">

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

        <div className="relative px-6 sm:px-8 py-7">
          {/* Date + badge plan */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-[12px] font-medium capitalize" style={{ color: 'rgba(255,255,255,0.45)' }}>{today}</p>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(244,121,32,0.2)', border: '1px solid rgba(244,121,32,0.3)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.orange }} />
              <span className="text-[10.5px] font-bold" style={{ color: C.orange }}>Plan Gratuit</span>
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-[26px] sm:text-[30px] font-black text-white mb-5"
            style={{ fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.5px' }}>
            Bonjour, {firstName}
          </h1>

          {/* Métriques principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* CA mensuel — métrique principale */}
            <div className="sm:col-span-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] mb-1"
                style={{ color: 'rgba(244,121,32,0.7)' }}>
                CA mensuel
              </p>
              <p className="text-[44px] sm:text-[52px] font-black leading-none text-white"
                style={{ fontFamily: 'Poppins,sans-serif' }}>
                {fmtXAF(monthlyRev)}
                <span className="text-[22px] font-bold ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  FCFA
                </span>
              </p>
              {s?.revenue_trend !== null && s?.revenue_trend !== undefined && (
                <span className={`inline-flex items-center gap-1 mt-2 text-[11px] font-bold rounded-full px-2.5 py-1 ${s.revenue_trend >= 0 ? '' : ''}`}
                  style={{
                    background: s.revenue_trend >= 0 ? 'rgba(22,163,74,0.18)' : 'rgba(220,38,38,0.18)',
                    color: s.revenue_trend >= 0 ? '#4ADE80' : '#F87171',
                  }}>
                  {s.revenue_trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {Math.abs(s.revenue_trend)}% vs mois préc.
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />

            {/* Stats secondaires */}
            <div className="sm:col-span-1 flex sm:flex-col gap-4 sm:gap-3 justify-between sm:justify-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Commandes
                </p>
                <p className="text-[26px] font-black text-white" style={{ fontFamily: 'Poppins,sans-serif' }}>
                  {monthlyOrds}
                  {pendingOrds > 0 && (
                    <span className="text-[11px] font-bold ml-2 px-2 py-0.5 rounded-full" style={{ background: C.amberL, color: C.amber }}>
                      {pendingOrds} en attente
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Clients uniques
                </p>
                <p className="text-[26px] font-black text-white" style={{ fontFamily: 'Poppins,sans-serif' }}>
                  {uniqueCust > 0 ? uniqueCust : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 mt-6 flex-wrap">
            <Link to="/seller/products/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-white text-[13px] transition-all hover:-translate-y-px"
              style={{ background: C.orange, boxShadow: `0 4px 18px rgba(244,121,32,0.5)` }}>
              <Plus size={16} />Ajouter un produit
            </Link>
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-[13px] transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Barre plan info */}
        <div className="px-6 sm:px-8 py-3 flex items-center gap-3 flex-wrap"
          style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {totalProds} produit{totalProds > 1 ? 's' : ''} · 20% commission · 0 boost
          </span>
          <Link to="/seller/plans"
            className="ml-auto flex items-center gap-1 text-[11.5px] font-bold hover:underline"
            style={{ color: C.orange }}>
            Passer au Pro <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>

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
            <p className="text-[13.5px] font-bold text-white" style={{ fontFamily: 'Poppins,sans-serif' }}>
              Débloquez le Plan Pro · 7 jours gratuits
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(196,181,253,0.65)' }}>
              Commission 10% · Analytics IA · 3 boosts inclus · Support 24h/7j
            </p>
          </div>
          <Link to="/seller/plans"
            className="flex-shrink-0 px-3.5 py-2 rounded-xl text-[11.5px] font-bold text-white whitespace-nowrap relative"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
            Voir les plans
          </Link>
          <button onClick={() => setShowBanner(false)}
            className="relative w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      {/*  4 KPI CARDS  */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'CA mensuel',
            value: `${fmtXAF(monthlyRev)} FCFA`,
            sub: avgOrder > 0 ? `${fmtXAF(avgOrder)} FCFA panier moy.` : undefined,
            trend: s?.revenue_trend ?? null,
            accentColor: C.orange,
            accentBg: C.orangeL,
          },
          {
            label: 'Commandes',
            value: `${monthlyOrds}`,
            sub: pendingOrds > 0 ? `${pendingOrds} en attente` : `${totalOrds} au total`,
            subWarn: pendingOrds > 0,
            trend: s?.orders_trend ?? null,
            accentColor: C.green,
            accentBg: C.greenL,
          },
          {
            label: 'Clients uniques',
            value: uniqueCust > 0 ? String(uniqueCust) : '—',
            sub: totalSales > 0 ? `${totalSales} unités vendues` : undefined,
            accentColor: C.blue,
            accentBg: C.blueL,
          },
          {
            label: 'Note boutique',
            value: shopRating !== null ? `${shopRating}/5` : '—',
            sub: reviewCount > 0 ? `${reviewCount} avis clients` : `${totalSales} ventes totales`,
            accentColor: C.amber,
            accentBg: C.amberL,
          },
        ].map((kpi, i) => (
          <Card key={i} className="p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default relative overflow-hidden group">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl transition-opacity opacity-0 group-hover:opacity-100"
              style={{ background: kpi.accentColor }} />

            {/* Valeur */}
            <p className="text-[28px] font-black leading-none tracking-tight mb-1.5"
              style={{ fontFamily: 'Poppins,sans-serif', color: C.text }}>
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
          { label: 'Ajouter produit', to: '/seller/products/new', primary: true },
          { label: `Commandes${pendingOrds > 0 ? ` (${pendingOrds})` : ''}`, to: '/seller/orders' },
          { label: 'Paiements',  to: '/seller/payments' },
          { label: 'Litiges',    to: '/seller/disputes' },
          { label: `Avis${reviewCount > 0 ? ` (${reviewCount})` : ''}`, to: '/seller/shop' },
          { label: 'Booster',    to: '/seller/boost' },
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
          <Share2 size={14} />Partager boutique
        </button>
      </div>

      {/* Plan chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: `${totalProds} produit${totalProds > 1 ? 's' : ''}`, ok: true },
          { label: '20% commission', ok: false },
          { label: '0 boost',        ok: false },
          { label: 'Analytics IA',   locked: true },
          { label: 'Heatmap',        locked: true },
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
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">

        {/* Objectif avec anneau */}
        <Card className="sm:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={14} style={{ color: C.orange }} />
              <span className="font-bold text-[13.5px]" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
                Objectif mensuel
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
                <Pencil size={10} />Modifier
              </button>
            )}
          </div>

          <div className="flex items-center gap-5">
            {/* SVG Ring */}
            <div className="relative flex-shrink-0">
              <Ring pct={goalPct} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[18px] font-black" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
                  {goalPct}%
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[13.5px] mb-0.5" style={{ color: C.text }}>
                {fmtXAF(monthlyRev)} FCFA
              </p>
              <p className="text-[10.5px] mb-2" style={{ color: C.muted }}>
                sur {fmtXAF(goal)} FCFA visés
              </p>
              {goalPct < 100 && (
                <p className="text-[10px]" style={{ color: C.muted }}>
                  Encore <strong style={{ color: C.text }}>{fmtXAF(Math.max(0, goal - monthlyRev))} FCFA</strong>
                </p>
              )}
              {goalPct >= 100 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1"
                  style={{ background: C.greenL, color: C.green }}>
                  <CheckCircle size={10} />Objectif atteint !
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
              Passez au plan <strong>Starter</strong> pour réduire votre commission 20% → 18% et accéder aux boosts.
            </p>
            <Link to="/seller/plans"
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap"
              style={{ background: C.white, border: '1px solid rgba(37,99,235,0.2)', color: C.blue }}>
              Voir les plans
            </Link>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              { label: 'Taux livraison', value: `${fulfRate}%`, ok: fulfRate >= 80 },
              { label: 'Taux retour',   value: `${returnRate}%`, ok: returnRate <= 5 },
            ].map((stat, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: stat.ok ? C.green : C.amber }} />
                  <p className="text-[11px] font-medium" style={{ color: C.muted }}>{stat.label}</p>
                </div>
                <p className="text-[20px] font-black" style={{ color: stat.ok ? C.green : C.amber, fontFamily: 'Poppins,sans-serif' }}>
                  {stat.value}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/*  GRAPHIQUE VENTES  */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.orangeL }}>
                <BarChart2 size={15} style={{ color: C.orange }} />
              </div>
              <p className="font-bold text-[14.5px]" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
                Revenus
              </p>
            </div>
            {chartData.length > 0 && (
              <div className="flex items-center gap-3 ml-10 text-[10.5px] flex-wrap" style={{ color: C.mutedL }}>
                <span>Total: <strong style={{ color: C.orange }}>{fmtXAF(chartTotal)} FCFA</strong></span>
                <span>·</span>
                <span>Moy: <strong style={{ color: C.muted }}>{fmtXAF(chartAvg)} FCFA</strong></span>
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
                {p === '7d' ? '7j' : p === '30d' ? '30j' : '12m'}
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
            <p className="text-[12px]" style={{ color: C.mutedL }}>Aucune vente sur cette période</p>
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
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.orangeL }}>
            <Flame size={15} style={{ color: C.orange }} />
          </div>
          <div>
            <p className="font-bold text-[14.5px]" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
              Heatmap ventes
            </p>
            <p className="text-[10.5px]" style={{ color: C.mutedL }}>Activité sur les 30 derniers jours</p>
          </div>
        </div>

        <p className="text-[9.5px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: C.mutedL }}>
          Jours de la semaine
        </p>
        {heatD.length > 0 ? (
          <div className="grid grid-cols-7 gap-2 mb-5">
            {heatD.map(d => (
              <div key={d.day} className="flex flex-col items-center gap-1.5">
                <HCell intensity={d.intensity} tooltip={`${d.day} · ${fmtXAF(d.revenue)} XAF · ${d.orders} cmd`} />
                <span className="text-[9px] font-medium" style={{ color: C.mutedL }}>{d.day}</span>
              </div>
            ))}
          </div>
        ) : <Bone h="h-8" r="rounded-xl" />}

        <p className="text-[9.5px] font-black uppercase tracking-[0.14em] mb-2" style={{ color: C.mutedL }}>
          Heures (0h → 23h)
        </p>
        {heatH.length > 0 ? (
          <div className="grid gap-1 mb-3" style={{ gridTemplateColumns: 'repeat(12,1fr)' }}>
            {heatH.map(h => (
              <HCell key={h.hour} intensity={h.intensity} tooltip={`${h.hour}h · ${fmtXAF(h.revenue)} XAF · ${h.orders} cmd`} />
            ))}
          </div>
        ) : <Bone h="h-5" />}

        <div className="flex items-center gap-2">
          <span className="text-[9px]" style={{ color: C.mutedL }}>Faible</span>
          <div className="flex gap-1">
            {[0, 0.2, 0.4, 0.65, 0.85, 1].map((v, i) => (
              <div key={i} className="w-5 h-3 rounded-sm" style={{ background: heatColor(v) }} />
            ))}
          </div>
          <span className="text-[9px]" style={{ color: C.mutedL }}>Fort</span>
        </div>
      </Card>

      {/*  ALERTES STOCK + PERFORMANCE  */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alertes stock */}
        <Card className="overflow-hidden">
          <SHead icon={<TriangleAlert size={14} />} title="Alertes stock" to="/seller/products" />
          {lowItems.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle size={22} style={{ color: C.green }} className="mx-auto mb-2" />
              <p className="text-[12px]" style={{ color: C.muted }}>Tous les stocks sont OK</p>
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
                  {item.stock_quantity === 0 ? 'Rupture de stock' : `${item.stock_quantity} unité${item.stock_quantity > 1 ? 's' : ''} restante${item.stock_quantity > 1 ? 's' : ''}`}
                </p>
              </div>
              <Link to={`/seller/products/${item.id}/edit`}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold transition-all"
                style={{ background: C.cream, border: `1px solid ${C.border}`, color: C.muted }}>
                Réappro.
              </Link>
            </div>
          ))}
        </Card>

        {/* Performance rapide */}
        <Card className="overflow-hidden">
          <SHead icon={<TrendingUp size={14} />} title="Performance rapide" />
          <div className="px-5 py-2">
            {[
              { label: 'Taux de livraison', sub: 'Commandes livrées vs payées', value: `${fulfRate}%`,  ok: fulfRate >= 80 },
              { label: 'Taux de retour',   sub: 'Remboursements',               value: `${returnRate}%`, ok: returnRate <= 5 },
              { label: 'Satisfaction',     sub: reviewCount > 0 ? `${reviewCount} avis clients` : 'Aucun avis encore', value: shopRating !== null ? `${shopRating}/5` : '—', ok: shopRating !== null && shopRating >= 4 },
              { label: 'Panier moyen',     sub: 'Valeur moyenne par commande',  value: avgOrder > 0 ? `${fmtXAF(avgOrder)} XAF` : '—', ok: avgOrder > 10_000 },
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
                <p className="text-[15px] font-extrabold" style={{ color: row.ok ? C.green : C.amber, fontFamily: 'Poppins,sans-serif' }}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/*  COMMANDES + TOP PRODUITS  */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Commandes récentes */}
        <Card className="overflow-hidden">
          <SHead icon={<ShoppingBag size={14} />} title="Dernières commandes" to="/seller/orders" />
          {orders.slice(0, 5).length === 0 ? (
            <div className="py-8 text-center"><p className="text-[12px]" style={{ color: C.muted }}>Aucune commande pour l'instant</p></div>
          ) : orders.slice(0, 5).map(order => {
            const pName  = order.items?.[0]?.product_title ?? `Commande ${order.id}`;
            const pImg   = order.items?.[0]?.product_image ?? null;
            const vTotal = order.vendor_total ?? Number(order.total_xaf);
            const fSt    = order.fulfillment_status ?? 'PENDING';
            const badge  = FULFILL[fSt] ?? { label: fSt, color: C.muted, bg: C.cream };
            return (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: C.orangeL }}>
                  {pImg ? <img src={pImg} alt={pName} className="w-full h-full object-cover" /> : <Truck size={15} style={{ color: C.orange }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold" style={{ color: C.text }}>{orderRef(order.id)}</p>
                  <p className="text-[10.5px] truncate" style={{ color: C.muted }}>{pName} · {fmtDate(order.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Pill label={badge.label} color={badge.color} bg={badge.bg} />
                  <p className="text-[13px] font-extrabold" style={{ color: C.orange, fontFamily: 'Poppins,sans-serif' }}>
                    {fmtXAF(vTotal)} FCFA
                  </p>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Top produits */}
        <Card className="overflow-hidden">
          <SHead icon={<TrendingUp size={14} />} title="Top produits" to="/seller/products" />
          {topProds.length === 0 ? (
            <div className="py-8 text-center"><p className="text-[12px]" style={{ color: C.muted }}>Aucune vente enregistrée</p></div>
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
                    <span className="text-[9.5px] flex-shrink-0" style={{ color: C.mutedL }}>{p.sales_count} ventes</span>
                  </div>
                </div>
                <p className="text-[13px] font-extrabold flex-shrink-0" style={{ color: C.orange, fontFamily: 'Poppins,sans-serif' }}>
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
            <span className="font-bold text-[14.5px]" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
              Mes produits
            </span>
            <span className="text-[10px] font-black text-white rounded-full px-2 py-0.5"
              style={{ background: C.orange }}>
              {totalProds}
            </span>
          </div>
          <Link to="/seller/products" className="text-[12px] font-bold flex items-center gap-1 hover:underline" style={{ color: C.orange }}>
            Tout voir <ChevronRight size={12} />
          </Link>
        </div>
        {products.slice(0, 5).length === 0 ? (
          <div className="py-10 text-center">
            <Package size={24} style={{ color: C.border }} className="mx-auto mb-3" />
            <p className="text-[12px] mb-4" style={{ color: C.muted }}>Aucun produit pour l'instant</p>
            <Link to="/seller/products/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12.5px] font-bold text-white"
              style={{ background: C.orange }}>
              <Plus size={14} />Créer mon premier produit
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Produit', 'Prix', 'Stock', 'Statut', ''].map((h, i) => (
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
                          {p.is_active ? 'Actif' : 'Inactif'}
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
        <Card className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.amberL }}>
              <Star size={14} style={{ color: C.amber }} />
            </div>
            <p className="font-bold text-[14.5px]" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
              Avis clients
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div>
              <p className="text-[48px] font-black leading-none" style={{ color: C.text, fontFamily: 'Poppins,sans-serif' }}>
                {shopRating.toFixed(1)}
              </p>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={14} style={i <= Math.round(shopRating)
                    ? { color: C.amber, fill: C.amber }
                    : { color: C.border, fill: C.border }} />
                ))}
              </div>
              <p className="text-[10.5px] mt-1" style={{ color: C.muted }}>{reviewCount} avis</p>
            </div>
            <Link to="/seller/shop"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-semibold transition-all"
              style={{ background: C.cream, border: `1px solid ${C.border}`, color: C.muted }}>
              <Store size={13} />Voir ma boutique
            </Link>
          </div>
        </Card>
      )}

    </div>
  );
}