// frontend/src/features/vendors/v2/commandes/CommandesListPage.tsx
// Écran « Commandes reçues » — VD-05 §CMD-01 à CMD-10.
// GET /orders?state=prep|in_progress|done|problems (VD-D06.A01/A04) n'existe
// pas encore : on charge vendorsApi.getOrders() une fois et on classe côté
// client (bucketOf). Le menu ⋮ Exporter/Factures (VD-D06.A06) n'a pas
// d'endpoint dédié aujourd'hui : volontairement omis plutôt qu'inventé.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Inbox, RefreshCw, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { palette } from '../theme';
import { Card, CenterState, HeaderMenu, Pill, ProductThumb } from './ui';
import ShopIdentityBar from '../ShopIdentityBar';
import {
  bucketOf, courierOf, fmtDateTime, fmtXAF, itemsSummary, markOrderReady, orderRef, pickupLocationOf, pillLabelKeyOf,
  type OrderBucket,
} from './helpers';

const FILTERS: OrderBucket[] = ['prep', 'in_progress', 'done', 'problems'];

export default function CommandesListPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderBucket>('prep');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    vendorsApi.getOrders()
      .then(setOrders)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<OrderBucket, number> = { prep: 0, in_progress: 0, done: 0, problems: 0 };
    orders.forEach((o) => { c[bucketOf(o)] += 1; });
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    return orders
      .filter((o) => bucketOf(o) === filter)
      .sort((a, b) => {
        const da = a.vendor_reply_deadline ? new Date(a.vendor_reply_deadline).getTime() : Infinity;
        const db = b.vendor_reply_deadline ? new Date(b.vendor_reply_deadline).getTime() : Infinity;
        if (da !== db) return da - db;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [orders, filter]);

  const mostUrgentPrepId = useMemo(() => {
    const preps = orders
      .filter((o) => bucketOf(o) === 'prep')
      .sort((a, b) => {
        const da = a.vendor_reply_deadline ? new Date(a.vendor_reply_deadline).getTime() : Infinity;
        const db = b.vendor_reply_deadline ? new Date(b.vendor_reply_deadline).getTime() : Infinity;
        return da - db;
      });
    return preps[0]?.id ?? null;
  }, [orders]);

  async function handleReady(order: VendorOrder) {
    setBusyId(order.id);
    try {
      await markOrderReady(order.id, order.fulfillment_status);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // CMD-02 : la phrase d'état fait toujours la somme des 4 filtres (aucune
  // commande n'est laissée hors de l'énumération).
  const summary = t('sl7_commandes.list_summary', {
    total: orders.length,
    prep: counts.prep,
    in_progress: counts.in_progress,
    problems: counts.problems,
    done: counts.done,
  });

  const filterLabels: Record<OrderBucket, string> = {
    prep: t('sl7_commandes.filter_prep'),
    in_progress: t('sl7_commandes.filter_in_progress'),
    done: t('sl7_commandes.filter_done'),
    problems: t('sl7_commandes.filter_problems'),
  };

  return (
    <div className="pb-24 pt-2">
      <ShopIdentityBar />
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="font-black" style={{ fontSize: 19, color: p.text }}>
          {t('sl7_commandes.list_title')}
        </h1>
        <HeaderMenu p={p} />
      </div>
      <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{summary}</p>

      <div className="flex gap-2 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="flex-shrink-0 rounded-full font-bold flex items-center gap-1.5"
              style={{
                padding: '9px 14px',
                fontSize: 12.5,
                minHeight: 40,
                background: active ? p.orange : p.card,
                color: active ? '#fff' : p.textMuted,
                border: `1px solid ${active ? p.orange : p.border}`,
              }}
            >
              {filterLabels[f]}
              <span
                className="rounded-full flex items-center justify-center"
                style={{
                  fontSize: 10.5,
                  minWidth: 18,
                  height: 18,
                  padding: '0 4px',
                  background: active ? 'rgba(255,255,255,0.25)' : p.cardAlt,
                  color: active ? '#fff' : p.textMuted,
                }}
              >
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />
      ) : error ? (
        <CenterState icon={<Inbox size={22} color={p.red} />} title={error} p={p} />
      ) : visible.length === 0 ? (
        <CenterState icon={<Inbox size={22} color={p.textMuted} />} title={t('sl7_commandes.empty_filter')} p={p} />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((order) => (
            <OrderListCard
              key={order.id}
              order={order}
              p={p}
              onOpen={() => navigate(`/seller/v2/commandes/${order.id}`)}
              onReady={order.id === mostUrgentPrepId ? () => handleReady(order) : undefined}
              busy={busyId === order.id}
              t={t}
            />
          ))}
        </div>
      )}

      <p className="mt-5 text-center" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
        {t('sl7_commandes.anonymity_note')}
      </p>
    </div>
  );
}

