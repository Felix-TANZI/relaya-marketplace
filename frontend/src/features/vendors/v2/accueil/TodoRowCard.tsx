// frontend/src/features/vendors/v2/accueil/TodoRowCard.tsx
// Carte "douce" (non héros) de la file à faire — commandes à préparer
// restantes, litiges gelés (ACC-02/ACC-04/ACC-05). Un seul montant, libellé à
// gauche, montant à droite (ACC-17).

import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import type { TodoItem } from './types';
import { formatRelativeDeadline, formatXaf } from './format';

interface Props {
  item: TodoItem;
  onReady: (orderId: number) => void;
  onRespondDispute: (orderId: number) => void;
  busy?: boolean;
  /** Accès Préparation (ACC-26) : mêmes cartes, aucun montant affiché. */
  hideAmount?: boolean;
}

export default function TodoRowCard({ item, onReady, onRespondDispute, busy, hideAmount }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const deadline = item.dueAt ? formatRelativeDeadline(item.dueAt) : null;
  const isDispute = item.kind === 'dispute';

  return (
    <div
      className="rounded-2xl p-3.5 mb-3"
      style={{
        background: isDispute ? (theme === 'dark' ? 'rgba(255,138,128,0.08)' : '#FEF2F2') : p.card,
        border: `1px solid ${isDispute ? p.red : p.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="font-bold uppercase rounded-full px-2 py-0.5"
          style={{
            fontSize: 9.5,
            letterSpacing: '.06em',
            color: isDispute ? '#fff' : p.textMuted,
            background: isDispute ? p.red : p.cardAlt,
          }}
        >
          {isDispute ? t('sl6_accueil.row_dispute_badge') : t('sl6_accueil.row_prepare_badge')}
        </span>
        {deadline ? (
          <span className="font-semibold" style={{ fontSize: 11.5, color: deadline.overdue ? p.red : p.textMuted }}>
            {deadline.label}
          </span>
        ) : null}
      </div>

      <p className="font-bold truncate mb-1" style={{ fontSize: 13.5, color: p.text }}>
        {item.productTitle || t('sl6_accueil.hero_untitled_product')}
        {item.qty > 1 ? ` ×${item.qty}` : ''}
      </p>

      {isDispute ? (
        <p className="mb-2" style={{ fontSize: 12, color: p.textMuted }}>
          {hideAmount
            ? t('sl6_accueil.row_dispute_frozen_no_amount')
            : t('sl6_accueil.row_dispute_frozen', { amount: formatXaf(item.keepAmount) })}
        </p>
      ) : null}

      {!isDispute && !hideAmount ? (
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: p.textMuted }}>{t('sl6_accueil.hero_keep_label')}</span>
          <span className="font-black" style={{ fontSize: 14, color: p.green }}>{formatXaf(item.keepAmount)}</span>
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => (isDispute ? onRespondDispute(item.orderId) : onReady(item.orderId))}
        className="w-full mt-2.5 rounded-xl font-bold disabled:opacity-60"
        style={{
          minHeight: 44,
          fontSize: 13,
          color: isDispute ? '#fff' : p.text,
          background: isDispute ? p.red : p.cardAlt,
        }}
      >
        {isDispute ? t('sl6_accueil.row_dispute_action') : t('sl6_accueil.row_prepare_action')}
      </button>
    </div>
  );
}
