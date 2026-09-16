// frontend/src/features/vendors/SellerPendingFundsPage.tsx
// Mes fonds en attente — ce qui revient au vendeur mais n'est pas encore retirable.
// Dérivé de Order.escrow_status : BLOCKED, RELEASE_PENDING, DISPUTED.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Lock, Package, RefreshCw, Scale, TriangleAlert } from 'lucide-react';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { orderRef } from './orderUtils';
import { SegmentBar } from './EscrowPipeline';
import {
  T, HERO, card, nf, VendorStyles, PageHead, GhostBtn,
  Hero, HeroAmount, Badge, Note, Skeleton,
} from './vendorTheme';

const RELEASE_H = 24;       // Order.escrow_release_h
const AUTO_CONFIRM_H = 48;  // Order.escrow_auto_confirm_h

type Bucket = 'soon' | 'after_delivery' | 'action' | 'frozen';

const BUCKETS: Record<Bucket, { titleKey: string; subKey: string; color: string; bg: string }> = {
  soon: {
    titleKey: 'sl4_pending_funds.bucket_soon_title',
    subKey: 'sl4_pending_funds.bucket_soon_sub',
    color: T.blue, bg: T.blueL,
  },
  after_delivery: {
    titleKey: 'sl4_pending_funds.bucket_after_delivery_title',
    subKey: 'sl4_pending_funds.bucket_after_delivery_sub',
    color: T.amber, bg: T.amberL,
  },
  action: {
    titleKey: 'sl4_pending_funds.bucket_action_title',
    subKey: 'sl4_pending_funds.bucket_action_sub',
    color: T.orange, bg: T.orangeB,
  },
  frozen: {
    titleKey: 'sl4_pending_funds.bucket_frozen_title',
    subKey: 'sl4_pending_funds.bucket_frozen_sub',
    color: T.red, bg: T.redL,
  },
};

const PENDING_ACTION = ['PAID_IN_ESCROW', 'VENDOR_ACKNOWLEDGED', 'PREPARING'];

function classify(o: VendorOrder): Bucket {
  if (o.escrow_status === 'DISPUTED') return 'frozen';
  if (o.escrow_status === 'RELEASE_PENDING') return 'soon';
  if (PENDING_ACTION.includes(o.fulfillment_status)) return 'action';
  return 'after_delivery';
}

/**
 * Échéance lisible : ce qui débloque le montant, et quand.
 *
 * `maintenant` est passé en argument plutôt que lu via `Date.now()` : cette
 * fonction est appelée pendant le rendu, et une horloge lue là rendrait le
 * composant impur — les compteurs sauteraient à chaque re-rendu.
 */
function timing(o: VendorOrder, maintenant: number, t: (key: string, opts?: Record<string, unknown>) => string): { blocker: string; timer: string; tone: string } {
  if (o.escrow_status === 'DISPUTED') {
    return { blocker: t('sl4_pending_funds.timing_disputed_blocker'), timer: t('sl4_pending_funds.timing_suspended'), tone: T.red };
  }
  if (o.escrow_status === 'RELEASE_PENDING') {
    const base = new Date(o.updated_at ?? o.created_at).getTime() + RELEASE_H * 3600000;
    const left = base - maintenant;
    const h = Math.max(0, Math.floor(left / 3600000));
    return {
      blocker: t('sl4_pending_funds.timing_release_pending_blocker'),
      timer: left > 0 ? t('sl4_pending_funds.timing_in_hours', { hours: h }) : t('sl4_pending_funds.timing_imminent'),
      tone: T.blue,
    };
  }
  if (PENDING_ACTION.includes(o.fulfillment_status)) {
    return { blocker: o.fulfillment_status === 'PREPARING' ? t('sl4_pending_funds.timing_preparing_blocker') : t('sl4_pending_funds.timing_to_confirm_blocker'), timer: t('sl4_pending_funds.timing_action_required'), tone: T.orange };
  }
  if (o.fulfillment_status === 'DELIVERED') {
    const base = new Date(o.updated_at ?? o.created_at).getTime() + AUTO_CONFIRM_H * 3600000;
    const left = base - maintenant;
    const h = Math.max(0, Math.floor(left / 3600000));
    return {
      blocker: t('sl4_pending_funds.timing_delivered_blocker'),
      timer: left > 0 ? t('sl4_pending_funds.timing_in_hours', { hours: h + RELEASE_H }) : t('sl4_pending_funds.timing_imminent'),
      tone: T.amber,
    };
  }
  return { blocker: t('sl4_pending_funds.timing_shipping_blocker'), timer: t('sl4_pending_funds.timing_after_delivery'), tone: T.amber };
}

