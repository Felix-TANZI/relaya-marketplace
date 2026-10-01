// frontend/src/features/vendors/v2/accueil/HeroCard.tsx
// Carte héros orange — la commande à préparer la plus urgente, et une seule
// (ACC-03). Liens Rupture / Plus de temps / Détail de 44 px (ACC-02/ACC-19).

import { Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette, primaryGradient } from '../theme';
import type { TodoItem } from './types';
import { formatClockTime, formatRelativeDeadline, formatXaf, orderRef } from './format';

interface Props {
  item: TodoItem;
  onReady: (orderId: number) => void;
  onStockout: (orderId: number) => void;
  onExtend: (orderId: number) => void;
  onDetail: (orderId: number) => void;
  busy?: boolean;
  /** Accès Préparation (ACC-26) : mêmes cartes, aucun montant affiché. */
  hideAmount?: boolean;
}

export default function HeroCard({ item, onReady, onStockout, onExtend, onDetail, busy, hideAmount }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const deadline = item.dueAt ? formatRelativeDeadline(item.dueAt) : null;

  return (
    <div
      className="rounded-[20px] p-4 mb-4 text-white"
      style={{ background: primaryGradient(p), boxShadow: '0 16px 32px rgba(204,74,11,0.28)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-black uppercase truncate" style={{ fontSize: 10.5, letterSpacing: '.1em', opacity: 0.85 }}>
            {t('sl6_accueil.hero_label')}
          </span>
          <span className="flex-shrink-0" style={{ fontSize: 10.5, opacity: 0.7 }}>· {orderRef(item.orderId)}</span>
        </span>
        {deadline ? (
          <span
            className="font-bold rounded-full px-2.5 py-1"
            style={{ fontSize: 11.5, background: deadline.overdue ? p.red : 'rgba(255,255,255,0.22)' }}
          >
            {deadline.label}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          {item.productImage ? (
            <img src={item.productImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package size={20} color="#fff" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold truncate" style={{ fontSize: 15.5 }}>
            {item.productTitle || t('sl6_accueil.hero_untitled_product')}
            {item.qty > 1 ? ` ×${item.qty}` : ''}
          </p>
          <p style={{ fontSize: 12, opacity: 0.85 }}>
            {t('sl6_accueil.row_paid_at', { time: formatClockTime(item.createdAt) })}
          </p>
          {item.dueAt ? (
            <p style={{ fontSize: 12, opacity: 0.85 }}>
              {t('sl6_accueil.hero_due_at', { time: formatClockTime(item.dueAt) })}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mb-3" style={{ fontSize: 12, opacity: 0.85 }}>
        {item.courierName
          ? t('sl6_accueil.hero_courier', { name: item.courierName })
          : t('sl6_accueil.row_courier_unassigned')}
      </p>

      {!hideAmount ? (
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 12.5, opacity: 0.85 }}>{t('sl6_accueil.hero_keep_label')}</span>
          <span className="font-black" style={{ fontSize: 18 }}>{formatXaf(item.keepAmount)}</span>
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => onReady(item.orderId)}
        className="w-full rounded-2xl font-bold mb-2 disabled:opacity-60"
        style={{ background: '#fff', color: p.orangeGradientTo, fontSize: 14.5, minHeight: 44 }}
      >
        {t('sl6_accueil.hero_action_ready')}
      </button>

      <div className="flex items-center justify-around" style={{ minHeight: 44 }}>
        <button type="button" onClick={() => onStockout(item.orderId)} className="font-semibold" style={{ fontSize: 12.5, opacity: 0.9 }}>
          {t('sl6_accueil.hero_action_stockout')}
        </button>
        <button type="button" onClick={() => onExtend(item.orderId)} className="font-semibold" style={{ fontSize: 12.5, opacity: 0.9 }}>
          {t('sl6_accueil.hero_action_extend')}
        </button>
        <button type="button" onClick={() => onDetail(item.orderId)} className="font-semibold" style={{ fontSize: 12.5, opacity: 0.9 }}>
          {t('sl6_accueil.hero_action_detail')}
        </button>
      </div>
    </div>
  );
}
