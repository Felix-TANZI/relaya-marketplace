import { http } from "@/services/api/http";

export type PaymentProvider = "MTN_MOMO" | "ORANGE_MONEY";
export type PaymentStatus = "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export type PaymentInitPayload = {
  order_id: number;
  provider: PaymentProvider;
  phone: string;
};

export type PaymentTransaction = {
  id: string;
  order: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount_xaf: number;
  payer_phone: string;
  order_payment_status?: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  raw_payload?: { failure_code?: string; failure_reason?: string; dev_simulated?: boolean } | null;
  created_at: string;
  updated_at?: string;
};

export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
};

/** Le préfixe opérateur détecté par lib/phone.ts → provider attendu. */
export const OPERATOR_TO_PROVIDER: Record<string, PaymentProvider> = {
  MTN: "MTN_MOMO",
  Orange: "ORANGE_MONEY",
};

export const TERMINAL_STATUSES: PaymentStatus[] = ["SUCCESS", "FAILED", "CANCELLED"];

export function initPayment(payload: PaymentInitPayload): Promise<PaymentTransaction> {
  return http<PaymentTransaction>("/api/payments/init/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPayment(txId: string): Promise<PaymentTransaction> {
  return http<PaymentTransaction>(`/api/payments/${txId}/`, { method: "GET" });
}

export function listPaymentsByOrder(orderId: number): Promise<PaymentTransaction[]> {
  return http<PaymentTransaction[]>(`/api/payments/list/?order_id=${orderId}`, { method: "GET" });
}

/** Historique complet du client, toutes commandes confondues. */
export function listMyPayments(status?: PaymentStatus): Promise<PaymentTransaction[]> {
  const q = status ? `?status=${status}` : "";
  return http<PaymentTransaction[]>(`/api/payments/mine/${q}`, { method: "GET" });
}

/** DEV ONLY — remplacé en prod par le webhook opérateur. */
export function simulatePaymentSuccess(txId: string): Promise<PaymentTransaction> {
  return http<PaymentTransaction>(`/api/payments/${txId}/simulate-success/`, { method: "POST" });
}

/** DEV ONLY */
export function simulatePaymentFailure(txId: string, reason = "Solde insuffisant", code = "4001") {
  return http<PaymentTransaction>(`/api/payments/${txId}/simulate-failure/`, {
    method: "POST",
    body: JSON.stringify({ reason, code }),
  });
}
