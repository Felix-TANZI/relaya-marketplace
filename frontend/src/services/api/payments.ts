import { http } from "@/services/api/http";

export type PaymentProvider = "MTN_MOMO" | "ORANGE_MONEY";

export type PaymentInitPayload = {
  order_id: number;
  provider: PaymentProvider;
  phone: string;
};

export type PaymentTransaction = {
  id: string; // uuid
  order: number;
  provider: PaymentProvider;
  status: "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  amount_xaf: number;
  payer_phone: string;
  created_at: string;
};

export function initPayment(payload: PaymentInitPayload): Promise<PaymentTransaction> {
  // V1 mock : crée une transaction INITIATED
  return http<PaymentTransaction>("/api/payments/init/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listPaymentsByOrder(orderId: number): Promise<PaymentTransaction[]> {
  return http<PaymentTransaction[]>(`/api/payments/list/?order_id=${orderId}`, {
    method: "GET",
  });
}

export function simulatePaymentSuccess(txId: string): Promise<PaymentTransaction> {
  // DEV ONLY: simule un callback provider "SUCCESS"
  return http<PaymentTransaction>(`/api/payments/${txId}/simulate-success/`, {
    method: "POST",
  });
}
