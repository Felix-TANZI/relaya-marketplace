// frontend/src/features/payments/hooks/useMyPayments.ts

import { paymentsApi } from '../api/payments.api';
import { refundsApi } from '../api/refunds.api';
import type { PaymentIntent } from '../model/payment.types';
import type { BuyerRefund } from '../model/refund.types';
import { useAsync } from './useAsync';

export function useMyPayments() {
  return useAsync<PaymentIntent[]>(() => paymentsApi.list(), []);
}

export function useMyPayment(reference: string) {
  return useAsync<PaymentIntent>(
    () => paymentsApi.detail(reference), [reference],
  );
}

export function useMyRefunds() {
  return useAsync<BuyerRefund[]>(() => refundsApi.mine(), []);
}