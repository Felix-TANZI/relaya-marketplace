// frontend/src/features/admin/vendors/VendorsOverviewPage.tsx
// Vue d'ensemble vendeurs — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, RefreshCw, TrendingUp, Award,
  DollarSign, CheckCircle, Clock, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { adminApi, type VendorStats } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

const fmtXaf  = (n: number) => n >= 1_000_000
  ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : `${n}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const STATUS_COLORS: Record<string, string> = {
  PENDING:   '#F59E0B',
  APPROVED:  '#10B981',
  REJECTED:  '#EF4444',
  SUSPENDED: '#9CA3AF',
};

const CERT_COLORS: Record<string, string> = {
  BRONZE:  '#CD7F32',
  SILVER:  '#8B909A',
  GOLD:    '#C8A000',
  DIAMOND: '#2563EB',
};

export default function VendorsOverviewPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [data,    setData]    = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getVendorStats();
      setData(result);
    } catch {
      toastRef.current('Erreur chargement vue vendeurs', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Vue d'ensemble — Vendeurs
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            Performance et santé du réseau de boutiques
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <Link to="/admin/vendors"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
            Liste vendeurs <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total boutiques',  value: kpis?.total,         accent: T.text,    icon: Store        },
          { label: 'Approuvées',       value: kpis?.approved,      accent: '#10B981', icon: CheckCircle  },
          { label: 'En attente KYC',  value: kpis?.pending,       accent: '#F59E0B', icon: Clock        },
          { label: 'GMV ce mois',      value: fmtXaf(kpis?.gmv_month ?? 0) + ' FCFA', accent: T.red, icon: DollarSign },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  {k.label}
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.accent + '18' }}>
                  <Icon size={14} style={{ color: k.accent }} />
                </div>
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: typeof k.value === 'string' ? 16 : 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>
                {loading ? '—' : k.value ?? 0}
              </p>
            </div>
          );
        })}
      </div>

      {/* GMV Chart + Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* GMV 30j */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>GMV 30 derniers jours</span>
            {kpis?.gmv_total && (
              <span style={{ fontSize: 11.5, color: T.muted, marginLeft: 'auto' }}>
                Total : {fmtXaf(kpis.gmv_total)} FCFA
              </span>
            )}
          </div>
          {loading || !data?.gmv_chart.length ? (
            <div className="flex items-center justify-center" style={{ height: 180 }}>
              <p style={{ fontSize: 13, color: T.muted }}>Aucune donnée</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.gmv_chart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F47920" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F47920" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={fmtDate}
                  tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtXaf(v)}
                  tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number | undefined) => [`${fmtXaf(v ?? 0)} FCFA`, 'GMV']}
                  labelFormatter={(d) => typeof d === 'string' ? fmtDate(d) : ''} />
                <Area type="monotone" dataKey="revenue" stroke="#F47920"
                  strokeWidth={2} fill="url(#gGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribution statuts */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2">
            <Store size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Statuts boutiques</span>
          </div>
          {loading || !data?.status_distribution.length ? (
            <div className="flex items-center justify-center" style={{ height: 140 }}>
              <p style={{ fontSize: 12, color: T.muted }}>Aucune donnée</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={data.status_distribution} dataKey="count" nameKey="status"
                    cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3}>
                    {data.status_distribution.map((d, i) => (
                      <Cell key={i} fill={STATUS_COLORS[d.status] ?? '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {data.status_distribution.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[d.status] ?? '#9CA3AF' }} />
                      <span style={{ fontSize: 11.5, color: T.muted }}>{d.label}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Distribution plans + certifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Plans */}
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Répartition par plan</span>
          </div>
          {loading || !data?.plan_distribution.length ? (
            <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '24px 0' }}>Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.plan_distribution} layout="vertical" margin={{ left: 16, right: 8 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="plan" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.plan_distribution.map((_, i) => (
                    <Cell key={i} fill={['#9CA3AF', '#3B82F6', '#F47920', '#8B5CF6'][i % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Certifications */}
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Award size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Répartition certifications</span>
          </div>
          {loading || !data?.cert_distribution.length ? (
            <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '24px 0' }}>Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {data.cert_distribution.map((d, i) => {
                const color = CERT_COLORS[d.tier] ?? '#9CA3AF';
                const max   = Math.max(...data.cert_distribution.map(x => x.count), 1);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                        <span style={{ fontSize: 12.5, color: T.text }}>{d.tier}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{d.count}</span>
                    </div>
                    <div style={{ height: 5, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(d.count / max * 100)}%`, background: color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { to: '/admin/vendors/kyc',           label: 'KYC en attente',       sub: `${kpis?.pending ?? '—'} à valider`,   accent: '#F59E0B' },
          { to: '/admin/vendors/certifications', label: 'Certifications',       sub: 'Bronze → Diamant',                   accent: '#C8A000' },
          { to: '/admin/vendors/map',            label: 'Carte des boutiques',  sub: 'Distribution géographique',          accent: '#3B82F6' },
        ].map((a, i) => (
          <Link key={i} to={a.to}
            className="flex items-center justify-between p-4 rounded-2xl transition-all"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = a.accent + '50')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 2 }}>{a.label}</p>
              <p style={{ fontSize: 11.5, color: T.muted }}>{a.sub}</p>
            </div>
            <ChevronRight size={16} style={{ color: a.accent, flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}