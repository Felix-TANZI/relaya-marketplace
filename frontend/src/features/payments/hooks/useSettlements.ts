// frontend/src/features/payments/hooks/useSettlements.ts

import { settlementsApi } from '../api/settlements.api';
import { adjustmentsApi } from '../api/adjustments.api';
import type { Adjustment } from '../model/adjustment.types';
import type { PayoutRequest, SettlementBatch } from '../model/settlement.types';
import { useAsync } from './useAsync';

export function useSettlements() {
  return useAsync<SettlementBatch[]>(() => settlementsApi.batches(), []);
}

export function useSettlement(reference: string) {
  return useAsync<SettlementBatch>(
    () => settlementsApi.batch(reference), [reference],
  );
}

export function usePayouts() {
  return useAsync<PayoutRequest[]>(() => settlementsApi.payouts(), []);
}

export function useAdjustments() {
  return useAsync<Adjustment[]>(() => adjustmentsApi.list(), []);
}