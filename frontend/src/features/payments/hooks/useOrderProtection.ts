// frontend/src/features/payments/hooks/useOrderProtection.ts

import { escrowApi } from '../api/escrow.api';
import type { BuyerEscrowHold } from '../model/escrow.types';
import { useAsync } from './useAsync';

/**
 * L'etat du sequestre qui protege une commande.
 *
 * Retourne une liste vide — sans erreur — pour une commande anterieure au
 * module financier. Afficher une erreur sur une vieille commande serait
 * inquietant sans raison.
 */
export function useOrderProtection(orderId: number | null) {
  return useAsync<BuyerEscrowHold[]>(
    () => (orderId ? escrowApi.protection(orderId) : Promise.resolve([])),
    [orderId],
  );
}