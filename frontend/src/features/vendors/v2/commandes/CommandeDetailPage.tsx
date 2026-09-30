// frontend/src/features/vendors/v2/commandes/CommandeDetailPage.tsx
// Écran « Commande à préparer » — VD-05 §PRE-01 à PRE-06.
// Route recommandée : /seller/v2/commandes/:id
// Une seule carte clé (délai, article, "C'est prêt") visible sans défiler
// (PRE-05) ; le reste des actions (Rupture, Plus de temps, Bon, Journal) en
// liste dans "Autres actions" (PRE-06). Pas de consigne d'emballage ni de
// code au marqueur (PRE-02) : "Vous ne faites pas le colis" seulement.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertOctagon, ChevronRight, Clock3, FileText, History, Inbox, RefreshCw, Truck,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import {
  Card, CenterState, Collapsible, GhostRow, KeepAmount, PageHeader, Pill, PrimaryButton, ProductThumb, ProgressBar,
} from './ui';
import {
  courierOf, fmtDateTime, fmtDurationShort, fmtXAF, isCounterPayment, itemsSummary,
  markOrderReady, orderRef, pickupLocationOf, progressRatio, useOrder,
} from './helpers';

const PREPARING_STATES = new Set(['PAID_IN_ESCROW', 'VENDOR_ACKNOWLEDGED', 'PREPARING']);

