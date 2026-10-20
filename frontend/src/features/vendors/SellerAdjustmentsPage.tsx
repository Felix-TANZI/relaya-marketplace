// frontend/src/features/vendors/SellerAdjustmentsPage.tsx
// Mes ajustements — commissions, frais de retrait, remboursements totaux et partiels.
// Aucun endpoint dédié : tout est reconstitué depuis getOrders() et getWithdrawals().

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowDownToLine, Download, Info, RefreshCw, RotateCcw, Scale, TrendingDown,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorOrder,
  type WithdrawalRequest,
  type VendorDisputeListItem,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { fmtDate, orderRef } from './orderUtils';
import { SegmentBar } from './EscrowPipeline';
import {
  T, HERO, nf, VendorStyles, PageHead, GhostBtn, StatCard,
  Hero, HeroAmount, Panel, Tabs, Badge, Note, Skeleton,
} from './vendorTheme';

type Kind = 'commission' | 'fee' | 'refund' | 'partial' | 'credit';
type Filter = 'all' | Kind;

type Row = {
  id: string;
  kind: Kind;
  title: string;
  meta: string;
  amount: number;   // négatif = retenu, positif = reversé
  date: string;
  link?: string;
};

const KIND: Record<Kind, { tagKey: string; color: string; bg: string; icon: React.ReactNode }> = {
  commission: { tagKey: 'sl4_adjustments.kind_commission',    color: T.violet, bg: T.violetL, icon: <Scale size={16} /> },
  fee:        { tagKey: 'sl4_adjustments.kind_fee',         color: T.orange, bg: T.orangeB, icon: <ArrowDownToLine size={16} /> },
  refund:     { tagKey: 'sl4_adjustments.kind_refund', color: T.blue,   bg: T.blueL,   icon: <RotateCcw size={16} /> },
  partial:    { tagKey: 'sl4_adjustments.kind_partial', color: T.amber,  bg: T.amberL,  icon: <RotateCcw size={16} /> },
  credit:     { tagKey: 'sl4_adjustments.kind_credit',        color: T.green,  bg: T.greenL,  icon: <TrendingDown size={16} style={{ transform: 'rotate(180deg)' }} /> },
};

