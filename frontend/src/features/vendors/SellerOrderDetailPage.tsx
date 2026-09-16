// frontend/src/features/vendors/SellerOrderDetailPage.tsx
// Détail d'une commande vendeur : progression, suivi livreur, argent, articles, note interne.
// L'identité de l'acheteur n'est pas affichée — seuls le lieu et un contact de livraison masqué.

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ArrowLeft, Bike, CheckCircle, Clock, FileText, Lock, MapPin,
  Navigation, Package, PackageCheck, Phone, RefreshCw, Route, Save, Scale,
  ShieldCheck, StickyNote, Truck, XCircle,
} from 'lucide-react';
import { vendorsApi, type VendorOrder, type FulfillmentStatus } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { openInvoice, fmtXAF, fmtDate, orderRef } from './orderUtils';
import {
  T, HERO, card, nf, ESCROW, type EscrowKey,
  VendorStyles, GhostBtn, Panel, Badge, Note,
} from './vendorTheme';

const RELEASE_H = 24;
const AUTO_CONFIRM_H = 48;

const STEPS = [
  { key: 'PAID_IN_ESCROW',      labelKey: 'sl3_order_detail.step_paid',       icon: CheckCircle },
  { key: 'VENDOR_ACKNOWLEDGED', labelKey: 'sl3_order_detail.step_acknowledged', icon: Clock },
  { key: 'PREPARING',           labelKey: 'sl3_order_detail.step_preparing',  icon: Package },
  { key: 'READY_FOR_PICKUP',    labelKey: 'sl3_order_detail.step_ready',      icon: Truck },
  { key: 'DELIVERED',           labelKey: 'sl3_order_detail.step_delivered',  icon: PackageCheck },
];

const STATUS_ORDER: Record<string, number> = {
  CREATED: 0, PAID_IN_ESCROW: 1, VENDOR_ACKNOWLEDGED: 2, PREPARING: 3,
  READY_FOR_PICKUP: 4, DELIVERED: 5, CANCELLED: -1,
};

const FULFILL_CFG: Record<string, { labelKey: string; color: string; bg: string }> = {
  CREATED:             { labelKey: 'sl3_order_detail.fulfill_created',      color: T.muted,  bg: T.creamAlt },
  PAID_IN_ESCROW:      { labelKey: 'sl3_order_detail.fulfill_to_confirm',   color: T.amber,  bg: T.amberL   },
  VENDOR_ACKNOWLEDGED: { labelKey: 'sl3_order_detail.fulfill_confirmed',    color: T.blue,   bg: T.blueL    },
  PREPARING:           { labelKey: 'sl3_order_detail.fulfill_preparing',   color: T.blue,   bg: T.blueL    },
  READY_FOR_PICKUP:    { labelKey: 'sl3_order_detail.fulfill_ready',        color: T.violet, bg: T.violetL  },
  DELIVERED:           { labelKey: 'sl3_order_detail.fulfill_delivered',    color: T.green,  bg: T.greenL   },
  BUYER_CONFIRMED:     { labelKey: 'sl3_order_detail.fulfill_buyer_confirmed', color: T.green,  bg: T.greenL   },
  AUTO_CONFIRMED:      { labelKey: 'sl3_order_detail.fulfill_auto_confirmed', color: T.green,  bg: T.greenL   },
  RELEASED_TO_VENDOR:  { labelKey: 'sl3_order_detail.fulfill_released',     color: T.green,  bg: T.greenL   },
  DISPUTED:            { labelKey: 'sl3_order_detail.fulfill_disputed',     color: T.red,    bg: T.redL     },
  CANCELLED:           { labelKey: 'sl3_order_detail.fulfill_cancelled',    color: T.red,    bg: T.redL     },
  REFUNDED:            { labelKey: 'sl3_order_detail.fulfill_refunded',     color: T.blue,   bg: T.blueL    },
};

const PAYMENT_CFG: Record<string, { labelKey: string; color: string; bg: string }> = {
  PENDING:  { labelKey: 'sl3_order_detail.payment_pending', color: T.amber, bg: T.amberL },
  PAID:     { labelKey: 'sl3_order_detail.payment_paid',    color: T.green, bg: T.greenL },
  FAILED:   { labelKey: 'sl3_order_detail.payment_failed',  color: T.red,   bg: T.redL   },
  REFUNDED: { labelKey: 'sl3_order_detail.payment_refunded', color: T.blue,  bg: T.blueL  },
};

