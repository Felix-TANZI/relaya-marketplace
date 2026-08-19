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
  const segments: MaturitySegment[] = [
    {
      label: 'Sous séquestre',
      hint: 'commandes vivantes',
      amount: treasury.escrow_xaf,
      color: FT.blue,
    },
    {
      label: 'Dettes exigibles',
      hint: 'à verser',
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
            Détenu chez le prestataire
          </p>
          {treasury.provider_total_xaf === null ? (
            <>
              <p style={{ fontSize: 20, margin: 0, color: FT.muted }}>
                indisponible
              </p>
              <p style={{ fontSize: 11.5, margin: '7px 0 0', color: FT.faint }}>
                {treasury.provider_error
                  ? 'La solvabilité ne peut pas être vérifiée.'
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
              Couverture
            </p>
            <Money
              value={couverture}
              size={34}
              tone={couverture >= 0 ? 'positive' : 'negative'}
              showSign
            />
            <p style={{ fontSize: 11.5, margin: '7px 0 0', color: FT.faint }}>
              {couverture >= 0
                ? 'au-delà de ce qui est dû'
                : 'de déficit — geler les versements'}
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
            {formatXaf(treasury.in_transit_xaf)} FCFA en transit — issue
            inconnue, ne jamais rejouer.
          </p>
        </div>
      )}
    </div>
  );
}