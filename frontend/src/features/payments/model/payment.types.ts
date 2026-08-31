// frontend/src/features/payments/model/payment.types.ts
// Types miroir des serializers du module financier.
//
// Ecrits A LA MAIN, pas generes. Un type genere suit l'API sans la
// questionner ; ecrit a la main, il documente ce que le frontend attend
// vraiment — et une divergence se voit a la compilation plutot qu'a
// l'execution.

export type PaymentIntentStatus =
  | 'DRAFT' | 'REQUIRES_ACTION' | 'PROCESSING' | 'SUCCEEDED'
  | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type PaymentAttemptStatus =
  | 'CREATED' | 'SENT' | 'PENDING' | 'SUCCEEDED' | 'FAILED'
  | 'EXPIRED' | 'UNKNOWN';

export type MomoOperator = 'MTN' | 'ORANGE';

export interface PaymentAttempt {
  external_reference: string;
  status: PaymentAttemptStatus;
  status_label: string;
  amount_xaf: number;
  payer_operator: string;
  payer_msisdn_masked: string;
  error_code: string;
  created_at: string;
  settled_at: string | null;
}

/**
 * Repartition d'un paiement, vue ACHETEUR.
 *
 * Elle n'expose AUCUN beneficiaire — ni code, ni libelle, ni commission.
 * `PAY-VND-000341` est un identifiant stable : le correler entre deux
 * commandes revelerait qu'elles viennent du meme vendeur.
 */
export interface PaymentBreakdown {
  by_component_xaf: Record<string, number>;
  /** Part qui ne cree aucun sequestre — livraison et services. */
  delivery_and_services_xaf: number;
  total_xaf: number;
  /** Garantie verifiable : les parts somment au total paye. */
  is_complete: boolean;
}

export interface PaymentIntent {
  reference: string;
  status: PaymentIntentStatus;
  status_label: string;
  amount_xaf: number;
  amount_captured_xaf: number;
  amount_refunded_xaf: number;
  currency: string;
  payer_operator: string;
  payer_msisdn_masked: string;
  expires_at: string | null;
  confirmed_at: string | null;
  failure_reason: string;
  breakdown: PaymentBreakdown;
  orders: number[];
  attempts: PaymentAttempt[];
  can_retry: boolean;
  created_at: string;
}

export interface InitiatePaymentPayload {
  payer_msisdn?: string;
  payer_operator?: MomoOperator;
}

export interface PaymentActionResult {
  reference: string;
  status: string;
  message: string;
  requires_action?: boolean;
  payment?: PaymentIntent;
}