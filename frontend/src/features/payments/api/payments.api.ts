// frontend/src/features/payments/api/payments.api.ts
// Paiements — espace acheteur.
//
// Appelle le client HTTP EXISTANT du projet : rafraichissement JWT, relance
// reseau et messages d'erreur en francais sont deja traites. En ecrire un
// second garantirait qu'ils divergent.

import { api } from '@/services/api/client';

import type {
  InitiatePaymentPayload, PaymentActionResult, PaymentIntent,
} from '../model/payment.types';

const BASE = '/api/payments/v2/me';

export const paymentsApi = {
  /** Mes paiements, du plus recent au plus ancien. */
  list: () => api.get<PaymentIntent[]>(`${BASE}/payments/`),

  detail: (reference: string) =>
    api.get<PaymentIntent>(`${BASE}/payments/${reference}/`),

  /** Emet la demande d'encaissement. Idempotent cote serveur. */
  initiate: (reference: string, payload: InitiatePaymentPayload = {}) =>
    api.post<PaymentActionResult>(`${BASE}/payments/${reference}/pay/`, payload),

  /**
   * Re-interroge le prestataire.
   *
   * C'est LUI qui fait foi, jamais l'etat local : CamPay n'emet aucun
   * webhook pour une transaction restee en attente.
   */
  check: (reference: string) =>
    api.post<PaymentActionResult>(`${BASE}/payments/${reference}/check/`),
};