/** Construit la liste des ajustements à partir des commandes, retraits et litiges. */
function buildRows(
  orders: VendorOrder[],
  withdrawals: WithdrawalRequest[],
  disputes: VendorDisputeListItem[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): Row[] {
  const rows: Row[] = [];

  // Montant réellement arbitré par BelivaY, par commande.
  const refundByOrder = new Map<number, number>();
  disputes.forEach(d => {
    const amt = d.refund_amount_xaf;
    if (d.order && typeof amt === 'number' && amt > 0) refundByOrder.set(d.order, amt);
  });

  orders.forEach(o => {
    const refunded = o.escrow_status === 'REFUNDED';
    const partial  = o.escrow_status === 'PARTIAL_REFUNDED';

    // Commission retenue — sauf remboursement total, où BelivaY ne retient rien
    if ((o.commission_amount ?? 0) > 0 && !refunded) {
      rows.push({
        id: `c-${o.id}`, kind: 'commission',
        title: t('sl4_adjustments.row_commission_title', { ref: orderRef(o.id) }),
        meta: t('sl4_adjustments.row_commission_meta', { amount: nf(o.vendor_subtotal), rate: o.commission_rate.toFixed(1) }),
        amount: -(o.commission_amount ?? 0),
        date: o.created_at, link: `/seller/orders/${o.id}`,
      });
    }

    if (refunded) {
      rows.push({
        id: `r-${o.id}`, kind: 'refund',
        title: t('sl4_adjustments.row_full_refund_title', { ref: orderRef(o.id) }),
        meta: t('sl4_adjustments.row_full_refund_meta'),
        amount: -(o.vendor_net_amount ?? 0),
        date: o.updated_at ?? o.created_at, link: `/seller/orders/${o.id}`,
      });
      if ((o.commission_amount ?? 0) > 0) {
        rows.push({
          id: `cr-${o.id}`, kind: 'credit',
          title: t('sl4_adjustments.row_commission_returned_title', { ref: orderRef(o.id) }),
          meta: t('sl4_adjustments.row_commission_returned_meta'),
          amount: o.commission_amount ?? 0,
          date: o.updated_at ?? o.created_at, link: `/seller/orders/${o.id}`,
        });
      }
    }

    if (partial) {
      const real = refundByOrder.get(o.id);
      rows.push({
        id: `p-${o.id}`, kind: 'partial',
        title: t('sl4_adjustments.row_partial_refund_title', { ref: orderRef(o.id) }),
        meta: real
          ? t('sl4_adjustments.row_partial_refund_meta_arbitrated', { amount: nf(o.vendor_subtotal) })
          : t('sl4_adjustments.row_partial_refund_meta_estimated'),
        amount: -(real ?? Math.round((o.vendor_net_amount ?? 0) * 0.3)),
        date: o.updated_at ?? o.created_at, link: `/seller/orders/${o.id}`,
      });
    }
  });

  withdrawals
    .filter(w => w.status === 'APPROVED' && w.fee_amount_xaf > 0)
    .forEach(w => {
      rows.push({
        id: `f-${w.id}`, kind: 'fee',
        title: t('sl4_adjustments.row_withdrawal_fee_title', { reference: w.reference }),
        meta: t('sl4_adjustments.row_withdrawal_fee_meta', { amount: nf(w.amount_xaf), rate: parseFloat(String(w.fee_percent_snapshot)).toFixed(1) }),
        amount: -w.fee_amount_xaf,
        date: w.processed_at ?? w.created_at, link: '/seller/settlements',
      });
    });

  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Hors composant : fonction pure, pas besoin d'etre recreee a chaque rendu. */
function sumOf(list: Row[], kind?: Kind) {
  return list.filter(r => !kind || r.kind === kind).reduce((s, r) => s + r.amount, 0);
}

function exportCSV(rows: Row[], shopName: string, header: string, t: (key: string) => string) {
  const lines = [
    header,
    ...rows.map(r => [
      fmtDate(r.date), t(KIND[r.kind].tagKey),
      `"${r.title}"`, `"${r.meta}"`, r.amount,
    ].join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `belivay_ajustements_${shopName}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SellerAdjustmentsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [disputes, setDisputes] = useState<VendorDisputeListItem[]>([]);
  const [shopName, setShopName] = useState('Ma Boutique');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  // Mois courant fige au chargement : lire l'horloge pendant le rendu rendrait
  // le composant impur et invaliderait les memos a chaque rendu.
  const [today, setToday] = useState<{ year: number; month: number }>({ year: 0, month: -1 });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ords, wds, profile, disp] = await Promise.all([
        vendorsApi.getOrders(),
        vendorsApi.getWithdrawals(),
        vendorsApi.getProfile(),
        // Les litiges ne sont pas indispensables : sans eux, le remboursement
        // partiel retombe sur une estimation plutot que de faire echouer la page.
        vendorsApi.getDisputes().catch(() => [] as VendorDisputeListItem[]),
      ]);
      setOrders(ords);
      setWithdrawals(wds);
      setDisputes(disp);
      setShopName(profile.business_name);
      const d = new Date();
      setToday({ year: d.getFullYear(), month: d.getMonth() });
    } catch {
      showToast(t('sl4_adjustments.toast_load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(
    () => buildRows(orders, withdrawals, disputes, t),
    [orders, withdrawals, disputes, t],
  );

  const dansLeMois = useMemo(
    () => (iso: string) => {
      const d = new Date(iso);
      return d.getFullYear() === today.year && d.getMonth() === today.month;
    },
    [today],
  );

  const month = useMemo(() => rows.filter(r => dansLeMois(r.date)), [rows, dansLeMois]);

  const totals = useMemo(() => {
    const commission = sumOf(month, 'commission');
    const fee        = sumOf(month, 'fee');
    const refund     = sumOf(month, 'refund') + sumOf(month, 'partial');
    const credit     = sumOf(month, 'credit');
    const net        = commission + fee + refund + credit;
    const gross      = orders
      .filter(o => dansLeMois(o.created_at))
      .reduce((s, o) => s + (o.vendor_subtotal ?? 0), 0);
    const retained = Math.abs(commission) + Math.abs(fee) + Math.abs(refund);
    return { commission, fee, refund, credit, net, gross, retained };
  }, [month, orders, dansLeMois]);

  const filtered = filter === 'all' ? rows : rows.filter(r => r.kind === filter);
  const share = (n: number) => (totals.retained > 0 ? Math.round((Math.abs(n) / totals.retained) * 100) : 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <VendorStyles />
        <div className="rounded-3xl animate-pulse" style={{ height: 190, background: T.creamAlt }} />
        <Skeleton h={96} n={4} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      <Link to="/seller/payments">
        <button type="button" className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
          style={{ padding: '8px 13px', fontSize: 12.5, background: T.white, border: `1px solid ${T.border}`, color: T.muted }}>
          <ArrowLeft size={14} />{t('sl4_adjustments.back_to_payments')}
        </button>
      </Link>

      <PageHead
        kicker={t('sl4_adjustments.kicker')} kickerColor={T.violet}
        title={t('sl4_adjustments.title')}
        subtitle={t('sl4_adjustments.subtitle')}
        actions={
          <>
            <GhostBtn icon={<Download size={13} />} onClick={() => exportCSV(rows, shopName, t('sl4_adjustments.csv_header'), t)}>{t('sl4_adjustments.export_csv_button')}</GhostBtn>
            <GhostBtn icon={<RefreshCw size={13} />} onClick={load}>{t('sl4_adjustments.refresh')}</GhostBtn>
          </>
        }
      />

      <Hero gradient={HERO.violet} blobColor="rgba(167,139,250,.55)">
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <HeroAmount
            kicker={t('sl4_adjustments.retained_month_kicker')}
            value={`− ${nf(totals.retained)}`}
            note={
              totals.gross > 0
                ? <>{t('sl4_adjustments.retained_share_before')}<strong style={{ color: '#fff' }}>{((totals.retained / totals.gross) * 100).toFixed(1)} %</strong>{t('sl4_adjustments.retained_share_after')}</>
                : t('sl4_adjustments.no_sales_month')
            }
          />
          <div className="text-right">
            <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,.4)' }}>
              {t('sl4_adjustments.gross_month_label')}
            </p>
            <p className="font-black mt-1.5" style={{ fontSize: 24, color: '#fff', letterSpacing: '-.02em' }}>
              {nf(totals.gross)} <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>FCFA</span>
            </p>
          </div>
        </div>

        <SegmentBar segments={[
          { pct: share(totals.commission), color: '#A78BFA', label: t('sl4_adjustments.segment_commissions', { amount: nf(Math.abs(totals.commission)) }) },
          { pct: share(totals.fee),        color: T.orange,  label: t('sl4_adjustments.segment_fees', { amount: nf(Math.abs(totals.fee)) }) },
          { pct: share(totals.refund),     color: T.blue,    label: totals.refund !== 0 ? t('sl4_adjustments.segment_refunds', { amount: nf(Math.abs(totals.refund)) }) : undefined },
        ]} />
      </Hero>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))' }}>
        <StatCard icon={KIND.commission.icon} value={`− ${nf(Math.abs(totals.commission))}`}
          label={t('sl4_adjustments.kpi_commission_label')} sub={t('sl4_adjustments.kpi_commission_sub')}
          color={T.violet} bg={T.violetL} trend={`${share(totals.commission)} %`} />
        <StatCard icon={KIND.fee.icon} value={`− ${nf(Math.abs(totals.fee))}`}
          label={t('sl4_adjustments.kpi_fee_label')} sub={t('sl4_adjustments.kpi_fee_sub')}
          color={T.orange} bg={T.orangeB} trend={`${share(totals.fee)} %`} />
        <StatCard icon={KIND.refund.icon} value={`− ${nf(Math.abs(totals.refund))}`}
          label={t('sl4_adjustments.kpi_refund_label')} sub={t('sl4_adjustments.kpi_refund_sub')}
          color={T.blue} bg={T.blueL} trend={`${share(totals.refund)} %`} />
        <StatCard icon={KIND.credit.icon} value={`+ ${nf(totals.credit)}`}
          label={t('sl4_adjustments.kpi_credit_label')} sub={t('sl4_adjustments.kpi_credit_sub')}
          color={T.green} bg={T.greenL} trend={t('sl4_adjustments.kpi_credit_trend')} />
      </div>

      <Panel
        pad={false}
        title={t('sl4_adjustments.detail_panel_title')} sub={t('sl4_adjustments.detail_panel_sub')}
        right={
          <Tabs<Filter>
            value={filter} onChange={setFilter} accent={T.violet}
            items={[
              { key: 'all',        label: t('sl4_adjustments.tab_all'),          n: rows.length },
              { key: 'commission', label: t('sl4_adjustments.tab_commissions'),   n: rows.filter(r => r.kind === 'commission').length },
              { key: 'fee',        label: t('sl4_adjustments.tab_fees'),         n: rows.filter(r => r.kind === 'fee').length },
              { key: 'refund',     label: t('sl4_adjustments.tab_refunds'), n: rows.filter(r => r.kind === 'refund' || r.kind === 'partial').length },
            ]}
          />
        }
      >
        {filtered.length === 0 ? (
          <div className="text-center" style={{ padding: '44px 20px' }}>
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: T.violetL, color: T.violet }}><Scale size={24} /></span>
            <p className="font-bold" style={{ fontSize: 14, color: T.text }}>{t('sl4_adjustments.empty_title')}</p>
            <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              {t('sl4_adjustments.empty_sub')}
            </p>
          </div>
        ) : filtered.map(r => {
          const k = KIND[r.kind];
          const positive = r.amount > 0;
          const body = (
            <div className="v-row flex items-center gap-3.5 flex-wrap"
              style={{ padding: '15px 20px', borderBottom: `1px solid ${T.borderL}` }}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: k.bg, color: k.color }}>{k.icon}</span>
              <div className="flex-1" style={{ minWidth: 190 }}>
                <p className="font-bold" style={{ fontSize: 12.5, color: T.text }}>{r.title}</p>
                <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>{r.meta}</p>
              </div>
              <Badge label={t(k.tagKey)} color={k.color} bg={k.bg} minWidth={104} />
              <div className="text-right flex-shrink-0" style={{ minWidth: 106 }}>
                <p className="font-black" style={{ fontSize: 14.5, color: positive ? T.green : k.color, letterSpacing: '-.01em' }}>
                  {positive ? '+' : '−'} {nf(Math.abs(r.amount))} FCFA
                </p>
                <p style={{ fontSize: 10, color: T.mutedL, marginTop: 2 }}>{fmtDate(r.date)}</p>
              </div>
            </div>
          );
          return r.link ? <Link key={r.id} to={r.link}>{body}</Link> : <div key={r.id}>{body}</div>;
        })}
      </Panel>

      <Note icon={<Info size={15} />} tone="violet">
        {t('sl4_adjustments.footer_note_before')}<strong style={{ color: T.text }}>{t('sl4_adjustments.footer_note_strong')}</strong>{t('sl4_adjustments.footer_note_after')}
      </Note>
    </div>
  );
}
