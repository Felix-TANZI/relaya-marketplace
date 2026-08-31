// frontend/src/features/vendors/SellerPaymentsPage.tsx
// Paiements & Escrow — espace vendeur BelivaY.
// Le solde et le chemin des fonds d'abord, le détail ensuite.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart2, CircleCheckBig, Download, FileText, Lock,
  RefreshCw, Scale, Smartphone, TrendingUp, TriangleAlert, Wallet,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorPaymentSummary,
  type WithdrawalRequest,
  type VendorOrder,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { fmtDate, orderRef, openInvoice } from './orderUtils';
import { OperatorLogo } from '@/features/payments/OperatorLogo';
import { EscrowPipeline, type Leg } from './EscrowPipeline';
import {
  T, HERO, card, nf, fmtRate, ESCROW, type EscrowKey,
  VendorStyles, PageHead, GhostBtn, StatCard, Hero, HeroAmount, Panel, Tabs, Badge, Note, Skeleton,
} from './vendorTheme';

type Tab = 'all' | 'RELEASED' | 'BLOCKED' | 'REFUNDED';

function exportCSV(orders: VendorOrder[], shopName: string) {
  const rows = [
    'Référence,Date,CA Brut (FCFA),Commission (FCFA),Net Vendeur (FCFA),Statut Escrow',
    ...orders.map(o => [
      orderRef(o.id), fmtDate(o.created_at), o.vendor_subtotal,
      o.commission_amount, o.vendor_net_amount, o.escrow_status_display,
    ].join(',')),
  ];
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `belivay_paiements_${shopName}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Bars({ data }: { data: { date: string; released: number; blocked: number }[] }) {
  const max = Math.max(...data.map(d => d.released + d.blocked), 1);
  return (
    <>
      <div className="flex items-end gap-[3px]" style={{ height: 150 }}>
        {data.map(d => {
          const rel = (d.released / max) * 138;
          const blk = (d.blocked / max) * 138;
          const empty = rel === 0 && blk === 0;
          return (
            <div key={d.date} className="flex-1 flex flex-col justify-end gap-px"
              title={`${d.date} · libéré ${nf(d.released)} · escrow ${nf(d.blocked)}`}>
              {blk > 0 && <span style={{ display: 'block', height: Math.max(2, blk), background: T.amber, borderRadius: '3px 3px 0 0' }} />}
              {rel > 0 && <span style={{ display: 'block', height: Math.max(2, rel), background: T.green, borderRadius: blk > 0 ? 0 : '3px 3px 0 0' }} />}
              {empty && <span style={{ display: 'block', height: 2, background: T.border, borderRadius: 2 }} />}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2.5" style={{ fontSize: 9.5, color: T.mutedL }}>
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.date.slice(5)}</span>
        <span>Aujourd'hui</span>
      </div>
    </>
  );
}

export default function SellerPaymentsPage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<VendorPaymentSummary | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [shopName, setShopName] = useState('Ma Boutique');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sum, ords, wds, profile] = await Promise.all([
        vendorsApi.getPaymentSummary(),
        vendorsApi.getOrders(),
        vendorsApi.getWithdrawals(),
        vendorsApi.getProfile(),
      ]);
      setSummary(sum);
      setOrders(ords.filter(o => o.escrow_status !== 'PENDING'));
      setWithdrawals(wds);
      setShopName(profile.business_name);
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const frozen = useMemo(
    () => orders.filter(o => o.escrow_status === 'DISPUTED')
                .reduce((s, o) => s + (o.vendor_net_amount ?? 0), 0),
    [orders],
  );

  const filtered = useMemo(() => {
    if (tab === 'all') return orders;
    if (tab === 'REFUNDED') return orders.filter(o => o.escrow_status === 'REFUNDED' || o.escrow_status === 'PARTIAL_REFUNDED');
    return orders.filter(o => o.escrow_status === tab);
  }, [orders, tab]);

  if (loading) {
    return (
      <div className="space-y-4">
        <VendorStyles />
        <div className="rounded-3xl animate-pulse" style={{ height: 200, background: T.creamAlt }} />
        <Skeleton h={104} n={2} />
      </div>
    );
  }
  if (!summary) return null;

  const commRate = parseFloat(String(summary.commission_rate));
  const released = summary.total_released_xaf;
  const blocked = summary.total_blocked_xaf;
  const relPending = summary.total_release_pending_xaf;
  const circulating = released + blocked + relPending + frozen;
  const pct = (n: number) => (circulating > 0 ? (n / circulating) * 100 : 0);
  const lastSettled = withdrawals.find(w => w.status === 'APPROVED');
  const grossProjection = commRate > 0
    ? Math.round(summary.projection_monthly_xaf / (1 - commRate / 100))
    : summary.projection_monthly_xaf;

  const legs: Leg[] = [
    { label: 'Payé, bloqué',        amount: blocked,    meta: `${summary.blocked_orders_count} commande${summary.blocked_orders_count > 1 ? 's' : ''} en escrow`, color: T.amber, pct: pct(blocked) },
    { label: 'Libération en cours', amount: relPending, meta: 'Versement sous 24 h',                          color: T.blue,  pct: pct(relPending) },
    { label: 'Disponible',          amount: released,   meta: 'Prêt à retirer',                               color: T.green, pct: pct(released) },
    { label: 'Gelé (litige)',       amount: frozen,     meta: frozen > 0 ? 'En arbitrage BelivaY' : 'Aucun litige', color: T.red, pct: pct(frozen) },
  ];

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      <PageHead
        kicker="Finances" title="Paiements & Escrow"
        subtitle="Où en est chaque franc que vous avez gagné"
        actions={
          <>
            <GhostBtn icon={<Download size={13} />} onClick={() => exportCSV(orders, shopName)}>Relevé CSV</GhostBtn>
            <GhostBtn icon={<RefreshCw size={13} />} onClick={load}>Actualiser</GhostBtn>
          </>
        }
      />

      {/* ═══ SOLDE + CHEMIN DES FONDS ═══ */}
      <Hero gradient={HERO.dark} blobColor="rgba(244,121,32,.7)">
        <span className="v-glow-slow absolute pointer-events-none"
          style={{ bottom: -90, left: '34%', width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(22,163,74,.42),transparent 70%)' }} />
        <div className="relative flex items-end justify-between gap-5 flex-wrap">
          <HeroAmount
            kicker="Disponible au retrait" value={nf(released)}
            note={
              <>
                <span className="inline-flex items-center gap-1.5 align-middle">
                  <span className="rounded-full" style={{ width: 6, height: 6, background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                </span>{' '}
                {summary.released_orders_count} commande{summary.released_orders_count > 1 ? 's' : ''} libérée{summary.released_orders_count > 1 ? 's' : ''}
                {lastSettled ? ` · dernier versement le ${fmtDate(lastSettled.created_at)}` : ''}
              </>
            }
          />
          <div className="flex items-center gap-3.5 rounded-2xl flex-wrap"
            style={{ padding: '14px 18px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)' }}>
            {summary.pending_withdrawal ? (
              <>
                <span className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.amberL, color: T.amber }}><TriangleAlert size={18} /></span>
                <span>
                  <span className="block font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.42)' }}>
                    Retrait en attente
                  </span>
                  <span className="block font-bold mt-0.5" style={{ fontSize: 13, color: '#fff' }}>
                    {summary.pending_withdrawal.reference} · {nf(summary.pending_withdrawal.net_xaf)} FCFA
                  </span>
                </span>
              </>
            ) : (
              <>
                <OperatorLogo provider={(summary.default_withdrawal_operator ?? 'MTN_MOMO') as 'MTN_MOMO'} size={38} />
                <span>
                  <span className="block font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.42)' }}>
                    Versement vers
                  </span>
                  <span className="block font-bold mt-0.5" style={{ fontSize: 13, color: '#fff' }}>
                    {summary.default_withdrawal_phone || 'Numéro à renseigner'}
                  </span>
                </span>
              </>
            )}
            <span className="hidden sm:block" style={{ width: 1, height: 34, background: 'rgba(255,255,255,.14)' }} />
            <Link to="/seller/wallet">
              <button type="button"
                className="flex items-center gap-2 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
                style={{ padding: '11px 18px', fontSize: 13, background: HERO.orange, boxShadow: '0 10px 24px -8px rgba(244,121,32,.85)' }}>
                <Smartphone size={15} />Retirer
              </button>
            </Link>
          </div>
        </div>

        <EscrowPipeline legs={legs} total={circulating} />
      </Hero>

      {/* ═══ KPIs ═══ */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))' }}>
        <StatCard icon={<CircleCheckBig size={17} />} value={String(summary.released_orders_count)}
          label="Commandes libérées" sub="Fonds déjà versés"
          color={T.green} bg={T.greenL} trend={`${nf(released)}`} />
        <StatCard icon={<Lock size={17} />} value={`${nf(blocked)}`}
          label="En escrow" sub="Libération 24–48 h"
          color={T.amber} bg={T.amberL} trend={String(summary.blocked_orders_count)} />
        <StatCard icon={<Scale size={17} />} value={fmtRate(summary.commission_rate)}
          label="Commission BelivaY" sub="Figée sur chaque commande"
          color={T.violet} bg={T.violetL} trend="Plan" />
        <StatCard icon={<Download size={17} />} value={fmtRate(summary.withdrawal_fee_percent)}
          label="Frais de retrait" sub={`Min. ${nf(summary.minimum_withdrawal_xaf)} FCFA`}
          color={T.blue} bg={T.blueL} trend="MoMo" />
      </div>

      {/* ═══ GRAPHIQUE + PROJECTION ═══ */}
      <div className="flex gap-3.5 flex-wrap">
        <div className="flex-1" style={{ minWidth: 320 }}>
          <Panel
            title="Activité financière" sub="30 derniers jours · libéré contre bloqué"
            right={
              <div className="flex items-center gap-3.5" style={{ fontSize: 10.5, color: T.muted }}>
                <span className="flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 9, height: 9, background: T.green }} />Libéré</span>
                <span className="flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 9, height: 9, background: T.amber }} />Escrow</span>
                <BarChart2 size={14} style={{ color: T.orange }} />
              </div>
            }
          >
            <Bars data={summary.chart_30_days} />
          </Panel>
        </div>

        <div className="flex-1" style={{ minWidth: 280, maxWidth: 380 }}>
          <Panel
            title="Projection du mois" sub="Moyenne des 3 derniers mois"
            right={<TrendingUp size={15} style={{ color: T.violet }} />}
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between rounded-2xl"
                style={{ padding: '13px 15px', background: T.cream, border: `1px solid ${T.border}` }}>
                <span className="font-semibold" style={{ fontSize: 11.5, color: T.muted }}>CA brut estimé</span>
                <span className="font-black" style={{ fontSize: 15, color: T.text }}>{nf(grossProjection)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl"
                style={{ padding: '13px 15px', background: T.redL, border: `1px solid ${T.redB}` }}>
                <span className="font-semibold" style={{ fontSize: 11.5, color: T.red }}>Commission {fmtRate(summary.commission_rate)}</span>
                <span className="font-black" style={{ fontSize: 15, color: T.red }}>
                  − {nf(grossProjection - summary.projection_monthly_xaf)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl"
                style={{ padding: 15, background: T.greenL, border: `1px solid ${T.greenB}` }}>
                <span className="font-bold" style={{ fontSize: 11.5, color: T.green }}>Vous recevrez</span>
                <span className="font-black" style={{ fontSize: 21, color: T.green, letterSpacing: '-.02em' }}>
                  {nf(summary.projection_monthly_xaf)}
                </span>
              </div>
            </div>
            <div className="mt-3.5">
              <Note icon={<Scale size={15} />}>
                Le taux de commission est adossé à votre plan et figé sur chaque commande au moment du paiement.
              </Note>
            </div>
          </Panel>
        </div>
      </div>

      {/* ═══ ACCÈS AUX TROIS VUES DÉTAILLÉES ═══ */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        {[
          { to: '/seller/settlements',   ic: <CircleCheckBig size={17} />, t: 'Mes règlements',      d: 'Ce que BelivaY vous a versé',        c: T.green,  bg: T.greenL },
          { to: '/seller/pending-funds', ic: <Lock size={17} />,           t: 'Mes fonds en attente', d: 'Quand chaque montant arrive',        c: T.amber,  bg: T.amberL },
          { to: '/seller/adjustments',   ic: <Scale size={17} />,          t: 'Mes ajustements',      d: 'Commissions, frais, remboursements', c: T.violet, bg: T.violetL },
        ].map(x => (
          <Link key={x.to} to={x.to}>
            <div className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:-translate-y-px" style={card}>
              <span className="w-[36px] h-[36px] rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: x.bg, color: x.c }}>{x.ic}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold" style={{ fontSize: 12.5, color: T.text }}>{x.t}</span>
                <span className="block" style={{ fontSize: 10.5, color: T.mutedL }}>{x.d}</span>
              </span>
              <ArrowRight size={15} style={{ color: T.mutedL, flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>

      {/* ═══ HISTORIQUE PAR COMMANDE ═══ */}
      <Panel
        pad={false}
        title="Historique des paiements" sub="Une ligne par commande, avec la commission retenue"
        right={
          <Tabs<Tab>
            value={tab} onChange={setTab}
            items={[
              { key: 'all',      label: 'Tous',      n: orders.length },
              { key: 'RELEASED', label: 'Libérés',   n: orders.filter(o => o.escrow_status === 'RELEASED').length },
              { key: 'BLOCKED',  label: 'En escrow', n: orders.filter(o => o.escrow_status === 'BLOCKED').length },
              { key: 'REFUNDED', label: 'Remboursés', n: orders.filter(o => o.escrow_status === 'REFUNDED' || o.escrow_status === 'PARTIAL_REFUNDED').length },
            ]}
          />
        }
      >
        {filtered.length === 0 ? (
          <p className="text-center" style={{ padding: '40px 0', fontSize: 13, color: T.muted }}>
            Aucune transaction dans cette catégorie.
          </p>
        ) : filtered.map(o => {
          const cfg = ESCROW[o.escrow_status as EscrowKey] ?? ESCROW.PENDING;
          return (
            <div key={o.id} className="v-row flex items-center gap-3.5 flex-wrap"
              style={{ padding: '15px 20px', borderBottom: `1px solid ${T.borderL}` }}>
              <Link to={`/seller/orders/${o.id}`} className="flex-1" style={{ minWidth: 150 }}>
                <p className="font-black" style={{ fontSize: 12.5, color: T.orange }}>{orderRef(o.id)}</p>
                <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>{fmtDate(o.created_at)}</p>
              </Link>

              <div className="text-right flex-shrink-0" style={{ minWidth: 100 }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: T.mutedL }}>Brut</p>
                <p className="font-semibold" style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{nf(o.vendor_subtotal)}</p>
              </div>
              <div className="text-right flex-shrink-0" style={{ minWidth: 108 }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: 'rgba(220,38,38,.7)' }}>
                  Commission {o.commission_rate.toFixed(1)} %
                </p>
                <p className="font-semibold" style={{ fontSize: 12.5, color: T.red, marginTop: 2 }}>− {nf(o.commission_amount)}</p>
              </div>
              <div className="text-right flex-shrink-0" style={{ minWidth: 112 }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: T.mutedL }}>Net vendeur</p>
                <p className="font-black" style={{ fontSize: 14.5, color: T.text, marginTop: 2 }}>{nf(o.vendor_net_amount)}</p>
              </div>

              <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} minWidth={104} />

              <button type="button" onClick={() => openInvoice([o], shopName)}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}
                title="Facture">
                <FileText size={14} />
              </button>
            </div>
          );
        })}
      </Panel>

      <Note icon={<Wallet size={15} />} tone="green">
        Le formulaire de retrait a déménagé dans <Link to="/seller/wallet" style={{ fontWeight: 700 }}>Compte BelivaY</Link>,
        avec votre numéro de versement enregistré — plus de double saisie.
      </Note>
    </div>
  );
}
