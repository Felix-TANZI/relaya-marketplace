// frontend/src/features/payments/buyer/RefundsPage.tsx
// Mes remboursements.
//
// ─────────────────────────────────────────────────────────────────────────
// CHAQUE REMBOURSEMENT PORTE SON EXPLICATION
//
// C'est le champ `explanation` de l'API : « l'argent est retourné sur le
// numéro qui avait payé », « votre remboursement est en cours de
// validation ».
//
// Sans cet ecran, un acheteur verrait un virement arriver sans savoir d'ou.
// Et sans l'explication, il verrait une ligne sans savoir quand.
// ─────────────────────────────────────────────────────────────────────────

import { useMyRefunds } from '../hooks/useMyPayments';
import EmptyState from '../shared/EmptyState';
import Money from '../shared/Money';
import { TONE } from '../model/status';
import { statusMeta } from '../model/status';
import { FT } from '../shared/tokens';
import { formatShortDate } from '../shared/dates';
import type { BuyerRefund } from '../model/refund.types';

function titre(refund: BuyerRefund): string {
  if (refund.orders.length === 1) {
    return `Remboursement de la commande #${refund.orders[0]}`;
  }
  if (refund.orders.length > 1) {
    return `Remboursement de ${refund.orders.length} commandes`;
  }
  return 'Remboursement';
}

function Ligne({ refund, showBorder }: {
  refund: BuyerRefund; showBorder: boolean;
}) {
  const meta = statusMeta('refund', refund.status);
  const abouti = refund.status === 'PAID';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '1rem 1.25rem',
      borderBottom: showBorder ? `0.5px solid ${FT.border}` : 'none',
    }}>
      <span aria-hidden="true" style={{
        width: 7, height: 7, borderRadius: '50%',
        background: TONE[meta.tone].dot, flexShrink: 0, marginTop: 6,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13.5, margin: 0, color: 'var(--text-primary, #1A1209)',
        }}>
          {titre(refund)}
        </p>
        {refund.explanation && (
          <p style={{
            fontSize: 12.5, margin: '4px 0 0', lineHeight: 1.55,
            color: FT.muted,
          }}>
            {refund.explanation}
          </p>
        )}
        <p style={{ fontSize: 11.5, margin: '5px 0 0', color: FT.faint }}>
          {formatShortDate(refund.created_at)}
          {refund.destination_masked && ` · ${refund.destination_masked}`}
        </p>
      </div>

      <span style={{ width: 84, textAlign: 'right' }}>
        <Money
          value={refund.amount_xaf}
          size={16}
          tone={abouti ? 'positive' : 'neutral'}
        />
      </span>
    </div>
  );
}

export default function RefundsPage() {
  const { data, loading, error } = useMyRefunds();
  const remboursements = data ?? [];

  return (
    <div style={{ maxWidth: 760 }}>
      <p style={{
        fontSize: 19, margin: '0 0 4px', color: 'var(--text-primary, #1A1209)',
      }}>
        Mes remboursements
      </p>
      <p style={{ fontSize: 12.5, margin: '0 0 1.25rem', color: FT.muted }}>
        L’argent retourne toujours sur le numéro qui a payé.
      </p>

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title="Impossible d'afficher vos remboursements"
            description={error}
          />
        )}

        {!loading && !error && remboursements.length === 0 && (
          <EmptyState
            icon="arrow-back-up"
            title="Aucun remboursement"
            description={
              'Si une commande vous est remboursée, elle apparaîtra ici avec '
              + 'son suivi.'
            }
          />
        )}

        {!loading && !error && remboursements.map((remboursement, index) => (
          <Ligne
            key={remboursement.reference}
            refund={remboursement}
            showBorder={index < remboursements.length - 1}
          />
        ))}
      </div>
    </div>
  );
}