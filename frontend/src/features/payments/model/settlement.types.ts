// frontend/src/features/payments/model/settlement.types.ts

export type PayeeType =
  | 'VENDOR' | 'DELIVERY_COMPANY' | 'RELAY_POINT' | 'PLATFORM' | 'BUYER';

export type SettlementStatus =
  | 'DRAFT' | 'CONFIRMED' | 'PAYOUT_REQUESTED' | 'PAID'
  | 'FAILED' | 'CANCELLED';

export type PayoutStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'PAID'
  | 'FAILED' | 'UNKNOWN' | 'REJECTED' | 'CANCELLED' | 'REVERSED';

/**
 * Ce que BelivaY doit a un partenaire.
 *
 * IL N'Y A NI SOLDE, NI BOUTON DE RETRAIT. Un partenaire qui peut reclamer
 * son argent quand il veut ferait de BelivaY un detenteur de monnaie
 * electronique — c'est le regime reglementaire que le modele evite.
 */
export interface AmountDue {
  payee_code: string;
  /** Expose explicitement : deduire le type d'un prefixe serait fragile. */
  payee_type: PayeeType | '';
  payee_type_label: string;
  display_label: string;
  due_xaf: number;
  released_not_settled_xaf: number;
  pending_bonus_xaf: number;
  outstanding_debt_xaf: number;
  in_settlement_xaf: number;
  /** Commandes VIVANTES : l'acheteur peut encore etre rembourse. */
  not_yet_due_xaf: number;
  frozen_xaf: number;
  next_settlement_cycle: string;
  /**
   * Date reelle du prochain reglement.
   *
   * Nulle pour un cycle au seuil : il depend du montant accumule, pas du
   * calendrier. Annoncer une date qui ne tiendrait pas serait pire que ne
   * rien annoncer.
   */
  next_settlement_at: string | null;
  blockers: string[];
}

export interface SettlementLine {
  reference: string;
  component: string;
  order_id: number | null;
  gross_xaf: number;
  commission_xaf: number;
  net_xaf: number;
  released_at: string | null;
}

export interface SettlementPayout {
  reference: string;
  status: PayoutStatus;
  status_label: string;
  amount_xaf: number;
  msisdn_masked: string;
  operator: string;
  settled_at: string | null;
}

export interface SettlementBatch {
  reference: string;
  status: SettlementStatus;
  status_label: string;
  period_start: string;
  period_end: string;
  gross_amount_xaf: number;
  adjustments_xaf: number;
  net_amount_xaf: number;
  is_exceptional: boolean;
  lines: SettlementLine[];
  adjustments: Adjustment[];
  payout: SettlementPayout | null;
  created_at: string;
}

export interface PayoutRequest {
  reference: string;
  status: PayoutStatus;
  status_label: string;
  amount_xaf: number;
  payee_msisdn_masked: string;
  payee_operator: string;
  requested_at: string;
  settled_at: string | null;
}

import type { Adjustment } from './adjustment.types';