function shipmentLabelKey(status?: string): string {
  switch (status) {
    case 'CREATED': return 'sl3_order_detail.shipment_created';
    case 'ASSIGNED': return 'sl3_order_detail.shipment_assigned';
    case 'PICKED_UP': return 'sl3_order_detail.shipment_picked_up';
    case 'IN_TRANSIT': return 'sl3_order_detail.shipment_in_transit';
    case 'OUT_FOR_DELIVERY': return 'sl3_order_detail.shipment_out_for_delivery';
    case 'DELIVERED': return 'sl3_order_detail.shipment_delivered';
    case 'FAILED': return 'sl3_order_detail.shipment_failed';
    case 'CANCELLED': return 'sl3_order_detail.shipment_cancelled';
    default: return status || 'sl3_order_detail.shipment_none';
  }
}

/** Masque le milieu du numéro : le vendeur peut appeler sans lire l'identité complète. */
function maskPhone(p?: string) {
  if (!p) return '—';
  const d = p.replace(/\D/g, '');
  if (d.length < 9) return p;
  return `+237 ${d.slice(-9, -8)} •• •• ${d.slice(-4, -2)} ${d.slice(-2)}`;
}

function useShopName(): string {
  const { t } = useTranslation();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    vendorsApi.getProfile().then(p => setName(p.business_name)).catch(() => null);
  }, []);
  return name ?? t('sl3_order_detail.default_shop_name');
}

/** Minuterie d'acceptation (72 h) — Date.now() jamais appelé pendant le rendu. */
function useTimer(createdAt: string, active: boolean): string | null {
  const { t } = useTranslation();
  const [timerText, setTimerText] = useState<string | null>(null);
  useEffect(() => {
    if (!active || !createdAt) return;
    const deadline = new Date(createdAt).getTime() + 72 * 3600000;
    const tick = () => {
      const d = deadline - Date.now();
      setTimerText(d <= 0 ? null : t('sl3_order_detail.time_remaining', { h: Math.floor(d / 3600000), m: Math.floor((d % 3600000) / 60000) }));
    };
    const a = setTimeout(tick, 0);
    const b = setInterval(tick, 60_000);
    return () => { clearTimeout(a); clearInterval(b); };
  }, [active, createdAt, t]);
  return active ? timerText : null;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3" style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderL}` }}>
      <span className="flex-shrink-0" style={{ color: T.mutedL, marginTop: 2 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.mutedL }}>{label}</p>
        <p className="font-semibold mt-0.5" style={{ fontSize: 12.5, color: T.text, lineHeight: 1.4 }}>{value}</p>
      </div>
    </div>
  );
}

