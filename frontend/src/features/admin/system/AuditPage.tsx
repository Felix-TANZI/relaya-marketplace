// frontend/src/features/admin/system/AuditPage.tsx
// Journal d'audit — BelivaY Admin

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ScrollText, RefreshCw, Search, Filter, Download,
  ChevronLeft, ChevronRight, X, TrendingUp,
  User, Shield, ShoppingCart, Package, DollarSign,
  Settings, Star, CreditCard, Eye,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id:           string;
  admin_id:     number | null;
  admin_name:   string;
  action:       string;
  entity_type:  string;
  entity_id:    number | null;
  entity_label: string;
  old_value:    string | null;
  new_value:    string | null;
  ip_address:   string | null;
  created_at:   string;
}

interface AuditResponse {
  entries:     AuditEntry[];
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
  kpis: {
    today:     number;
    week:      number;
    month:     number;
    top_admin: string;
  };
  by_entity: Array<{ entity_type: string; count: number }>;
  by_hour:   Array<{ hour: string; count: number }>;
  admins:    string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_CFG: Record<string, {
  label: string; color: string; bg: string;
  icon: React.ElementType; link?: (id: number) => string;
}> = {
  order:        { label: 'Commande',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: ShoppingCart, link: (eid) => `/admin/orders/${eid}`        },
  user:         { label: 'Utilisateur', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: User,         link: (eid) => `/admin/users/${eid}`          },
  vendor:       { label: 'Vendeur',     color: '#F47920', bg: 'rgba(244,121,32,0.12)', icon: Shield,       link: (eid) => `/admin/vendors/${eid}`        },
  product:      { label: 'Produit',     color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: Package,      link: () => `/admin/catalogue`            },
  review:       { label: 'Avis',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Star                                                     },
  settings:     { label: 'Paramètres', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: Settings                                                 },
  withdrawal:   { label: 'Retrait',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icon: DollarSign,  link: () => `/admin/vendors/withdrawals`   },
  subscription: { label: 'Abonnement', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',   icon: CreditCard,  link: () => `/admin/vendors/subscriptions` },
};

const ENTITY_KEYS = Object.keys(ENTITY_CFG);
const PAGE_SIZES  = [20, 50, 100] as const;

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const fmtHour = (h: string) => h.slice(11, 16);

// Avatar admin — initiales colorées
function AdminAvatar({ name, T }: { name: string; T: ReturnType<typeof useAdminTheme> }) {
  const initials = name.split(/[\s._-]/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('');
  const color    = name === 'Système' ? T.muted : '#DC2626';
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: color + '20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, flexShrink: 0 }}>
        {initials || '?'}
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text, whiteSpace: 'nowrap' }}>{name}</span>
    </div>
  );
}

