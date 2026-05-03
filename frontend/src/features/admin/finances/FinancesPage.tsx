// frontend/src/features/admin/finances/FinancesPage.tsx
// Tableau de bord financier — admin BelivaY
// KPIs commissions · Escrow · Retraits pendants · Chart 30j · Top vendeurs

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, TrendingUp, Lock, ArrowDownToLine,
  RefreshCw, AlertCircle, Store, Award,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FinancesStats {
  kpis: {
    total_commission:           number;
    month_commission:           number;
    week_commission:            number;
    gmv_total:                  number;
    gmv_month:                  number;
    escrow_blocked:             number;
    pending_withdrawals_amount: number;
    pending_withdrawals_count:  number;
    approved_withdrawals_total: number;
    commission_rate:            string;
  };
  commissions_chart: Array<{ date: string; commission: number; gmv: number }>;
  top_vendors: Array<{
    vendor_id:        number;
    vendor_name:      string;
    business_name:    string;
    total_gmv:        number;
    total_commission: number;
  }>;
  pending_withdrawals: Array<{
    id:              number;
    reference:       string;
    vendor_id:       number;
    business_name:   string;
    amount_xaf:      number;
    net_amount_xaf:  number;
    operator:        string;
    phone:           string;
    created_at:      string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf  = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtShort= (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, T }: {
  active?: boolean; payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string | number; T: ReturnType<typeof useAdminTheme>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
      <p style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 12, fontWeight: 700, color: p.color }}>
          {p.name} : {fmtXaf(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [stats,   setStats]   = useState<FinancesStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const data  = await http<FinancesStats>('/api/vendors/admin/finances/stats/', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      setStats(data);
    } catch {
      showToast('Erreur chargement des finances', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={40} style={{ color: T.muted }} />
        <p style={{ fontSize: 14, color: T.muted }}>Impossible de charger les finances</p>
        <button onClick={() => load()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
          <RefreshCw size={14} /> Réessayer
        </button>
      </div>
    );
  }

  const { kpis, commissions_chart, top_vendors, pending_withdrawals } = stats;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Finances & Commissions
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            Taux de commission actuel : <span style={{ color: T.red, fontWeight: 700 }}>{kpis.commission_rate}%</span>
            {pending_withdrawals.length > 0 && (
              <span style={{ color: '#F59E0B', fontWeight: 700, marginLeft: 8 }}>
                · {pending_withdrawals.length} retrait{pending_withdrawals.length > 1 ? 's' : ''} en attente
              </span>
            )}
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* ── KPI Cards (8) ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Commissions totales',   value: fmtXaf(kpis.total_commission),           sub: `${kpis.commission_rate}% sur chaque vente`, accent: T.red,    icon: DollarSign  },
          { label: 'Commissions ce mois',   value: fmtXaf(kpis.month_commission),           sub: `${fmtXaf(kpis.week_commission)} cette semaine`, accent: '#10B981', icon: TrendingUp  },
          { label: 'GMV total',             value: fmtXaf(kpis.gmv_total),                 sub: `${fmtXaf(kpis.gmv_month)} ce mois`,         accent: '#3B82F6', icon: Store       },
          { label: 'Escrow bloqué',         value: fmtXaf(kpis.escrow_blocked),             sub: 'fonds sécurisés en cours',                  accent: '#F59E0B', icon: Lock        },
          { label: 'Retraits en attente',   value: fmtXaf(kpis.pending_withdrawals_amount), sub: `${kpis.pending_withdrawals_count} demande${kpis.pending_withdrawals_count > 1 ? 's' : ''}`, accent: kpis.pending_withdrawals_count > 0 ? '#EF4444' : T.muted, icon: ArrowDownToLine },
          { label: 'Retraits approuvés',    value: fmtXaf(kpis.approved_withdrawals_total), sub: 'versés aux vendeurs',                        accent: '#10B981', icon: ArrowDownToLine },
          { label: 'Marge nette estimée',   value: fmtXaf(kpis.total_commission - kpis.approved_withdrawals_total), sub: 'commissions - retraits approuvés', accent: '#8B5CF6', icon: Award },
          { label: 'GMV ce mois',           value: fmtXaf(kpis.gmv_month),                 sub: 'volume brut ce mois',                       accent: '#06B6D4', icon: TrendingUp  },
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
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.text, lineHeight: 1.1, marginBottom: 4 }}>
                {k.value}
              </p>
              <p style={{ fontSize: 11, color: k.accent === T.muted ? T.muted : k.accent }}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* AreaChart commissions 30j — 2/3 */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text }}>
                Commissions & GMV — 30 jours
              </p>
              <p style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                Commissions perçues et volume brut quotidien
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 2, background: T.red }} />
                <span style={{ fontSize: 11, color: T.muted }}>Commission</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#3B82F6' }} />
                <span style={{ fontSize: 11, color: T.muted }}>GMV</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={commissions_chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={T.red}  stopOpacity={0.25} />
                  <stop offset="95%" stopColor={T.red}  stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : `${Math.round(v / 1000)}k`} width={32} />
              <Tooltip content={(props) => <ChartTooltip {...props} T={T} />} />
              <Area type="monotone" dataKey="gmv"        name="GMV"        stroke="#3B82F6" strokeWidth={1.5} fill="url(#gmvGrad)"  dot={false} />
              <Area type="monotone" dataKey="commission" name="Commission" stroke={T.red}   strokeWidth={2}   fill="url(#commGrad)" dot={false} activeDot={{ r: 4, fill: T.red }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top vendeurs contributeurs — 1/3 */}
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Top contributeurs
          </p>
          <p style={{ fontSize: 11.5, color: T.muted, marginBottom: 16 }}>
            Par commissions générées
          </p>

          {top_vendors.length === 0 ? (
            <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '20px 0' }}>
              Aucune donnée
            </p>
          ) : (
            <div className="space-y-3">
              {top_vendors.slice(0, 6).map((v, i) => {
                const maxComm = top_vendors[0]?.total_commission ?? 1;
                const pct     = Math.round((v.total_commission / maxComm) * 100);
                return (
                  <Link key={v.vendor_id} to={`/admin/vendors/${v.vendor_id}`}
                    className="block group transition-all"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          background: i === 0 ? T.red + '20' : T.border,
                          color: i === 0 ? T.red : T.muted,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 800,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }} className="truncate">
                          {v.business_name}
                        </span>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: T.red, flexShrink: 0, marginLeft: 6 }}>
                        {fmtXaf(v.total_commission)}
                      </span>
                    </div>
                    <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? T.red : '#3B82F6', borderRadius: 2, opacity: 1 - i * 0.1 }} />
                    </div>
                    <p style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>GMV: {fmtXaf(v.total_gmv)}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── BarChart commissions mensuel condensé ─────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 16 }}>
          Distribution quotidienne des commissions
        </p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={commissions_chart} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : `${Math.round(v / 1000)}k`} width={32} />
            <Tooltip content={(props) => <ChartTooltip {...props} T={T} />} />
            <Bar dataKey="commission" name="Commission" fill={T.red} radius={[3, 3, 0, 0]} fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Retraits en attente ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${pending_withdrawals.length > 0 ? 'rgba(245,158,11,0.35)' : T.border}` }}>
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: `1px solid ${T.border}`, background: pending_withdrawals.length > 0 ? 'rgba(245,158,11,0.06)' : T.cardAlt }}>
          <div className="flex items-center gap-2">
            <ArrowDownToLine size={14} style={{ color: pending_withdrawals.length > 0 ? '#F59E0B' : T.muted }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              Retraits vendeurs en attente
            </span>
            {pending_withdrawals.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                {pending_withdrawals.length}
              </span>
            )}
          </div>
          <Link to="/admin/vendors/withdrawals" style={{ fontSize: 11.5, fontWeight: 600, color: T.red }}>
            Gérer tout →
          </Link>
        </div>

        {pending_withdrawals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <ArrowDownToLine size={28} style={{ color: T.muted }} />
            <p style={{ fontSize: 13, color: T.muted }}>Aucun retrait en attente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                  {['Référence', 'Boutique', 'Opérateur', 'Numéro', 'Montant', 'Net', 'Demandé le'].map((h, i) => (
                    <th key={i} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending_withdrawals.map((wr, i) => (
                  <tr key={wr.id}
                    style={{ borderBottom: i < pending_withdrawals.length - 1 ? `1px solid ${T.border}` : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ fontSize: 11.5, color: T.muted, background: T.cardAlt, padding: '2px 6px', borderRadius: 4 }}>
                        {wr.reference}
                      </code>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link to={`/admin/vendors/${wr.vendor_id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: '#F47920' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                        {wr.business_name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: wr.operator === 'MTN_MOMO' ? 'rgba(245,158,11,0.12)' : 'rgba(245,121,32,0.12)',
                        color:      wr.operator === 'MTN_MOMO' ? '#F59E0B'                : '#F47920',
                      }}>
                        {wr.operator === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: T.muted }}>{wr.phone}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>
                      {fmtXaf(wr.amount_xaf)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#10B981', whiteSpace: 'nowrap' }}>
                      {fmtXaf(wr.net_amount_xaf)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>
                      {fmtDate(wr.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}