// frontend/src/features/vendors/v2/accueil/TodoRowCard.tsx
// Carte "douce" (non héros) de la file à faire — commandes à préparer
// restantes, litiges gelés, retours ouverts (ACC-02/ACC-04/ACC-05/ACC-06). Un
// seul montant, libellé à gauche, montant à droite (ACC-17). Photo produit
// réelle (jamais une icône générique tant qu'une image existe, même logique
// que HeroCard.tsx et commandes/CommandesListPage.tsx).

import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import type { TodoItem } from './types';
import { formatAbsoluteDeadline, formatClockTime, formatRelativeDeadline, formatXaf, orderRef } from './format';

interface Props {
  item: TodoItem;
  onReady: (orderId: number) => void;
  onRespondDispute: (item: TodoItem) => void;
  onViewReturn: (item: TodoItem) => void;
  busy?: boolean;
  /** Accès Préparation (ACC-26) : mêmes cartes, aucun montant affiché. */
  hideAmount?: boolean;
}

/** Motif de retour (OrderReturn.reason) — mêmes codes que litiges/ReturnsListPage.tsx, libellés dupliqués ici pour rester dans accueil/. */
const RETURN_REASON_KEYS: Record<string, string> = {
  NOT_AS_DESCRIBED: 'sl6_accueil.return_reason_not_as_described',
  DAMAGED: 'sl6_accueil.return_reason_damaged',
  COUNTERFEIT: 'sl6_accueil.return_reason_counterfeit',
  HIDDEN_DEFECT: 'sl6_accueil.return_reason_hidden_defect',
};

