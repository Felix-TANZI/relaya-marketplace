// frontend/src/features/payments/api/admin-finance.api.ts
// Administration financiere.
//
// ─────────────────────────────────────────────────────────────────────────
// TOUTES CES ROUTES EXIGENT L'HABILITATION `finance`
//
// `is_staff` ne suffit pas. Jusqu'a la Phase 0, tout membre du personnel
// pouvait approuver un versement de 400 000 FCFA — le seul obstacle etait
// l'inconfort de l'interface d'administration Django.
//
// Une interface soignee supprime cet obstacle. Le controle d'acces a donc
// ete pose AVANT de la construire.
// ─────────────────────────────────────────────────────────────────────────

import { api } from '@/services/api/client';

import type { FinanceAnalytics } from '../model/analytics.types';
import type {
  AdminAdjustmentRow, AdminDiscrepancyRow, AdminEscrowDetail, AdminEscrowRow,
  AdminIntentDetail, AdminIntentRow, AdminPayee, AdminPayoutDetail,
  AdminPayoutRow, AdminRefundRow, AdminRiskAssessment, AdminTrustScore,
  FinanceDashboard, Paginated, TaskHealthEntry,
} from '../model/finance.types';
import type { SettlementBatch } from '../model/settlement.types';

const BASE = '/api/payments/v2/admin';

/**
 * Parametres de liste.
 *
 * Le client HTTP du projet n'accepte PAS `undefined` — il faut donc omettre
 * une cle plutot que lui donner une valeur vide. C'est plus sur : une cle
 * presente avec `undefined` finirait en `?status=undefined` dans l'URL.
 */
export type ListParams = Record<string, string | number | boolean>;