export default function SellerOrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const shopName = useShopName();

  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [data, noteData] = await Promise.all([
        vendorsApi.getOrderDetail(parseInt(id, 10)),
        vendorsApi.getNote(parseInt(id, 10)),
      ]);
      setOrder(data);
      setNote(noteData.content);
      setNoteDraft(noteData.content);
    } catch {
      showToast(t('sl3_order_detail.toast_not_found'), 'error');
      navigate('/seller/orders');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast, t]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const advance = async (next: FulfillmentStatus) => {
    if (!order) return;
    try {
      setUpdating(true);
      const updated = await vendorsApi.updateFulfillmentStatus(order.id, { fulfillment_status: next });
      setOrder(updated);
      const nextLabel = FULFILL_CFG[next]?.labelKey ? t(FULFILL_CFG[next].labelKey) : next;
      showToast(t('sl3_order_detail.toast_status_updated', { status: nextLabel }), 'success');
    } catch {
      showToast(t('sl3_order_detail.toast_update_error'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  const saveNote = async () => {
    if (!order) return;
    try {
      setNoteSaving(true);
      const saved = await vendorsApi.saveNote(order.id, noteDraft);
      setNote(saved.content);
      setNoteDraft(saved.content);
      showToast(t('sl3_order_detail.toast_note_saved'), 'success');
    } catch {
      showToast(t('sl3_order_detail.toast_note_save_error'), 'error');
    } finally {
      setNoteSaving(false);
    }
  };

  const status = order?.fulfillment_status as FulfillmentStatus | undefined;
  const timer = useTimer(order?.created_at ?? '', status === 'PAID_IN_ESCROW');

  if (loading) {
    return (
      <div className="space-y-4">
        <VendorStyles />
        <div className="rounded-2xl animate-pulse" style={{ height: 64, background: T.creamAlt }} />
        <div className="rounded-2xl animate-pulse" style={{ height: 190, background: T.creamAlt }} />
        <div className="rounded-2xl animate-pulse" style={{ height: 240, background: T.creamAlt }} />
      </div>
    );
  }
  if (!order || !status) return null;

  const fulfillCfg = FULFILL_CFG[status];
  const paymentCfg = PAYMENT_CFG[order.payment_status];
  const escrow = ESCROW[order.escrow_status as EscrowKey] ?? ESCROW.PENDING;
  const cur = STATUS_ORDER[status] ?? 1;
  const isCancelled = status === 'CANCELLED';
  const isDelivered = ['DELIVERED', 'BUYER_CONFIRMED', 'AUTO_CONFIRMED', 'RELEASED_TO_VENDOR'].includes(status);
  const spin = <RefreshCw size={13} className="animate-spin" />;
  const items = order.items ?? [];
  const units = items.reduce((s, i) => s + (i.qty ?? 0), 0);

  const releaseLeft = (() => {
    if (order.escrow_status === 'RELEASED') return null;
    if (order.escrow_status === 'DISPUTED') return t('sl3_order_detail.release_suspended_dispute');
    if (!isDelivered) return t('sl3_order_detail.release_after_delivery');
    const base = new Date(order.updated_at ?? order.created_at).getTime();
    const target = order.escrow_status === 'RELEASE_PENDING'
      ? base + RELEASE_H * 3600000
      : base + (AUTO_CONFIRM_H + RELEASE_H) * 3600000;
    const left = target - Date.now();
    return left > 0 ? t('sl3_order_detail.release_in_hours', { hours: Math.floor(left / 3600000) }) : t('sl3_order_detail.release_imminent');
  })();

  /** Rang de l'escrow, pour savoir quelle étape du parcours de l'argent est franchie. */
  const escrowRank: Record<string, number> = {
    PENDING: 0, BLOCKED: 1, DISPUTED: 1, REFUNDED: 1, PARTIAL_REFUNDED: 1,
    RELEASE_PENDING: 2, RELEASED: 3,
  };
  const rank = escrowRank[order.escrow_status] ?? 0;
  const stepRank: Record<string, number> = { paid: 1, commission: 1, delivered: 2, released: 3 };

  const moneySteps = [
    {
      key: 'paid', title: t('sl3_order_detail.money_paid_title'),
      time: order.is_paid ? fmtDate(order.created_at) : t('sl3_order_detail.time_pending'),
      desc: t('sl3_order_detail.money_paid_desc'),
      amount: t('sl3_order_detail.money_paid_amount', { amount: fmtXAF(order.vendor_subtotal) }), tone: T.green,
    },
    {
      key: 'commission', title: t('sl3_order_detail.money_commission_title'),
      time: order.is_paid ? fmtDate(order.created_at) : '—',
      desc: t('sl3_order_detail.money_commission_desc'),
      amount: t('sl3_order_detail.money_commission_amount', { amount: fmtXAF(order.commission_amount), rate: order.commission_rate.toFixed(1) }), tone: T.red,
    },
    {
      key: 'delivered', title: t('sl3_order_detail.money_delivered_title'),
      time: isDelivered ? fmtDate(order.updated_at ?? order.created_at) : t('sl3_order_detail.time_upcoming'),
      desc: t('sl3_order_detail.money_delivered_desc', { hours: AUTO_CONFIRM_H }),
      amount: t('sl3_order_detail.money_delivered_amount', { amount: fmtXAF(order.vendor_net_amount ?? 0) }), tone: T.amber,
    },
    {
      key: 'released', title: t('sl3_order_detail.money_released_title'),
      time: rank >= 3 ? fmtDate(order.updated_at ?? order.created_at) : (releaseLeft ?? t('sl3_order_detail.time_upcoming')),
      desc: t('sl3_order_detail.money_released_desc'),
      amount: t(rank >= 3 ? 'sl3_order_detail.money_released_amount_done' : 'sl3_order_detail.money_released_amount_pending', { amount: fmtXAF(order.vendor_net_amount ?? 0) }),
      tone: rank >= 3 ? T.green : T.mutedL,
    },
  ];

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      {/* ═══ EN-TÊTE ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/seller/orders">
          <button type="button" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: T.white, border: `1px solid ${T.border}`, color: T.text }}>
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div className="flex-1" style={{ minWidth: 200 }}>
          <h1 className="font-black" style={{ fontSize: 21, color: T.text, letterSpacing: '-.025em' }}>
            {t('sl3_order_detail.order_heading', { ref: orderRef(order.id) })}
          </h1>
          <p className="mt-0.5" style={{ fontSize: 12, color: T.muted }}>
            {fmtDate(order.created_at)} · {t(items.length > 1 ? 'sl3_order_detail.item_count_plural' : 'sl3_order_detail.item_count', { count: items.length })} · {order.city}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {paymentCfg && <Badge label={t(paymentCfg.labelKey)} color={paymentCfg.color} bg={paymentCfg.bg} />}
          {fulfillCfg && <Badge label={t(fulfillCfg.labelKey)} color={fulfillCfg.color} bg={fulfillCfg.bg} />}
          <Badge label={t(escrow.labelKey)} color={escrow.color} bg={escrow.bg} />
          <button type="button" onClick={() => openInvoice([order], shopName, t)}
            className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
            style={{ padding: '9px 14px', fontSize: 12, background: T.orange, boxShadow: '0 8px 18px -8px rgba(244,121,32,.8)' }}>
            <FileText size={13} />{t('sl3_order_detail.invoice')}
          </button>
        </div>
      </div>

      {/* ═══ PROGRESSION ═══ */}
      <div className="rounded-2xl p-5" style={card}>
        <p className="font-bold uppercase mb-4" style={{ fontSize: 10.5, letterSpacing: '.18em', color: T.mutedL }}>
          {t('sl3_order_detail.order_progress')}
        </p>

        {timer && (
          <div className="flex items-center gap-2 mb-4 rounded-xl"
            style={{ padding: '11px 14px', background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.14)' }}>
            <Clock size={14} style={{ color: T.green, flexShrink: 0 }} />
            <span className="font-semibold" style={{ fontSize: 12, color: T.green }}>{t('sl3_order_detail.timer_to_accept', { timer })}</span>
          </div>
        )}

        {isCancelled ? (
          <div className="flex items-center gap-3 rounded-xl" style={{ padding: 13, background: T.redL }}>
            <XCircle size={18} style={{ color: T.red, flexShrink: 0 }} />
            <div>
              <p className="font-bold" style={{ fontSize: 13, color: T.red }}>{t('sl3_order_detail.order_cancelled')}</p>
              <p style={{ fontSize: 11, color: T.red }}>{t('sl3_order_detail.cancelled_on', { date: fmtDate(order.updated_at ?? order.created_at) })}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="flex items-start" style={{ minWidth: 440 }}>
              {STEPS.map((s, i) => {
                const ord = STATUS_ORDER[s.key] ?? i;
                const done = ord < cur;
                const now = s.key === status;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: done ? T.green : now ? T.orange : T.creamAlt,
                          border: `2px solid ${done ? T.green : now ? T.orange : T.border}`,
                          boxShadow: now ? '0 0 0 4px rgba(244,121,32,.15)' : 'none',
                        }}>
                        <Icon size={14} style={{ color: done || now ? '#fff' : T.mutedL }} />
                      </span>
                      <span className="whitespace-nowrap"
                        style={{ fontSize: 10, fontWeight: now ? 700 : 500, color: done ? T.green : now ? T.orange : T.mutedL }}>
                        {t(s.labelKey)}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span className="flex-shrink-0"
                        style={{ height: 2, width: 52, margin: '0 5px 20px', background: done ? T.green : T.border }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isCancelled && !isDelivered && (
          <div className="flex gap-2 mt-5 pt-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}` }}>
            {status === 'PAID_IN_ESCROW' && (
              <>
                <button type="button" onClick={() => advance('VENDOR_ACKNOWLEDGED')}
                  disabled={updating || !order.is_paid}
                  title={!order.is_paid ? t('sl3_order_detail.awaiting_payment') : undefined}
                  className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
                  style={{ padding: '11px 17px', fontSize: 12.5, background: T.green, boxShadow: '0 8px 20px -10px rgba(22,163,74,.8)' }}>
                  {updating ? spin : <CheckCircle size={14} />}{t('sl3_order_detail.accept_order')}
                </button>
                <button type="button" onClick={() => advance('PREPARING')} disabled={updating || !order.is_paid}
                  className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
                  style={{ padding: '11px 16px', fontSize: 12.5, background: T.cream, border: `1px solid ${T.border}`, color: T.text }}>
                  {updating ? spin : <Package size={14} />}{t('sl3_order_detail.move_to_preparing')}
                </button>
                <button type="button" onClick={() => advance('CANCELLED')} disabled={updating}
                  className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
                  style={{ padding: '11px 16px', fontSize: 12.5, background: T.redL, border: `1px solid ${T.redB}`, color: T.red }}>
                  {updating ? spin : <XCircle size={14} />}{t('sl3_order_detail.refuse')}
                </button>
              </>
            )}
            {status === 'VENDOR_ACKNOWLEDGED' && (
              <button type="button" onClick={() => advance('PREPARING')} disabled={updating}
                className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
                style={{ padding: '11px 17px', fontSize: 12.5, background: T.blue, boxShadow: '0 8px 20px -10px rgba(37,99,235,.8)' }}>
                {updating ? spin : <Package size={14} />}{t('sl3_order_detail.start_preparing')}
              </button>
            )}
            {status === 'PREPARING' && (
              <button type="button" onClick={() => advance('READY_FOR_PICKUP')} disabled={updating}
                className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
                style={{ padding: '11px 17px', fontSize: 12.5, background: T.orange, boxShadow: '0 8px 20px -10px rgba(244,121,32,.85)' }}>
                {updating ? spin : <Truck size={14} />}{t('sl3_order_detail.mark_ready_to_ship')}
              </button>
            )}
            {status === 'READY_FOR_PICKUP' && (
              <span className="flex items-center gap-1.5 font-medium" style={{ fontSize: 12, color: T.muted }}>
                <Truck size={14} />{t('sl3_order_detail.waiting_for_courier')}
              </span>
            )}
          </div>
        )}

        {!order.is_paid && !isCancelled && (
          <div className="flex items-center gap-2 mt-3 rounded-xl"
            style={{ padding: '10px 13px', background: T.amberL, border: `1px solid ${T.amberB}` }}>
            <AlertTriangle size={13} style={{ color: T.amber, flexShrink: 0 }} />
            <p className="font-semibold" style={{ fontSize: 12, color: T.amber }}>
              {t('sl3_order_detail.payment_pending_warning')}
            </p>
          </div>
        )}
      </div>

      {/* ═══ SUIVI COLIS ═══ */}
      <Panel title={t('sl3_order_detail.shipment_panel_title')} right={<Route size={15} style={{ color: T.orange }} />}>
        {order.shipment ? (
          <>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
              <div className="rounded-2xl" style={{ padding: '13px 15px', background: T.blueL, border: '1px solid rgba(37,99,235,.16)' }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.blue }}>{t('sl3_order_detail.delivery_status')}</p>
                <p className="font-black mt-1.5" style={{ fontSize: 13, color: T.text }}>{t(shipmentLabelKey(order.shipment.status))}</p>
              </div>
              <div className="rounded-2xl" style={{ padding: '13px 15px', background: T.greenL, border: `1px solid ${T.greenB}` }}>
                <p className="flex items-center gap-1.5 font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.green }}>
                  <Navigation size={11} />{t('sl3_order_detail.distance_calculated')}
                </p>
                <p className="font-black mt-1.5" style={{ fontSize: 17, color: T.text }}>
                  {order.shipment.distance_km.toFixed(1)} km
                </p>
              </div>
              <div className="rounded-2xl" style={{ padding: '13px 15px', background: T.orangeL, border: '1px solid rgba(244,121,32,.16)' }}>
                <p className="flex items-center gap-1.5 font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.orange }}>
                  <Bike size={11} />{t('sl3_order_detail.courier')}
                </p>
                <p className="font-black mt-1.5" style={{ fontSize: 13, color: T.text }}>
                  {order.shipment.courier_name || t('sl3_order_detail.awaiting')}
                </p>
                {order.shipment.courier_phone && (
                  <p style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{order.shipment.courier_phone}</p>
                )}
              </div>
            </div>

            {order.shipment.pickup_confirmation_code && (
              <div className="mt-4 rounded-2xl" style={{ padding: '14px 16px', background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: '#92400E' }}>
                  {t('sl3_order_detail.pickup_code_title')}
                </p>
                <p className="font-black mt-1.5" style={{ fontSize: 24, letterSpacing: '.15em', color: '#78350F' }}>
                  {order.shipment.pickup_confirmation_code}
                </p>
                <p style={{ fontSize: 11, color: '#92400E', marginTop: 4 }}>
                  {t('sl3_order_detail.pickup_code_desc')}
                </p>
              </div>
            )}

            <div className="mt-5">
              {(order.shipment.timeline ?? []).map((e, i, arr) => {
                const isLast = i === arr.length - 1;
                return (
                  <div key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: isLast ? T.orange : T.creamAlt, color: isLast ? '#fff' : T.muted }}>
                        {isLast ? <Truck size={14} /> : <CheckCircle size={14} />}
                      </span>
                      {!isLast && <span className="flex-1" style={{ width: 1, minHeight: 24, background: T.border }} />}
                    </div>
                    <div className="flex-1 min-w-0" style={{ paddingBottom: isLast ? 0 : 16 }}>
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <p className="font-black" style={{ fontSize: 12.5, color: T.text }}>{e.label}</p>
                        <span className="font-semibold" style={{ fontSize: 10.5, color: T.mutedL }}>{fmtDate(e.created_at)}</span>
                      </div>
                      <p className="mt-1" style={{ fontSize: 11.5, lineHeight: 1.5, color: T.muted }}>
                        {e.message || t(shipmentLabelKey(e.status))}
                      </p>
                      {e.location && (
                        <p className="flex items-center gap-1 font-bold mt-1.5" style={{ fontSize: 10.5, color: T.mutedL }}>
                          <MapPin size={11} />{e.location}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-xl" style={{ padding: '13px 15px', background: T.cream, fontSize: 13, color: T.muted }}>
            {t('sl3_order_detail.no_shipment_tracking')}
          </div>
        )}
      </Panel>

      {/* ═══ ARGENT ═══ */}
      <div className="flex gap-3.5 items-start flex-wrap">
        <div className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 340 }}>

          <Panel title={t('sl3_order_detail.money_lifecycle_title')} right={<Lock size={15} style={{ color: escrow.color }} />}>
            {moneySteps.map((s, i, arr) => {
              const done = rank >= (stepRank[s.key] ?? 0);
              const isNow = !done && (i === 0 || rank >= (stepRank[arr[i - 1].key] ?? 0));
              return (
                <div key={s.key} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 26 }}>
                    <span className="rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 26, height: 26, color: '#fff',
                        background: done ? T.green : isNow ? T.amber : '#E2DACE',
                        boxShadow: isNow ? '0 0 0 5px rgba(217,119,6,.16)' : 'none',
                      }}>
                      {(done || isNow) && <CheckCircle size={13} />}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="flex-1"
                        style={{ width: 2, minHeight: 30, margin: '5px 0', background: done ? 'rgba(22,163,74,.28)' : T.border }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0" style={{ paddingBottom: i < arr.length - 1 ? 20 : 0 }}>
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <p className="font-bold" style={{ fontSize: 13, color: done || isNow ? T.text : T.mutedL }}>{s.title}</p>
                      <span style={{ fontSize: 10.5, color: T.mutedL, fontVariantNumeric: 'tabular-nums' }}>{s.time}</span>
                    </div>
                    <p className="mt-1" style={{ fontSize: 11.5, lineHeight: 1.55, color: T.muted, maxWidth: 460 }}>{s.desc}</p>
                    <span className="inline-block font-black rounded-lg mt-2.5"
                      style={{ fontSize: 11.5, padding: '5px 11px', color: s.tone, background: `${s.tone}1a` }}>
                      {s.amount}
                    </span>
                  </div>
                </div>
              );
            })}
          </Panel>

          <Panel
            title={t('sl3_order_detail.payment_breakdown_title')}
            right={<GhostBtn icon={<FileText size={13} />} onClick={() => openInvoice([order], shopName, t)}>{t('sl3_order_detail.invoice')}</GhostBtn>}
          >
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between" style={{ padding: '14px 16px', background: T.cream }}>
                <span style={{ fontSize: 12, color: T.muted }}>{t('sl3_order_detail.items_subtotal')}</span>
                <span className="font-bold" style={{ fontSize: 13.5, color: T.text }}>{fmtXAF(order.vendor_subtotal)}</span>
              </div>
              <div className="flex items-center justify-between"
                style={{ padding: '14px 16px', background: T.white, borderTop: `1px solid ${T.borderL}` }}>
                <span style={{ fontSize: 12, color: T.mutedL }}>{t('sl3_order_detail.delivery_collected_by_belivay')}</span>
                <span className="font-semibold" style={{ fontSize: 13, color: T.mutedL }}>
                  {(order.delivery_fee_xaf ?? 0) === 0 ? t('sl3_order_detail.free') : fmtXAF(order.delivery_fee_xaf ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3"
                style={{ padding: '14px 16px', background: 'rgba(220,38,38,.06)', borderTop: '1px solid rgba(220,38,38,.14)' }}>
                <span style={{ fontSize: 12, color: T.red }}>
                  {t('sl3_order_detail.commission_rate', { rate: order.commission_rate.toFixed(1) })}{' '}
                  <span style={{ fontSize: 10, opacity: .8 }}>{t('sl3_order_detail.commission_locked')}</span>
                </span>
                <span className="font-bold flex-shrink-0" style={{ fontSize: 13.5, color: T.red }}>
                  − {fmtXAF(order.commission_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3"
                style={{ padding: '17px 16px', background: T.greenL, borderTop: `1px solid ${T.greenB}` }}>
                <span className="font-bold" style={{ fontSize: 12, color: T.green }}>{t('sl3_order_detail.net_to_you')}</span>
                <span className="font-black flex-shrink-0"
                  style={{ fontSize: 22, color: T.green, letterSpacing: '-.02em' }}>
                  {fmtXAF(order.vendor_net_amount ?? 0)}
                </span>
              </div>
            </div>
          </Panel>
        </div>

        {/* ═══ COLONNE DROITE ═══ */}
        <aside className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 270, maxWidth: 340 }}>
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: HERO.dark }}>
            <span className="v-glow absolute pointer-events-none"
              style={{ top: -50, right: -30, width: 160, height: 160, borderRadius: '50%',
                background: `radial-gradient(circle,${escrow.color}88,transparent 68%)` }} />
            <div className="relative">
              <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.42)' }}>
                {rank >= 3 ? t('sl3_order_detail.already_paid_out') : t('sl3_order_detail.blocked_for_you')}
              </p>
              <p className="font-black mt-2"
                style={{ fontSize: 29, color: '#fff', letterSpacing: '-.025em' }}>
                {nf(order.vendor_net_amount ?? 0)} <span style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>FCFA</span>
              </p>

              {releaseLeft && (
                <div className="flex items-center gap-3 mt-4 rounded-2xl"
                  style={{ padding: 13, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.13)' }}>
                  <span className="relative flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34 }}>
                    <span className="v-pulse absolute inset-0 rounded-full" style={{ border: `1.5px solid ${escrow.color}99` }} />
                    <Clock size={16} style={{ color: escrow.color, position: 'relative' }} />
                  </span>
                  <span>
                    <span className="block font-bold" style={{ fontSize: 11.5, color: '#fff' }}>
                      {t('sl3_order_detail.release_label', { when: releaseLeft.toLowerCase() })}
                    </span>
                    <span className="block mt-0.5" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)' }}>
                      {order.escrow_status === 'DISPUTED' ? t('sl3_order_detail.resumes_after_arbitration') : t('sl3_order_detail.or_on_buyer_confirmation')}
                    </span>
                  </span>
                </div>
              )}

              <p className="mt-3" style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,.55)' }}>
                {t('sl3_order_detail.auto_confirm_hero', { autoConfirmH: AUTO_CONFIRM_H, releaseH: RELEASE_H })}
              </p>

              <Link to="/seller/pending-funds">
                <span className="block mt-3 font-bold" style={{ fontSize: 11, color: T.orange }}>
                  {t('sl3_order_detail.see_all_pending_funds')}
                </span>
              </Link>
            </div>
          </div>

          {/* Livraison — sans identité acheteur */}
          <Panel title={t('sl3_order_detail.delivery_panel_title')} right={<MapPin size={15} style={{ color: T.orange }} />}>
            <DetailRow icon={<MapPin size={13} />} label={t('sl3_order_detail.city')} value={order.city} />
            {order.address && <DetailRow icon={<MapPin size={13} />} label={t('sl3_order_detail.delivery_address')} value={order.address} />}
            <DetailRow icon={<Phone size={13} />} label={t('sl3_order_detail.delivery_contact')} value={maskPhone(order.customer_phone)} />

            {order.note && (
              <div className="mt-3 rounded-2xl" style={{ padding: 13, background: T.orangeL, border: '1px solid rgba(244,121,32,.16)' }}>
                <p className="flex items-center gap-1.5 font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.orange }}>
                  <StickyNote size={12} />{t('sl3_order_detail.customer_instructions')}
                </p>
                <p className="mt-1.5" style={{ fontSize: 12, lineHeight: 1.5, color: T.text }}>{order.note}</p>
              </div>
            )}

            <div className="mt-3">
              <Note icon={<ShieldCheck size={14} />}>
                {t('sl3_order_detail.buyer_identity_note')}
              </Note>
            </div>
          </Panel>

          {order.escrow_status === 'DISPUTED' && (
            <Link to="/seller/disputes">
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ ...card, border: `1px solid ${T.redB}` }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.redL, color: T.red }}><Scale size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold" style={{ fontSize: 12.5, color: T.text }}>{t('sl3_order_detail.dispute_ongoing')}</span>
                  <span className="block" style={{ fontSize: 10.5, color: T.muted }}>
                    {t('sl3_order_detail.dispute_frozen_amount', { amount: fmtXAF(order.vendor_net_amount ?? 0) })}
                  </span>
                </span>
              </div>
            </Link>
          )}
        </aside>
      </div>

      {/* ═══ ARTICLES ═══ */}
      <Panel
        pad={false}
        title={t('sl3_order_detail.ordered_items_title')}
        sub={t('sl3_order_detail.ordered_items_sub', { items: t(items.length > 1 ? 'sl3_order_detail.item_count_plural' : 'sl3_order_detail.item_count', { count: items.length }), units: t(units > 1 ? 'sl3_order_detail.unit_count_plural' : 'sl3_order_detail.unit_count', { count: units }) })}
        right={<Package size={15} style={{ color: T.orange }} />}
      >
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3.5 flex-wrap"
            style={{ padding: '15px 20px', borderBottom: `1px solid ${T.borderL}` }}>
            <span className="rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ width: 52, height: 52, background: T.orangeL }}>
              {item.product_image
                ? <img src={item.product_image} alt={item.product_title} className="w-full h-full object-cover" />
                : <Package size={21} style={{ color: T.orange }} />}
            </span>
            <div className="flex-1" style={{ minWidth: 170 }}>
              <p className="font-semibold" style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{item.product_title}</p>
              <p className="mt-1" style={{ fontSize: 11.5, color: T.muted }}>
                {t('sl3_order_detail.qty_short')} <strong style={{ color: T.text }}>{item.qty}</strong> · {t('sl3_order_detail.unit_price')}{' '}
                <strong style={{ color: T.text }}>{fmtXAF(item.product_price ?? 0)}</strong>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black" style={{ fontSize: 15.5, color: T.text, letterSpacing: '-.01em' }}>
                {fmtXAF(item.line_total_xaf)}
              </p>
              <p style={{ fontSize: 10.5, color: T.mutedL, marginTop: 2 }}>
                {t('sl3_order_detail.net_amount', { amount: fmtXAF(Math.round(item.line_total_xaf * (1 - order.commission_rate / 100))) })}
              </p>
            </div>
          </div>
        ))}
      </Panel>

      {/* ═══ NOTE INTERNE ═══ */}
      <div className="rounded-2xl overflow-hidden" style={card}>
        <div className="flex items-center justify-between gap-3 flex-wrap"
          style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.violetL, color: T.violet }}><StickyNote size={15} /></span>
            <span className="font-bold" style={{ fontSize: 13.5, color: T.text }}>{t('sl3_order_detail.internal_note_title')}</span>
            <span className="font-bold rounded-full"
              style={{ fontSize: 10, padding: '4px 9px', background: T.violetL, color: T.violet }}>
              {t('sl3_order_detail.internal_note_visibility')}
            </span>
          </div>
          {noteDraft !== note && (
            <span className="font-medium" style={{ fontSize: 11, color: T.amber }}>{t('sl3_order_detail.unsaved_changes')}</span>
          )}
        </div>

        <div style={{ padding: '18px 20px' }}>
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            placeholder={t('sl3_order_detail.note_placeholder')}
            maxLength={2000}
            rows={4}
            className="w-full resize-none rounded-2xl outline-none transition-all"
            style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, background: T.cream, border: `1px solid ${T.border}`, color: T.text, fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = T.violet; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <div className="flex items-center justify-between gap-2.5 mt-3 flex-wrap">
            <p style={{ fontSize: 11, color: T.mutedL }}>{t('sl3_order_detail.char_count', { count: noteDraft.length })}</p>
            <div className="flex gap-2">
              {noteDraft !== note && (
                <button type="button" onClick={() => setNoteDraft(note)}
                  className="rounded-xl font-semibold"
                  style={{ padding: '9px 15px', fontSize: 12, background: T.creamAlt, color: T.muted }}>
                  {t('sl3_order_detail.cancel')}
                </button>
              )}
              <button type="button" onClick={saveNote} disabled={noteSaving || noteDraft === note}
                className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                style={{ padding: '9px 17px', fontSize: 12.5, background: T.violet, boxShadow: '0 8px 20px -10px rgba(124,58,237,.85)' }}>
                {noteSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {noteSaving ? t('sl3_order_detail.saving') : t('sl3_order_detail.save')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5"
          style={{ padding: '13px 20px', background: 'rgba(124,58,237,.04)', borderTop: `1px solid ${T.border}` }}>
          <StickyNote size={12} style={{ color: T.violet, flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11, lineHeight: 1.6, color: T.muted }}>
            {t('sl3_order_detail.note_privacy_desc')}
          </p>
        </div>
      </div>

      {/* ═══ PIED DE PAGE ═══ */}
      <div className="rounded-2xl flex items-center justify-between gap-3 flex-wrap"
        style={{ padding: '16px 20px', background: T.creamAlt, border: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 11.5, color: T.muted }}>
          {t('sl3_order_detail.created_on', { date: fmtDate(order.created_at) })}
          {order.updated_at && order.updated_at !== order.created_at && t('sl3_order_detail.updated_on_suffix', { date: fmtDate(order.updated_at) })}
        </p>
        <button type="button" onClick={() => openInvoice([order], shopName, t)}
          className="flex items-center gap-2 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
          style={{ padding: '10px 17px', fontSize: 12.5, background: T.orange, boxShadow: '0 8px 20px -10px rgba(244,121,32,.85)' }}>
          <FileText size={14} />{t('sl3_order_detail.print_invoice')}
        </button>
      </div>
    </div>
  );
}