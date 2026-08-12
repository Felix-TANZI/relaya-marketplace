// frontend/src/features/payments/hooks/useFinanceDashboard.ts

import { adminFinanceApi } from '../api/admin-finance.api';
import type { FinanceDashboard } from '../model/finance.types';
import { useAsync } from './useAsync';

export function useFinanceDashboard(days = 7, offline = false) {
  return useAsync<FinanceDashboard>(
    () => adminFinanceApi.dashboard({
      days, ...(offline ? { offline: 1 } : {}),
    }),
    [days, offline],
  );
}