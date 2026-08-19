// frontend/src/features/payments/payee/components/AmountDueCard.tsx
// L'ecran d'accueil financier d'un partenaire.
//
// ─────────────────────────────────────────────────────────────────────────
// CE COMPOSANT REMPLACE UN BOUTON DE RETRAIT
//
// C'est le point le plus delicat du chantier : annoncer une bonne
// nouvelle — « BelivaY vous doit » — tout en retirant un bouton auquel les
// vendeurs sont habitues.
//
// La reponse n'est pas d'expliquer pourquoi le retrait a disparu, mais de
// rendre le versement automatique plus rassurant qu'il ne l'etait : un
// montant, une date, un compte a rebours, et le numero vers lequel l'argent
// partira.
//
// IL N'Y A NI SOLDE NI BOUTON DE RETRAIT, et ce n'est pas un manque : un
// partenaire qui peut reclamer son argent quand il veut ferait de BelivaY
// un detenteur de monnaie electronique.
// ─────────────────────────────────────────────────────────────────────────

import MaturityBar from '../../shared/MaturityBar';
import type { MaturitySegment } from '../../shared/MaturityBar';
import { MATURITY_COLORS } from '../../shared/format';
import { FT } from '../../shared/tokens';
import { formatLongDate, relativeDays } from '../../shared/dates';
import type { AmountDue } from '../../model/settlement.types';
import BlockersNotice from './BlockersNotice';

interface AmountDueCardProps {
  due: AmountDue;
  msisdnMasked?: string;
  operator?: string;
  onResolveBlockers?: () => void;
}

export default function AmountDueCard({
  due, msisdnMasked, operator, onResolveBlockers,
}: AmountDueCardProps) {
  const bloque = due.blockers.length > 0;
  // La date vient desormais de l'API. Elle reste nulle pour un cycle au
  // seuil — on retombe alors sur la cle du cycle.
  const prochainVersement = due.next_settlement_at;

  const segments: MaturitySegment[] = [
    {
      label: 'Sous séquestre',
      hint: 'encore remboursable',
      amount: due.not_yet_due_xaf,
      color: MATURITY_COLORS.held,
    },
    {
      label: 'En règlement',
      hint: 'lot en préparation',
      amount: due.in_settlement_xaf,
      color: MATURITY_COLORS.settling,
    },
    {
      label: 'Acquis',
      hint: due.outstanding_debt_xaf > 0
        ? `dont ${due.outstanding_debt_xaf.toLocaleString('fr-FR')} retenus`
        : 'à verser au prochain cycle',
      amount: due.released_not_settled_xaf + due.pending_bonus_xaf,
      color: MATURITY_COLORS.earned,
    },
  ];

  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, padding: '1.75rem',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '1.75rem',
        gap: 20, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{
            fontSize: 11, margin: '0 0 10px', letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-muted, #B4B2A9)',
          }}>
            Disponible au prochain versement
          </p>
          <p style={{
            fontSize: 44, fontWeight: 500, margin: 0, lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary, #1A1209)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {Math.round(due.due_xaf).toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')}
          </p>
          <p style={{ fontSize: 13, margin: '8px 0 0', color: FT.muted }}>
            FCFA
          </p>
        </div>

        {bloque ? (
          <BlockersNotice
            blockers={due.blockers}
            onResolve={onResolveBlockers}
          />
        ) : (
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: 11, margin: '0 0 6px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text-muted, #B4B2A9)',
            }}>
              Versement
            </p>
            <p style={{
              fontSize: 15, margin: 0, color: 'var(--text-primary, #1A1209)',
            }}>
              {formatLongDate(prochainVersement) || due.next_settlement_cycle}
            </p>
            {prochainVersement && (
              <p style={{ fontSize: 12, margin: '4px 0 0', color: FT.coral }}>
                {relativeDays(prochainVersement)}
              </p>
            )}
            {msisdnMasked && (
              // Un partenaire doit voir vers OU part l'argent AVANT le
              // versement, pas apres.
              <p style={{ fontSize: 11.5, margin: '10px 0 0', color: FT.muted }}>
                {msisdnMasked}{operator ? ` · ${operator}` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      <MaturityBar segments={segments} />
    </div>
  );
}