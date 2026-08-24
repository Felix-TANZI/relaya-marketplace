// frontend/src/features/payments/model/finance.types.ts
// Types de l'administration financiere.

import type { Adjustment } from './adjustment.types';
import type { EscrowStatus, PartnerEscrowHold } from './escrow.types';
import type { PayeeType, PayoutStatus } from './settlement.types';
import type { PaymentAttempt, PaymentIntentStatus } from './payment.types';
import type { RefundStatus } from './refund.types';

export type Severity = 'CRITIQUE' | 'ALERTE' | 'ATTENTION' | 'NORMAL';

/**
 * Un point d'attention.
 *
 * `action` est ce qui distingue une alerte utile d'une alerte ignoree :
 * une exploitation doit savoir QUOI FAIRE, pas seulement que ca va mal.
 */
export interface FinanceSignal {
  gravite: Severity;
  titre: string;
  detail: string;
  action: string;
}

export interface Treasury {
  ledger_treasury_xaf: number;
  in_transit_xaf: number;
  escrow_xaf: number;
  payables_xaf: number;
  third_party_liabilities_xaf: number;
  provider_total_xaf: number | null;
  provider_per_operator: Record<string, number>;
  coverage_xaf: number | null;
  provider_error?: string;
}

export interface TaskHealthEntry {
  task_name: string;
  critical: boolean;
  stale: boolean;
  alert: boolean;
  last_success_at: string | null;
  last_status: string;
}

export interface FinanceDashboard {
  generated_at: string;
  treasury: Treasury;
  escrow: {
    by_status: Record<string, { count: number; total_xaf: number }>;
    due_for_auto_confirm: number;
    due_for_release: number;
    frozen_xaf: number;
  };
  settlements: {
    batches_by_status: Record<string, { count: number; total_xaf: number }>;
    payouts_by_status: Record<string, { count: number; total_xaf: number }>;
    awaiting_approval: number;
    unknown_payouts: number;
    unknown_xaf: number;
    exceptional: {
      share_by_amount_percent: number;
      alert_threshold_percent: number;
      alert: boolean;
      total_batches: number;
    };
  };
  integrity: {
    trial_balance: number;
    invariants_ok: boolean;
    must_freeze_payouts: boolean;
    violations: Array<{
      code: string; name: string; detail: string; blocking: boolean;
    }>;
    discrepancies: {
      open_total: number;
      critical_open: number;
      total_gap_xaf: number;
    };
  };
  scheduler: {
    tasks: TaskHealthEntry[];
    stale: string[];
    critical_alerts: string[];
    never_run: boolean;
  };
  activity: {
    period_days: number;
    intents_by_status: Record<string, number>;
    intents_total: number;
    collected_xaf: number;
    pending: number;
  };
  signals: FinanceSignal[];
  worst: Severity;
}

/** Ce que signifie un etat, et ce qu'il faut en faire. */
export interface Guidance {
  meaning: string;
  action: string;
}

export interface PayeeBrief {
  payee_code: string;
  payee_type: PayeeType;
  display_label: string;
}

export interface Paginated<T> {
  count: number;
  page: number;
  pages: number;
  page_size: number;
  results: T[];
}

export interface AdminIntentRow {
  reference: string;
  status: PaymentIntentStatus;
  status_label: string;
  amount_xaf: number;
  amount_captured_xaf: number;
  amount_refunded_xaf: number;
  payer_operator: string;
  payer_msisdn_masked: string;
  payer_relationship: string;
  buyer_username: string;
  risk_score: number;
  created_at: string;
  confirmed_at: string | null;
}

export interface AdminIntentDetail extends AdminIntentRow {
  idempotency_key: string;
  correlation_id: string;
  expires_at: string | null;
  failure_reason: string;
  distribution_plan: Record<string, unknown>;
  attempts: PaymentAttempt[];
  orders: number[];
  escrow_holds: AdminEscrowRow[];
  needs_reallocation: boolean;
}

export interface AdminEscrowRow extends PartnerEscrowHold {
  payee: PayeeBrief;
  refunded_amount_xaf: number;
  guidance: Guidance;
}