// Diff viewer — ancienne / nouvelle valeur
function DiffViewer({ old_value, new_value, T }: {
  old_value: string | null; new_value: string | null;
  T: ReturnType<typeof useAdminTheme>;
}) {
  if (!old_value && !new_value) return null;
  if (!old_value && new_value) {
    return (
      <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.12)', color: '#10B981', fontFamily: 'monospace' }}>
        + {new_value}
      </span>
    );
  }
  if (old_value && !new_value) {
    return (
      <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontFamily: 'monospace', textDecoration: 'line-through' }}>
        {old_value}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontFamily: 'monospace', textDecoration: 'line-through' }}>
        {old_value}
      </span>
      <span style={{ fontSize: 11, color: T.muted }}>→</span>
      <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 5, background: 'rgba(16,185,129,0.1)', color: '#10B981', fontFamily: 'monospace' }}>
        {new_value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  // Filtres
  const [entityF,   setEntityF]   = useState('');
  const [adminF,    setAdminF]    = useState('');
  const [search,    setSearch]    = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [pageSize,  setPageSize]  = useState<20 | 50 | 100>(20);

  // État
  const [data,        setData]       = useState<AuditResponse | null>(null);
  const [page,        setPage]       = useState(1);
  const [loading,     setLoading]    = useState(true);
  const [showFilters, setShowFilters]= useState(false);
  const [expanded,    setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityF)  params.append('entity_type', entityF);
      if (adminF)   params.append('admin_name',  adminF);
      if (search)   params.append('search',      search);
      if (dateFrom) params.append('date_from',   dateFrom);
      if (dateTo)   params.append('date_to',     dateTo);
      params.append('page',      String(page));
      params.append('page_size', String(pageSize));

      const result = await http<AuditResponse>(
        `/api/vendors/admin/audit/?${params}`,
        { headers: authHeader() }
      );
      setData(result);
    } catch {
      toastRef.current("Erreur chargement du journal d'audit", 'error');
    } finally {
      setLoading(false);
    }
  }, [entityF, adminF, search, dateFrom, dateTo, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const hasFilters = entityF || adminF || search || dateFrom || dateTo;

  const resetFilters = () => {
    setEntityF(''); setAdminF(''); setSearch('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = data.entries.map(e =>
      [e.id, e.created_at, e.admin_name, e.action, e.entity_type,
       e.entity_label, e.old_value ?? '', e.new_value ?? '', e.ip_address ?? ''].join(';')
    );
    const csv  = `ID;Date;Admin;Action;Type;Entité;Ancienne valeur;Nouvelle valeur;IP\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `belivay_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Journal d'Audit
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {data ? `${data.total.toLocaleString('fr-FR')} actions tracées` : '—'} · Admin le plus actif : <strong style={{ color: T.text }}>{data?.kpis.top_admin ?? '—'}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={!data || data.entries.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            <Download size={12} /> Export CSV
          </button>
          <button onClick={() => load()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)', cursor: 'pointer' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Aujourd'hui", value: data?.kpis.today,  accent: T.text,    icon: ScrollText  },
          { label: 'Cette semaine', value: data?.kpis.week,  accent: '#3B82F6', icon: TrendingUp  },
          { label: 'Ce mois',    value: data?.kpis.month, accent: '#F47920', icon: TrendingUp  },
          { label: 'Total',      value: data?.total,       accent: T.muted,   icon: Eye         },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</span>
                <Icon size={13} style={{ color: k.accent }} />
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
                {loading ? '—' : (k.value ?? 0).toLocaleString('fr-FR')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Graphique activité + distribution */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Activité 24h */}
          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Activité 24h</span>
            </div>
            {data.by_hour.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={data.by_hour} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.red} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={T.red} stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tickFormatter={fmtHour}
                    tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number | undefined) => [v ?? 0, 'Actions']}
                    labelFormatter={(label) => typeof label === 'string' ? fmtHour(label) : ''} />
                  <Area type="monotone" dataKey="count" stroke={T.red}
                    strokeWidth={2} fill="url(#aGrad)" dot={false} name="Actions" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center" style={{ height: 130 }}>
                <p style={{ fontSize: 13, color: T.muted }}>Aucune activité</p>
              </div>
            )}
          </div>

          {/* Distribution par entité */}
          <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <ScrollText size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Par entité</span>
            </div>
            {data.by_entity.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={data.by_entity} dataKey="count" nameKey="entity_type"
                      cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={2}>
                      {data.by_entity.map((d) => (
                        <Cell key={d.entity_type} fill={ENTITY_CFG[d.entity_type]?.color ?? '#9CA3AF'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number | undefined) => [v ?? 0, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center space-y-1.5">
                  {data.by_entity.slice(0, 5).map(d => {
                    const cfg = ENTITY_CFG[d.entity_type];
                    return (
                      <div key={d.entity_type} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: cfg?.color ?? '#9CA3AF', flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: T.muted }}>{cfg?.label ?? d.entity_type}</span>
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg?.color ?? T.text }}>{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center" style={{ height: 110 }}>
                <p style={{ fontSize: 12, color: T.muted }}>Aucune donnée</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barre filtres */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher action, admin, entité…"
              style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 10, padding: '9px 12px 9px 36px', fontSize: 13, outline: 'none' }} />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: showFilters ? T.red + '15' : T.cardAlt, color: showFilters ? T.red : T.muted, border: `1px solid ${showFilters ? T.red + '40' : T.border}`, cursor: 'pointer' }}>
            <Filter size={12} /> Filtres
            {hasFilters && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: T.red, color: '#fff', marginLeft: 2 }}>!</span>}
          </button>
          {hasFilters && (
            <button onClick={resetFilters} style={{ color: T.muted, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', background: 'none', border: 'none' }}>
              <X size={12} /> Réinitialiser
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
            {/* Type entité */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Type d'entité</label>
              <select value={entityF} onChange={e => { setEntityF(e.target.value); setPage(1); }}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }}>
                <option value="">Tous</option>
                {ENTITY_KEYS.map(k => <option key={k} value={k}>{ENTITY_CFG[k].label}</option>)}
              </select>
            </div>
            {/* Admin */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Admin</label>
              <select value={adminF} onChange={e => { setAdminF(e.target.value); setPage(1); }}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }}>
                <option value="">Tous les admins</option>
                {(data?.admins ?? []).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {/* Date depuis */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Depuis</label>
              <input type="datetime-local" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
            </div>
            {/* Date jusqu'à */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Jusqu'à</label>
              <input type="datetime-local" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
            </div>
          </div>
        )}
      </div>

      {/* Filtres rapides par entité */}
      <div className="flex items-center gap-2 flex-wrap">
        {['', ...ENTITY_KEYS].map(k => {
          const cfg    = k ? ENTITY_CFG[k] : null;
          const active = entityF === k;
          const count  = data?.by_entity.find(e => e.entity_type === k)?.count;
          return (
            <button key={k || 'all'} onClick={() => { setEntityF(k); setPage(1); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: active ? (cfg?.color ?? T.red) + '18' : T.card, color: active ? (cfg?.color ?? T.red) : T.muted, border: `1px solid ${active ? (cfg?.color ?? T.red) + '40' : T.border}` }}>
              {cfg && <cfg.icon size={11} />}
              {k ? cfg?.label : 'Tous'}
              {k && count !== undefined && <span style={{ fontSize: 10, opacity: 0.7 }}>({count})</span>}
            </button>
          );
        })}
        <div className="flex-1 flex justify-end">
          <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value) as 20 | 50 | 100); setPage(1); }}
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: '5px 10px', fontSize: 11.5, outline: 'none', cursor: 'pointer' }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
      </div>

      {/* Tableau d'audit */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {/* Header */}
        <div className="grid px-5 py-3" style={{ gridTemplateColumns: '180px 100px 1fr 1fr 110px', borderBottom: `1px solid ${T.border}`, background: T.cardAlt, gap: 12 }}>
          {['Admin', 'Entité', 'Action', 'Changement', 'Date'].map((h, i) => (
            <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-3">
            <ScrollText size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>
              {hasFilters ? 'Aucune action correspondant aux filtres.' : 'Aucune action enregistrée.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: T.border }}>
            {data.entries.map(e => {
              const cfg   = ENTITY_CFG[e.entity_type] ?? { label: e.entity_type, color: '#9CA3AF', bg: T.cardAlt, icon: ScrollText };
              const Icon  = cfg.icon;
              const isExp = expanded === e.id;
              const hasLink = cfg.link && e.entity_id;

              return (
                <div key={e.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  {/* Ligne principale */}
                  <div
                    className="grid px-5 py-3 cursor-pointer items-center"
                    style={{ gridTemplateColumns: '180px 100px 1fr 1fr 110px', gap: 12 }}
                    onClick={() => setExpanded(isExp ? null : e.id)}
                    onMouseEnter={ev => (ev.currentTarget.style.background = T.cardAlt)}
                    onMouseLeave={ev => (ev.currentTarget.style.background = isExp ? T.cardAlt + '80' : 'transparent')}>

                    {/* Admin */}
                    <AdminAvatar name={e.admin_name} T={T} />

                    {/* Entité */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg }}>
                        <Icon size={11} style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                        {e.entity_id && (
                          <p style={{ fontSize: 10, color: T.muted }}>#{e.entity_id}</p>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <span style={{ fontSize: 12.5, color: T.text, lineHeight: 1.4 }} className="truncate">
                      {e.action}
                    </span>

                    {/* Changement — diff viewer */}
                    <DiffViewer old_value={e.old_value} new_value={e.new_value} T={T} />

                    {/* Date */}
                    <span style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>
                      {fmtDateTime(e.created_at)}
                    </span>
                  </div>

                  {/* Détails expandés */}
                  {isExp && (
                    <div className="px-5 pb-4 pt-1" style={{ background: T.cardAlt + '60', borderTop: `1px solid ${T.border}` }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: 'ID entrée',   value: e.id },
                          { label: 'IP',           value: e.ip_address || '—' },
                          { label: 'Entité',       value: e.entity_label },
                          { label: 'Horodatage',   value: fmtDateTime(e.created_at) },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p style={{ fontSize: 10.5, color: T.muted, marginBottom: 2 }}>{label}</p>
                            <p style={{ fontSize: 12.5, color: T.text, wordBreak: 'break-all' }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Lien vers l'entité */}
                      {hasLink && (
                        <div className="mt-3">
                          <Link to={cfg.link!(e.entity_id!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                            <Eye size={11} /> Voir {cfg.label.toLowerCase()} #{e.entity_id}
                          </Link>
                        </div>
                      )}

                      {/* Diff complet si valeurs longues */}
                      {(e.old_value || e.new_value) && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {e.old_value && (
                            <div>
                              <p style={{ fontSize: 10.5, color: '#EF4444', marginBottom: 4, fontWeight: 700 }}>Avant</p>
                              <pre style={{ fontSize: 11.5, color: '#EF4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                                {e.old_value}
                              </pre>
                            </div>
                          )}
                          {e.new_value && (
                            <div>
                              <p style={{ fontSize: 10.5, color: '#10B981', marginBottom: 4, fontWeight: 700 }}>Après</p>
                              <pre style={{ fontSize: 11.5, color: '#10B981', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '8px 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                                {e.new_value}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: `1px solid ${T.border}`, background: T.cardAlt }}>
            <span style={{ fontSize: 12, color: T.muted }}>
              {((page - 1) * pageSize + 1)}–{Math.min(page * pageSize, data.total)} sur {data.total.toLocaleString('fr-FR')}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 28, height: 28, borderRadius: 7, background: T.card, color: page === 1 ? T.border : T.text, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontSize: 12, color: T.muted }}>{page} / {data.total_pages}</span>
              <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}
                style={{ width: 28, height: 28, borderRadius: 7, background: T.card, color: page === data.total_pages ? T.border : T.text, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === data.total_pages ? 'not-allowed' : 'pointer' }}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}