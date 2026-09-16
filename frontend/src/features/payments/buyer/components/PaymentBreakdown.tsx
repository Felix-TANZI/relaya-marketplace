// frontend/src/features/payments/buyer/components/PaymentBreakdown.tsx
// Ce que l'acheteur a paye, et pour quoi.
//
// ─────────────────────────────────────────────────────────────────────────
// DEUX LIGNES, PAS PLUS
//
// L'anonymat interdit d'exposer un beneficiaire — un code comme
// PAY-VND-000341 est stable, le correler entre deux commandes revelerait
// qu'elles viennent du meme vendeur.
//
// Mais l'acheteur a le droit de savoir ce qu'il paie. Ses articles, et le
// reste. Aller plus loin revelerait la commission du vendeur — que l'API ne
// renvoie d'ailleurs pas de ce cote.
// ─────────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next';

import Money from '../../shared/Money';
import { FT } from '../../shared/tokens';
import type { PaymentBreakdown as Breakdown } from '../../model/payment.types';

interface PaymentBreakdownProps {
  breakdown: Breakdown;
}

/** Cles de traduction des composants economiques, cote acheteur. */
const LIBELLES: Record<string, string> = {
  GOODS: 'pm2_buyer_breakdown.component_goods',
  TRANSPORT: 'pm2_buyer_breakdown.component_transport',
  RELAY_HANDLING: 'pm2_buyer_breakdown.component_relay_handling',
  INSURANCE: 'pm2_buyer_breakdown.component_insurance',
};

export default function PaymentBreakdown({
  breakdown,
}: PaymentBreakdownProps) {
  const { t } = useTranslation();
  const lignes = Object.entries(breakdown.by_component_xaf)
    .filter(([, montant]) => montant > 0);

  const reliquat = breakdown.delivery_and_services_xaf;

  return (
    <>
      <div style={{ padding: '1.25rem' }}>
        {lignes.map(([composant, montant], index) => (
          <div
            key={composant}
            style={{
              display: 'flex', justifyContent: 'space-between',
              padding: index === 0 ? '0 0 11px' : '11px 0',
              borderBottom: `0.5px solid ${FT.border}`,
            }}
          >
            <span style={{ fontSize: 12.5, color: FT.muted }}>
              {LIBELLES[composant] ? t(LIBELLES[composant]) : composant}
            </span>
            <Money value={montant} size={13.5} />
          </div>
        ))}

        {reliquat > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '11px 0 0',
          }}>
            <span style={{ fontSize: 12.5, color: FT.muted }}>
              {t('pm2_buyer_breakdown.delivery_and_services')}
            </span>
            <Money value={reliquat} size={13.5} />
          </div>
        )}
      </div>

      <div style={{
        padding: '0.75rem 1.25rem', borderTop: `0.5px solid ${FT.border}`,
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', background: 'var(--surface-1, #F5F0E8)',
      }}>
        <span style={{
          fontSize: 12, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: FT.muted,
        }}>
          {t('pm2_buyer_breakdown.total_paid')}
        </span>
        <Money value={breakdown.total_xaf} size={16} showCurrency />
      </div>
    </>
  );
} 