export default function TodoRowCard({ item, onReady, onRespondDispute, onViewReturn, busy, hideAmount }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const locale = i18n.language.startsWith('en') ? 'en' : 'fr';
  const deadline = item.dueAt ? formatRelativeDeadline(item.dueAt) : null;
  const isDispute = item.kind === 'dispute';
  const isReturn = item.kind === 'return';
  const accentColor = isDispute ? p.red : isReturn ? p.amber : p.border;
  const tintedBg = isDispute
    ? (theme === 'dark' ? 'rgba(255,138,128,0.08)' : '#FEF2F2')
    : isReturn
      ? (theme === 'dark' ? 'rgba(240,192,76,0.08)' : '#FFFBEB')
      : p.card;

  const badgeLabel = isDispute
    ? t('sl6_accueil.row_dispute_badge')
    : isReturn
      ? t('sl6_accueil.row_return_badge')
      : t('sl6_accueil.row_prepare_badge');
  const badgeBg = isDispute ? p.red : isReturn ? p.amber : p.cardAlt;
  const badgeColor = isDispute || isReturn ? '#fff' : p.textMuted;

  const reasonLabel = isReturn && item.returnReasonCode
    ? (RETURN_REASON_KEYS[item.returnReasonCode] ? t(RETURN_REASON_KEYS[item.returnReasonCode]) : item.returnReasonCode)
    : null;

  return (
    <div
      className="rounded-2xl p-3.5 mb-3"
      style={{ background: tintedBg, border: `1px solid ${accentColor}` }}
    >
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className="font-bold uppercase rounded-full px-2 py-0.5 flex-shrink-0"
            style={{ fontSize: 9.5, letterSpacing: '.06em', color: badgeColor, background: badgeBg }}
          >
            {badgeLabel}
          </span>
          <span className="truncate" style={{ fontSize: 10.5, color: p.textMuted }}>{orderRef(item.orderId)}</span>
        </span>
        {deadline ? (
          <span className="font-semibold flex-shrink-0" style={{ fontSize: 11.5, color: deadline.overdue ? p.red : p.textMuted }}>
            {deadline.label}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5 mb-1.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: p.cardAlt }}
        >
          {item.productImage ? (
            <img src={item.productImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package size={16} color={p.textMuted} />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate" style={{ fontSize: 13.5, color: p.text }}>
            {item.productTitle || t('sl6_accueil.hero_untitled_product')}
            {item.qty > 1 ? ` ×${item.qty}` : ''}
          </p>
          {!isDispute && !isReturn ? (
            <p style={{ fontSize: 11, color: p.textMuted }}>
              {t('sl6_accueil.row_paid_at', { time: formatClockTime(item.createdAt) })}
            </p>
          ) : null}
        </div>
      </div>

      {!isDispute && !isReturn ? (
        <p className="mb-2" style={{ fontSize: 11.5, color: p.textMuted }}>
          {item.courierName
            ? t('sl6_accueil.hero_courier', { name: item.courierName })
            : t('sl6_accueil.row_courier_unassigned')}
        </p>
      ) : null}

      {isDispute ? (
        <>
          <p className="mb-1.5" style={{ fontSize: 12, color: p.text }}>
            {t('sl6_accueil.row_dispute_reason', { reason: item.disputeReason || t('sl6_accueil.hero_untitled_product') })}
          </p>
          <p className="mb-2" style={{ fontSize: 11.5, color: p.textMuted }}>
            {item.disputeReplied
              ? t('sl6_accueil.row_dispute_mediation')
              : item.dueAt
                ? t('sl6_accueil.row_dispute_deadline', { when: formatAbsoluteDeadline(item.dueAt, locale) })
                : t('sl6_accueil.row_dispute_frozen_no_amount')}
          </p>
        </>
      ) : null}

      {isReturn ? (
        <>
          {reasonLabel ? (
            <p className="mb-1.5" style={{ fontSize: 12, color: p.text }}>
              {t('sl6_accueil.row_return_reason', { reason: reasonLabel })}
            </p>
          ) : null}
          {item.returnStatus === 'RECEIVED' && item.dueAt ? (
            <p className="mb-2" style={{ fontSize: 11.5, color: p.textMuted }}>
              {t('sl6_accueil.row_return_inspection_deadline', { when: formatAbsoluteDeadline(item.dueAt, locale) })}
            </p>
          ) : null}
          {!hideAmount ? (
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: p.textMuted }}>
                {item.returnStatus === 'RECEIVED'
                  ? t('sl6_accueil.row_return_frozen_inspection')
                  : item.returnStatus === 'REQUESTED'
                    ? t('sl6_accueil.row_return_frozen_review')
                    : t('sl6_accueil.row_return_frozen_transit')}
              </span>
              <span className="font-black" style={{ fontSize: 14, color: p.amber }}>{formatXaf(item.keepAmount)}</span>
            </div>
          ) : null}
        </>
      ) : null}

      {isDispute && !hideAmount ? (
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: p.textMuted }}>{t('sl6_accueil.row_dispute_frozen_label')}</span>
          <span className="font-black" style={{ fontSize: 14, color: p.red }}>{formatXaf(item.keepAmount)}</span>
        </div>
      ) : null}

      {!isDispute && !isReturn && !hideAmount ? (
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: p.textMuted }}>{t('sl6_accueil.hero_keep_label')}</span>
          <span className="font-black" style={{ fontSize: 14, color: p.green }}>{formatXaf(item.keepAmount)}</span>
        </div>
      ) : null}

      {isReturn ? (
        <button
          type="button"
          onClick={() => onViewReturn(item)}
          className="w-full mt-2.5 rounded-xl font-semibold"
          style={{ minHeight: 44, fontSize: 13, color: p.text, border: `1px solid ${p.border}` }}
        >
          {t('sl6_accueil.row_return_action')}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => (isDispute ? onRespondDispute(item) : onReady(item.orderId))}
          className="w-full mt-2.5 rounded-xl font-bold disabled:opacity-60"
          style={{
            minHeight: 44,
            fontSize: 13,
            color: isDispute ? '#fff' : p.text,
            background: isDispute ? p.red : p.cardAlt,
          }}
        >
          {isDispute
            ? (item.disputeReplied ? t('sl6_accueil.row_dispute_action_view') : t('sl6_accueil.row_dispute_action'))
            : t('sl6_accueil.row_prepare_action')}
        </button>
      )}
    </div>
  );
}
