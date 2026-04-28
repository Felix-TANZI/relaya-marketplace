// frontend/src/features/admin/operations/DisputesListPage.tsx
// Gestion des litiges — admin BelivaY
// KPIs · Filtres statut/raison · Tableau desktop · Cards mobile · Pagination

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale, Search, RefreshCw, Eye,
  ChevronLeft, ChevronRight, ChevronDown, X,
  Filter, MessageSquare,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { adminApi, type AdminDispute, type DisputeStats } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:        { label: 'Ouvert',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  IN_PROGRESS: { label: 'En cours',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  RESOLVED:    { label: 'Résolu',     color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  CLOSED:      { label: 'Clôturé',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

const REASON_CFG: Record<string, string> = {
  NOT_RECEIVED:    'Non reçu',
  DAMAGED:         'Endommagé',
  WRONG_ITEM:      'Mauvais article',
  NOT_AS_DESCRIBED:'Non conforme',
  REFUND_REQUEST:  'Demande remboursement',
  OTHER:           'Autre',
};

const RESOLUTION_CFG: Record<string, { label: string; color: string }> = {
  REFUND:         { label: 'Remboursement',  color: '#10B981' },
  EXCHANGE:       { label: 'Échange',        color: '#3B82F6' },
  PARTIAL_REFUND: { label: 'Remb. partiel',  color: '#F59E0B' },
  REJECTED:       { label: 'Rejeté',         color: '#EF4444' },
  OTHER:          { label: 'Autre',          color: '#9CA3AF' },
};

type SortKey    = 'id' | 'created_at' | 'messages_count';
type SortDir    = 'asc' | 'desc';
type StatusTab  = 'all' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type ReasonFilter = 'all' | 'NOT_RECEIVED' | 'DAMAGED' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'REFUND_REQUEST' | 'OTHER';

const PAGE_SIZES = [10, 20, 50] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.OPEN;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.color, border: `1px solid ${c.color}40`, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', whiteSpace: 'nowrap' }}>
      {REASON_CFG[reason] ?? reason}
    </span>
  );
}

function SkeletonRow({ T }: { T: ReturnType<typeof useAdminTheme> }) {
  return (
    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
      {[8, 30, 20, 20, 15, 18, 18, 8].map((w, i) => (
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

export default function DisputesListPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [stats,    setStats]    = useState<DisputeStats | null>(null);
  const [loading,  setLoading]  = useState(true);

  const [statusTab, setStatusTab]   = useState<StatusTab>('all');
  const [reasonF,   setReasonF]     = useState<ReasonFilter>('all');
  const [search,    setSearch]      = useState('');
  const [sort,      setSort]        = useState<SortKey>('created_at');
  const [dir,       setDir]         = useState<SortDir>('desc');
  const [page,      setPage]        = useState(1);
  const [pageSize,  setPageSize]    = useState<10|20|50>(20);
  const [openDrop,  setOpenDrop]    = useState<'reason' | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (statusTab !== 'all') filters.status = statusTab;
      if (reasonF   !== 'all') filters.reason = reasonF;
      const [dList, dStats] = await Promise.all([
        adminApi.listDisputes(filters),
        adminApi.getDisputeStats().catch(() => null),
      ]);
      setDisputes(dList);
      if (dStats) setStats(dStats);
    } catch {
      showToast('Erreur chargement des litiges', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusTab, reasonF, showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrage local (recherche texte) ─────────────────────────────────────
  const filtered = disputes.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.id.toString(), d.opened_by_name, d.customer_name, d.order.toString()]
      .some(v => v?.toLowerCase().includes(q));
  });

  // ── Tri ───────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const va = sort === 'id' ? a.id : sort === 'created_at' ? a.created_at : a.messages_count;
    const vb = sort === 'id' ? b.id : sort === 'created_at' ? b.created_at : b.messages_count;
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

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k
      ? <ArrowUpDown size={11} style={{ color: T.muted, opacity: 0.4 }} />
      : dir === 'asc' ? <ArrowUp size={11} style={{ color: T.red }} /> : <ArrowDown size={11} style={{ color: T.red }} />;

  // ── KPIs depuis les stats ou calculés localement ──────────────────────────
  const kpis = {
    total:       disputes.length,
    open:        stats?.open_disputes        ?? disputes.filter(d => d.status === 'OPEN').length,
    in_progress: stats?.in_progress_disputes ?? disputes.filter(d => d.status === 'IN_PROGRESS').length,
    resolved:    stats?.resolved_disputes    ?? disputes.filter(d => d.status === 'RESOLVED').length,
    avg_days:    stats?.avg_resolution_days  ?? 0,
  };

  const DropMenu = ({ children, show }: { children: React.ReactNode; show: boolean }) =>
    show ? (
      <div className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 min-w-[190px]"
        style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    ) : null;

  const DropItem = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={() => { onClick(); setOpenDrop(null); }}
      className="w-full flex items-center gap-2 px-4 py-2 text-left text-[12px]"
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
            Gestion Litiges
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {kpis.open > 0 && <span style={{ color: T.red, fontWeight: 700, marginRight: 6 }}>{kpis.open} ouverts ·</span>}
            {disputes.length.toLocaleString('fr-FR')} litiges au total
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: kpis.total,       accent: T.text,    onClick: () => setStatusTab('all') },
          { label: 'Ouverts',      value: kpis.open,        accent: '#EF4444', onClick: () => setStatusTab('OPEN') },
          { label: 'En cours',     value: kpis.in_progress, accent: '#F59E0B', onClick: () => setStatusTab('IN_PROGRESS') },
          { label: 'Délai moy.',   value: `${kpis.avg_days.toFixed(1)}j`, accent: '#3B82F6', onClick: undefined },
        ].map((k, i) => (
          <button key={i} onClick={() => { k.onClick?.(); setPage(1); }}
            className="rounded-2xl p-4 text-left w-full transition-all"
            style={{ background: T.card, border: `1px solid ${T.border}`, cursor: k.onClick ? 'pointer' : 'default' }}
            onMouseEnter={e => { if (k.onClick) (e.currentTarget.style.borderColor = k.accent + '55'); }}
            onMouseLeave={e => { if (k.onClick) (e.currentTarget.style.borderColor = T.border); }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>
              {loading ? '—' : k.value}
            </p>
          </button>
        ))}
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>

        {/* Tabs statut */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
            {([
              { key: 'all'         as StatusTab, label: 'Tous',      count: disputes.length },
              { key: 'OPEN'        as StatusTab, label: 'Ouverts',   count: kpis.open },
              { key: 'IN_PROGRESS' as StatusTab, label: 'En cours',  count: kpis.in_progress },
              { key: 'RESOLVED'    as StatusTab, label: 'Résolus',   count: kpis.resolved },
              { key: 'CLOSED'      as StatusTab, label: 'Clôturés',  count: disputes.filter(d => d.status === 'CLOSED').length },
            ] as { key: StatusTab; label: string; count: number }[]).map(t => (
              <button key={t.key}
                onClick={() => { setStatusTab(t.key); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all"
                style={{
                  background: statusTab === t.key ? (t.key === 'OPEN' ? '#EF4444' : statusTab === t.key ? T.red : T.red) : 'transparent',
                  color:      statusTab === t.key ? '#fff' : (STATUS_CFG[t.key]?.color ?? T.muted),
                }}
                onMouseEnter={e => { if (statusTab !== t.key) (e.currentTarget.style.color = T.text); }}
                onMouseLeave={e => { if (statusTab !== t.key) (e.currentTarget.style.color = STATUS_CFG[t.key]?.color ?? T.muted); }}>
                {t.label}
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, fontWeight: 700, background: statusTab === t.key ? 'rgba(255,255,255,0.25)' : T.cardAlt, color: statusTab === t.key ? '#fff' : T.muted }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1 hidden sm:block" />

          {/* Recherche */}
          <div className="relative w-full sm:w-56 flex-shrink-0">
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input type="text" placeholder="#ID, client, commande…"
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
              onFocus={e => (e.target.style.borderColor = T.red)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
          </div>
        </div>

        {/* Ligne 2 : dropdown raison */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} style={{ color: T.muted, flexShrink: 0 }} />
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpenDrop(openDrop === 'reason' ? null : 'reason')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
              style={{ background: reasonF !== 'all' ? T.red + '18' : T.cardAlt, color: reasonF !== 'all' ? T.red : T.muted, border: `1px solid ${reasonF !== 'all' ? T.red + '40' : T.border}` }}>
              {reasonF === 'all' ? 'Raison' : REASON_CFG[reasonF] ?? reasonF} <ChevronDown size={11} />
            </button>
            <DropMenu show={openDrop === 'reason'}>
              <DropItem label="Toutes raisons" active={reasonF === 'all'} onClick={() => { setReasonF('all'); setPage(1); }} />
              {Object.entries(REASON_CFG).map(([k, l]) => (
                <DropItem key={k} label={l} active={reasonF === k} onClick={() => { setReasonF(k as ReasonFilter); setPage(1); }} />
              ))}
            </DropMenu>
          </div>

          {reasonF !== 'all' && (
            <button onClick={() => { setReasonF('all'); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: T.red + '10', color: T.red, border: `1px solid ${T.red}30` }}>
              <X size={11} /> Effacer
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
                  { label: '#',          k: 'id'            as SortKey | null },
                  { label: 'Client',     k: null },
                  { label: 'Commande',   k: null },
                  { label: 'Raison',     k: null },
                  { label: 'Statut',     k: null },
                  { label: 'Messages',   k: 'messages_count' as SortKey | null },
                  { label: 'Ouvert le',  k: 'created_at'    as SortKey | null },
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
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} T={T} />)
                : paginated.length === 0
                  ? <tr><td colSpan={8} style={{ padding: '60px 0', textAlign: 'center' }}>
                      <div className="flex flex-col items-center gap-3">
                        <Scale size={28} style={{ color: T.muted }} />
                        <p style={{ fontSize: 14, color: T.muted }}>Aucun litige trouvé</p>
                      </div>
                    </td></tr>
                  : paginated.map((d, i) => (
                    <tr key={d.id}
                      style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${T.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>#{d.id}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.text }} className="truncate max-w-[140px]">{d.customer_name}</p>
                        <p style={{ fontSize: 11, color: T.muted }} className="truncate max-w-[140px]">{d.opened_by_name}</p>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link to={`/admin/orders/${d.order}`}
                          className="flex items-center gap-1 text-[12px] font-semibold transition-all"
                          style={{ color: '#3B82F6' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                          #{d.order}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 14px' }}><ReasonBadge reason={d.reason} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={d.status} />
                          {d.resolution && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: RESOLUTION_CFG[d.resolution]?.color + '18', color: RESOLUTION_CFG[d.resolution]?.color }}>
                              {RESOLUTION_CFG[d.resolution]?.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-1.5">
                          <MessageSquare size={12} style={{ color: T.muted }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{d.messages_count}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>
                        {fmtDateTime(d.created_at)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link to={`/admin/disputes/${d.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; (e.currentTarget as HTMLElement).style.borderColor = T.red + '40'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
                          <Eye size={12} />
                        </Link>
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
              <Scale size={28} style={{ color: T.muted }} />
              <p style={{ fontSize: 14, color: T.muted }}>Aucun litige</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: T.border }}>
              {paginated.map(d => (
                <div key={d.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>#{d.id}</span>
                      <span style={{ fontSize: 12, color: T.muted, marginLeft: 8 }}>{fmtDateTime(d.created_at)}</span>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{d.customer_name}</p>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <ReasonBadge reason={d.reason} />
                    <Link to={`/admin/orders/${d.order}`} style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>
                      Cmd #{d.order}
                    </Link>
                    <span style={{ fontSize: 11, color: T.muted }}>
                      <MessageSquare size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {d.messages_count} msg
                    </span>
                  </div>
                  <Link to={`/admin/disputes/${d.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold w-fit"
                    style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                    <Eye size={12} /> Voir le litige
                  </Link>
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