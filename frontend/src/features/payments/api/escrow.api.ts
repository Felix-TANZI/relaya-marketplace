// frontend/src/features/payments/api/escrow.api.ts
// Sequestres — protection acheteur et vue partenaire.

import { api } from '@/services/api/client';

import type { BuyerEscrowHold, PartnerEscrowHold } from '../model/escrow.types';

export const escrowApi = {
  /** La promesse de BelivaY sur une commande, vue acheteur. */
  protection: (orderId: number) =>
    api.get<BuyerEscrowHold[]>(
      `/api/payments/v2/me/orders/${orderId}/protection/`,
    ),

  /** Mes sequestres, vue partenaire — avec MA commission. */
  mine: (status?: string) =>
    api.get<PartnerEscrowHold[]>('/api/payments/v2/partner/escrow/', {
      params: status ? { status } : undefined,
    }),
};