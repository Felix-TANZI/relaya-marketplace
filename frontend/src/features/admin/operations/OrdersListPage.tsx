// frontend/src/features/admin/orders/OrdersListPage.tsx
// Gestion des commandes — admin BelivaY
// KPIs · Filtres multi-niveaux · Tableau/Cards · Pagination

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, RefreshCw, AlertCircle, Download,
  ChevronLeft, ChevronRight, Eye, XCircle, CheckCircle,
  Clock, Truck, Package, Ban, ArrowUpDown, ArrowUp, ArrowDown,
  Filter, ChevronDown, X,
} from 'lucide-react';
import { adminApi, type AdminOrder } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'En attente',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  PAID:     { label: 'Payée',        color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  FAILED:   { label: 'Échouée',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  REFUNDED: { label: 'Remboursée',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
};

const FULFILLMENT_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING:    { label: 'En attente',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: Clock       },
  PROCESSING: { label: 'En cours',      color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  icon: Package     },
  SHIPPED:    { label: 'Expédiée',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  icon: Truck       },
  DELIVERED:  { label: 'Livrée',        color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle },
  CANCELLED:  { label: 'Annulée',       color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: Ban         },
};

type SortKey    = 'id' | 'created_at' | 'total_xaf';
type SortDir    = 'asc' | 'desc';
type PayTab     = 'all' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
type FulfillTab = 'all' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
type DateFilter = 'all' | 'today' | 'week' | 'month';

const PAGE_SIZES = [10, 20, 50] as const;

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function PayBadge({ status }: { status: string }) {
  const c = PAYMENT_CFG[status] ?? PAYMENT_CFG.PENDING;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.color, border: `1px solid ${c.color}40`, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

function FulfillBadge({ status }: { status: string }) {
  const c   = FULFILLMENT_CFG[status] ?? FULFILLMENT_CFG.PENDING;
  const Icon = c.icon;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.color, border: `1px solid ${c.color}40`, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <Icon size={10} /> {c.label}
    </span>
  );
}

function SkeletonRow({ T }: { T: ReturnType<typeof useAdminTheme> }) {
  return (
    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
      {[8, 30, 15, 15, 20, 20, 15, 8].map((w, i) => (
        <td key={i} style={{ padding: '14px 14px' }}>
          <div style={{ height: 11, width: `${w * 4}px`, borderRadius: 5, background: T.border, animation: 'shimmer 1.4s ease-in-out infinite', backgroundImage: `linear-gradient(90deg,${T.border} 25%,${T.cardAlt} 50%,${T.border} 75%)`, backgroundSize: '200% 100%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function OrdersListPage() {
  const T              = useAdminTheme();
  const { showToast }  = useToast();
  const { confirm }    = useConfirm();
  const [searchParams] = useSearchParams();

  const [orders,   setOrders]  = useState<AdminOrder[]>([]);
  const [loading,  setLoading] = useState(true);
  const [acting,   setActing]  = useState<number | null>(null);

  // Filtres — initialisés depuis l'URL si présents (ex: ?vendor=3)
  const [payTab,   setPayTab]  = useState<PayTab>(() => {
    const p = searchParams.get('payment_status');
    return (['PENDING','PAID','FAILED','REFUNDED'].includes(p ?? '') ? p as PayTab : 'all');
  });
  const [fulfillTab, setFulfillTab] = useState<FulfillTab>(() => {
    const f = searchParams.get('fulfillment_status');
    return (['PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].includes(f ?? '') ? f as FulfillTab : 'all');
  });
  const [dateF,    setDateF]   = useState<DateFilter>('all');
  const [search,   setSearch]  = useState('');
  const [sort,     setSort]    = useState<SortKey>('created_at');
  const [dir,      setDir]     = useState<SortDir>('desc');
  const [page,     setPage]    = useState(1);
  const [pageSize, setPageSize]= useState<10 | 20 | 50>(20);
  const [openDrop, setOpenDrop]= useState<'date' | 'fulfill' | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Passage des filtres backend pour réduire la charge
      const filters: Record<string, string> = {};
      if (payTab     !== 'all') filters.payment_status     = payTab;
      if (fulfillTab !== 'all') filters.fulfillment_status = fulfillTab;
      const vendorId = searchParams.get('vendor');
      if (vendorId) filters.vendor = vendorId;
      const userId = searchParams.get('user');
      if (userId) filters.search = `user:${userId}`;
      const data = await adminApi.listOrders(filters);
      setOrders(data);
    } catch {
      showToast('Erreur chargement des commandes', 'error');
    } finally {
      setLoading(false);
    }
  }, [payTab, fulfillTab, searchParams, showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrage local (date + recherche texte) ───────────────────────────────
  const now = Date.now();
  const filtered = orders.filter(o => {
    const created = new Date(o.created_at).getTime();
    if (dateF === 'today' && now - created > 86400_000)      return false;
    if (dateF === 'week'  && now - created > 7 * 86400_000)  return false;
    if (dateF === 'month' && now - created > 30 * 86400_000) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchId = o.id.toString().includes(q);
      const matchCust = [o.customer_name, o.customer_email, o.customer_phone, o.city]
        .some(v => v?.toLowerCase().includes(q));
      const matchVendor = o.vendor_names?.some(v => v.toLowerCase().includes(q));
      if (!matchId && !matchCust && !matchVendor) return false;
    }
    return true;
  });

  // ── Tri ───────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const va = sort === 'id' ? a.id : sort === 'created_at' ? a.created_at : a.total_xaf;
    const vb = sort === 'id' ? b.id : sort === 'created_at' ? b.created_at : b.total_xaf;
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

  const activeFilters = [dateF !== 'all'].filter(Boolean).length;
  const resetFilters  = () => { setDateF('all'); setSearch(''); setPage(1); };

  // ── KPIs calculés ────────────────────────────────────────────────────────
  const kpis = {
    total:     orders.length,
    pending:   orders.filter(o => o.payment_status === 'PENDING').length,
    paid:      orders.filter(o => o.payment_status === 'PAID').length,
    revenue:   orders.filter(o => o.payment_status === 'PAID').reduce((s, o) => s + o.total_xaf, 0),
    delivered: orders.filter(o => o.fulfillment_status === 'DELIVERED').length,
    cancelled: orders.filter(o => o.fulfillment_status === 'CANCELLED').length,
  };

  // ── Annulation ────────────────────────────────────────────────────────────
  const handleCancel = async (o: AdminOrder) => {
    const ok = await confirm({
      title: `Annuler la commande #${o.id} ?`,
      message: 'Cette action est irréversible. La commande passera en statut Annulée.',
      type: 'danger', confirmText: 'Annuler la commande', cancelText: 'Garder',
    });
    if (!ok) return;
    setActing(o.id);
    try {
      await adminApi.cancelOrder(o.id);
      showToast(`Commande #${o.id} annulée`, 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const url = adminApi.exportOrdersCSV({
      payment_status:     payTab !== 'all'     ? payTab     : undefined,
      fulfillment_status: fulfillTab !== 'all' ? fulfillTab : undefined,
    });
    window.open(url, '_blank');
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k
      ? <ArrowUpDown size={11} style={{ color: T.muted, opacity: 0.4 }} />
      : dir === 'asc' ? <ArrowUp size={11} style={{ color: T.red }} /> : <ArrowDown size={11} style={{ color: T.red }} />;

  const DropMenu = ({ children, show }: { children: React.ReactNode; show: boolean }) =>
    show ? <div className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 min-w-[170px]" style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>{children}</div> : null;

  const DropItem = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={() => { onClick(); setOpenDrop(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-left text-[12px]"
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
            Gestion Commandes
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {kpis.pending > 0 && <span style={{ color: T.red, fontWeight: 700, marginRight: 6 }}>{kpis.pending} en attente ·</span>}
            {orders.length.toLocaleString('fr-FR')} commandes au total
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
          { label: 'Total',        value: kpis.total,                  sub: 'toutes commandes',   accent: T.text,    click: () => { setPayTab('all'); setFulfillTab('all'); } },
          { label: 'Paiement att.',value: kpis.pending,                sub: 'à encaisser',        accent: '#F59E0B', click: () => setPayTab('PENDING') },
          { label: 'Revenus (payé)',value: fmtXaf(kpis.revenue),       sub: `${kpis.paid} payées`,accent: '#10B981', click: () => setPayTab('PAID') },
          { label: 'Livrées',      value: kpis.delivered,              sub: `${kpis.cancelled} annulées`, accent: '#3B82F6', click: () => setFulfillTab('DELIVERED') },
        ].map((k, i) => (
          <button key={i} onClick={() => { k.click(); setPage(1); }}
            className="rounded-2xl p-4 text-left transition-all w-full"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = k.accent + '55')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: loading ? 14 : 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>
              {loading ? '—' : (typeof k.value === 'number' ? k.value.toLocaleString('fr-FR') : k.value)}
            </p>
            <p style={{ fontSize: 11, color: k.accent === T.text ? T.muted : k.accent, marginTop: 4 }}>{k.sub}</p>
          </button>
        ))}
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>

        {/* Tabs paiement */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
            {(['all','PENDING','PAID','FAILED','REFUNDED'] as PayTab[]).map(t => {
              const cfg = t === 'all' ? null : PAYMENT_CFG[t];
              const count = t === 'all' ? orders.length : orders.filter(o => o.payment_status === t).length;
              return (
                <button key={t} onClick={() => { setPayTab(t); setPage(1); load(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all"
                  style={{ background: payTab === t ? (cfg?.color ?? T.red) : 'transparent', color: payTab === t ? '#fff' : (cfg?.color ?? T.muted) }}
                  onMouseEnter={e => { if (payTab !== t) (e.currentTarget.style.color = T.text); }}
                  onMouseLeave={e => { if (payTab !== t) (e.currentTarget.style.color = cfg?.color ?? T.muted); }}>
                  {t === 'all' ? 'Tous' : cfg?.label}
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, fontWeight: 700, background: payTab === t ? 'rgba(255,255,255,0.25)' : T.cardAlt, color: payTab === t ? '#fff' : T.muted }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 hidden sm:block" />
          {/* Recherche */}
          <div className="relative w-full sm:w-60 flex-shrink-0">
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input type="text" placeholder="#ID, client, ville…"
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
              onFocus={e => (e.target.style.borderColor = T.red)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
          </div>
        </div>

        {/* Ligne 2 : dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} style={{ color: T.muted, flexShrink: 0 }} />

          {/* Statut livraison */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpenDrop(openDrop === 'fulfill' ? null : 'fulfill')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
              style={{ background: fulfillTab !== 'all' ? T.red + '18' : T.cardAlt, color: fulfillTab !== 'all' ? T.red : T.muted, border: `1px solid ${fulfillTab !== 'all' ? T.red + '40' : T.border}` }}>
              {fulfillTab === 'all' ? 'Livraison' : FULFILLMENT_CFG[fulfillTab]?.label} <ChevronDown size={11} />
            </button>
            <DropMenu show={openDrop === 'fulfill'}>
              <DropItem label="Tous" active={fulfillTab === 'all'} onClick={() => { setFulfillTab('all'); setPage(1); load(); }} />
              {(['PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED'] as FulfillTab[]).map(f => (
                <DropItem key={f} label={FULFILLMENT_CFG[f]?.label ?? f} active={fulfillTab === f} onClick={() => { setFulfillTab(f); setPage(1); }} />
              ))}
            </DropMenu>
          </div>

          {/* Période */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpenDrop(openDrop === 'date' ? null : 'date')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
              style={{ background: dateF !== 'all' ? T.red + '18' : T.cardAlt, color: dateF !== 'all' ? T.red : T.muted, border: `1px solid ${dateF !== 'all' ? T.red + '40' : T.border}` }}>
              {({ all: 'Période', today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois' } as Record<DateFilter, string>)[dateF]} <ChevronDown size={11} />
            </button>
            <DropMenu show={openDrop === 'date'}>
              {([['all',"Toutes périodes"],['today',"Aujourd'hui"],['week','Cette semaine'],['month','Ce mois']] as [DateFilter,string][]).map(([k,l]) => (
                <DropItem key={k} label={l} active={dateF === k} onClick={() => { setDateF(k); setPage(1); }} />
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
                  { label: '#',          k: 'id'         as SortKey | null },
                  { label: 'Client',     k: null },
                  { label: 'Vendeurs',   k: null },
                  { label: 'Paiement',   k: null },
                  { label: 'Livraison',  k: null },
                  { label: 'Montant',    k: 'total_xaf'  as SortKey | null },
                  { label: 'Date',       k: 'created_at' as SortKey | null },
                  { label: '',           k: null },
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
                  ? <tr><td colSpan={8} style={{ padding: '60px 0', textAlign: 'center' }}>
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle size={28} style={{ color: T.muted }} />
                        <p style={{ fontSize: 14, color: T.muted }}>Aucune commande trouvée</p>
                        {activeFilters > 0 && <button onClick={resetFilters} style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>Réinitialiser</button>}
                      </div>
                    </td></tr>
                  : paginated.map((o, i) => (
                    <tr key={o.id}
                      style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${T.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* ID */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>#{o.id}</span>
                      </td>

                      {/* Client */}
                      <td style={{ padding: '12px 14px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.2 }} className="truncate max-w-[160px]">
                          {o.customer_name}
                        </p>
                        <p style={{ fontSize: 11, color: T.muted }}>{o.city}</p>
                      </td>

                      {/* Vendeurs */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {(o.vendor_names ?? []).slice(0, 2).map((v, j) => (
                            <span key={j} style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(244,121,32,0.12)', color: '#F47920' }}>
                              {v}
                            </span>
                          ))}
                          {(o.vendor_names ?? []).length > 2 && (
                            <span style={{ fontSize: 10, color: T.muted }}>+{(o.vendor_names ?? []).length - 2}</span>
                          )}
                        </div>
                      </td>

                      {/* Paiement */}
                      <td style={{ padding: '12px 14px' }}><PayBadge status={o.payment_status} /></td>

                      {/* Livraison */}
                      <td style={{ padding: '12px 14px' }}><FulfillBadge status={o.fulfillment_status} /></td>

                      {/* Montant */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: o.payment_status === 'PAID' ? '#10B981' : T.text, whiteSpace: 'nowrap' }}>
                          {fmtXaf(o.total_xaf)}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>
                        {fmtDateTime(o.created_at)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link to={`/admin/orders/${o.id}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                            <Eye size={12} />
                          </Link>
                          {o.fulfillment_status !== 'CANCELLED' && o.fulfillment_status !== 'DELIVERED' && (
                            <button onClick={() => handleCancel(o)} disabled={acting === o.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                              {acting === o.id ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={12} />}
                            </button>
                          )}
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
            <div className="flex flex-col items-center py-16 gap-3">
              <AlertCircle size={28} style={{ color: T.muted }} />
              <p style={{ fontSize: 14, color: T.muted }}>Aucune commande</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: T.border }}>
              {paginated.map(o => (
                <div key={o.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>#{o.id}</span>
                      <span style={{ fontSize: 12, color: T.muted, marginLeft: 8 }}>{fmtDate(o.created_at)}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: o.payment_status === 'PAID' ? '#10B981' : T.text, whiteSpace: 'nowrap' }}>
                      {fmtXaf(o.total_xaf)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{o.customer_name} · {o.city}</p>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <PayBadge status={o.payment_status} />
                    <FulfillBadge status={o.fulfillment_status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/orders/${o.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                      style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                      <Eye size={12} /> Détail
                    </Link>
                    {o.fulfillment_status !== 'CANCELLED' && o.fulfillment_status !== 'DELIVERED' && (
                      <button onClick={() => handleCancel(o)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <XCircle size={12} /> Annuler
                      </button>
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
                style={{ background: T.cardAlt, border: `1px solid ${T.border}`, color: page === 1 ? T.muted : T.text, opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === '…'
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
                style={{ background: T.cardAlt, border: `1px solid ${T.border}`, color: page === totalPages ? T.muted : T.text, opacity: page === totalPages ? 0.4 : 1 }}>
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