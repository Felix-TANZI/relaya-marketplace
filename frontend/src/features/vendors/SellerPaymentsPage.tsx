// frontend/src/features/vendors/SellerPaymentsPage.tsx
// Paiements & Escrow — espace vendeur BelivaY.
// Le solde et le chemin des fonds d'abord, le détail ensuite.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

function exportCSV(orders: VendorOrder[], shopName: string, header: string) {
  const rows = [
    header,
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
  const { t } = useTranslation();
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
              title={t('sl4_payments.chart_bar_tooltip', { date: d.date, released: nf(d.released), blocked: nf(d.blocked) })}>
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
        <span>{t('sl4_payments.chart_today')}</span>
      </div>
    </>
  );
}

export default function SellerPaymentsPage() {
  const { t } = useTranslation();
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
      showToast(t('sl4_payments.toast_load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

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
    { label: t('sl4_payments.leg_blocked_label'),        amount: blocked,    meta: t(summary.blocked_orders_count > 1 ? 'sl4_payments.leg_blocked_meta_plural' : 'sl4_payments.leg_blocked_meta', { count: summary.blocked_orders_count }), color: T.amber, pct: pct(blocked) },
    { label: t('sl4_payments.leg_pending_label'), amount: relPending, meta: t('sl4_payments.leg_pending_meta'),                          color: T.blue,  pct: pct(relPending) },
    { label: t('sl4_payments.leg_available_label'),          amount: released,   meta: t('sl4_payments.leg_available_meta'),                               color: T.green, pct: pct(released) },
    { label: t('sl4_payments.leg_frozen_label'),       amount: frozen,     meta: frozen > 0 ? t('sl4_payments.leg_frozen_meta_active') : t('sl4_payments.leg_frozen_meta_none'), color: T.red, pct: pct(frozen) },
  ];

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      <PageHead
        kicker={t('sl4_payments.kicker')} title={t('sl4_payments.title')}
        subtitle={t('sl4_payments.subtitle')}
        actions={
          <>
            <GhostBtn icon={<Download size={13} />} onClick={() => exportCSV(orders, shopName, t('sl4_payments.csv_header'))}>{t('sl4_payments.export_csv_button')}</GhostBtn>
            <GhostBtn icon={<RefreshCw size={13} />} onClick={load}>{t('sl4_payments.refresh')}</GhostBtn>
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
            kicker={t('sl4_payments.available_kicker')} value={nf(released)}
            note={
              <>
                <span className="inline-flex items-center gap-1.5 align-middle">
                  <span className="rounded-full" style={{ width: 6, height: 6, background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                </span>{' '}
                {t(summary.released_orders_count > 1 ? 'sl4_payments.released_orders_count_plural' : 'sl4_payments.released_orders_count', { count: summary.released_orders_count })}
                {lastSettled ? t('sl4_payments.last_settlement_note', { date: fmtDate(lastSettled.created_at) }) : ''}
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
                    {t('sl4_payments.pending_withdrawal_label')}
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
                    {t('sl4_payments.withdrawal_target_label')}
                  </span>
                  <span className="block font-bold mt-0.5" style={{ fontSize: 13, color: '#fff' }}>
                    {summary.default_withdrawal_phone || t('sl4_payments.number_missing')}
                  </span>
                </span>
              </>
            )}
            <span className="hidden sm:block" style={{ width: 1, height: 34, background: 'rgba(255,255,255,.14)' }} />
            <Link to="/seller/wallet">
              <button type="button"
                className="flex items-center gap-2 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
                style={{ padding: '11px 18px', fontSize: 13, background: HERO.orange, boxShadow: '0 10px 24px -8px rgba(244,121,32,.85)' }}>
                <Smartphone size={15} />{t('sl4_payments.withdraw_button')}
              </button>
            </Link>
          </div>
        </div>

        <EscrowPipeline legs={legs} total={circulating} />
      </Hero>

      {/* ═══ KPIs ═══ */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))' }}>
        <StatCard icon={<CircleCheckBig size={17} />} value={String(summary.released_orders_count)}
          label={t('sl4_payments.kpi_released_label')} sub={t('sl4_payments.kpi_released_sub')}
          color={T.green} bg={T.greenL} trend={`${nf(released)}`} />
        <StatCard icon={<Lock size={17} />} value={`${nf(blocked)}`}
          label={t('sl4_payments.kpi_escrow_label')} sub={t('sl4_payments.kpi_escrow_sub')}
          color={T.amber} bg={T.amberL} trend={String(summary.blocked_orders_count)} />
        <StatCard icon={<Scale size={17} />} value={fmtRate(summary.commission_rate)}
          label={t('sl4_payments.kpi_commission_label')} sub={t('sl4_payments.kpi_commission_sub')}
          color={T.violet} bg={T.violetL} trend={t('sl4_payments.kpi_commission_trend')} />
        <StatCard icon={<Download size={17} />} value={fmtRate(summary.withdrawal_fee_percent)}
          label={t('sl4_payments.kpi_fee_label')} sub={t('sl4_payments.kpi_fee_sub', { amount: nf(summary.minimum_withdrawal_xaf) })}
          color={T.blue} bg={T.blueL} trend={t('sl4_payments.kpi_fee_trend')} />
      </div>

      {/* ═══ GRAPHIQUE + PROJECTION ═══ */}
      <div className="flex gap-3.5 flex-wrap">
        <div className="flex-1" style={{ minWidth: 320 }}>
          <Panel
            title={t('sl4_payments.chart_panel_title')} sub={t('sl4_payments.chart_panel_sub')}
            right={
              <div className="flex items-center gap-3.5" style={{ fontSize: 10.5, color: T.muted }}>
                <span className="flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 9, height: 9, background: T.green }} />{t('sl4_payments.chart_legend_released')}</span>
                <span className="flex items-center gap-1.5"><span className="rounded-sm" style={{ width: 9, height: 9, background: T.amber }} />{t('sl4_payments.chart_legend_escrow')}</span>
                <BarChart2 size={14} style={{ color: T.orange }} />
              </div>
            }
          >
            <Bars data={summary.chart_30_days} />
          </Panel>
        </div>

        <div className="flex-1" style={{ minWidth: 280, maxWidth: 380 }}>
          <Panel
            title={t('sl4_payments.projection_panel_title')} sub={t('sl4_payments.projection_panel_sub')}
            right={<TrendingUp size={15} style={{ color: T.violet }} />}
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between rounded-2xl"
                style={{ padding: '13px 15px', background: T.cream, border: `1px solid ${T.border}` }}>
                <span className="font-semibold" style={{ fontSize: 11.5, color: T.muted }}>{t('sl4_payments.projection_gross_label')}</span>
                <span className="font-black" style={{ fontSize: 15, color: T.text }}>{nf(grossProjection)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl"
                style={{ padding: '13px 15px', background: T.redL, border: `1px solid ${T.redB}` }}>
                <span className="font-semibold" style={{ fontSize: 11.5, color: T.red }}>{t('sl4_payments.projection_commission_label', { rate: fmtRate(summary.commission_rate) })}</span>
                <span className="font-black" style={{ fontSize: 15, color: T.red }}>
                  − {nf(grossProjection - summary.projection_monthly_xaf)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl"
                style={{ padding: 15, background: T.greenL, border: `1px solid ${T.greenB}` }}>
                <span className="font-bold" style={{ fontSize: 11.5, color: T.green }}>{t('sl4_payments.projection_receive_label')}</span>
                <span className="font-black" style={{ fontSize: 21, color: T.green, letterSpacing: '-.02em' }}>
                  {nf(summary.projection_monthly_xaf)}
                </span>
              </div>
            </div>
            <div className="mt-3.5">
              <Note icon={<Scale size={15} />}>
                {t('sl4_payments.projection_note')}
              </Note>
            </div>
          </Panel>
        </div>
      </div>

      {/* ═══ ACCÈS AUX TROIS VUES DÉTAILLÉES ═══ */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        {[
          { to: '/seller/settlements',   ic: <CircleCheckBig size={17} />, t: t('sl4_payments.link_settlements_title'),      d: t('sl4_payments.link_settlements_desc'),        c: T.green,  bg: T.greenL },
          { to: '/seller/pending-funds', ic: <Lock size={17} />,           t: t('sl4_payments.link_pending_title'), d: t('sl4_payments.link_pending_desc'),        c: T.amber,  bg: T.amberL },
          { to: '/seller/adjustments',   ic: <Scale size={17} />,          t: t('sl4_payments.link_adjustments_title'),      d: t('sl4_payments.link_adjustments_desc'), c: T.violet, bg: T.violetL },
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
        title={t('sl4_payments.history_panel_title')} sub={t('sl4_payments.history_panel_sub')}
        right={
          <Tabs<Tab>
            value={tab} onChange={setTab}
            items={[
              { key: 'all',      label: t('sl4_payments.tab_all'),      n: orders.length },
              { key: 'RELEASED', label: t('sl4_payments.tab_released'),   n: orders.filter(o => o.escrow_status === 'RELEASED').length },
              { key: 'BLOCKED',  label: t('sl4_payments.tab_escrow'), n: orders.filter(o => o.escrow_status === 'BLOCKED').length },
              { key: 'REFUNDED', label: t('sl4_payments.tab_refunded'), n: orders.filter(o => o.escrow_status === 'REFUNDED' || o.escrow_status === 'PARTIAL_REFUNDED').length },
            ]}
          />
        }
      >
        {filtered.length === 0 ? (
          <p className="text-center" style={{ padding: '40px 0', fontSize: 13, color: T.muted }}>
            {t('sl4_payments.empty_category')}
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
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: T.mutedL }}>{t('sl4_payments.column_gross')}</p>
                <p className="font-semibold" style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{nf(o.vendor_subtotal)}</p>
              </div>
              <div className="text-right flex-shrink-0" style={{ minWidth: 108 }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: 'rgba(220,38,38,.7)' }}>
                  {t('sl4_payments.column_commission', { rate: o.commission_rate.toFixed(1) })}
                </p>
                <p className="font-semibold" style={{ fontSize: 12.5, color: T.red, marginTop: 2 }}>− {nf(o.commission_amount)}</p>
              </div>
              <div className="text-right flex-shrink-0" style={{ minWidth: 112 }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: T.mutedL }}>{t('sl4_payments.column_net')}</p>
                <p className="font-black" style={{ fontSize: 14.5, color: T.text, marginTop: 2 }}>{nf(o.vendor_net_amount)}</p>
              </div>

              <Badge label={t(cfg.labelKey)} color={cfg.color} bg={cfg.bg} minWidth={104} />

              <button type="button" onClick={() => openInvoice([o], shopName, t)}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}
                title={t('sl4_payments.invoice_title')}>
                <FileText size={14} />
              </button>
            </div>
          );
        })}
      </Panel>

      <Note icon={<Wallet size={15} />} tone="green">
        {t('sl4_payments.wallet_moved_note_before')} <Link to="/seller/wallet" style={{ fontWeight: 700 }}>{t('sl4_payments.wallet_moved_note_link')}</Link>{t('sl4_payments.wallet_moved_note_after')}
      </Note>
    </div>
  );
}
