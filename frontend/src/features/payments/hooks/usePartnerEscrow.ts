// frontend/src/features/payments/hooks/usePartnerEscrow.ts

import { escrowApi } from '../api/escrow.api';
import type { PartnerEscrowHold } from '../model/escrow.types';
import { useAsync } from './useAsync';

export function usePartnerEscrow(status?: string) {
  return useAsync<PartnerEscrowHold[]>(
    () => escrowApi.mine(status), [status],
  );
}