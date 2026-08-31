// frontend/src/features/payments/api/settlements.api.ts
// Reglements — espace partenaire.

import { api } from '@/services/api/client';

import type {
  AmountDue, PayoutRequest, SettlementBatch,
} from '../model/settlement.types';

const BASE = '/api/payments/v2/partner';

export const settlementsApi = {
  /**
   * Ce que BelivaY me doit.
   *
   * Il n'existe AUCUN endpoint de retrait : le partenaire est regle par
   * cycle, jamais a la demande.
   */
  amountDue: () => api.get<AmountDue>(`${BASE}/due/`),

  batches: () => api.get<SettlementBatch[]>(`${BASE}/settlements/`),

  batch: (reference: string) =>
    api.get<SettlementBatch>(`${BASE}/settlements/${reference}/`),

  payouts: () => api.get<PayoutRequest[]>(`${BASE}/payouts/`),
};