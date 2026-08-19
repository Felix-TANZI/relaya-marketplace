// frontend/src/features/payments/usePaymentTransaction.ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPayment,
  initPayment,
  TERMINAL_STATUSES,
  type PaymentProvider,
  type PaymentTransaction,
} from "@/services/api/payments";

const POLL_MS = 3000;
export const PAYMENT_TIMEOUT_S = 96;

export type PaymentPhase = "idle" | "pending" | "success" | "failed";

export function usePaymentTransaction(orderId: number) {
  const [phase, setPhase] = useState<PaymentPhase>("idle");
  const [tx, setTx] = useState<PaymentTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_TIMEOUT_S);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(
    async (provider: PaymentProvider, phoneE164: string) => {
      setError(null);
      setSecondsLeft(PAYMENT_TIMEOUT_S);
      try {
        const created = await initPayment({ order_id: orderId, provider, phone: phoneE164 });
        setTx(created);
        setPhase("pending");

        tickRef.current = window.setInterval(() => {
          setSecondsLeft((s) => {
            if (s <= 1) {
              stop();
              setPhase("failed");
              setError("Aucune confirmation reçue de l'opérateur. Aucun montant n'a été débité.");
              return 0;
            }
            return s - 1;
          });
        }, 1000);

        pollRef.current = window.setInterval(async () => {
          try {
            const fresh = await getPayment(created.id);
            setTx(fresh);
            if (TERMINAL_STATUSES.includes(fresh.status)) {
              stop();
              setPhase(fresh.status === "SUCCESS" ? "success" : "failed");
              if (fresh.status !== "SUCCESS") {
                setError(
                  fresh.status === "CANCELLED"
                    ? "Paiement annulé depuis votre téléphone."
                    : "Le paiement a été refusé par l'opérateur (solde insuffisant ou code incorrect).",
                );
              }
            }
          } catch {
            /* le polling suivant réessaiera */
          }
        }, POLL_MS);
      } catch (e) {
        setPhase("failed");
        setError(e instanceof Error ? e.message : "Impossible d'initier le paiement.");
      }
    },
    [orderId, stop],
  );

  const reset = useCallback(() => {
    stop();
    setPhase("idle");
    setTx(null);
    setError(null);
    setSecondsLeft(PAYMENT_TIMEOUT_S);
  }, [stop]);

  return { phase, tx, error, secondsLeft, start, reset, stop };
}