export interface AdminEscrowDetail extends AdminEscrowRow {
  intent_reference: string;
  policy_snapshot: Record<string, unknown>;
  dispute_window_ends_at: string | null;
  triggered_at: string | null;
  released_at: string | null;
  frozen_at: string | null;
  /**
   * Les autres sequestres du meme paiement.
   *
   * Geler celui-ci ne gele PAS les autres — l'ecran doit le montrer pour
   * eviter qu'un operateur croie bloquer tout le paiement.
   */
  siblings: Array<{
    reference: string;
    component: string;
    order_id: number | null;
    status: EscrowStatus;
    payee_code: string;
    net_amount_xaf: number;
  }>;
}

export interface AdminPayoutRow {
  reference: string;
  payee: PayeeBrief;
  status: PayoutStatus;
  status_label: string;
  amount_xaf: number;
  psp_fee_xaf: number;
  required_approvals: number;
  approvals_count: number;
  is_fully_approved: boolean;
  payee_operator: string;
  payee_msisdn_masked: string;
  provider_code: string;
  error_code: string;
  guidance: Guidance;
  requested_at: string;
  settled_at: string | null;
}

export interface AdminPayoutDetail extends AdminPayoutRow {
  provider_external_reference: string;
  provider_reference: string;
  provider_status_raw: string;
  error_message: string;
  response_payload: Record<string, unknown>;
  justification: string;
  batch_reference: string;
  approvals: Array<{ by: string; at: string; comment: string }>;
  requested_by_username: string;
  executed_at: string | null;
}

export interface AdminRefundRow {
  reference: string;
  intent_reference: string;
  amount_xaf: number;
  reason: string;
  reason_label: string;
  detail: string;
  status: RefundStatus;
  status_label: string;
  payer_msisdn_masked: string;
  requested_by_username: string;
  approved_by_username: string;
  approved_at: string | null;
  payout_reference: string;
  guidance: Guidance;
  created_at: string;
}

export interface AdminAdjustmentRow extends Adjustment {
  payee: PayeeBrief;
  evidence_url: string;
  source_order_id: number | null;
  source_event: string;
  source_contract: string;
  max_offset_percent: string | null;
  created_by_username: string;
  approved_by_username: string;
  approved_at: string | null;
}

export interface AdminDiscrepancyRow {
  id: string;
  run_reference: string;
  kind: string;
  kind_label: string;
  severity: string;
  severity_label: string;
  subject_type: string;
  subject_ref: string;
  provider_reference: string;
  expected_xaf: number;
  observed_xaf: number;
  gap_xaf: number;
  detail: string;
  evidence: Record<string, unknown>;
  suggested_action: string;
  resolution: string;
  resolution_label: string;
  resolution_note: string;
  resolved_by_username: string;
  resolved_at: string | null;
  created_at: string;
}


export interface AdminRiskSignal {
  kind: string;
  severity: string;
  weight: number;
  detail: string;
  evidence: Record<string, unknown>;
}

export interface AdminRiskAssessment {
  id: string;
  subject_type: string;
  subject_ref: string;
  score: number;
  decision: string;
  decision_label: string;
  note: string;
  policy_key: string;
  signals: AdminRiskSignal[];
  overridden_by_username: string;
  override_reason: string;
  overridden_at: string | null;
  created_at: string;
}

export interface AdminTrustScore {
  id: string;
  payee: PayeeBrief;
  score: number;
  previous_score: number;
  delta: number;
  orders_count: number;
  disputes_count: number;
  late_count: number;
  cancelled_count: number;
  breakdown: Record<string, unknown>;
  window_days: number;
  computed_at: string;
}

export interface AdminPayee {
  payee_code: string;
  payee_type: PayeeType;
  payee_type_label: string;
  display_label: string;
  momo_operator: string;
  momo_number_masked: string;
  momo_changed_at: string | null;
  kyc_status: string;
  payout_hold: boolean;
  payout_hold_reason: string;
  settlement_cycle_key: string;
  is_active: boolean;
  /** Ce qui empeche un versement : KYC, refroidissement, blocage. */
  blockers: string[];
  created_at: string;
}