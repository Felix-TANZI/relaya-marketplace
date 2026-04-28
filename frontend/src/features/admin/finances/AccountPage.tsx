// frontend/src/features/admin/finances/AccountPage.tsx
// Compte BelivaY — solde plateforme, escrow, santé système

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Landmark, RefreshCw, DollarSign, Lock, TrendingUp,
  ArrowDownToLine, Shield, CheckCircle, AlertTriangle,
  Clock, Activity,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AccountStats {
  // Finances plateforme
  total_gmv:                  number;  // Volume brut total
  total_commissions_earned:   number;  // Commissions générées (total)
  total_escrow_blocked:       number;  // Escrow BLOCKED actuellement
  total_escrow_release_pending: number; // Escrow RELEASE_PENDING
  total_escrow_released:      number;  // Escrow RELEASED (libéré aux vendeurs)
  total_withdrawals_approved: number;  // Retraits vendeurs approuvés
  net_platform_revenue:       number;  // commissions - retraits
  pending_withdrawals_count:  number;
  pending_withdrawals_amount: number;
  commission_rate:            string;

  // Santé système
  total_users:        number;
  active_vendors:     number;
  total_orders:       number;
  paid_orders:        number;
  pending_disputes:   number;
  maintenance_mode:   boolean;
  db_status:          string;
  last_order_at:      string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, icon: Icon, T }: {
  label:  string;
  value:  string;
  sub?:   string;
  accent: string;
  icon:   React.ElementType;
  T:      ReturnType<typeof useAdminTheme>;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accent + '18' }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>
      <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.1, marginBottom: 4 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: accent }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [stats,   setStats]   = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await http<AccountStats>(
        '/api/vendors/admin/account/stats/',
        { headers: authHeader() }
      );
      setStats(data);
    } catch {
      toastRef.current('Erreur chargement du compte', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!stats) return null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Compte BelivaY
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            Finances de la plateforme · Commission actuelle : <span style={{ color: T.red, fontWeight: 700 }}>{stats.commission_rate}%</span>
            {stats.maintenance_mode && (
              <span style={{ color: '#EF4444', fontWeight: 700, marginLeft: 12 }}>· Mode maintenance ACTIF</span>
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

      {/* Alerte maintenance */}
      {stats.maintenance_mode && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#EF4444' }}>Plateforme en mode maintenance</p>
            <p style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
              Les clients ne peuvent pas accéder à BelivaY. Désactivez dans Paramètres dès que les travaux sont terminés.
            </p>
          </div>
        </div>
      )}

      {/* ─── Finances plateforme ─────────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-5">
          <Landmark size={16} style={{ color: T.red }} />
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: '#F9FAFB' }}>Finances de la plateforme</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'GMV Total',
              value: fmtXaf(stats.total_gmv),
              sub:   'Volume brut de toutes les ventes',
              accent: '#3B82F6',
            },
            {
              label: 'Commissions Générées',
              value: fmtXaf(stats.total_commissions_earned),
              sub:   `${stats.commission_rate}% sur chaque vente`,
              accent: T.red,
            },
            {
              label: 'Revenu Net Plateforme',
              value: fmtXaf(stats.net_platform_revenue),
              sub:   'Commissions − retraits vendeurs',
              accent: '#10B981',
            },
          ].map((k, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(249,250,251,0.4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                {k.label}
              </p>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: k.accent, lineHeight: 1.1, marginBottom: 4 }}>
                {k.value}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(249,250,251,0.4)' }}>{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── KPIs Escrow ─────────────────────────────────────────────────── */}
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
          État de l'Escrow
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Fonds bloqués"       value={fmtXaf(stats.total_escrow_blocked)}          sub="Commandes en cours"           accent="#F59E0B" icon={Lock}            T={T} />
          <KpiCard label="Libération en cours" value={fmtXaf(stats.total_escrow_release_pending)}   sub="Délai 24h post-livraison"     accent="#3B82F6" icon={Clock}           T={T} />
          <KpiCard label="Libéré aux vendeurs" value={fmtXaf(stats.total_escrow_released)}          sub="Fonds débloqués"              accent="#10B981" icon={CheckCircle}     T={T} />
          <KpiCard label="Retraits approuvés"  value={fmtXaf(stats.total_withdrawals_approved)}     sub="Versés aux vendeurs"          accent="#8B5CF6" icon={ArrowDownToLine} T={T} />
        </div>
      </div>

      {/* ─── Retraits en attente ─────────────────────────────────────────── */}
      {stats.pending_withdrawals_count > 0 && (
        <div className="flex items-start gap-4 p-4 rounded-2xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <ArrowDownToLine size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#F59E0B' }}>
              {stats.pending_withdrawals_count} retrait{stats.pending_withdrawals_count > 1 ? 's' : ''} en attente d'approbation
            </p>
            <p style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
              Montant total : <strong style={{ color: T.text }}>{fmtXaf(stats.pending_withdrawals_amount)}</strong> — 
              à traiter dans la section <a href="/admin/vendors/withdrawals" style={{ color: '#F59E0B', fontWeight: 600, marginLeft: 4 }}>Retraits vendeurs →</a>
            </p>
          </div>
        </div>
      )}

      {/* ─── Layout 2 colonnes ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Santé système */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
            <Activity size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Santé Système</span>
          </div>
          <div className="p-5 space-y-0">
            {[
              { label: 'Base de données',     value: stats.db_status === 'ok' ? 'Opérationnelle' : 'Dégradée', accent: stats.db_status === 'ok' ? '#10B981' : '#EF4444', icon: Shield },
              { label: 'Utilisateurs totaux', value: stats.total_users.toLocaleString('fr-FR'),               accent: '#3B82F6', icon: Activity },
              { label: 'Vendeurs actifs',     value: stats.active_vendors.toLocaleString('fr-FR'),            accent: '#F47920', icon: Activity },
              { label: 'Commandes totales',   value: stats.total_orders.toLocaleString('fr-FR'),              accent: '#8B5CF6', icon: TrendingUp },
              { label: 'Commandes payées',    value: stats.paid_orders.toLocaleString('fr-FR'),               accent: '#10B981', icon: CheckCircle },
              { label: 'Litiges en cours',    value: stats.pending_disputes.toLocaleString('fr-FR'),          accent: stats.pending_disputes > 0 ? '#EF4444' : '#10B981', icon: AlertTriangle },
              { label: 'Dernière commande',   value: fmtDate(stats.last_order_at),                            accent: T.muted, icon: Clock },
            ].map(({ label, value, accent, icon: Icon }, i, arr) => (
              <div key={i} className="flex items-center justify-between py-3"
                style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accent + '15' }}>
                    <Icon size={13} style={{ color: accent }} />
                  </div>
                  <span style={{ fontSize: 12.5, color: T.muted }}>{label}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flux de trésorerie */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
            <DollarSign size={14} style={{ color: T.red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Flux de Trésorerie</span>
          </div>
          <div className="p-5 space-y-4">

            {/* Barre de répartition visuelle */}
            {stats.total_gmv > 0 && (() => {
              const commPct   = Math.round(stats.total_commissions_earned / stats.total_gmv * 100);
              const escrowPct = Math.round(stats.total_escrow_blocked / stats.total_gmv * 100);
              const relPct    = Math.round(stats.total_escrow_released / stats.total_gmv * 100);
              return (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8 }}>
                    Répartition du GMV Total
                  </p>
                  <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', background: T.border, display: 'flex' }}>
                    <div style={{ width: `${commPct}%`,   background: T.red,      transition: 'width 0.5s' }} title={`Commissions: ${commPct}%`} />
                    <div style={{ width: `${escrowPct}%`, background: '#F59E0B',  transition: 'width 0.5s' }} title={`Escrow: ${escrowPct}%`} />
                    <div style={{ width: `${relPct}%`,    background: '#10B981',  transition: 'width 0.5s' }} title={`Libéré: ${relPct}%`} />
                  </div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {[
                      { color: T.red,     label: `Commissions ${commPct}%` },
                      { color: '#F59E0B', label: `Escrow ${escrowPct}%` },
                      { color: '#10B981', label: `Libéré ${relPct}%` },
                    ].map((l, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                        <span style={{ fontSize: 11, color: T.muted }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Lignes détail */}
            {[
              { label: 'GMV Total',            value: fmtXaf(stats.total_gmv),                    accent: '#3B82F6' },
              { label: '− Commissions (-)',     value: fmtXaf(stats.total_commissions_earned),     accent: T.red },
              { label: '− Retraits versés (-)', value: fmtXaf(stats.total_withdrawals_approved),  accent: '#8B5CF6' },
              { label: '= Revenu Net',          value: fmtXaf(stats.net_platform_revenue),         accent: '#10B981' },
            ].map(({ label, value, accent }, i) => (
              <div key={i} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: i < 3 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}