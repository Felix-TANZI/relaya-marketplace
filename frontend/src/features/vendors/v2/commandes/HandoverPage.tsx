// frontend/src/features/vendors/v2/commandes/HandoverPage.tsx
// Écran « Remise au livreur » — VD-06 §REM-01 à REM-09.
// Route recommandée : /seller/v2/commandes/:id/remise
// Code masqué par défaut, affiché au toucher (REM-01), jamais sans nom/photo
// du livreur (REM-02). Bridge : pas de GET /orders/{id}/handover-code dédié —
// handoverCodeOf() (helpers.ts) lit shipment.pickup_confirmation_code (REM-05 :
// fonctionne hors réseau car déjà en cache local via l'appel initial).
// Pas de bouton "Le livreur est là" (retiré, A05) : on sonde périodiquement
// l'état de la commande et on ne bascule vers "Remis au livreur" que lorsque
// le serveur confirme la remise (REM-08).
// Sur les 6 cas d'erreur (VD-06 §1.6), 3 sont détectables avec les données
// déjà exposées (hors réseau, commande annulée, délai dépassé) et affichés en
// direct via ErrorCard ; les 3 autres (livreur absent, remise bloquée,
// plafond de valeur) n'ont pas encore de champ serveur dédié côté vendeur et
// restent documentés en bas d'écran plutôt qu'inventés.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Inbox, MessageCircle, RefreshCw, Truck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { Card, CenterState, Collapsible, GhostRow, PageHeader, Pill, ProductThumb } from './ui';
import { ErrorCard, HANDOVER_ERROR_CASES, type HandoverErrorKey } from './ErrorCard';
import {
  courierOf, detectHandoverIssue, fmtDateTime, handoverCodeOf, itemsSummary, orderRef, pickupLocationOf,
  useOnlineStatus, useOrder,
} from './helpers';

