// frontend/src/features/payments/api/refunds.api.ts
// Remboursements — espace acheteur.

import { api } from '@/services/api/client';

import type { BuyerRefund } from '../model/refund.types';

export const refundsApi = {
  /**
   * Mes remboursements.
   *
   * Sans cet ecran, un acheteur verrait son argent revenir sans
   * explication.
   */
  mine: () => api.get<BuyerRefund[]>('/api/payments/v2/me/refunds/'),
};