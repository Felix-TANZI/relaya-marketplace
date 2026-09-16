// frontend/src/features/payments/admin/components/TreasuryCard.tsx
// Detenons-nous ce que nous devons ?
//
// ─────────────────────────────────────────────────────────────────────────
// LA COUVERTURE EST LE SEUL CHIFFRE EN COULEUR
//
// C'est la question de solvabilite. Verte, tout va bien ; rouge, il faut
// geler les versements. Aucun autre nombre de cet ecran n'a besoin de
// crier.
// ─────────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next';

import MaturityBar from '../../shared/MaturityBar';
import type { MaturitySegment } from '../../shared/MaturityBar';
import Money from '../../shared/Money';
import { FT } from '../../shared/tokens';
import { formatXaf } from '../../shared/format';
import type { Treasury } from '../../model/finance.types';

interface TreasuryCardProps {
  treasury: Treasury;
}

export default function TreasuryCard({ treasury }: TreasuryCardProps) {
  const { t } = useTranslation();
  const segments: MaturitySegment[] = [
    {
      label: t('pm1_treasury_card.escrow_label'),
      hint: t('pm1_treasury_card.escrow_hint'),
      amount: treasury.escrow_xaf,
      color: FT.blue,
    },
    {
      label: t('pm1_treasury_card.payables_label'),
      hint: t('pm1_treasury_card.payables_hint'),
      amount: treasury.payables_xaf,
      color: FT.amber,
    },
  ];

  const operateurs = Object.entries(treasury.provider_per_operator ?? {})
    .filter(([, montant]) => montant > 0)
    .map(([nom, montant]) => `${nom} ${formatXaf(montant)}`)
    .join(' · ');

  const couverture = treasury.coverage_xaf;

  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, padding: '1.5rem',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '1.5rem',
        gap: 24, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{
            fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em',
            textTransform: 'uppercase', color: FT.faint,
          }}>
            {t('pm1_treasury_card.held_by_provider')}
          </p>
          {treasury.provider_total_xaf === null ? (
            <>
              <p style={{ fontSize: 20, margin: 0, color: FT.muted }}>
                {t('pm1_treasury_card.unavailable')}
              </p>
              <p style={{ fontSize: 11.5, margin: '7px 0 0', color: FT.faint }}>
                {treasury.provider_error
                  ? t('pm1_treasury_card.solvency_unverifiable')
                  : ''}
              </p>
            </>
          ) : (
            <>
              <Money value={treasury.provider_total_xaf} size={34} />
              {operateurs && (
                <p style={{ fontSize: 11.5, margin: '7px 0 0', color: FT.faint }}>
                  {operateurs}
                </p>
              )}
            </>
          )}
        </div>

        {couverture !== null && (
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: FT.faint,
            }}>
              {t('pm1_treasury_card.coverage')}
            </p>
            <Money
              value={couverture}
              size={34}
              tone={couverture >= 0 ? 'positive' : 'negative'}
              showSign
            />
            <p style={{ fontSize: 11.5, margin: '7px 0 0', color: FT.faint }}>
              {couverture >= 0
                ? t('pm1_treasury_card.coverage_positive')
                : t('pm1_treasury_card.coverage_negative')}
            </p>
          </div>
        )}
      </div>

      <MaturityBar segments={segments} />

      {treasury.in_transit_xaf > 0 && (
        <div style={{
          marginTop: '1.25rem', paddingTop: '1rem',
          borderTop: `0.5px solid ${FT.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span aria-hidden="true" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: FT.red, flexShrink: 0,
          }} />
          <p style={{ fontSize: 12.5, margin: 0, color: FT.muted, flex: 1 }}>
            {t('pm1_treasury_card.in_transit', { amount: formatXaf(treasury.in_transit_xaf) })}
          </p>
        </div>
      )}
    </div>
  );
}