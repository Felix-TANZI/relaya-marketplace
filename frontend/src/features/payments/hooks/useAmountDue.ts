// frontend/src/features/payments/hooks/useAmountDue.ts

import { settlementsApi } from '../api/settlements.api';
import type { AmountDue } from '../model/settlement.types';
import { useAsync } from './useAsync';

export function useAmountDue() {
  return useAsync<AmountDue>(() => settlementsApi.amountDue(), []);
}