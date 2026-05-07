// frontend/src/features/admin/vendors/VendorsListPage.tsx
// Gestion vendeurs BelivaY — page admin complète.
// KPIs · GMV Chart · Donuts · Filtres · Tableau/Cards · Actions · Pagination

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  RefreshCw, AlertCircle, ChevronLeft, ChevronRight,
  Search, Download, Eye, MoreHorizontal, CheckCircle,
  XCircle, Ban, ChevronDown, X, Filter,
  ArrowUpDown, ArrowUp, ArrowDown, ShoppingCart,
  Package, Trophy,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { adminApi, type VendorProfile } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface VendorStats {
  kpis: {
    total: number; pending: number; approved: number;
    rejected: number; suspended: number;
    new_week: number; new_month: number;
    gmv_total: number; gmv_month: number;
  };
  gmv_chart:           Array<{ date: string; revenue: number }>;
  status_distribution: Array<{ status: string; label: string; count: number }>;
  plan_distribution:   Array<{ plan: string; count: number }>;
  cert_distribution:   Array<{ tier: string; count: number }>;
}

type SortKey     = 'business_name' | 'created_at' | 'total_orders' | 'total_revenue' | 'total_products';
type SortDir     = 'asc' | 'desc';
type StatusTab   = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
type PlanFilter  = 'all' | 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
type DateFilter  = 'all' | 'today' | 'week' | 'month';
type TopPeriod = 'day' | 'week' | 'month';

const PAGE_SIZES = [10, 20, 50] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG VISUELLE
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'En attente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  APPROVED:  { label: 'Approuvé',   color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:  { label: 'Rejeté',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  SUSPENDED: { label: 'Suspendu',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

