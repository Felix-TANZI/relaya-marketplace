// frontend/src/features/admin/system/LogsPage.tsx
// Logs Système — BelivaY Admin

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Terminal, RefreshCw, Search, Filter, Trash2,
  AlertCircle, AlertTriangle, Info, Bug,
  ChevronLeft, ChevronRight, Download, Activity,
  X, Zap, CheckCircle, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SystemLogEntry {
  id:         number;
  level:      'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  service:    string;
  message:    string;
  logger:     string;
  pathname:   string;
  lineno:     number | null;
  exc_text:   string;
  ip_address: string | null;
  user_id:    number | null;
  created_at: string;
}

interface LogKpis {
  total_24h:    number;
  errors_24h:   number;
  warnings_24h: number;
  info_24h:     number;
}

interface LogsResponse {
  logs:        SystemLogEntry[];
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
  kpis:        LogKpis;
  by_service:  Array<{ service: string; count: number }>;
  by_hour?:    Array<{ hour: string; errors: number; warnings: number; info: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const LEVEL_CFG: Record<string, {
  label: string; color: string; bg: string;
  terminal: string; icon: React.ElementType
}> = {
  DEBUG:    { label: 'DEBUG',    color: '#6B7280', bg: 'rgba(107,114,128,0.12)', terminal: '#6B7280', icon: Bug           },
  INFO:     { label: 'INFO',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  terminal: '#58A6FF', icon: Info          },
  WARNING:  { label: 'WARNING',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  terminal: '#E3B341', icon: AlertTriangle },
  ERROR:    { label: 'ERROR',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   terminal: '#FF7B72', icon: AlertCircle   },
  CRITICAL: { label: 'CRITICAL', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)', terminal: '#D2A8FF', icon: Zap           },
};

const SERVICE_LABELS: Record<string, string> = {
  api:      'API Backend',
  auth:     'Authentification',
  payments: 'Paiements',
  email:    'Email',
  orders:   'Commandes',
  catalog:  'Catalogue',
  vendors:  'Vendeurs',
  system:   'Système',
};

// Indicateur de santé par service : aucun ERROR dans les 24h = healthy
const SERVICE_HEALTH_COLOR = (errors: number) =>
  errors === 0 ? '#10B981' : errors < 5 ? '#F59E0B' : '#EF4444';

const LEVELS   = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;
const SERVICES = Object.keys(SERVICE_LABELS);
const PAGE_SIZES = [50, 100, 200] as const;
const AUTO_REFRESH_INTERVAL = 30_000;

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const fmtHour = (h: string) => h.slice(11, 16); // HH:MM

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  // Filtres
  const [levelF,     setLevelF]    = useState('');
  const [serviceF,   setServiceF]  = useState('');
  const [search,     setSearch]    = useState('');
  const [dateFrom,   setDateFrom]  = useState('');
  const [dateTo,     setDateTo]    = useState('');
  const [pageSize,   setPageSize]  = useState<50 | 100 | 200>(50);

  // État
  const [data,        setData]        = useState<LogsResponse | null>(null);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded,    setExpanded]    = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showClear,   setShowClear]   = useState(false);
  const [clearing,    setClearing]    = useState(false);
  const [countdown,   setCountdown]   = useState(30);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelF)   params.append('level',     levelF);
      if (serviceF) params.append('service',   serviceF);
      if (search)   params.append('search',    search);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo)   params.append('date_to',   dateTo);
      params.append('page',      String(page));
      params.append('page_size', String(pageSize));

      const result = await http<LogsResponse>(
        `/api/vendors/admin/logs/?${params}`,
        { headers: authHeader() }
      );
      setData(result);
      setCountdown(30);
    } catch {
      if (!silent) toastRef.current('Erreur chargement des logs', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [levelF, serviceF, search, dateFrom, dateTo, page, pageSize]);

  useEffect(() => { load(false); }, [load]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (autoRefresh) {
      intervalRef.current  = setInterval(() => load(true), AUTO_REFRESH_INTERVAL);
      countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? 30 : c - 1), 1000);
    }
    return () => {
      if (intervalRef.current)  clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, load]);

  const resetFilters = () => {
    setLevelF(''); setServiceF(''); setSearch('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = levelF || serviceF || search || dateFrom || dateTo;

  // Taux d'erreur
  const errorRate = data?.kpis.total_24h
    ? Math.round(data.kpis.errors_24h / data.kpis.total_24h * 100)
    : 0;

  // Santé système globale
  const systemHealthy = (data?.kpis.errors_24h ?? 0) === 0;
  const systemDegraded = (data?.kpis.errors_24h ?? 0) > 0 && (data?.kpis.errors_24h ?? 0) < 10;

  const clearLogs = async () => {
    setClearing(true);
    try {
      const res = await http<{ deleted: number; message: string }>(
        '/api/vendors/admin/logs/clear/?days=30',
        { method: 'DELETE', headers: authHeader() }
      );
      toastRef.current(res.message, 'success');
      setShowClear(false);
      load(false);
    } catch {
      toastRef.current('Erreur lors de la suppression', 'error');
    } finally {
      setClearing(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = data.logs.map(l =>
      [l.id, l.created_at, l.level, l.service, l.logger,
       `"${l.message.replace(/"/g, '""')}"`,
       l.ip_address ?? '', l.user_id ?? '', l.lineno ?? ''].join(';')
    );
    const csv  = `ID;Date;Level;Service;Logger;Message;IP;User;Ligne\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `belivay_logs_${new Date().toISOString().slice(0, 10)}.csv`;
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
            Logs Système
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Indicateur santé */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: systemHealthy ? 'rgba(16,185,129,0.12)' : systemDegraded ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${systemHealthy ? 'rgba(16,185,129,0.3)' : systemDegraded ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: systemHealthy ? '#10B981' : systemDegraded ? '#F59E0B' : '#EF4444', animation: !systemHealthy ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: systemHealthy ? '#10B981' : systemDegraded ? '#F59E0B' : '#EF4444' }}>
                {systemHealthy ? 'Système opérationnel' : systemDegraded ? 'Dégradé' : 'Incidents en cours'}
              </span>
            </div>
            <span style={{ fontSize: 12.5, color: T.muted }}>
              {data ? `${data.total.toLocaleString('fr-FR')} entrées au total` : '—'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setAutoRefresh(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: autoRefresh ? 'rgba(16,185,129,0.12)' : T.cardAlt, color: autoRefresh ? '#10B981' : T.muted, border: `1px solid ${autoRefresh ? 'rgba(16,185,129,0.3)' : T.border}` }}>
            <Activity size={12} />
            {autoRefresh ? `Auto · ${countdown}s` : 'Auto OFF'}
          </button>
          <button onClick={exportCSV} disabled={!data || data.logs.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            <Download size={12} /> Export CSV
          </button>
          <button onClick={() => setShowClear(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
            <Trash2 size={12} /> Purger
          </button>
          <button onClick={() => load(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)', cursor: 'pointer' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* KPIs 24h */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total 24h',    value: data?.kpis.total_24h,    accent: T.text,    icon: Terminal,       sub: undefined },
          { label: 'Erreurs 24h',  value: data?.kpis.errors_24h,   accent: '#EF4444', icon: AlertCircle,    sub: `${errorRate}% du trafic` },
          { label: 'Warnings',     value: data?.kpis.warnings_24h, accent: '#F59E0B', icon: AlertTriangle,  sub: undefined },
          { label: 'Info',         value: data?.kpis.info_24h,     accent: '#3B82F6', icon: Info,           sub: undefined },
          { label: 'Taux erreur',  value: `${errorRate}%`,         accent: errorRate > 5 ? '#EF4444' : '#10B981', icon: TrendingUp, sub: errorRate > 5 ? 'Attention' : 'Normal' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</span>
                <Icon size={13} style={{ color: k.accent }} />
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: k.accent, lineHeight: 1 }}>
                {loading ? '—' : k.value ?? 0}
              </p>
              {k.sub && <p style={{ fontSize: 10.5, color: T.muted, marginTop: 3 }}>{k.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Graphique activité + santé services */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Activité par heure */}
          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Activité 24h</span>
            </div>
            {data.by_hour && data.by_hour.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={data.by_hour} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="warnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tickFormatter={fmtHour}
                    tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number | undefined, n: string | undefined) => [v ?? 0, n ?? '']} />
                  <Area type="monotone" dataKey="errors"   stroke="#EF4444" strokeWidth={2} fill="url(#errGrad)"  dot={false} name="Erreurs" />
                  <Area type="monotone" dataKey="warnings" stroke="#F59E0B" strokeWidth={1.5} fill="url(#warnGrad)" dot={false} name="Warnings" />
                  <Area type="monotone" dataKey="info"     stroke="#3B82F6" strokeWidth={1} fill="none" dot={false} name="Info" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center" style={{ height: 140 }}>
                <p style={{ fontSize: 13, color: T.muted }}>Aucune donnée d'activité</p>
              </div>
            )}
          </div>

          {/* Santé par service */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <CheckCircle size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Santé services</span>
            </div>
            <div className="divide-y" style={{ borderColor: T.border }}>
              {SERVICES.map(svc => {
                const errors = data.by_service.find(s => s.service === svc)?.count ?? 0;
                const color  = SERVICE_HEALTH_COLOR(errors);
                return (
                  <div key={svc} className="flex items-center justify-between px-5 py-2.5"
                    onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="flex items-center gap-2.5">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: T.text }}>{SERVICE_LABELS[svc]}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>
                      {errors === 0 ? 'OK' : `${errors} err.`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barre de recherche + filtres */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher dans les messages, loggers, tracebacks…"
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
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Niveau</label>
              <select value={levelF} onChange={e => { setLevelF(e.target.value); setPage(1); }}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }}>
                <option value="">Tous</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Service</label>
              <select value={serviceF} onChange={e => { setServiceF(e.target.value); setPage(1); }}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }}>
                <option value="">Tous</option>
                {SERVICES.map(s => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Depuis</label>
              <input type="datetime-local" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>Jusqu'à</label>
              <input type="datetime-local" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                style={{ width: '100%', background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
            </div>
          </div>
        )}
      </div>

      {/* Filtres rapides niveau */}
      <div className="flex items-center gap-2 flex-wrap">
        {['', ...LEVELS].map(l => {
          const cfg    = l ? LEVEL_CFG[l] : null;
          const active = levelF === l;
          const count  = l === 'ERROR' || l === 'CRITICAL'
            ? data?.kpis.errors_24h
            : l === 'WARNING' ? data?.kpis.warnings_24h
            : l === 'INFO'    ? data?.kpis.info_24h
            : null;
          return (
            <button key={l || 'all'} onClick={() => { setLevelF(l); setPage(1); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: active ? (cfg?.color ?? T.red) + '18' : T.card, color: active ? (cfg?.color ?? T.red) : T.muted, border: `1px solid ${active ? (cfg?.color ?? T.red) + '40' : T.border}` }}>
              {cfg && <cfg.icon size={11} />}
              {l || 'Tous'}
              {count !== null && count !== undefined && (
                <span style={{ fontSize: 10, opacity: 0.7 }}>({count})</span>
              )}
            </button>
          );
        })}
        {/* Taille de page */}
        <div className="flex-1 flex justify-end">
          <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value) as 50 | 100 | 200); setPage(1); }}
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: '5px 10px', fontSize: 11.5, outline: 'none', cursor: 'pointer' }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
      </div>

      {/* Terminal de logs */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Header terminal */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#161B22' }}>
          <div className="flex items-center gap-3">
            {/* Dots macOS style */}
            <div className="flex items-center gap-1.5">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#484F58', fontFamily: 'monospace' }}>
              belivay@prod — logs
            </span>
            {autoRefresh && (
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 10, color: '#10B981', fontFamily: 'monospace' }}>LIVE</span>
              </div>
            )}
          </div>
          <span style={{ fontSize: 11, color: '#484F58', fontFamily: 'monospace' }}>
            {data ? `${((page - 1) * pageSize + 1)}–${Math.min(page * pageSize, data.total)} / ${data.total.toLocaleString('fr-FR')}` : '—'}
          </span>
        </div>

        {/* Prompt */}
        <div style={{ padding: '8px 20px 4px', fontFamily: 'monospace', fontSize: 11.5, color: '#484F58' }}>
          <span style={{ color: '#3FB950' }}>belivay</span>
          <span style={{ color: '#58A6FF' }}>@prod</span>
          <span style={{ color: '#E6EDF3' }}> % </span>
          <span style={{ color: '#E6EDF3' }}>
            tail -f /var/log/belivay.log
            {levelF   ? ` | grep ${levelF}`   : ''}
            {serviceF ? ` | grep ${SERVICE_LABELS[serviceF]}` : ''}
            {search   ? ` | grep "${search}"` : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10B981', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-3">
            <Terminal size={32} style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
              {hasFilters ? '// Aucun log correspondant aux filtres' : '// Aucun log — le système est silencieux'}
            </p>
          </div>
        ) : (
          <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12 }}>
            {data.logs.map(log => {
              const cfg      = LEVEL_CFG[log.level] ?? LEVEL_CFG.INFO;
              const Icon     = cfg.icon;
              const isExp    = expanded === log.id;
              const hasTrace = log.exc_text && log.exc_text.length > 0;

              return (
                <div key={log.id} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: isExp ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}>
                  {/* Ligne principale */}
                  <div
                    className="flex items-start gap-2 px-5 py-2 cursor-pointer"
                    onClick={() => setExpanded(isExp ? null : log.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isExp ? 'rgba(255,255,255,0.02)' : 'transparent')}>

                    {/* Timestamp */}
                    <span style={{ color: '#30363D', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 10.5, paddingTop: 1 }}>
                      {fmtDateTime(log.created_at)}
                    </span>

                    {/* Level */}
                    <div className="flex items-center gap-1 flex-shrink-0" style={{ minWidth: 80 }}>
                      <Icon size={10} style={{ color: cfg.terminal }} />
                      <span style={{ color: cfg.terminal, fontWeight: 700, fontSize: 10.5 }}>{log.level}</span>
                    </div>

                    {/* Service */}
                    <span style={{ color: '#58A6FF', flexShrink: 0, fontSize: 11 }}>
                      [{SERVICE_LABELS[log.service] ?? log.service}]
                    </span>

                    {/* Message */}
                    <span style={{
                      color: log.level === 'ERROR' || log.level === 'CRITICAL'
                        ? '#FF7B72' : log.level === 'WARNING'
                        ? '#E3B341' : '#C9D1D9',
                      flex: 1, lineHeight: 1.5, wordBreak: 'break-word',
                    }}>
                      {log.message}
                    </span>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasTrace && (
                        <span style={{ fontSize: 9.5, color: '#FF7B72', background: 'rgba(239,68,68,0.15)', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                          TRACE
                        </span>
                      )}
                      {log.ip_address && (
                        <span style={{ fontSize: 9.5, color: '#30363D' }}>{log.ip_address}</span>
                      )}
                    </div>
                  </div>

                  {/* Détails expandés */}
                  {isExp && (
                    <div style={{ padding: '4px 20px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
                        {[
                          { label: 'Logger',   value: log.logger || '—' },
                          { label: 'Fichier',  value: log.pathname ? `${log.pathname.split('/').slice(-2).join('/')}:${log.lineno}` : '—' },
                          { label: 'IP',       value: log.ip_address || '—' },
                          { label: 'User ID',  value: log.user_id ? `#${log.user_id}` : '—' },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p style={{ fontSize: 9.5, color: '#30363D', marginBottom: 2 }}>{label}</p>
                            <p style={{ fontSize: 11, color: '#8B949E', wordBreak: 'break-all', fontFamily: 'monospace' }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {hasTrace && (
                        <pre style={{
                          background: 'rgba(255,59,48,0.05)',
                          border: '1px solid rgba(255,59,48,0.15)',
                          borderRadius: 8, padding: '10px 14px',
                          color: '#FF7B72', fontSize: 10.5,
                          overflowX: 'auto', whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word', maxHeight: 280,
                          overflowY: 'auto', lineHeight: 1.7,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        }}>
                          {log.exc_text}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination terminal */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#161B22' }}>
            <span style={{ fontSize: 11, color: '#484F58', fontFamily: 'monospace' }}>
              page {page}/{data.total_pages}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 26, height: 26, borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: page === 1 ? '#30363D' : '#8B949E', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft size={12} />
              </button>
              <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}
                style={{ width: 26, height: 26, borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: page === data.total_pages ? '#30363D' : '#8B949E', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === data.total_pages ? 'not-allowed' : 'pointer' }}>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal purge */}
      {showClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowClear(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Trash2 size={20} style={{ color: '#EF4444' }} />
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.text }}>
                Purger les logs
              </h3>
            </div>
            <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
              Tous les logs de plus de <strong style={{ color: T.text }}>30 jours</strong> seront supprimés définitivement. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowClear(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={clearLogs} disabled={clearing}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#EF4444', color: '#fff', cursor: clearing ? 'not-allowed' : 'pointer', opacity: clearing ? 0.7 : 1, border: 'none' }}>
                {clearing ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {clearing ? 'Suppression…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}