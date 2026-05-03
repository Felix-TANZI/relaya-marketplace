// frontend/src/features/admin/customers/CustomersOverviewPage.tsx
// Vue d'ensemble clients — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, RefreshCw, TrendingUp, ShoppingCart,
  Award, UserPlus, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { adminApi } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export default function CustomersOverviewPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [data,    setData]    = useState<Awaited<ReturnType<typeof adminApi.getCustomerStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getCustomerStats();
      setData(result);
    } catch {
      toastRef.current('Erreur chargement vue clients', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis;
  const chart = data?.registrations_chart ?? [];
  const loyalty = data?.role_distribution ?? [];

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Vue d'ensemble — Clients
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            Analyse globale de la base clients BelivaY
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <Link to="/admin/customers"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
            Liste clients <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total clients',      value: kpis?.total,          accent: T.text,    icon: Users    },
          { label: 'Actifs 30j',         value: kpis?.active_30d,     accent: '#10B981', icon: TrendingUp},
          { label: 'Nouveaux ce mois',   value: kpis?.new_this_month, accent: '#3B82F6', icon: UserPlus },
          { label: 'Avec commandes',     value: kpis?.vendors,        accent: '#F47920', icon: ShoppingCart },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.accent + '18' }}>
                  <Icon size={14} style={{ color: k.accent }} />
                </div>
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>
                {loading ? '—' : (k.value ?? 0).toLocaleString('fr-FR')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Graphique inscriptions + donut fidélité */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Inscriptions 30j */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Nouvelles inscriptions (30j)</span>
          </div>
          {loading || chart.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 180 }}>
              <div style={{ fontSize: 13, color: T.muted }}>Aucune donnée</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.red} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={T.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={fmtDate}
                  tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number | undefined) => [v ?? 0, 'Inscriptions']}
                  labelFormatter={(d) => typeof d === 'string' ? fmtDate(d) : ''} />
                <Area type="monotone" dataKey="count" stroke={T.red}
                  strokeWidth={2} fill="url(#cGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribution rôles */}
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Award size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Répartition rôles</span>
          </div>
          {loading || loyalty.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 160 }}>
              <p style={{ fontSize: 12, color: T.muted }}>Aucune donnée</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={loyalty} dataKey="count" nameKey="role"
                    cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {loyalty.map((_, i) => (
                      <Cell key={i} fill={[T.red, '#F47920', '#3B82F6', '#8B5CF6'][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {loyalty.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: [T.red, '#F47920', '#3B82F6', '#8B5CF6'][i % 4] }} />
                      <span style={{ fontSize: 11.5, color: T.muted }}>{r.role}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { to: '/admin/customers',         label: 'Liste complète des clients', sub: `${kpis?.total ?? '—'} clients`, accent: T.red },
          { to: '/admin/notifications',     label: 'Envoyer une notification',   sub: 'Broadcast ciblé',              accent: '#3B82F6' },
          { to: '/admin/users',             label: 'Gestion utilisateurs',       sub: 'Bannir · Modifier · Supprimer', accent: '#8B5CF6' },
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