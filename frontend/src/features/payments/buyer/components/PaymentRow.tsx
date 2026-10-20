// frontend/src/features/payments/buyer/components/PaymentRow.tsx
// Un paiement dans la liste de l'acheteur.

import { useTranslation } from 'react-i18next';

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
 *
 * Les libelles sont des cles de traduction, resolues au rendu.
 */
const ETATS: Record<string, { dot: string; labelKey: string; hintKey: string }> = {
  SUCCEEDED: { dot: FT.green, labelKey: 'pm2_buyer_row.status_paid', hintKey: '' },
  PROCESSING: {
    dot: FT.amber, labelKey: 'pm2_buyer_row.status_pending', hintKey: 'pm2_buyer_row.hint_enter_code',
  },
  REQUIRES_ACTION: {
    dot: FT.amber, labelKey: 'pm2_buyer_row.status_pending', hintKey: 'pm2_buyer_row.hint_enter_code',
  },
  DRAFT: { dot: FT.faint, labelKey: 'pm2_buyer_row.status_to_pay', hintKey: '' },
  FAILED: { dot: FT.red, labelKey: 'pm2_buyer_row.status_failed', hintKey: '' },
  EXPIRED: {
    dot: FT.faint, labelKey: 'pm2_buyer_row.status_expired', hintKey: 'pm2_buyer_row.hint_expired',
  },
  CANCELLED: { dot: FT.faint, labelKey: 'pm2_buyer_row.status_cancelled', hintKey: '' },
  REFUNDED: { dot: FT.faint, labelKey: 'pm2_buyer_row.status_refunded', hintKey: '' },
  PARTIALLY_REFUNDED: {
    dot: FT.green, labelKey: 'pm2_buyer_row.status_paid', hintKey: 'pm2_buyer_row.hint_partially_refunded',
  },
};

const ETEINTS = ['EXPIRED', 'CANCELLED', 'FAILED'];

export default function PaymentRow({
  payment, onClick, showBorder = true,
}: PaymentRowProps) {
  const { t } = useTranslation();
  const etat = ETATS[payment.status];
  const etatDot = etat?.dot ?? FT.faint;
  const etatLabel = etat ? t(etat.labelKey) : payment.status_label;
  const etatHint = etat?.hintKey ? t(etat.hintKey) : '';

  // Les paiements sans suite restent VISIBLES, en retrait.
  // Un acheteur qui cherche pourquoi sa commande n'est pas passee ne
  // pensera jamais a cocher un filtre.
  const eteint = ETEINTS.includes(payment.status);
  const teinteTexte = eteint ? FT.muted : 'var(--text-primary, #1A1209)';

  const nombreCommandes = payment.orders.length;
  const details = [
    formatShortDate(payment.created_at),
    nombreCommandes > 0
      ? t(nombreCommandes > 1 ? 'pm2_buyer_row.orders_count_plural' : 'pm2_buyer_row.orders_count', { count: nombreCommandes })
      : '',
    etatHint || (payment.payer_msisdn_masked
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
        background: etatDot, flexShrink: 0,
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
        {etatLabel}
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