export default function CommandeDetailPage() {
  const { id } = useParams();
  const orderId = id ? Number(id) : undefined;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { order, loading, error, reload } = useOrder(orderId);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleReady() {
    if (!order) return;
    setSaving(true);
    setActionError(null);
    try {
      await markOrderReady(order.id, order.fulfillment_status);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />;
  }
  if (error || !order) {
    return <CenterState icon={<Inbox size={22} color={p.red} />} title={error ?? t('sl7_commandes.not_found')} p={p} />;
  }

  const summary = itemsSummary(order);
  const courier = courierOf(order);
  const pickup = pickupLocationOf(order);
  const counter = isCounterPayment(order);
  const ratio = progressRatio(order.created_at, order.vendor_reply_deadline);
  const remainingMs = order.vendor_reply_deadline
    ? new Date(order.vendor_reply_deadline).getTime() - Date.now()
    : null;
  const alreadyReady = !PREPARING_STATES.has(order.fulfillment_status);

  return (
    <div className="pb-24 pt-2">
      <PageHeader title={t('sl7_commandes.detail_title')} subtitle={orderRef(order.id)} onBack={() => navigate(-1)} p={p} />

      <div className="flex gap-2 mb-3">
        <Pill
          label={counter ? t('sl7_commandes.pill_counter') : t('sl7_commandes.pill_paid')}
          tone={counter ? 'amber' : 'green'}
          p={p}
        />
        {!alreadyReady ? <Pill label={t('sl7_commandes.pill_to_prepare')} tone="orange" p={p} /> : null}
      </div>

      <Card p={p} accent={p.orange}>
        {order.vendor_reply_deadline ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 700 }}>
                {remainingMs !== null && remainingMs > 0
                  ? t('sl7_commandes.due_in', { time: fmtDurationShort(remainingMs) })
                  : t('sl7_commandes.due_overdue')}
              </span>
              <span style={{ fontSize: 11.5, color: p.textMuted }}>
                {t('sl7_commandes.due_before', { time: fmtDateTime(order.vendor_reply_deadline) })}
              </span>
            </div>
            <ProgressBar ratio={ratio} p={p} />
          </>
        ) : null}

        <div className="mt-4 mb-1 flex items-start gap-3">
          <ProductThumb imageUrl={summary.imageUrl} size={52} p={p} />
          <div className="min-w-0 flex-1">
            <p className="font-black truncate" style={{ fontSize: 17, color: p.text }}>
              {summary.title}{summary.qty > 1 ? ` ×${summary.qty}` : ''}
            </p>
            {summary.extra > 0 ? (
              <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl7_commandes.plus_n_others', { n: summary.extra })}</p>
            ) : (
              <p style={{ fontSize: 12, color: p.textMuted }}>
                {t('sl7_commandes.item_meta_line', { qty: summary.qty, price: fmtXAF(summary.unitPrice) })}
              </p>
            )}
            <p style={{ fontSize: 11.5, color: p.textMuted, marginTop: 2 }}>{orderRef(order.id)}</p>
          </div>
        </div>

        <div className="rounded-xl mt-3 mb-3" style={{ background: p.cardAlt, padding: '10px 12px' }}>
          <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl7_commandes.detail_set_aside')}</p>
        </div>

        {!alreadyReady ? (
          <PrimaryButton onClick={handleReady} disabled={saving} p={p}>
            {saving ? t('sl7_commandes.saving') : t('sl7_commandes.cta_ready')}
          </PrimaryButton>
        ) : (
          <p className="text-center font-bold" style={{ fontSize: 13, color: p.green }}>
            {t('sl7_commandes.detail_already_ready')}
          </p>
        )}
        {actionError ? <p className="mt-2" style={{ fontSize: 12, color: p.red }}>{actionError}</p> : null}
      </Card>

      <div className="mt-4 mb-1 px-1">
        <KeepAmount amount={fmtXAF(order.vendor_net_amount)} label={t('sl7_commandes.you_keep')} p={p} />
        <div className="flex items-center justify-between mt-1">
          <span style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl7_commandes.sale_price')}</span>
          <span style={{ fontSize: 12, color: p.textMuted }}>{fmtXAF(order.vendor_subtotal)}</span>
        </div>
      </div>

      <Card p={p}>
        <div className="flex items-center gap-2 mb-2">
          <Truck size={16} color={p.textMuted} />
          <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t('sl7_commandes.pickup_title')}</p>
        </div>
        {courier && pickup ? (
          <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>
            {pickup.kind === 'relay'
              ? t('sl7_commandes.courier_line_relay', { name: courier.name, relay: pickup.relay })
              : t('sl7_commandes.courier_line_home', { name: courier.name })}
          </p>
        ) : (
          <p style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl7_commandes.pickup_not_assigned')}</p>
        )}
        <p className="font-bold mt-2" style={{ fontSize: 12.5, color: p.text }}>{t('sl7_commandes.pickup_not_you')}</p>
        <div className="mt-2">
          <Collapsible title={t('sl7_commandes.how_it_works')} p={p}>{t('sl7_commandes.pickup_how')}</Collapsible>
        </div>
      </Card>

      <p className="font-black uppercase mt-5 mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
        {t('sl7_commandes.other_actions')}
      </p>
      <div className="flex flex-col gap-2">
        <GhostRow p={p} onClick={() => navigate(`/seller/v2/commandes/${order.id}/plus-de-temps`)}>
          <span className="flex items-center gap-2"><Clock3 size={15} /> {t('sl7_commandes.action_extend')}</span>
          <ChevronRight size={15} color={p.textMuted} />
        </GhostRow>
        <GhostRow p={p} onClick={() => navigate(`/seller/v2/commandes/${order.id}/rupture`)}>
          <span className="flex items-center gap-2"><AlertOctagon size={15} /> {t('sl7_commandes.action_stockout')}</span>
          <ChevronRight size={15} color={p.textMuted} />
        </GhostRow>
        <GhostRow p={p} onClick={() => navigate(`/seller/v2/commandes/${order.id}/bon-de-preparation`)}>
          <span className="flex items-center gap-2"><FileText size={15} /> {t('sl7_commandes.action_slip')}</span>
          <ChevronRight size={15} color={p.textMuted} />
        </GhostRow>
        <GhostRow p={p} onClick={() => navigate(`/seller/v2/commandes/${order.id}/journal`)}>
          <span className="flex items-center gap-2"><History size={15} /> {t('sl7_commandes.action_journal')}</span>
          <ChevronRight size={15} color={p.textMuted} />
        </GhostRow>
        {alreadyReady ? (
          <GhostRow p={p} onClick={() => navigate(`/seller/v2/commandes/${order.id}/remise`)}>
            <span className="flex items-center gap-2"><Truck size={15} /> {t('sl7_commandes.action_handover')}</span>
            <ChevronRight size={15} color={p.textMuted} />
          </GhostRow>
        ) : null}
      </div>

      <p className="mt-5 text-center" style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.5 }}>
        {t('sl7_commandes.anonymity_note')}
      </p>
    </div>
  );
}