const AFTER_READY = new Set(['DRIVER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'BUYER_CONFIRMED', 'AUTO_CONFIRMED', 'RELEASED_TO_VENDOR']);

export default function HandoverPage() {
  const { id } = useParams();
  const orderId = id ? Number(id) : undefined;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { order, loading, error, reload } = useOrder(orderId);
  const isOnline = useOnlineStatus();
  const [codeVisible, setCodeVisible] = useState(false);

  // REM-08 : la remise est enregistrée par la saisie du livreur côté serveur ;
  // on sonde toutes les 15 s pendant que l'écran est ouvert.
  useEffect(() => {
    if (!order || AFTER_READY.has(order.fulfillment_status)) return undefined;
    const id2 = window.setInterval(reload, 15_000);
    return () => window.clearInterval(id2);
  }, [order, reload]);

  useEffect(() => {
    if (order && AFTER_READY.has(order.fulfillment_status) && orderId) {
      navigate(`/seller/v2/commandes/${orderId}/remis`, { replace: true });
    }
  }, [order, orderId, navigate]);

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />;
  }
  if (error || !order) {
    return <CenterState icon={<Inbox size={22} color={p.red} />} title={error ?? t('sl7_commandes.not_found')} p={p} />;
  }

  const courier = courierOf(order);
  const pickup = pickupLocationOf(order);
  const code = handoverCodeOf(order);
  const issue = detectHandoverIssue(order, isOnline);
  const summary = itemsSummary(order);

  const issueLabels: Record<HandoverErrorKey, { title: string; detail: string; action: string; why: string }> = {
    courier_absent: {
      title: t('sl7_commandes.error_courier_absent_title'),
      detail: t('sl7_commandes.error_courier_absent_detail'),
      action: '',
      why: t('sl7_commandes.error_courier_absent_why'),
    },
    code_blocked: {
      title: t('sl7_commandes.error_code_blocked_title'),
      detail: t('sl7_commandes.error_code_blocked_detail'),
      action: '',
      why: t('sl7_commandes.error_code_blocked_why'),
    },
    order_cancelled: {
      title: t('sl7_commandes.error_cancelled_title'),
      detail: t('sl7_commandes.error_cancelled_detail'),
      action: t('sl7_commandes.error_cancelled_action'),
      why: t('sl7_commandes.error_cancelled_why'),
    },
    deadline_passed: {
      title: t('sl7_commandes.error_deadline_title'),
      detail: t('sl7_commandes.error_deadline_detail'),
      action: t('sl7_commandes.error_deadline_action'),
      why: t('sl7_commandes.error_deadline_why'),
    },
    offline: {
      title: t('sl7_commandes.error_offline_title'),
      detail: t('sl7_commandes.error_offline_detail'),
      action: t('sl7_commandes.error_offline_action'),
      why: t('sl7_commandes.error_offline_why'),
    },
    value_cap: {
      title: t('sl7_commandes.error_value_cap_title'),
      detail: t('sl7_commandes.error_value_cap_detail'),
      action: '',
      why: t('sl7_commandes.error_value_cap_why'),
    },
  };

  function actionFor(key: HandoverErrorKey): (() => void) | undefined {
    if (key === 'order_cancelled') return () => navigate('/seller/v2/commandes');
    if (key === 'deadline_passed') return () => navigate('/seller/v2/messagerie');
    if (key === 'offline') return () => reload();
    return undefined;
  }

  const liveCase = issue ? HANDOVER_ERROR_CASES.find((c) => c.key === issue) : undefined;
  const registryCases = HANDOVER_ERROR_CASES.filter((c) => c.key !== issue);

  return (
    <div className="pb-24 pt-2">
      <PageHeader title={t('sl7_commandes.handover_title')} subtitle={orderRef(order.id)} onBack={() => navigate(-1)} p={p} />

      <div className="flex gap-2 mb-3">
        <Pill label={t('sl7_commandes.handover_ready_pill')} tone="green" p={p} />
      </div>

      {liveCase ? (
        <div className="mb-4">
          <ErrorCard
            tone={liveCase.tone}
            icon={liveCase.icon}
            title={issueLabels[liveCase.key].title}
            detail={issueLabels[liveCase.key].detail}
            actionLabel={issueLabels[liveCase.key].action}
            onAction={actionFor(liveCase.key)}
            why={issueLabels[liveCase.key].why}
            p={p}
            product={{ imageUrl: summary.imageUrl, title: summary.title, ref: orderRef(order.id) }}
          />
        </div>
      ) : null}

      <Card p={p}>
        <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: `1px solid ${p.border}` }}>
          <ProductThumb imageUrl={summary.imageUrl} size={40} p={p} />
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate" style={{ fontSize: 13, color: p.text }}>{summary.title}</p>
            <p style={{ fontSize: 11, color: p.textMuted }}>{orderRef(order.id)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Truck size={16} color={p.textMuted} />
          <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t('sl7_commandes.pickup_title')}</p>
        </div>
        {courier && pickup ? (
          <p style={{ fontSize: 14, color: p.text, fontWeight: 700 }}>
            {pickup.kind === 'relay'
              ? t('sl7_commandes.courier_line_relay', { name: courier.name, relay: pickup.relay })
              : t('sl7_commandes.courier_line_home', { name: courier.name })}
          </p>
        ) : (
          <p style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl7_commandes.pickup_not_assigned')}</p>
        )}
      </Card>

      <Card p={p} accent={p.orange}>
        <p className="text-center" style={{ fontSize: 12, color: p.textMuted, fontWeight: 700 }}>
          {t('sl7_commandes.handover_code_label')}
        </p>
        {code ? (
          <>
            <p className="text-center font-black my-3" style={{ fontSize: 32, letterSpacing: 4, color: p.text }}>
              {codeVisible ? code : '••• •••'}
            </p>
            <button
              type="button"
              onClick={() => setCodeVisible((v) => !v)}
              className="w-full rounded-xl font-bold flex items-center justify-center gap-2"
              style={{ background: p.cardAlt, color: p.text, padding: '11px 14px', fontSize: 13, minHeight: 44 }}
            >
              {codeVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              {codeVisible ? t('sl7_commandes.handover_hide_code') : t('sl7_commandes.handover_show_code')}
            </button>
          </>
        ) : (
          <p className="text-center mt-2" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl7_commandes.handover_code_missing')}</p>
        )}
      </Card>

      <div className="rounded-2xl p-4" style={{ background: `${p.red}14`, border: `1px solid ${p.red}44` }}>
        <p style={{ fontSize: 12.5, color: p.text, lineHeight: 1.5, fontWeight: 600 }}>{t('sl7_commandes.handover_warning')}</p>
      </div>

      <div className="mt-3">
        <Collapsible title={t('sl7_commandes.how_it_works')} p={p}>{t('sl7_commandes.handover_how')}</Collapsible>
      </div>

      <div className="mt-4">
        <GhostRow p={p} onClick={() => navigate('/seller/v2/messagerie')}>
          <span className="flex items-center gap-2"><MessageCircle size={15} /> {t('sl7_commandes.write_support')}</span>
        </GhostRow>
      </div>

      <div className="mt-4">
        <Collapsible title={t('sl7_commandes.handover_other_cases_title')} p={p}>
          <div className="flex flex-col gap-3">
            {registryCases.map((c) => (
              <div key={c.key}>
                <p className="font-semibold" style={{ color: p.text, fontSize: 12.5 }}>{issueLabels[c.key].title}</p>
                <p style={{ fontSize: 11.5 }}>{issueLabels[c.key].detail}</p>
              </div>
            ))}
          </div>
        </Collapsible>
      </div>

      <p className="mt-4 text-center" style={{ fontSize: 11, color: p.textMuted }}>
        {t('sl7_commandes.handover_data_from', { time: fmtDateTime(order.updated_at) })}
      </p>
    </div>
  );
}
