// frontend/src/features/admin/customers/CustomersLoyaltyPage.tsx
// Fidélité & Segments clients — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, RefreshCw, Users, TrendingUp, ShoppingCart,
  ChevronLeft, ExternalLink, Star,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface TierDistribution {
  tier:    string;
  label:   string;
  count:   number;
  pct:     number;
  min_pts: number;
  max_pts: number | null;
}

interface TopClient {
  id:           number;
  username:     string;
  full_name:    string;
  email:        string;
  points:       number;
  tier:         string;
  orders_count: number;
  date_joined:  string;
}

interface LoyaltyStats {
  total_buyers: number;
  avg_points:   number;
  tier_counts:  Record<string, number>;
  distribution: TierDistribution[];
  top_clients:  TopClient[];
  earning_rule: string;
  thresholds:   Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const TIER_CFG: Record<string, { label: string; color: string; bg: string; gradient: string }> = {
  BRONZE:  { label: 'Bronze',  color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  gradient: 'linear-gradient(135deg,#CD7F32,#8B5E2D)' },
  SILVER:  { label: 'Argent',  color: '#8B909A', bg: 'rgba(139,144,154,0.12)', gradient: 'linear-gradient(135deg,#8B909A,#5A5F6A)' },
  GOLD:    { label: 'Or',      color: '#C8A000', bg: 'rgba(200,160,0,0.12)',   gradient: 'linear-gradient(135deg,#C8A000,#8B6E00)' },
  DIAMOND: { label: 'Diamant', color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)' },
};

const TIER_BENEFITS: Record<string, string[]> = {
  BRONZE:  ['Accès au catalogue', 'Historique commandes', 'Support standard'],
  SILVER:  ['Badge Argent · 500 pts', 'Livraison prioritaire', 'Support amélioré'],
  GOLD:    ['Badge Or · 1 000 pts', 'Livraison offerte (-10%)', 'Support dédié', 'Accès ventes privées'],
  DIAMOND: ['Badge Diamant · 2 000 pts', 'Livraison offerte', 'Support VIP 24/7', 'Accès exclusifs', 'Cadeau anniversaire'],
};

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomersLoyaltyPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [data,    setData]    = useState<LoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await http<LoyaltyStats>(
        '/api/vendors/admin/customers/loyalty/',
        { headers: authHeader() }
      );
      setData(result);
    } catch {
      toastRef.current('Erreur chargement fidélité', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredClients = data?.top_clients.filter(c =>
    filterTier === 'all' || c.tier === filterTier
  ) ?? [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/admin/customers"
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
              <ChevronLeft size={14} />
            </Link>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>
              Fidélité & Segments
            </h1>
          </div>
          <p style={{ fontSize: 13, color: T.muted, paddingLeft: 44 }}>
            {data?.earning_rule ?? '—'} · {data?.total_buyers ?? '—'} acheteurs analysés
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total acheteurs', value: data?.total_buyers,                     accent: T.text,    icon: Users      },
          { label: 'Points moyens',   value: data?.avg_points?.toFixed(0),            accent: '#F47920', icon: Star       },
          { label: 'Tier Gold+',      value: (data?.tier_counts?.GOLD ?? 0) + (data?.tier_counts?.DIAMOND ?? 0), accent: '#C8A000', icon: Award      },
          { label: 'Diamant',         value: data?.tier_counts?.DIAMOND,              accent: '#2563EB', icon: TrendingUp },
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

      {/* Distribution + Avantages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Graphiques répartition */}
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Award size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Répartition par tier</span>
          </div>
          {loading || !data ? (
            <div className="flex items-center justify-center" style={{ height: 200 }}>
              <p style={{ fontSize: 13, color: T.muted }}>Chargement…</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Donut */}
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.distribution} dataKey="count" nameKey="label"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {data.distribution.map((d) => (
                      <Cell key={d.tier} fill={TIER_CFG[d.tier]?.color ?? '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number | undefined, n: string | undefined) => [v ?? 0, n ?? '']} />
                </PieChart>
              </ResponsiveContainer>
              {/* Légende + barres */}
              <div className="flex flex-col justify-center space-y-2.5">
                {data.distribution.map(d => {
                  const cfg = TIER_CFG[d.tier];
                  return (
                    <div key={d.tier}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg?.color }} />
                          <span style={{ fontSize: 12, color: T.text }}>{cfg?.label}</span>
                        </div>
                        <div className="text-right">
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg?.color }}>{d.count}</span>
                          <span style={{ fontSize: 10.5, color: T.muted, marginLeft: 4 }}>{d.pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d.pct}%`, background: cfg?.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Seuils et avantages */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
            <Star size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Seuils & Avantages</span>
          </div>
          <div className="divide-y" style={{ borderColor: T.border }}>
            {(['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'] as const).map((tier) => {
              const cfg  = TIER_CFG[tier];
              const threshold = data?.thresholds[tier] ?? 0;
              const benefits  = TIER_BENEFITS[tier];
              return (
                <div key={tier} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.gradient }}>
                      <Award size={14} style={{ color: '#fff' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
                        <span style={{ fontSize: 11, color: T.muted }}>≥ {threshold.toLocaleString('fr-FR')} pts</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
                      {loading ? '—' : (data?.tier_counts[tier] ?? 0)} clients
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-11">
                    {benefits.map((b, j) => (
                      <span key={j} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Histogramme points */}
      {data && data.distribution.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Volume par tier</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data.distribution} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }}
                formatter={(v: number | undefined) => [v ?? 0, 'clients']} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.distribution.map((d) => (
                  <Cell key={d.tier} fill={TIER_CFG[d.tier]?.color ?? '#9CA3AF'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top clients fidèles */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
          <div className="flex items-center gap-2">
            <Award size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              Top clients {filterTier !== 'all' ? `— ${TIER_CFG[filterTier]?.label}` : ''}
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>({filteredClients.length})</span>
          </div>
          {/* Filtre tier */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'DIAMOND', 'GOLD', 'SILVER', 'BRONZE'] as const).map(t => (
              <button key={t} onClick={() => setFilterTier(t)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                style={{ background: filterTier === t ? (t === 'all' ? T.red : TIER_CFG[t]?.color) + '20' : T.cardAlt, color: filterTier === t ? (t === 'all' ? T.red : TIER_CFG[t]?.color) : T.muted, border: `1px solid ${filterTier === t ? (t === 'all' ? T.red : TIER_CFG[t]?.color) + '40' : T.border}` }}>
                {t === 'all' ? 'Tous' : TIER_CFG[t]?.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <Award size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>Aucun client dans ce tier</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: T.cardAlt, borderBottom: `1px solid ${T.border}` }}>
                  {['#', 'Client', 'Tier', 'Points', 'Commandes payées', 'Membre depuis', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c, i) => {
                  const cfg = TIER_CFG[c.tier];
                  const joined = new Date(c.date_joined).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: i < filteredClients.length - 1 ? `1px solid ${T.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Rang */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black"
                          style={{ background: i < 3 ? cfg?.gradient : T.border, color: i < 3 ? '#fff' : T.muted }}>
                          {i + 1}
                        </div>
                      </td>
                      {/* Client */}
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.full_name}</p>
                        <p style={{ fontSize: 11, color: T.muted }}>@{c.username}</p>
                      </td>
                      {/* Tier */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: cfg?.gradient }}>
                            <Award size={12} style={{ color: '#fff' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cfg?.color }}>{cfg?.label}</span>
                        </div>
                      </td>
                      {/* Points */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: cfg?.color }}>
                          {c.points.toLocaleString('fr-FR')}
                        </span>
                        <span style={{ fontSize: 11, color: T.muted, marginLeft: 3 }}>pts</span>
                      </td>
                      {/* Commandes */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-1.5">
                          <ShoppingCart size={12} style={{ color: T.muted }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.orders_count}</span>
                        </div>
                      </td>
                      {/* Membre depuis */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: T.muted }}>
                        {joined}
                      </td>
                      {/* Lien */}
                      <td style={{ padding: '12px 16px' }}>
                        <Link to={`/admin/users/${c.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T.text)}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = T.muted)}>
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}