function OrderListCard({
  order, p, onOpen, onReady, busy, t,
}: {
  order: VendorOrder;
  p: ReturnType<typeof palette>;
  onOpen: () => void;
  onReady?: () => void;
  busy: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const bucket = bucketOf(order);
  const summary = itemsSummary(order);
  const pickup = pickupLocationOf(order);
  const isProblem = bucket === 'problems';
  const isDone = bucket === 'done';

  return (
    <Card p={p} accent={isProblem ? p.red : bucket === 'prep' ? p.orange : undefined}>
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-center justify-between mb-2">
          <Pill
            label={t(pillLabelKeyOf(order))}
            tone={isProblem ? 'red' : bucket === 'prep' ? 'orange' : bucket === 'in_progress' ? 'amber' : 'green'}
            p={p}
          />
          <span style={{ fontSize: 11, color: p.textMuted }}>{orderRef(order.id)}</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <ProductThumb imageUrl={summary.imageUrl} p={p} />
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate" style={{ fontSize: 14, color: p.text }}>
              {summary.title}{summary.qty > 1 ? ` ×${summary.qty}` : ''}
            </p>
            {summary.extra > 0 ? (
              <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl7_commandes.plus_n_others', { n: summary.extra })}</p>
            ) : (
              <p style={{ fontSize: 11.5, color: p.textMuted }}>
                {t('sl7_commandes.item_meta_line', { qty: summary.qty, price: fmtXAF(summary.unitPrice) })}
              </p>
            )}
          </div>
          <ChevronRight size={16} color={p.textMuted} />
        </div>
        <p style={{ fontSize: 11.5, color: p.textMuted, marginBottom: 6 }}>
          {t('sl7_commandes.paid_at', { time: fmtDateTime(order.created_at) })}
        </p>
      </button>

      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 600 }}>{t('sl7_commandes.you_keep')}</span>
        <span className="font-black" style={{ fontSize: 16, color: p.green }}>{fmtXAF(order.vendor_net_amount)}</span>
      </div>

      {pickup && !isDone && !isProblem ? (
        <p className="flex items-center gap-1.5 mt-2" style={{ fontSize: 11.5, color: p.textMuted }}>
          <Truck size={13} />
          {pickup.kind === 'relay'
            ? t('sl7_commandes.courier_line_relay', { name: courierOf(order)?.name, relay: pickup.relay })
            : t('sl7_commandes.courier_line_home', { name: courierOf(order)?.name })}
        </p>
      ) : null}

      {isDone ? (
        <p className="mt-2" style={{ fontSize: 11.5, color: p.textMuted }}>
          {order.escrow_status === 'RELEASED'
            ? t('sl7_commandes.money_paid')
            : order.escrow_status === 'RELEASE_PENDING'
              ? t('sl7_commandes.money_releasing')
              : t('sl7_commandes.money_to_pay')}
        </p>
      ) : null}

      {onReady ? (
        <button
          type="button"
          disabled={busy}
          onClick={onReady}
          className="w-full rounded-xl font-bold text-white mt-3 disabled:opacity-60"
          style={{ background: p.orange, padding: '11px 14px', fontSize: 13, minHeight: 44 }}
        >
          {busy ? t('sl7_commandes.saving') : t('sl7_commandes.cta_ready')}
        </button>
      ) : null}
    </Card>
  );
}