export const adminFinanceApi = {
  // ── Synthese ────────────────────────────────────────────────────────────
  dashboard: (params: ListParams = {}) =>
    api.get<FinanceDashboard>(`${BASE}/dashboard/`, { params }),

  preflight: () =>
    api.get<{ exit_code: number; output: string }>(`${BASE}/preflight/`),

  /**
   * Pilotage — series et tendances.
   *
   * Ecran SEPARE du tableau de bord : celui-ci repond a « comment ca
   * evolue ? », l'autre a « dois-je agir ce matin ? ».
   */
  analytics: (params: ListParams = {}) =>
    api.get<FinanceAnalytics>(`${BASE}/analytics/`, { params }),

  // ── Paiements ───────────────────────────────────────────────────────────
  intents: (params: ListParams = {}) =>
    api.get<Paginated<AdminIntentRow>>(`${BASE}/intents/`, { params }),

  intent: (reference: string) =>
    api.get<AdminIntentDetail>(`${BASE}/intents/${reference}/`),

  /** Le prestataire fait foi, jamais l'etat local. */
  pollIntent: (reference: string) =>
    api.post<{ status: string; message: string }>(
      `${BASE}/intents/${reference}/poll/`,
    ),

  // ── Sequestres ──────────────────────────────────────────────────────────
  escrow: (params: ListParams = {}) =>
    api.get<Paginated<AdminEscrowRow>>(`${BASE}/escrow/`, { params }),

  escrowDetail: (reference: string) =>
    api.get<AdminEscrowDetail>(`${BASE}/escrow/${reference}/`),

  /** Gele CE sequestre, et lui seul. Motif obligatoire. */
  freezeEscrow: (reference: string, reason: string) =>
    api.post<AdminEscrowDetail>(`${BASE}/escrow/${reference}/freeze/`, { reason }),

  unfreezeEscrow: (reference: string, reason: string) =>
    api.post<AdminEscrowDetail>(`${BASE}/escrow/${reference}/unfreeze/`, { reason }),

  /** Liberation FORCEE, hors du cycle normal. */
  releaseEscrow: (reference: string, reason: string) =>
    api.post<AdminEscrowDetail>(`${BASE}/escrow/${reference}/release/`, { reason }),

  // ── Reglements ──────────────────────────────────────────────────────────
  settlements: (params: ListParams = {}) =>
    api.get<Paginated<SettlementBatch>>(`${BASE}/settlements/`, { params }),

  settlement: (reference: string) =>
    api.get<SettlementBatch>(`${BASE}/settlements/${reference}/`),

  buildSettlements: (payload: {
    cycle_key?: string; payee_type?: string; confirm?: boolean;
  } = {}) =>
    api.post<{
      batches: SettlementBatch[]; created: number;
      confirmed: number; errors: string[];
    }>(`${BASE}/settlements/build/`, payload),

  confirmSettlement: (reference: string) =>
    api.post<SettlementBatch>(`${BASE}/settlements/${reference}/confirm/`),

  requestPayout: (reference: string, comment = '') =>
    api.post<AdminPayoutDetail>(
      `${BASE}/settlements/${reference}/request-payout/`, { comment },
    ),

  // ── Versements ──────────────────────────────────────────────────────────
  payouts: (params: ListParams = {}) =>
    api.get<Paginated<AdminPayoutRow>>(`${BASE}/payouts/`, { params }),

  payout: (reference: string) =>
    api.get<AdminPayoutDetail>(`${BASE}/payouts/${reference}/`),

  /** Le demandeur ne peut pas approuver : le service le refuse. */
  approvePayout: (reference: string, comment = '') =>
    api.post<AdminPayoutDetail>(`${BASE}/payouts/${reference}/approve/`, { comment }),

  rejectPayout: (reference: string, reason: string) =>
    api.post<AdminPayoutDetail>(`${BASE}/payouts/${reference}/reject/`, { reason }),

  /** Sur timeout, l'etat devient UNKNOWN — jamais FAILED. */
  executePayout: (reference: string) =>
    api.post<AdminPayoutDetail>(`${BASE}/payouts/${reference}/execute/`),

  // ── Remboursements ──────────────────────────────────────────────────────
  refunds: (params: ListParams = {}) =>
    api.get<Paginated<AdminRefundRow>>(`${BASE}/refunds/`, { params }),

  createRefund: (payload: {
    intent_reference: string; amount_xaf: number;
    reason: string; detail?: string;
  }) => api.post<AdminRefundRow>(`${BASE}/refunds/create/`, payload),

  approveRefund: (reference: string) =>
    api.post<AdminRefundRow>(`${BASE}/refunds/${reference}/approve/`),

  rejectRefund: (reference: string, reason: string) =>
    api.post<AdminRefundRow>(`${BASE}/refunds/${reference}/reject/`, { reason }),

  executeRefund: (reference: string) =>
    api.post<AdminRefundRow>(`${BASE}/refunds/${reference}/execute/`),

  // ── Ajustements ─────────────────────────────────────────────────────────
  adjustments: (params: ListParams = {}) =>
    api.get<Paginated<AdminAdjustmentRow>>(`${BASE}/adjustments/`, { params }),

  createAdjustment: (payload: {
    payee_code: string; direction: string; category: string;
    amount_xaf: number; reason: string; source_order_id?: number | null;
  }) => api.post<AdminAdjustmentRow>(`${BASE}/adjustments/create/`, payload),

  approveAdjustment: (reference: string) =>
    api.post<AdminAdjustmentRow>(`${BASE}/adjustments/${reference}/approve/`),

  // ── Reconciliation ──────────────────────────────────────────────────────
  discrepancies: (params: ListParams = {}) =>
    api.get<Paginated<AdminDiscrepancyRow>>(
      `${BASE}/reconciliation/discrepancies/`, { params },
    ),

  /** Un ecart est QUALIFIE, jamais corrige automatiquement. */
  resolveDiscrepancy: (id: string, resolution: string, note: string) =>
    api.post<AdminDiscrepancyRow>(
      `${BASE}/reconciliation/discrepancies/${id}/resolve/`,
      { resolution, note },
    ),

  runReconciliation: (
    level: 'solvency' | 'escrow' | 'transactional' | 'unknown_payouts',
  ) => api.post<Record<string, unknown>>(`${BASE}/reconciliation/run/${level}/`),

  // ── Risque ──────────────────────────────────────────────────────────────
  // ON MARQUE, ON NE BLOQUE PAS : ces scores alertent, ils ne refusent
  // aucun paiement. Le blocage automatique est desactive par defaut.
  riskAssessments: (params: ListParams = {}) =>
    api.get<Paginated<AdminRiskAssessment>>(
      `${BASE}/risk/assessments/`, { params },
    ),

  trustScores: (params: ListParams = {}) =>
    api.get<Paginated<AdminTrustScore>>(
      `${BASE}/risk/trust-scores/`, { params },
    ),

  // ── Beneficiaires ───────────────────────────────────────────────────────
  payees: (params: ListParams = {}) =>
    api.get<Paginated<AdminPayee>>(`${BASE}/payees/`, { params }),

  payeeDue: (payeeCode: string) =>
    api.get<{ payee: AdminPayee; due: Record<string, unknown> }>(
      `${BASE}/payees/${payeeCode}/due/`,
    ),

  // ── Ordonnanceur ────────────────────────────────────────────────────────
  taskHealth: () =>
    api.get<{
      health: TaskHealthEntry[];
      catalog: Array<Record<string, unknown>>;
      schedule: Array<Record<string, unknown>>;
      groups: Record<string, string>;
    }>(`${BASE}/tasks/health/`),

  runTask: (name: string) =>
    api.post<{ task: string; result: Record<string, unknown> }>(
      `${BASE}/tasks/${name}/run/`,
    ),
};