const PLAN_CFG: Record<string, { label: string; color: string; bg: string }> = {
  FREE:     { label: 'Gratuit',  color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  STARTER:  { label: 'Starter', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  PRO:      { label: 'Pro',     color: '#F47920', bg: 'rgba(244,121,32,0.12)'  },
  BUSINESS: { label: 'Business',color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};

const CERT_CFG: Record<string, { label: string; color: string }> = {
  BRONZE:  { label: 'Bronze',  color: '#CD7F32' },
  SILVER:  { label: 'Argent',  color: '#A8A9AD' },
  GOLD:    { label: 'Or',      color: '#FFD700' },
  DIAMOND: { label: 'Diamant', color: '#60A5FA' },
};

const CHART_COLORS = ['#10B981', '#F59E0B', '#9CA3AF', '#EF4444'];
const PLAN_COLORS  = ['#9CA3AF', '#3B82F6', '#F47920', '#8B5CF6'];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf    = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate   = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtShort  = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const isNew     = (d: string) => Date.now() - new Date(d).getTime() < 7 * 86400_000;

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' };
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
      {cfg.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return null;
  const cfg = PLAN_CFG[plan] ?? PLAN_CFG.FREE;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
      {cfg.label}
    </span>
  );
}

function CertBadge({ tier }: { tier: string }) {
  const cfg = CERT_CFG[tier] ?? CERT_CFG.BRONZE;
  return (
    <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: cfg.color + '18', color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function VendorAvatar({ vendor, size = 32 }: { vendor: VendorProfile; size?: number }) {
  const initial = (vendor.business_name?.[0] ?? 'V').toUpperCase();
  const statusColor =
    vendor.status === 'APPROVED'  ? '#10B981' :
    vendor.status === 'PENDING'   ? '#F59E0B' :
    vendor.status === 'SUSPENDED' ? '#9CA3AF' : '#EF4444';
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 4,
      background: `linear-gradient(135deg, ${statusColor}33, ${statusColor}66)`,
      border: `2px solid ${statusColor}44`,
      color: statusColor, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 800, fontSize: size * 0.42, flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

function SkeletonRow({ T }: { T: ReturnType<typeof useAdminTheme> }) {
  return (
    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
      {[40, 60, 20, 20, 25, 25, 20, 18, 10].map((w, i) => (
        <td key={i} style={{ padding: '14px 14px' }}>
          <div style={{ height: 11, width: `${w}%`, borderRadius: 5, background: T.border, animation: 'shimmer 1.4s ease-in-out infinite', backgroundImage: `linear-gradient(90deg,${T.border} 25%,${T.cardAlt} 50%,${T.border} 75%)`, backgroundSize: '200% 100%' }} />
        </td>
      ))}
    </tr>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  const T = useAdminTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
      <p style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{fmtXaf(payload[0].value)}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function VendorsListPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();
  const [searchParams] = useSearchParams();

  const [vendors,   setVendors]  = useState<VendorProfile[]>([]);
  const [stats,     setStats]    = useState<VendorStats | null>(null);
  const [loading,   setLoading]  = useState(true);
  const [acting,    setActing]   = useState<number | null>(null);
  const [mobileMenu,setMobileMenu] = useState<number | null>(null);

  // filtres
  const [statusTab, setStatusTab] = useState<StatusTab>(() => {
    const s = searchParams.get('status');
    return (s && ['PENDING','APPROVED','REJECTED','SUSPENDED'].includes(s)) ? s as StatusTab : 'all';
  });
  const [planF,   setPlanF]   = useState<PlanFilter>('all');
  const [dateF,   setDateF]   = useState<DateFilter>('all');
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState<SortKey>('created_at');
  const [dir,     setDir]     = useState<SortDir>('desc');
  const [page,    setPage]    = useState(1);
  const [pageSize,setPageSize]= useState<10 | 20 | 50>(20);
  const [openDrop,setOpenDrop]= useState<'plan' | 'date' | null>(null);
  const [topPeriod, setTopPeriod] = useState<TopPeriod>('week');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────
  // listVendors est critique : la liste s'affiche même si les stats échouent.
  // getVendorStats est optionnel : les graphiques restent null sans bloquer.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const vList = await adminApi.listVendors();
      setVendors(vList);
    } catch {
      showToast('Erreur chargement vendeurs', 'error');
    } finally {
      setLoading(false);
    }
    // Stats en parallèle — silencieuses si l'endpoint n'est pas encore dispo
    try {
      const vStats = await adminApi.getVendorStats();
      setStats(vStats);
    } catch {
      // Stats non disponibles — graphiques masqués, liste toujours visible
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrage ─────────────────────────────────────────────────────────────
  const now = Date.now();
  const filtered = vendors.filter(v => {
    if (statusTab !== 'all' && v.status !== statusTab) return false;
    if (planF     !== 'all' && v.plan_code !== planF)   return false;
    const created = new Date(v.created_at).getTime();
    if (dateF === 'today' && now - created > 86400_000)      return false;
    if (dateF === 'week'  && now - created > 7 * 86400_000)  return false;
    if (dateF === 'month' && now - created > 30 * 86400_000) return false;
    const q = search.toLowerCase();
    if (q && ![v.business_name, v.user_email, v.city, v.phone, v.user_full_name]
      .some(x => x?.toLowerCase().includes(q))) return false;
    return true;
  });

  // ── Tri ───────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const va =
      sort === 'business_name'  ? a.business_name :
      sort === 'created_at'     ? a.created_at :
      sort === 'total_orders'   ? (a.total_orders   ?? 0) :
      sort === 'total_revenue'  ? (a.total_revenue  ?? 0) :
      sort === 'total_products' ? (a.total_products ?? 0) : '';
    const vb =
      sort === 'business_name'  ? b.business_name :
      sort === 'created_at'     ? b.created_at :
      sort === 'total_orders'   ? (b.total_orders   ?? 0) :
      sort === 'total_revenue'  ? (b.total_revenue  ?? 0) :
      sort === 'total_products' ? (b.total_products ?? 0) : '';
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ?  1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(k); setDir('desc'); }
    setPage(1);
  };

  const handleSearch = (v: string) => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 220);
  };

  const activeFilters = [planF !== 'all', dateF !== 'all'].filter(Boolean).length;
  const resetFilters  = () => { setPlanF('all'); setDateF('all'); setSearch(''); setPage(1); };
  const topVendors = [...vendors]
    .filter((vendor) => vendor.status === 'APPROVED')
    .sort((a, b) => {
      const scoreA = (a.total_revenue ?? 0) + (a.total_orders ?? 0) * 1500 + (a.total_products ?? 0) * 250;
      const scoreB = (b.total_revenue ?? 0) + (b.total_orders ?? 0) * 1500 + (b.total_products ?? 0) * 250;
      return scoreB - scoreA;
    })
    .slice(0, topPeriod === 'day' ? 5 : topPeriod === 'week' ? 7 : 10);

  // ── Actions ───────────────────────────────────────────────────────────────
  const doAction = async (v: VendorProfile, action: 'approve' | 'reject' | 'suspend') => {
    const cfgs = {
      approve: { title: `Approuver ${v.business_name} ?`,  message: 'Le vendeur pourra mettre des produits en vente.',  type: 'warning' as const, confirmText: 'Approuver' },
      reject:  { title: `Rejeter ${v.business_name} ?`,    message: 'La demande sera définitivement rejetée.',           type: 'danger'  as const, confirmText: 'Rejeter'   },
      suspend: { title: `Suspendre ${v.business_name} ?`,  message: 'La boutique sera désactivée immédiatement.',        type: 'warning' as const, confirmText: 'Suspendre' },
    };
    const ok = await confirm({ ...cfgs[action], cancelText: 'Annuler' });
    if (!ok) return;
    setActing(v.id);
    try {
      if (action === 'approve')      await adminApi.approveVendor(v.id);
      else if (action === 'reject')  await adminApi.rejectVendor(v.id);
      else                           await adminApi.suspendVendor(v.id);
      showToast('Action effectuée', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = 'ID;Boutique;Propriétaire;Email;Ville;Statut;Plan;Certification;Produits;Revenus;Commandes;Inscrit';
    const rows    = sorted.map(v => [
      v.id, v.business_name, v.user_full_name, v.user_email, v.city,
      STATUS_CFG[v.status]?.label ?? v.status,
      PLAN_CFG[v.plan_code ?? 'FREE']?.label ?? 'Gratuit',
      CERT_CFG[v.certification_tier]?.label ?? v.certification_tier,
      v.total_products ?? 0, v.total_revenue ?? 0, v.total_orders ?? 0,
      fmtDate(v.created_at),
    ].join(';'));
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `belivay_vendors_${new Date().toISOString().slice(0,10)}.csv` });
    a.click(); URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k
      ? <ArrowUpDown size={11} style={{ color: T.muted, opacity: 0.4 }} />
      : dir === 'asc'
        ? <ArrowUp   size={11} style={{ color: T.red }} />
        : <ArrowDown size={11} style={{ color: T.red }} />;

  // ── Dropdown helpers ──────────────────────────────────────────────────────
  const DropBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap"
      style={{ background: active ? T.red + '18' : T.cardAlt, color: active ? T.red : T.muted, border: `1px solid ${active ? T.red + '40' : T.border}` }}>
      {label} <ChevronDown size={11} />
    </button>
  );

  const DropMenu = ({ children, show }: { children: React.ReactNode; show: boolean }) =>
    show ? (
      <div className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 min-w-[150px]"
        style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    ) : null;

  const DropItem = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={() => { onClick(); setOpenDrop(null); }}
      className="w-full flex items-center gap-2 px-4 py-2 text-left text-[12px] transition-all"
      style={{ color: active ? T.red : T.text, background: active ? T.red + '10' : 'transparent', fontWeight: active ? 700 : 400 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? T.red : 'transparent', flexShrink: 0 }} />
      {label}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" onClick={() => setOpenDrop(null)}>

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Gestion Vendeurs
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {stats?.kpis.pending !== undefined && stats.kpis.pending > 0 && (
              <span style={{ color: T.red, fontWeight: 700, marginRight: 6 }}>
                {stats.kpis.pending} en attente ·
              </span>
            )}
            {vendors.length.toLocaleString('fr-FR')} boutiques enregistrées
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            <Download size={13} /> <span className="hidden sm:inline">Exporter CSV</span>
          </button>
          <button onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total boutiques',  value: stats?.kpis.total    ?? '—', sub: `+${stats?.kpis.new_month ?? 0} ce mois`,   accent: T.text,    tab: 'all'      as StatusTab },
          { label: 'En attente',       value: stats?.kpis.pending  ?? '—', sub: 'à valider',                                accent: '#F59E0B', tab: 'PENDING'  as StatusTab },
          { label: 'Approuvés',        value: stats?.kpis.approved ?? '—', sub: 'boutiques actives',                        accent: '#10B981', tab: 'APPROVED' as StatusTab },
          { label: 'GMV ce mois',      value: stats ? fmtXaf(stats.kpis.gmv_month) : '—', sub: `Total : ${stats ? fmtXaf(stats.kpis.gmv_total) : '—'}`, accent: '#8B5CF6', tab: null },
        ].map((kpi, i) => (
          <button key={i}
            onClick={() => { if (kpi.tab) { setStatusTab(kpi.tab); setPage(1); } }}
            className="rounded-2xl p-4 text-left transition-all w-full"
            style={{
              background: statusTab === kpi.tab && kpi.tab ? kpi.accent + '10' : T.card,
              border: `1px solid ${statusTab === kpi.tab && kpi.tab ? kpi.accent + '55' : T.border}`,
            }}
            onMouseEnter={e => { if (kpi.tab) (e.currentTarget.style.borderColor = kpi.accent + '44'); }}
            onMouseLeave={e => { if (kpi.tab && statusTab !== kpi.tab) (e.currentTarget.style.borderColor = T.border); }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{kpi.label}</p>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: loading ? T.border : T.text, lineHeight: 1 }}>
              {loading ? '—' : (typeof kpi.value === 'number' ? kpi.value.toLocaleString('fr-FR') : kpi.value)}
            </p>
            <p style={{ fontSize: 11, color: kpi.accent === T.text ? T.muted : kpi.accent, marginTop: 4 }}>{kpi.sub}</p>
          </button>
        ))}
      </div>

      <section className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#F59E0B18', color: '#F59E0B' }}>
              <Trophy size={17} />
            </div>
            <div>
              <h2 style={{ color: T.text, fontSize: 14, fontWeight: 800 }}>Top vendeurs</h2>
              <p style={{ color: T.muted, fontSize: 11.5 }}>Tri par performance commerciale</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-xl p-1" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
            {([
              { key: 'day', label: 'Jour' },
              { key: 'week', label: 'Semaine' },
              { key: 'month', label: 'Mois' },
            ] as { key: TopPeriod; label: string }[]).map((period) => (
              <button
                key={period.key}
                type="button"
                onClick={() => setTopPeriod(period.key)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-bold"
                style={{ background: topPeriod === period.key ? T.red : 'transparent', color: topPeriod === period.key ? '#fff' : T.muted }}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(topVendors.length ? topVendors : vendors.slice(0, 3)).map((vendor, index) => (
            <Link
              key={vendor.id}
              to={`/admin/vendors/${vendor.id}`}
              className="flex items-center gap-3 rounded-xl p-3 transition-all hover:-translate-y-0.5"
              style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-black"
                style={{ background: index < 3 ? '#F59E0B22' : T.card, color: index < 3 ? '#F59E0B' : T.muted }}>
                #{index + 1}
              </div>
              <VendorAvatar vendor={vendor} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate" style={{ color: T.text, fontSize: 13, fontWeight: 800 }}>{vendor.business_name}</p>
                <p className="truncate" style={{ color: T.muted, fontSize: 11 }}>{vendor.city || 'Ville non renseignée'} · {vendor.total_orders ?? 0} commandes</p>
              </div>
              <span style={{ color: T.red, fontSize: 12, fontWeight: 800 }}>{fmtXaf(vendor.total_revenue ?? 0)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* GMV 30j — 2/3 */}
          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text }}>
                  GMV Plateforme — 30 jours
                </p>
                <p style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                  Volume brut de marchandises vendues
                </p>
              </div>
              <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', fontSize: 11, fontWeight: 700 }}>
                {fmtXaf(stats.kpis.gmv_month)} ce mois
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={stats.gmv_chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : `${Math.round(v / 1000)}k`} width={32} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} fill="url(#gmvGrad)" dot={false} activeDot={{ r: 4, fill: '#8B5CF6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 3 Donuts — 1/3 */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>

            {/* Statuts */}
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 8 }}>Statuts</p>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={80} height={80}>
                  <PieChart>
                    <Pie data={stats.status_distribution} dataKey="count" cx="50%" cy="50%" innerRadius={25} outerRadius={38} paddingAngle={2}>
                      {stats.status_distribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {stats.status_distribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div style={{ width: 6, height: 6, borderRadius: 2, background: CHART_COLORS[i], flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, color: T.muted }}>{d.label}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: T.border }} />

            {/* Plans */}
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 8 }}>Plans</p>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={80} height={80}>
                  <PieChart>
                    <Pie data={stats.plan_distribution} dataKey="count" cx="50%" cy="50%" innerRadius={25} outerRadius={38} paddingAngle={2}>
                      {stats.plan_distribution.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {stats.plan_distribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div style={{ width: 6, height: 6, borderRadius: 2, background: PLAN_COLORS[i], flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, color: T.muted }}>{PLAN_CFG[d.plan]?.label ?? d.plan}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>

        {/* Tabs statuts */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
            {([
              { key: 'all'       as StatusTab, label: 'Tous',         count: vendors.length },
              { key: 'PENDING'   as StatusTab, label: 'En attente',   count: stats?.kpis.pending   ?? 0, alert: (stats?.kpis.pending ?? 0) > 0 },
              { key: 'APPROVED'  as StatusTab, label: 'Approuvés',    count: stats?.kpis.approved  ?? 0 },
              { key: 'SUSPENDED' as StatusTab, label: 'Suspendus',    count: stats?.kpis.suspended ?? 0 },
              { key: 'REJECTED'  as StatusTab, label: 'Rejetés',      count: stats?.kpis.rejected  ?? 0 },
            ] as { key: StatusTab; label: string; count: number; alert?: boolean }[]).map(t => (
              <button key={t.key}
                onClick={() => { setStatusTab(t.key); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all"
                style={{ background: statusTab === t.key ? (t.alert ? '#F59E0B' : T.red) : 'transparent', color: statusTab === t.key ? '#fff' : (t.alert ? '#F59E0B' : T.muted) }}
                onMouseEnter={e => { if (statusTab !== t.key) (e.currentTarget.style.color = T.text); }}
                onMouseLeave={e => { if (statusTab !== t.key) (e.currentTarget.style.color = t.alert ? '#F59E0B' : T.muted); }}>
                {t.label}
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, fontWeight: 700, background: statusTab === t.key ? 'rgba(255,255,255,0.25)' : T.cardAlt, color: statusTab === t.key ? '#fff' : (t.alert ? '#F59E0B' : T.muted) }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1 hidden sm:block" />

          {/* Recherche */}
          <div className="relative w-full sm:w-60 flex-shrink-0">
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input type="text" placeholder="Boutique, email, ville…"
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none transition-all"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`, fontFamily: "'Plus Jakarta Sans',sans-serif" }}
              onFocus={e  => (e.target.style.borderColor = T.red)}
              onBlur={e   => (e.target.style.borderColor = T.inputBorder)} />
          </div>
        </div>

        {/* Ligne 2 : dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} style={{ color: T.muted, flexShrink: 0 }} />

          <div className="relative" onClick={e => e.stopPropagation()}>
            <DropBtn label={planF === 'all' ? 'Plan' : PLAN_CFG[planF]?.label ?? planF} active={planF !== 'all'} onClick={() => setOpenDrop(openDrop === 'plan' ? null : 'plan')} />
            <DropMenu show={openDrop === 'plan'}>
              <DropItem label="Tous les plans" active={planF === 'all'} onClick={() => { setPlanF('all'); setPage(1); }} />
              {(['FREE','STARTER','PRO','BUSINESS'] as PlanFilter[]).map(k => (
                <DropItem key={k} label={PLAN_CFG[k]?.label ?? k} active={planF === k} onClick={() => { setPlanF(k); setPage(1); }} />
              ))}
            </DropMenu>
          </div>

          <div className="relative" onClick={e => e.stopPropagation()}>
            <DropBtn label={({ all: 'Période', today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois' } as Record<DateFilter,string>)[dateF]} active={dateF !== 'all'} onClick={() => setOpenDrop(openDrop === 'date' ? null : 'date')} />
            <DropMenu show={openDrop === 'date'}>
              {([['all','Toutes périodes'],['today',"Aujourd'hui"],['week','Cette semaine'],['month','Ce mois']] as [DateFilter,string][]).map(([k,l]) => (
                <DropItem key={k} label={l} active={dateF === k} onClick={() => { setDateF(k as DateFilter); setPage(1); }} />
              ))}
            </DropMenu>
          </div>

          {activeFilters > 0 && (
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: T.red + '10', color: T.red, border: `1px solid ${T.red}30` }}>
              <X size={11} /> {activeFilters} filtre{activeFilters > 1 ? 's' : ''}
            </button>
          )}

          <p style={{ fontSize: 12, color: T.muted, marginLeft: 'auto' }}>
            {sorted.length} résultat{sorted.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                {([
                  { label: 'Boutique',    k: 'business_name'  as SortKey | null },
                  { label: 'Statut',      k: null },
                  { label: 'Plan',        k: null },
                  { label: 'Cert.',       k: null },
                  { label: 'Produits',    k: 'total_products' as SortKey | null },
                  { label: 'Revenus',     k: 'total_revenue'  as SortKey | null },
                  { label: 'Commandes',   k: 'total_orders'   as SortKey | null },
                  { label: 'Inscrit',     k: 'created_at'     as SortKey | null },
                  { label: '',            k: null },
                ] as { label: string; k: SortKey | null }[]).map((col, i) => (
                  <th key={i}
                    onClick={col.k ? () => toggleSort(col.k!) : undefined}
                    className={col.k ? 'cursor-pointer select-none' : ''}
                    style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: sort === col.k ? T.red : T.muted }}>
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.k && <SortIcon k={col.k} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} T={T} />)
                : paginated.length === 0
                  ? (
                    <tr><td colSpan={9} style={{ padding: '60px 0', textAlign: 'center' }}>
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle size={28} style={{ color: T.muted }} />
                        <p style={{ fontSize: 14, color: T.muted }}>Aucune boutique trouvée</p>
                        {activeFilters > 0 && <button onClick={resetFilters} style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>Réinitialiser les filtres</button>}
                      </div>
                    </td></tr>
                  )
                  : paginated.map((v, i) => (
                    <tr key={v.id}
                      style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${T.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* Boutique */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-2.5">
                          <VendorAvatar vendor={v} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>{v.business_name}</p>
                              {isNew(v.created_at) && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>NOUVEAU</span>}
                            </div>
                            <p style={{ fontSize: 11, color: T.muted }}>{v.user_email}</p>
                            {v.city && <p style={{ fontSize: 10.5, color: T.muted }}>{v.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}><StatusBadge status={v.status} /></td>
                      <td style={{ padding: '12px 14px' }}><PlanBadge plan={v.plan_code ?? null} /></td>
                      <td style={{ padding: '12px 14px' }}><CertBadge tier={v.certification_tier} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-1">
                          <Package size={11} style={{ color: T.muted }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v.total_products ?? 0}</span>
                          <span style={{ fontSize: 10, color: T.muted }}>/{v.active_products ?? 0} actifs</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: (v.total_revenue ?? 0) > 0 ? '#10B981' : T.muted }}>
                          {fmtXaf(v.total_revenue ?? 0)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-1">
                          <ShoppingCart size={11} style={{ color: T.muted }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v.total_orders ?? 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(v.created_at)}</td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-1 justify-end">
                          <Link to={`/admin/vendors/${v.id}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                            <Eye size={12} />
                          </Link>
                          <div className="relative">
                            <button
                              onClick={() => setMobileMenu(mobileMenu === v.id ? null : v.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                              {acting === v.id ? <RefreshCw size={11} className="animate-spin" /> : <MoreHorizontal size={12} />}
                            </button>
                            {mobileMenu === v.id && (
                              <div className="absolute right-0 top-8 z-20 rounded-xl py-1 overflow-hidden"
                                style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: 160 }}>
                                {v.status === 'PENDING' && (
                                  <>
                                    <button onClick={() => { setMobileMenu(null); doAction(v, 'approve'); }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#10B981' }}>
                                      <CheckCircle size={13} /> Approuver
                                    </button>
                                    <button onClick={() => { setMobileMenu(null); doAction(v, 'reject'); }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#EF4444' }}>
                                      <XCircle size={13} /> Rejeter
                                    </button>
                                  </>
                                )}
                                {v.status === 'APPROVED' && (
                                  <button onClick={() => { setMobileMenu(null); doAction(v, 'suspend'); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#F59E0B' }}>
                                    <Ban size={13} /> Suspendre
                                  </button>
                                )}
                                {v.status === 'SUSPENDED' && (
                                  <button onClick={() => { setMobileMenu(null); doAction(v, 'approve'); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#10B981' }}>
                                    <CheckCircle size={13} /> Réactiver
                                  </button>
                                )}
                                {v.status === 'REJECTED' && (
                                  <button onClick={() => { setMobileMenu(null); doAction(v, 'approve'); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#10B981' }}>
                                    <CheckCircle size={13} /> Approuver quand même
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Mobile — cards */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle size={28} style={{ color: T.muted }} />
              <p style={{ fontSize: 14, color: T.muted }}>Aucune boutique trouvée</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: T.border }}>
              {paginated.map(v => (
                <div key={v.id} className="p-4 flex items-start gap-3">
                  <VendorAvatar vendor={v} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p style={{ fontSize: 13, fontWeight: 600, color: T.text }} className="truncate">{v.business_name}</p>
                          {isNew(v.created_at) && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10B981', flexShrink: 0 }}>NOUVEAU</span>}
                        </div>
                        <p style={{ fontSize: 11, color: T.muted }} className="truncate">{v.user_email}</p>
                      </div>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <PlanBadge plan={v.plan_code ?? null} />
                      <CertBadge tier={v.certification_tier} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span style={{ fontSize: 11, color: T.muted }}><Package size={10} style={{ display: 'inline', marginRight: 3 }} />{v.total_products ?? 0} produits</span>
                      {(v.total_revenue ?? 0) > 0 && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>{fmtXaf(v.total_revenue ?? 0)}</span>}
                      {v.city && <span style={{ fontSize: 11, color: T.muted }}>{v.city}</span>}
                    </div>
                  </div>
                  {/* Menu mobile */}
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setMobileMenu(mobileMenu === v.id ? null : v.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                      <MoreHorizontal size={14} />
                    </button>
                    {mobileMenu === v.id && (
                      <div className="absolute right-0 top-10 z-20 rounded-xl overflow-hidden py-1"
                        style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 160 }}>
                        <Link to={`/admin/vendors/${v.id}`} className="flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: T.text }} onClick={() => setMobileMenu(null)}>
                          <Eye size={13} /> Voir la fiche
                        </Link>
                        {v.status === 'PENDING' && <>
                          <button onClick={() => { setMobileMenu(null); doAction(v, 'approve'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#10B981' }}><CheckCircle size={13} /> Approuver</button>
                          <button onClick={() => { setMobileMenu(null); doAction(v, 'reject'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#EF4444' }}><XCircle size={13} /> Rejeter</button>
                        </>}
                        {v.status === 'APPROVED' && (
                          <button onClick={() => { setMobileMenu(null); doAction(v, 'suspend'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#F59E0B' }}><Ban size={13} /> Suspendre</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 flex-wrap gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 12, color: T.muted }}>Lignes :</span>
              {PAGE_SIZES.map(s => (
                <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                  className="w-8 h-7 rounded-lg text-[12px] font-semibold"
                  style={{ background: pageSize === s ? T.red : T.cardAlt, color: pageSize === s ? '#fff' : T.muted, border: `1px solid ${pageSize === s ? T.red : T.border}` }}>
                  {s}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: T.muted }}>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} sur {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: T.cardAlt, color: page === 1 ? T.muted : T.text, border: `1px solid ${T.border}`, opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p); return acc;
                }, [])
                .map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} style={{ fontSize: 12, color: T.muted, padding: '0 4px' }}>…</span>
                    : <button key={p} onClick={() => setPage(p as number)}
                        className="w-8 h-8 rounded-lg text-[12px] font-semibold flex items-center justify-center"
                        style={{ background: page === p ? T.red : T.cardAlt, color: page === p ? '#fff' : T.muted, border: `1px solid ${page === p ? T.red : T.border}` }}>
                        {p}
                      </button>
                )
              }
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: T.cardAlt, color: page === totalPages ? T.muted : T.text, border: `1px solid ${T.border}`, opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
