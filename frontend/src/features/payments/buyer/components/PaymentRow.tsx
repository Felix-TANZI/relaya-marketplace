// frontend/src/features/payments/buyer/components/PaymentRow.tsx
// Un paiement dans la liste de l'acheteur.

import Money from '../../shared/Money';
import { FT } from '../../shared/tokens';
import { formatShortDate } from '../../shared/dates';
import type { PaymentIntent } from '../../model/payment.types';

interface PaymentRowProps {
  payment: PaymentIntent;
  onClick?: () => void;
  showBorder?: boolean;
}

/**
 * Les etats acheteur, avec le vocabulaire d'un acheteur.
 *
 * « SUCCEEDED » devient « payé », « REQUIRES_ACTION » devient « composez
 * votre code » — la phrase qui dit quoi faire, pas celle qui decrit l'etat.
 */
const ETATS: Record<string, { dot: string; label: string; hint: string }> = {
  SUCCEEDED: { dot: FT.green, label: 'payé', hint: '' },
  PROCESSING: {
    dot: FT.amber, label: 'en attente', hint: 'composez votre code',
  },
  REQUIRES_ACTION: {
    dot: FT.amber, label: 'en attente', hint: 'composez votre code',
  },
  DRAFT: { dot: FT.faint, label: 'à payer', hint: '' },
  FAILED: { dot: FT.red, label: 'échoué', hint: '' },
  EXPIRED: {
    dot: FT.faint, label: 'expiré', hint: 'expiré sans confirmation',
  },
  CANCELLED: { dot: FT.faint, label: 'annulé', hint: '' },
  REFUNDED: { dot: FT.faint, label: 'remboursé', hint: '' },
  PARTIALLY_REFUNDED: {
    dot: FT.green, label: 'payé', hint: 'partiellement remboursé',
  },
};

const ETEINTS = ['EXPIRED', 'CANCELLED', 'FAILED'];

export default function PaymentRow({
  payment, onClick, showBorder = true,
}: PaymentRowProps) {
  const etat = ETATS[payment.status]
    ?? { dot: FT.faint, label: payment.status_label, hint: '' };

  // Les paiements sans suite restent VISIBLES, en retrait.
  // Un acheteur qui cherche pourquoi sa commande n'est pas passee ne
  // pensera jamais a cocher un filtre.
  const eteint = ETEINTS.includes(payment.status);
  const teinteTexte = eteint ? FT.muted : 'var(--text-primary, #1A1209)';

  const nombreCommandes = payment.orders.length;
  const details = [
    formatShortDate(payment.created_at),
    nombreCommandes > 0
      ? `${nombreCommandes} commande${nombreCommandes > 1 ? 's' : ''}`
      : '',
    etat.hint || (payment.payer_msisdn_masked
      ? `${payment.payer_operator} ${payment.payer_msisdn_masked}`
      : ''),
  ].filter(Boolean).join(' · ');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 1.25rem',
        borderBottom: showBorder ? `0.5px solid ${FT.border}` : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span aria-hidden="true" style={{
        width: 7, height: 7, borderRadius: '50%',
        background: etat.dot, flexShrink: 0,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, margin: 0, color: teinteTexte,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {payment.reference}
        </p>
        <p style={{ fontSize: 11.5, margin: '2px 0 0', color: FT.faint }}>
          {details}
        </p>
      </div>

      <span style={{
        fontSize: 11.5, width: 80, textAlign: 'right', color: FT.muted,
      }}>
        {etat.label}
      </span>

      <span style={{ width: 82, textAlign: 'right' }}>
        <Money
          value={payment.amount_xaf}
          size={15}
          tone={eteint ? 'muted' : 'neutral'}
        />
      </span>
    </div>
  );
}