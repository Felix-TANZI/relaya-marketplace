// frontend/src/features/vendors/v2/accueil/EarningsCard.tsx
// Carte "Gagné avec BelivaY" — écran "Rien à faire" (ACC-10/A12). Carte "clé
// nuit" : toujours sombre, même en thème clair (même traitement que les
// cartes nuit de VD-03). GET /money/earnings et /payouts/next (VD-D05.A12)
// n'existent pas : approximé via vendorsV2Api.getMoneySummary() (voir
// useAccueilData.ts), repli sur vendorsApi.getPaymentSummary() sinon.

import { useTranslation } from 'react-i18next';
import { DARK } from '../theme';
import { formatXaf } from './format';

interface Props {
  lifetimeEarnedXaf: number | null;
  releasingXaf: number | null;
  nextPayoutLabel: string | null;
  nextPayoutAmountXaf: number | null;
  totalOrdersCount: number | null;
  onSeeTier: () => void;
}

export default function EarningsCard({
  lifetimeEarnedXaf,
  releasingXaf,
  nextPayoutLabel,
  nextPayoutAmountXaf,
  totalOrdersCount,
  onSeeTier,
}: Props) {
  const { t } = useTranslation();
  const p = DARK;

  return (
    <div className="rounded-[20px] p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
      <p className="font-black uppercase mb-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
        {t('sl6_accueil.earnings_title')}
      </p>
      <p className="font-black mb-3" style={{ fontSize: 26, color: p.text }}>
        {formatXaf(lifetimeEarnedXaf ?? 0)}
      </p>

      {releasingXaf ? (
        <p className="mb-2" style={{ fontSize: 12.5, color: p.textMuted }}>
          {t('sl6_accueil.earnings_releasing', { amount: formatXaf(releasingXaf) })}
        </p>
      ) : null}

      <div className="rounded-xl p-3 mb-3" style={{ background: p.cardAlt }}>
        <p style={{ fontSize: 12, color: p.textMuted }}>
          {nextPayoutLabel && nextPayoutAmountXaf !== null
            ? t('sl6_accueil.earnings_next_payout', { date: nextPayoutLabel, amount: formatXaf(nextPayoutAmountXaf) })
            : t('sl6_accueil.earnings_no_next_payout')}
        </p>
      </div>

      <div className="flex items-center gap-3 mb-3" style={{ fontSize: 11.5, color: p.textMuted }}>
        {totalOrdersCount !== null ? (
          <span>{t('sl6_accueil.earnings_recap_orders', { count: totalOrdersCount })}</span>
        ) : null}
        <span>{t('sl6_accueil.earnings_zero_unpaid')}</span>
        <span>{t('sl6_accueil.earnings_zero_transport')}</span>
      </div>

      <button
        type="button"
        onClick={onSeeTier}
        className="font-semibold"
        style={{ fontSize: 12.5, color: '#FF9549', minHeight: 44 }}
      >
        {t('sl6_accueil.earnings_see_tier')}
      </button>
    </div>
  );
}
