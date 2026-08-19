// frontend/src/features/payments/model/refund.types.ts

export type RefundStatus =
  | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'PAID'
  | 'FAILED' | 'UNKNOWN' | 'REJECTED';

/**
 * Remboursement vu par l'ACHETEUR.
 *
 * Sans cet ecran, il verrait son argent revenir sans explication.
 * `explanation` porte une phrase adaptee a chaque etape.
 */
export interface BuyerRefund {
  reference: string;
  payment_reference: string;
  amount_xaf: number;
  reason: string;
  reason_label: string;
  status: RefundStatus;
  status_label: string;
  /** Le retour va vers le numero qui a PAYE, jamais ailleurs. */
  destination_masked: string;
  orders: number[];
  explanation: string;
  created_at: string;
}