// frontend/src/features/payments/model/escrow.types.ts

export type EscrowStatus =
  | 'PENDING' | 'HELD' | 'RELEASE_SCHEDULED' | 'RELEASED'
  | 'FROZEN' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';

export type EconomicComponent =
  | 'GOODS' | 'TRANSPORT' | 'RELAY_HANDLING' | 'INSURANCE' | 'PLATFORM_FEE';

/**
 * Sequestre vu par l'ACHETEUR.
 *
 * Ni beneficiaire, ni commission, ni net : c'est la promesse de BelivaY,
 * pas la comptabilite du vendeur.
 */
export interface BuyerEscrowHold {
  reference: string;
  component: EconomicComponent;
  component_label: string;
  order_id: number | null;
  status: EscrowStatus;
  status_label: string;
  gross_amount_xaf: number;
  auto_confirm_at: string | null;
  release_at: string | null;
  dispute_window_ends_at: string | null;
  protection: {
    funds_protected: boolean;
    message: string;
  };
}

/** Sequestre vu par le PARTENAIRE : il voit SA commission, c'est la sienne. */
export interface PartnerEscrowHold {
  reference: string;
  component: EconomicComponent;
  component_label: string;
  order_id: number | null;
  status: EscrowStatus;
  status_label: string;
  gross_amount_xaf: number;
  commission_xaf: number;
  net_amount_xaf: number;
  payable_xaf: number;
  release_trigger: string;
  auto_confirm_at: string | null;
  release_at: string | null;
  frozen_reason: string;
  settlement_batch_ref: string;
  created_at: string;
}