export default function SellerPendingFundsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  // Horloge figée au chargement : voir le commentaire de `timing`.
  const [maintenant, setMaintenant] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const ords = await vendorsApi.getOrders();
      setOrders(ords);
      setMaintenant(Date.now());
    } catch {
      showToast(t('sl4_pending_funds.toast_load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(
    () => orders.filter(o => ['BLOCKED', 'RELEASE_PENDING', 'DISPUTED'].includes(o.escrow_status)),
    [orders],
  );

  const groups = useMemo(() => {
    const map: Record<Bucket, VendorOrder[]> = { soon: [], after_delivery: [], action: [], frozen: [] };
    pending.forEach(o => map[classify(o)].push(o));
    return (['soon', 'action', 'after_delivery', 'frozen'] as Bucket[])
      .map(k => ({
        key: k,
        title: t(BUCKETS[k].titleKey),
        sub: t(BUCKETS[k].subKey),
        color: BUCKETS[k].color,
        bg: BUCKETS[k].bg,
        rows: map[k],
        total: map[k].reduce((s, o) => s + (o.vendor_net_amount ?? 0), 0),
      }))
      .filter(g => g.rows.length > 0);
  }, [pending, t]);

  const total = pending.reduce((s, o) => s + (o.vendor_net_amount ?? 0), 0);
  const soon = groups.find(g => g.key === 'soon')?.total ?? 0;
  const frozen = groups.find(g => g.key === 'frozen')?.total ?? 0;
  const blocked = total - soon - frozen;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <VendorStyles />
        <div className="rounded-3xl animate-pulse" style={{ height: 190, background: T.creamAlt }} />
        <Skeleton h={140} n={2} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      <Link to="/seller/payments">
        <button type="button" className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
          style={{ padding: '8px 13px', fontSize: 12.5, background: T.white, border: `1px solid ${T.border}`, color: T.muted }}>
          <ArrowLeft size={14} />{t('sl4_pending_funds.back_to_payments')}
        </button>
      </Link>

      <PageHead
        kicker={t('sl4_pending_funds.kicker')} kickerColor={T.amber}
        title={t('sl4_pending_funds.title')}
        subtitle={t('sl4_pending_funds.subtitle')}
        actions={<GhostBtn icon={<RefreshCw size={13} />} onClick={load}>{t('sl4_pending_funds.refresh')}</GhostBtn>}
      />

      <Hero gradient={HERO.amber} blobColor="rgba(217,119,6,.6)">
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <HeroAmount
            kicker={t('sl4_pending_funds.total_pending_kicker')} value={nf(total)}
            note={
              <>
                {t(pending.length > 1 ? 'sl4_pending_funds.order_count_plural' : 'sl4_pending_funds.order_count', { count: pending.length })}
                {frozen > 0 ? <> {t('sl4_pending_funds.frozen_amount_note_before')}<strong style={{ color: '#ff8a80' }}>{t('sl4_pending_funds.frozen_amount_note_strong', { amount: nf(frozen) })}</strong>{t('sl4_pending_funds.frozen_amount_note_after')}</> : null}
              </>
            }
          />
          <div className="text-right">
            <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,.4)' }}>
              {t('sl4_pending_funds.arrives_soon_label')}
            </p>
            <p className="font-black mt-1.5" style={{ fontSize: 24, color: '#34d399', letterSpacing: '-.02em' }}>
              {nf(soon)} <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>FCFA</span>
            </p>
          </div>
        </div>

        <SegmentBar segments={[
          { pct: pct(blocked), color: T.amber, label: t('sl4_pending_funds.segment_escrow', { amount: nf(blocked) }) },
          { pct: pct(soon),    color: T.blue,  label: t('sl4_pending_funds.segment_release', { amount: nf(soon) }) },
          { pct: pct(frozen),  color: T.red,   label: frozen > 0 ? t('sl4_pending_funds.segment_frozen', { amount: nf(frozen) }) : undefined },
        ]} />
      </Hero>

      <div className="flex gap-3.5 items-start flex-wrap">
        <div className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 320 }}>
          {groups.length === 0 ? (
            <div className="rounded-2xl text-center" style={{ ...card, padding: '44px 20px' }}>
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: T.greenL, color: T.green }}><Lock size={24} /></span>
              <p className="font-bold" style={{ fontSize: 14, color: T.text }}>{t('sl4_pending_funds.empty_title')}</p>
              <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                {t('sl4_pending_funds.empty_sub')}
              </p>
            </div>
          ) : groups.map(g => (
            <section key={g.key} className="rounded-2xl overflow-hidden" style={card}>
              <div className="flex items-center gap-3 flex-wrap"
                style={{ padding: '15px 18px', borderBottom: `1px solid ${T.border}` }}>
                <span className="rounded-full flex-shrink-0"
                  style={{ width: 9, height: 9, background: g.color, boxShadow: `0 0 0 4px ${g.bg}` }} />
                <div className="flex-1" style={{ minWidth: 140 }}>
                  <p className="font-bold" style={{ fontSize: 13, color: T.text }}>{g.title}</p>
                  <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>{g.sub}</p>
                </div>
                <p className="font-black flex-shrink-0" style={{ fontSize: 15, color: g.color, letterSpacing: '-.02em' }}>
                  {nf(g.total)} FCFA
                </p>
              </div>

              {g.rows.map(o => {
                const tm = timing(o, maintenant, t);
                return (
                  <Link key={o.id} to={`/seller/orders/${o.id}`}>
                    <div className="flex items-center gap-3.5 flex-wrap transition-colors"
                      style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderL}` }}>
                      <span className="w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                        <Package size={15} />
                      </span>
                      <div className="flex-1" style={{ minWidth: 150 }}>
                        <p className="font-black" style={{ fontSize: 12, color: T.orange }}>{orderRef(o.id)}</p>
                        <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>{tm.blocker}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black" style={{ fontSize: 14, color: T.text }}>{nf(o.vendor_net_amount ?? 0)}</p>
                        <p style={{ fontSize: 10, color: T.mutedL, marginTop: 1 }}>{t('sl4_pending_funds.out_of_amount', { amount: nf(o.vendor_subtotal) })}</p>
                      </div>
                      <Badge label={tm.timer} color={tm.tone} bg={`${tm.tone}1a`} minWidth={96} />
                    </div>
                  </Link>
                );
              })}
            </section>
          ))}
        </div>

        <aside className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 270, maxWidth: 340 }}>
          <div className="rounded-2xl p-5" style={card}>
            <p className="font-bold mb-4" style={{ fontSize: 13.5, color: T.text }}>{t('sl4_pending_funds.why_wait_title')}</p>
            {[
              { n: '1', t: t('sl4_pending_funds.step1_title'), d: t('sl4_pending_funds.step1_desc') },
              { n: '2', t: t('sl4_pending_funds.step2_title', { hours: AUTO_CONFIRM_H }), d: t('sl4_pending_funds.step2_desc') },
              { n: '3', t: t('sl4_pending_funds.step3_title', { hours: RELEASE_H }), d: t('sl4_pending_funds.step3_desc') },
            ].map(s => (
              <div key={s.n} className="flex gap-3 mb-4">
                <span className="w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 font-black"
                  style={{ background: T.amberL, color: T.amber, fontSize: 11.5 }}>{s.n}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold" style={{ fontSize: 12, color: T.text }}>{s.t}</span>
                  <span className="block mt-1" style={{ fontSize: 11, lineHeight: 1.55, color: T.muted }}>{s.d}</span>
                </span>
              </div>
            ))}
            <Note icon={<Clock size={15} />}>
              {t('sl4_pending_funds.delays_note_before')}<strong style={{ color: T.text }}>{t('sl4_pending_funds.delays_note_autoconfirm', { hours: AUTO_CONFIRM_H })}</strong>{t('sl4_pending_funds.delays_note_middle')}<strong style={{ color: T.text }}>{t('sl4_pending_funds.delays_note_release', { hours: RELEASE_H })}</strong>{t('sl4_pending_funds.delays_note_after')}
            </Note>
          </div>

          {frozen > 0 && (
            <div className="rounded-2xl" style={{ ...card, border: `1px solid ${T.redB}`, padding: 18 }}>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.redL, color: T.red }}><TriangleAlert size={15} /></span>
                <p className="font-bold flex-1" style={{ fontSize: 12.5, color: T.text }}>{t('sl4_pending_funds.frozen_amount_title')}</p>
              </div>
              <p className="font-black mt-3" style={{ fontSize: 24, color: T.red, letterSpacing: '-.02em' }}>
                {nf(frozen)} FCFA
              </p>
              <p className="mt-1.5" style={{ fontSize: 11, lineHeight: 1.55, color: T.muted }}>
                {t('sl4_pending_funds.frozen_orders_count', { count: groups.find(g => g.key === 'frozen')?.rows.length ?? 0 })}
              </p>
              <Link to="/seller/disputes">
                <button type="button" className="mt-3.5 w-full flex items-center justify-center gap-2 rounded-xl font-bold"
                  style={{ padding: 11, fontSize: 11.5, background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                  <Scale size={14} />{t('sl4_pending_funds.view_disputes_button')}
                </button>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
