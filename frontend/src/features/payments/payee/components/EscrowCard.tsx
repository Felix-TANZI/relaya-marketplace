// frontend/src/features/payments/payee/components/EscrowCard.tsx
// Un sequestre, vu par le partenaire.

import Money from '../../shared/Money';
import StatusBadge from '../../shared/StatusBadge';
import { FT } from '../../shared/tokens';
import { formatShortDate, relativeDays } from '../../shared/dates';
import type { PartnerEscrowHold } from '../../model/escrow.types';

interface EscrowCardProps {
  hold: PartnerEscrowHold;
  showBorder?: boolean;
}

export default function EscrowCard({
  hold, showBorder = true,
}: EscrowCardProps) {
  /**
   * L'echeance qui compte depend de l'etat.
   *
   * Un sequestre en garde attend une confirmation ; un sequestre declenche
   * attend sa date de liberation. Afficher les deux brouillerait le seul
   * message utile : quand cet argent devient exigible.
   */
  const echeance = hold.status === 'RELEASE_SCHEDULED'
    ? hold.release_at
    : hold.auto_confirm_at;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '14px 1.25rem',
      borderBottom: showBorder ? `0.5px solid ${FT.border}` : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13.5, margin: 0, color: 'var(--text-primary, #1A1209)',
        }}>
          {hold.order_id
            ? `Commande #${hold.order_id}`
            : hold.component_label}
        </p>

        <div style={{ marginTop: 5 }}>
          <StatusBadge
            domain="escrow"
            status={hold.status}
            label={hold.status_label}
            size="sm"
          />
        </div>

        {hold.frozen_reason && (
          <p style={{
            fontSize: 11.5, margin: '5px 0 0', color: FT.redD, lineHeight: 1.5,
          }}>
            {hold.frozen_reason}
          </p>
        )}

        {echeance && !hold.frozen_reason && (
          <p style={{ fontSize: 11.5, margin: '4px 0 0', color: FT.faint }}>
            {hold.status === 'RELEASE_SCHEDULED' ? 'Libération' : 'Confirmation'}
            {' '}{relativeDays(echeance)} · {formatShortDate(echeance)}
          </p>
        )}
      </div>

      <div style={{ textAlign: 'right' }}>
        <Money value={hold.payable_xaf} size={15} />
        {hold.commission_xaf > 0 && (
          <p style={{ fontSize: 11, margin: '2px 0 0', color: FT.faint }}>
            après {hold.commission_xaf.toLocaleString('fr-FR')} de commission
          </p>
        )}
      </div>
    </div>
  );
}