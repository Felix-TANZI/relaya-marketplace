// frontend/src/features/vendors/SellerPaymentsPage.tsx
// Page Paiements & Escrow — espace vendeur BelivaY.
//
// Sections :
//   1. KPIs   : libéré, bloqué, en attente, commission
//   2. Projection mensuelle (moyenne 3 mois)
//   3. Graphique barres 30 jours (libéré vs bloqué)
//   4. Timeline Escrow (cycle de vie des fonds)
//   5. Demande de retrait Mobile Money (Orange / MTN)
//   6. Historique retraits
//   7. Historique paiements par commande + facture HTML + export CSV

import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, Lock, Clock, TrendingUp, Download,
  FileText, RefreshCw, Smartphone, XCircle,
  CheckCircle, AlertTriangle, BarChart2,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorPaymentSummary,
  type WithdrawalRequest,
  type VendorOrder,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { fmtXAF, fmtDate, orderRef, openInvoice } from './orderUtils';

// ─────────────────────────────────────────────────────────────
// TOKENS DESIGN
// ─────────────────────────────────────────────────────────────
const T = {
  orange:  '#F47920',
  orangeL: '#FFF3E8',
  orangeB: 'rgba(244,121,32,0.12)',
  cream:   '#F5F0E8',
  creamAlt:'#EDE7DC',
  white:   '#FFFFFF',
  border:  '#E8E2D9',
  text:    '#1A1209',
  muted:   '#7C6E5A',
  mutedL:  '#B8A898',
  green:   '#16A34A',
  greenL:  'rgba(22,163,74,0.10)',
  greenB:  'rgba(22,163,74,0.20)',
  red:     '#DC2626',
  redL:    'rgba(220,38,38,0.10)',
  amber:   '#D97706',
  amberL:  'rgba(217,119,6,0.10)',
  blue:    '#2563EB',
  blueL:   'rgba(37,99,235,0.10)',
  violet:  '#7C3AED',
  violetL: 'rgba(124,58,237,0.10)',
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function fmtRate(r: string | number): string {
  return `${parseFloat(String(r)).toFixed(1)}%`;
}

function exportPaymentsCSV(orders: VendorOrder[], shopName: string): void {
  const bom  = '\uFEFF';
  const rows = [
    'Référence,Date,CA Brut (FCFA),Commission (FCFA),Net Vendeur (FCFA),Statut Escrow',
    ...orders.map(o => [
      orderRef(o.id),
      fmtDate(o.created_at),
      o.vendor_subtotal,
      o.commission_amount,
      o.vendor_net_amount,
      o.escrow_status_display,
    ].join(',')),
  ];
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `belivay_paiements_${shopName}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────

function KpiCard({ ico, value, label, sublabel, color, bg }: {
  ico: React.ReactNode; value: string; label: string; sublabel: string;
  color: string; bg: string;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bg }}>
          <span style={{ color }}>{ico}</span>
        </div>
        <p className="text-[12px] font-semibold" style={{ color: T.muted }}>{label}</p>
      </div>
      <p className="font-black text-[22px] leading-none" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
        {value}
      </p>
      <p className="text-[11px]" style={{ color: T.mutedL }}>{sublabel}</p>
    </div>
  );
}

function BarChart({ data }: { data: { date: string; released: number; blocked: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.released + d.blocked), 1);
  return (
    <div className="flex items-end gap-[3px] h-32 w-full">
      {data.map((d, i) => {
        const relPct = (d.released / maxVal) * 100;
        const blkPct = (d.blocked  / maxVal) * 100;
        const showLabel = i % 5 === 0;
        return (
          <div key={d.date} className="flex flex-col items-center flex-1 gap-[2px]"
            title={`${d.date} | Libéré: ${fmtXAF(d.released)} | Bloqué: ${fmtXAF(d.blocked)}`}>
            <div className="flex flex-col justify-end w-full flex-1 gap-[1px]">
              {d.blocked > 0 && (
                <div style={{ height: `${blkPct}%`, background: T.amber, borderRadius: '2px 2px 0 0', minHeight: 2 }} />
              )}
              {d.released > 0 && (
                <div style={{ height: `${relPct}%`, background: T.green, borderRadius: d.blocked > 0 ? '0' : '2px 2px 0 0', minHeight: 2 }} />
              )}
              {d.released === 0 && d.blocked === 0 && (
                <div style={{ height: 2, background: T.border, borderRadius: 2 }} />
              )}
            </div>
            {showLabel && (
              <p className="text-[8px] rotate-45 origin-left mt-1" style={{ color: T.mutedL, whiteSpace: 'nowrap' }}>
                {d.date.slice(5)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OperatorCard({ id, selected, onSelect }: {
  id: 'ORANGE_MONEY' | 'MTN_MOMO'; selected: boolean; onSelect: () => void;
}) {
  const isOrange = id === 'ORANGE_MONEY';
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-all cursor-pointer w-full"
      style={{
        background:   selected ? (isOrange ? '#FFF3E8' : '#FFFBEB') : T.cream,
        borderColor:  selected ? (isOrange ? T.orange : T.amber) : T.border,
        boxShadow:    selected ? `0 0 0 3px ${isOrange ? T.orangeB : 'rgba(217,119,6,0.12)'}` : 'none',
      }}>
      <span className="text-2xl">{isOrange ? '🟠' : '🟡'}</span>
      <p className="text-[13px] font-bold" style={{ color: T.text }}>
        {isOrange ? 'Orange Money' : 'MTN MoMo'}
      </p>
      <p className="text-[10px]" style={{ color: T.muted }}>
        {isOrange ? '69X / 65X' : '68X / 67X'}
      </p>
    </button>
  );
}

const ESCROW_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:          { label: 'Non payé',      color: T.muted,  bg: T.creamAlt },
  BLOCKED:          { label: 'En escrow',      color: T.amber,  bg: T.amberL   },
  RELEASE_PENDING:  { label: 'Libération 24h', color: T.blue,   bg: T.blueL    },
  RELEASED:         { label: 'Libéré',         color: T.green,  bg: T.greenL   },
  REFUNDED:         { label: 'Remboursé',      color: T.blue,   bg: T.blueL    },
  PARTIAL_REFUNDED: { label: 'Remb. partiel',  color: T.amber,  bg: T.amberL   },
  DISPUTED:         { label: 'Litige',         color: T.red,    bg: T.redL     },
};

function EscrowBadge({ status }: { status: string }) {
  const cfg = ESCROW_CFG[status] ?? { label: status, color: T.muted, bg: T.creamAlt };
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────

export default function SellerPaymentsPage() {
  const { showToast } = useToast();

  const [summary,     setSummary]     = useState<VendorPaymentSummary | null>(null);
  const [orders,      setOrders]      = useState<VendorOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [shopName,    setShopName]    = useState('Ma Boutique');

  const [operator,   setOperator]   = useState<'ORANGE_MONEY' | 'MTN_MOMO'>('ORANGE_MONEY');
  const [phone,      setPhone]      = useState('');
  const [amount,     setAmount]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, ordersData, wdData, profileData] = await Promise.all([
        vendorsApi.getPaymentSummary(),
        vendorsApi.getOrders(),
        vendorsApi.getWithdrawals(),
        vendorsApi.getProfile(),
      ]);
      setSummary(sumData);
      // Filtrer les commandes avec un escrow non PENDING (commandes pertinentes)
      setOrders(ordersData.filter(o => o.escrow_status !== 'PENDING'));
      setWithdrawals(wdData);
      setShopName(profileData.business_name);
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const amountNum  = parseInt(amount, 10) || 0;
  const feeRate    = summary ? parseFloat(String(summary.withdrawal_fee_percent)) : 1.5;
  const feeXaf     = Math.round(amountNum * feeRate / 100);
  const netXaf     = amountNum - feeXaf;
  const minAmount  = summary?.minimum_withdrawal_xaf ?? 1000;
  const solde      = summary?.total_released_xaf ?? 0;
  const hasPending = !!summary?.pending_withdrawal;
  const canWithdraw = !hasPending && amountNum >= minAmount && amountNum <= solde && phone.length >= 9;

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    try {
      setSubmitting(true);
      const wd = await vendorsApi.createWithdrawal({
        amount_xaf:   amountNum,
        operator,
        phone_number: phone.startsWith('+237') ? phone : `+237${phone}`,
      });
      showToast(`Demande ${wd.reference} soumise avec succès`, 'success');
      setPhone('');
      setAmount('');
      await load();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Erreur lors de la demande';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!summary?.pending_withdrawal) return;
    try {
      setCancelling(true);
      await vendorsApi.cancelWithdrawal(summary.pending_withdrawal.id);
      showToast('Demande annulée', 'success');
      await load();
    } catch {
      showToast("Erreur lors de l'annulation", 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }} />
      </div>
    );
  }

  if (!summary) return null;

  const commRate = parseFloat(String(summary.commission_rate));

  return (
    <div className="space-y-5 pb-10">

      {/* ═══ EN-TÊTE ═══ */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-[22px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            Paiements & Escrow
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            Suivi de vos revenus et libérations de fonds
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportPaymentsCSV(orders, shopName)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            <Download size={13} />Relevé CSV
          </button>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            <RefreshCw size={13} />Actualiser
          </button>
        </div>
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          ico={<CheckCircle size={16} />}
          value={fmtXAF(summary.total_released_xaf)}
          label="Fonds libérés"
          sublabel={`${summary.released_orders_count} commande${summary.released_orders_count > 1 ? 's' : ''}`}
          color={T.green} bg={T.greenL}
        />
        <KpiCard
          ico={<Lock size={16} />}
          value={fmtXAF(summary.total_blocked_xaf)}
          label="En escrow"
          sublabel={`${summary.blocked_orders_count} commande${summary.blocked_orders_count > 1 ? 's' : ''} · Libération 24h`}
          color={T.amber} bg={T.amberL}
        />
        <KpiCard
          ico={<Clock size={16} />}
          value={fmtXAF(summary.total_release_pending_xaf)}
          label="Libération en cours"
          sublabel="Après confirmation acheteur"
          color={T.blue} bg={T.blueL}
        />
        <KpiCard
          ico={<DollarSign size={16} />}
          value={fmtRate(summary.commission_rate)}
          label="Commission BelivaY"
          sublabel="Taux unique — modifiable par l'admin"
          color={T.violet} bg={T.violetL}
        />
      </div>

      {/* ═══ PROJECTION MENSUELLE ═══ */}
      <div className="rounded-2xl p-5"
        style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} style={{ color: T.violet }} />
          <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            Projection mensuelle
          </p>
          <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: T.violetL, color: T.violet }}>
            Moyenne 3 derniers mois
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: T.cream, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: T.muted }}>CA Brut</p>
            <p className="font-black text-[16px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              {commRate > 0
                ? fmtXAF(Math.round(summary.projection_monthly_xaf / (1 - commRate / 100)))
                : fmtXAF(summary.projection_monthly_xaf)}
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.15)` }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: T.red }}>
              Commission {fmtRate(summary.commission_rate)}
            </p>
            <p className="font-black text-[16px]" style={{ color: T.red, fontFamily: 'Poppins,sans-serif' }}>
              {commRate > 0
                ? `-${fmtXAF(Math.round(summary.projection_monthly_xaf / (1 - commRate / 100) * commRate / 100))}`
                : fmtXAF(0)}
            </p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: T.greenL, border: `1px solid ${T.greenB}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: T.green }}>Vous recevrez</p>
            <p className="font-black text-[16px]" style={{ color: T.green, fontFamily: 'Poppins,sans-serif' }}>
              {fmtXAF(summary.projection_monthly_xaf)}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ GRAPHIQUE 30 JOURS ═══ */}
      <div className="rounded-2xl p-5"
        style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={15} style={{ color: T.orange }} />
            <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              Activité financière — 30 jours
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]" style={{ color: T.muted }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: T.green }} />Libéré
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: T.amber }} />En escrow
            </span>
          </div>
        </div>
        <BarChart data={summary.chart_30_days} />
      </div>

      {/* ═══ TIMELINE ESCROW ═══ */}
      <div className="rounded-2xl p-5"
        style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
        <p className="font-bold text-[14px] mb-4" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
          Comment fonctionnent vos fonds
        </p>
        <div>
          {([
            {
              ico: <Lock size={15} />, color: T.amber, bg: T.amberL,
              title: 'Paiement confirmé — Fonds sécurisés en Escrow',
              hint: "Dès que l'acheteur paie, vos fonds sont bloqués chez BelivaY.",
            },
            {
              ico: <Clock size={15} />, color: T.blue, bg: T.blueL,
              title: 'Libération en cours (24h)',
              hint: "Après confirmation de réception par l'acheteur, ou 48h automatiquement sans litige.",
            },
            {
              ico: <CheckCircle size={15} />, color: T.green, bg: T.greenL,
              title: 'Fonds versés sur Mobile Money',
              hint: 'Vos gains nets (après commission) sont transférés vers Orange Money ou MTN MoMo.',
            },
          ] as const).map((step, i, arr) => (
            <div key={i} className="flex gap-3 relative">
              {i < arr.length - 1 && (
                <div className="absolute left-[17px] top-9 bottom-0 w-[2px]" style={{ background: T.border }} />
              )}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 z-10"
                style={{ background: step.bg }}>
                <span style={{ color: step.color }}>{step.ico}</span>
              </div>
              <div className="pb-5">
                <p className="font-semibold text-[13px]" style={{ color: T.text }}>{step.title}</p>
                <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>{step.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RETRAIT MOBILE MONEY ═══ */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.orangeB }}>
              <Smartphone size={15} style={{ color: T.orange }} />
            </div>
            <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              Retrait Mobile Money
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium" style={{ color: T.muted }}>Solde disponible</p>
            <p className="font-black text-[16px]" style={{ color: T.green, fontFamily: 'Poppins,sans-serif' }}>
              {fmtXAF(solde)}
            </p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Retrait en cours */}
          {hasPending && summary.pending_withdrawal && (
            <div className="rounded-xl p-4" style={{ background: T.amberL, border: `1px solid rgba(217,119,6,0.25)` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={13} style={{ color: T.amber }} />
                    <p className="text-[12.5px] font-bold" style={{ color: T.amber }}>
                      Demande en attente — {summary.pending_withdrawal.reference}
                    </p>
                  </div>
                  <p className="text-[11.5px]" style={{ color: T.muted }}>
                    {fmtXAF(summary.pending_withdrawal.amount_xaf)} →{' '}
                    <strong>{summary.pending_withdrawal.operator === 'ORANGE_MONEY' ? 'Orange Money' : 'MTN MoMo'}</strong>{' '}
                    {summary.pending_withdrawal.phone} · Net :{' '}
                    <strong>{fmtXAF(summary.pending_withdrawal.net_xaf)}</strong>
                  </p>
                  <p className="text-[10.5px] mt-1" style={{ color: T.muted }}>
                    Soumise le {fmtDate(summary.pending_withdrawal.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold flex-shrink-0"
                  style={{ background: T.redL, color: T.red, border: `1px solid rgba(220,38,38,0.2)` }}>
                  {cancelling ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={11} />}
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Infos tarifaires */}
          <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: T.cream, color: T.muted }}>
            Transférez vos gains vers votre <strong>Orange Money</strong> ou <strong>MTN Mobile Money</strong>.<br />
            Délai : <strong>&lt; 2h</strong> · Frais : <strong>{fmtRate(summary.withdrawal_fee_percent)}</strong>{' '}
            (taux préférentiel BelivaY) · Min. <strong>{fmtXAF(minAmount)}</strong>
          </div>

          {/* Sélection opérateur */}
          <div className="grid grid-cols-2 gap-3">
            <OperatorCard id="ORANGE_MONEY" selected={operator === 'ORANGE_MONEY'} onSelect={() => setOperator('ORANGE_MONEY')} />
            <OperatorCard id="MTN_MOMO"     selected={operator === 'MTN_MOMO'}     onSelect={() => setOperator('MTN_MOMO')} />
          </div>

          {/* Numéro */}
          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: T.text }}>
              Votre numéro {operator === 'ORANGE_MONEY' ? 'Orange Money' : 'MTN MoMo'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold"
                style={{ color: T.muted }}>+237</span>
              <input
                type="tel"
                maxLength={9}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="690 000 000"
                disabled={hasPending}
                className="w-full rounded-xl pl-14 pr-4 py-3 text-[14px] font-bold outline-none transition-all"
                style={{
                  background:    hasPending ? T.creamAlt : T.cream,
                  border:        `1px solid ${T.border}`,
                  color:         T.text,
                  letterSpacing: '0.05em',
                }}
              />
            </div>
            <p className="text-[10.5px] mt-1" style={{ color: T.mutedL }}>
              Format : 690 000 000 (Orange) ou 680 000 000 (MTN)
            </p>
          </div>

          {/* Montant + aperçu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                Montant à retirer (FCFA)
              </label>
              <input
                type="number"
                min={minAmount}
                max={solde}
                step={500}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Min. ${fmtXAF(minAmount)}`}
                disabled={hasPending}
                className="w-full rounded-xl px-4 py-3 text-[14px] font-bold outline-none transition-all"
                style={{
                  background: hasPending ? T.creamAlt : T.cream,
                  border: `1px solid ${T.border}`,
                  color:  T.text,
                }}
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: T.text }}>
                Vous recevrez (après frais)
              </label>
              <div className="rounded-xl px-4 py-3 font-black text-[18px]"
                style={{ background: T.greenL, border: `1px solid ${T.greenB}`, color: T.green, fontFamily: 'Poppins,sans-serif' }}>
                {amountNum >= minAmount ? fmtXAF(netXaf) : '—'}
              </div>
            </div>
          </div>

          {amountNum >= minAmount && (
            <div className="rounded-xl px-4 py-3 text-[12px]"
              style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
              Frais {fmtRate(summary.withdrawal_fee_percent)} = <strong style={{ color: T.red }}>{fmtXAF(feeXaf)}</strong>
              &nbsp;·&nbsp;Net versé : <strong style={{ color: T.green }}>{fmtXAF(netXaf)}</strong>
            </div>
          )}

          <button
            type="button"
            onClick={handleWithdraw}
            disabled={!canWithdraw || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] text-white transition-all disabled:opacity-50"
            style={{
              background:  T.orange,
              boxShadow:   canWithdraw && !submitting ? '0 4px 12px rgba(244,121,32,0.35)' : 'none',
            }}>
            {submitting
              ? <><RefreshCw size={14} className="animate-spin" />Envoi en cours…</>
              : <><Smartphone size={14} />Confirmer le retrait</>}
          </button>

          {solde < minAmount && !hasPending && (
            <p className="text-center text-[12px]" style={{ color: T.muted }}>
              Solde insuffisant. Minimum requis : {fmtXAF(minAmount)}.
            </p>
          )}
        </div>
      </div>

      {/* ═══ HISTORIQUE RETRAITS ═══ */}
      {withdrawals.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
            <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              Historique des retraits
            </p>
          </div>
          <div>
            {withdrawals.map(wd => {
              const statusCfg: Record<string, { color: string; bg: string }> = {
                PENDING:   { color: T.amber,  bg: T.amberL  },
                APPROVED:  { color: T.green,  bg: T.greenL  },
                REJECTED:  { color: T.red,    bg: T.redL    },
                CANCELLED: { color: T.muted,  bg: T.creamAlt },
              };
              const cfg = statusCfg[wd.status] ?? statusCfg.CANCELLED;
              return (
                <div key={wd.id} className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div>
                    <p className="font-bold text-[13px]" style={{ color: T.text }}>{wd.reference}</p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>
                      {wd.operator === 'ORANGE_MONEY' ? '🟠 Orange Money' : '🟡 MTN MoMo'} · {wd.phone_number}
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: T.mutedL }}>{fmtDate(wd.created_at)}</p>
                    {wd.admin_note && (
                      <p className="text-[11px] mt-1 italic" style={{ color: T.red }}>{wd.admin_note}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4 space-y-1">
                    <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                      {fmtXAF(wd.net_amount_xaf)}
                    </p>
                    <p className="text-[10.5px]" style={{ color: T.mutedL }}>
                      Brut {fmtXAF(wd.amount_xaf)} · Frais {fmtXAF(wd.fee_amount_xaf)}
                    </p>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-block"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      {wd.status_display}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ HISTORIQUE PAIEMENTS PAR COMMANDE ═══ */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <p className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            Historique paiements
          </p>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: T.cream, color: T.muted }}>
            {orders.length} transaction{orders.length > 1 ? 's' : ''}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[13px]" style={{ color: T.muted }}>Aucune transaction pour l'instant.</p>
          </div>
        ) : (
          <div>
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <p className="font-bold text-[13px]" style={{ color: T.orange }}>{orderRef(order.id)}</p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>{fmtDate(order.created_at)}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: T.mutedL }}>
                    Commission : {fmtXAF(order.commission_amount)} ({order.commission_rate.toFixed(1)}%)
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4 space-y-1">
                  <EscrowBadge status={order.escrow_status} />
                  <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                    {fmtXAF(order.vendor_net_amount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => openInvoice([order], shopName)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold ml-auto"
                    style={{ background: T.cream, color: T.muted, border: `1px solid ${T.border}` }}>
                    <FileText size={10} />Facture
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}