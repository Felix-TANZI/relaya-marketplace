import { http } from "@/services/api/http";

// =============================================================================
// PONT VERS LE MODULE FINANCIER
//
// Ce fichier conserve EXACTEMENT le contrat que consomment PaymentSheet,
// PaymentReceipt, OrderPaymentPanel et PaymentsHistoryPanel. Aucun de ces
// composants ne change.
//
// Ce qui change, c'est la destination : /api/payments/v2/ au lieu de
// /api/payments/.
//
// ─────────────────────────────────────────────────────────────────────────────
// POURQUOI CE CHANGEMENT EST NECESSAIRE
//
// L'ancienne API exposait `simulate-success` : elle marquait le paiement
// reussi SANS appeler l'operateur. Aucun franc ne bougeait, aucun sequestre
// n'etait cree, aucune ecriture comptable n'etait produite — et le vendeur
// n'aurait jamais ete paye.
//
// L'interface affichait pourtant « sous sequestre ». C'etait une promesse
// que rien ne tenait.
// =============================================================================

export type PaymentProvider = "MTN_MOMO" | "ORANGE_MONEY";
export type PaymentStatus =
  | "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export type PaymentInitPayload = {
  order_id: number;
  provider: PaymentProvider;
  phone: string;
};

/**
 * Repartition du paiement, telle que l'acheteur a le droit de la voir.
 *
 * Elle n'expose AUCUN beneficiaire : un code vendeur est stable, et le
 * correler entre deux commandes revelerait qu'elles viennent du meme
 * vendeur.
 */
export type PaymentBreakdown = {
  by_component_xaf: Record<string, number>;
  delivery_and_services_xaf: number;
  total_xaf: number;
  is_complete: boolean;
};

export type PaymentTransaction = {
  id: string;
  order: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount_xaf: number;
  payer_phone: string;
  order_payment_status?: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  raw_payload?: {
    failure_code?: string;
    failure_reason?: string;
    dev_simulated?: boolean;
  } | null;
  created_at: string;
  updated_at?: string;

  // ── Champs du module financier ──────────────────────────────────────────
  /** Toutes les commandes couvertes : un paiement peut en regrouper N. */
  orders?: number[];
  /** Repartition par composant economique. */
  breakdown?: PaymentBreakdown;
  /** Vrai si un nouvel essai est possible apres echec. */
  can_retry?: boolean;
  /** Expiration de la demande chez l'operateur. */
  expires_at?: string | null;
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

export const TERMINAL_STATUSES: PaymentStatus[] = [
  "SUCCESS", "FAILED", "CANCELLED",
];

// ─────────────────────────────────────────────────────────────────────────────
// TRADUCTION DES ETATS
//
// Le module financier a un vocabulaire plus riche que l'ancien. On le
// ramene au contrat existant plutot que de faire evoluer tous les
// composants — ils n'ont pas besoin de cette finesse.
// ─────────────────────────────────────────────────────────────────────────────

const ETATS: Record<string, PaymentStatus> = {
  DRAFT: "INITIATED",
  REQUIRES_ACTION: "PENDING",
  PROCESSING: "PENDING",
  SUCCEEDED: "SUCCESS",
  PARTIALLY_REFUNDED: "SUCCESS",
  FAILED: "FAILED",
  EXPIRED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "SUCCESS",
};

const OPERATEURS: Record<string, PaymentProvider> = {
  MTN: "MTN_MOMO",
  ORANGE: "ORANGE_MONEY",
};

/** Ce que renvoie le module financier pour une intention. */
type IntentV2 = {
  reference: string;
  status: string;
  status_label: string;
  amount_xaf: number;
  amount_captured_xaf: number;
  amount_refunded_xaf: number;
  payer_operator: string;
  payer_msisdn_masked: string;
  expires_at: string | null;
  confirmed_at: string | null;
  failure_reason: string;
  breakdown: PaymentBreakdown;
  orders: number[];
  can_retry: boolean;
  created_at: string;
};

type ActionV2 = {
  reference: string;
  status: string;
  message: string;
  requires_action?: boolean;
  payment?: IntentV2;
};

function versTransaction(intent: IntentV2): PaymentTransaction {
  const echoue = intent.status === "FAILED" || intent.status === "EXPIRED";

  return {
    id: intent.reference,
    // Un paiement peut couvrir plusieurs commandes ; les composants n'en
    // attendent qu'une. On expose la premiere, et la liste complete dans
    // `orders`.
    order: intent.orders?.[0] ?? 0,
    provider: OPERATEURS[(intent.payer_operator || "").toUpperCase()]
      ?? "MTN_MOMO",
    status: ETATS[intent.status] ?? "PENDING",
    amount_xaf: intent.amount_xaf,
    payer_phone: intent.payer_msisdn_masked || "",
    order_payment_status:
      intent.status === "SUCCEEDED" ? "PAID"
        : intent.status === "REFUNDED" ? "REFUNDED"
          : echoue ? "FAILED" : "PENDING",
    raw_payload: echoue
      // Le message du prestataire, TEL QUEL. « Solde insuffisant » vaut
      // mieux que « une erreur est survenue » : c'est ce qui permet a
      // l'acheteur de corriger.
      ? { failure_reason: intent.failure_reason || "" }
      : null,
    created_at: intent.created_at,
    updated_at: intent.confirmed_at ?? undefined,

    orders: intent.orders ?? [],
    breakdown: intent.breakdown,
    can_retry: intent.can_retry,
    expires_at: intent.expires_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LA REFERENCE D'INTENTION, PAS UN IDENTIFIANT DE COMMANDE
//
// `initPayment` recoit un `order_id` mais le module financier travaille sur
// des REFERENCES d'intention. On retrouve donc l'intention qui couvre la
// commande, plutot que d'en creer une seconde.
//
// C'est ce qui garantit qu'un acheteur qui recharge la page ne declenche
// pas un deuxieme prelevement.
// ─────────────────────────────────────────────────────────────────────────────

async function intentionDeLaCommande(orderId: number): Promise<IntentV2> {
  const paiements = await http<IntentV2[]>("/api/payments/v2/me/payments/", {
    method: "GET",
  });
  const trouvee = paiements.find((p) => p.orders?.includes(orderId));
  if (!trouvee) {
    throw new Error(
      "Aucun paiement n'a été préparé pour cette commande. "
      + "Contactez le support.",
    );
  }
  return trouvee;
}

/**
 * Emet la demande de paiement.
 *
 * L'acheteur recevra une invite USSD sur son telephone. Le prestataire
 * repond PENDING : c'est le sondage qui tranchera.
 */
export async function initPayment(
  payload: PaymentInitPayload,
): Promise<PaymentTransaction> {
  const intention = await intentionDeLaCommande(payload.order_id);

  const issue = await http<ActionV2>(
    `/api/payments/v2/me/payments/${intention.reference}/pay/`,
    {
      method: "POST",
      body: JSON.stringify({
        payer_msisdn: payload.phone.replace(/\D/g, ""),
        payer_operator: payload.provider === "ORANGE_MONEY"
          ? "ORANGE" : "MTN",
      }),
    },
  );

  if (issue.payment) return versTransaction(issue.payment);

  // Le service n'a pas renvoye l'intention complete : on la relit.
  return getPayment(intention.reference);
}

/**
 * Etat d'un paiement.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE PRESTATAIRE FAIT FOI, JAMAIS L'ETAT LOCAL
 *
 * Mobile Money n'emet aucune notification pour une transaction restee en
 * attente. On INTERROGE donc le prestataire tant que l'issue n'est pas
 * connue, au lieu de lire un statut qui ne bougerait jamais.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function getPayment(txId: string): Promise<PaymentTransaction> {
  const intention = await http<IntentV2>(
    `/api/payments/v2/me/payments/${txId}/`, { method: "GET" },
  );

  const enAttente = intention.status === "PROCESSING"
    || intention.status === "REQUIRES_ACTION";

  if (!enAttente) return versTransaction(intention);

  try {
    const issue = await http<ActionV2>(
      `/api/payments/v2/me/payments/${txId}/check/`, { method: "POST" },
    );
    if (issue.payment) return versTransaction(issue.payment);
  } catch {
    // Un echec d'interrogation n'est pas un echec de paiement : le reseau
    // peut avoir hoquete. On rend l'etat connu, le prochain passage
    // tranchera.
  }
  return versTransaction(intention);
}

export async function listPaymentsByOrder(
  orderId: number,
): Promise<PaymentTransaction[]> {
  const paiements = await http<IntentV2[]>("/api/payments/v2/me/payments/", {
    method: "GET",
  });
  return paiements
    .filter((p) => p.orders?.includes(orderId))
    .map(versTransaction);
}

export async function listMyPayments(): Promise<PaymentTransaction[]> {
  const paiements = await http<IntentV2[]>("/api/payments/v2/me/payments/", {
    method: "GET",
  });
  return paiements.map(versTransaction);
}

// ─────────────────────────────────────────────────────────────────────────────
// LA SIMULATION EST SUPPRIMEE
//
// `simulatePaymentSuccess` marquait un paiement reussi sans qu'aucun franc
// ne bouge. La conserver, meme en developpement, permettrait de croire un
// paiement abouti alors que le vendeur ne serait jamais paye.
//
// Ces fonctions levent desormais une erreur explicite plutot que de
// disparaitre silencieusement : un appel oublie doit se voir.
// ─────────────────────────────────────────────────────────────────────────────

export function simulatePaymentSuccess(): Promise<PaymentTransaction> {
  return Promise.reject(new Error(
    "La simulation de paiement est supprimée. Les paiements passent "
    + "désormais par l'opérateur Mobile Money.",
  ));
}

export function simulatePaymentFailure(): Promise<PaymentTransaction> {
  return Promise.reject(new Error(
    "La simulation d'échec est supprimée.",
  ));
}

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTION D'UNE COMMANDE
// ─────────────────────────────────────────────────────────────────────────────

/** Sequestre vu par l'acheteur : ni beneficiaire, ni commission. */
export type OrderProtection = {
  reference: string;
  component: string;
  component_label: string;
  order_id: number | null;
  status: string;
  status_label: string;
  gross_amount_xaf: number;
  /** L'echeance apres laquelle la commande est confirmee SANS action. */
  auto_confirm_at: string | null;
  release_at: string | null;
  dispute_window_ends_at: string | null;
  protection: { funds_protected: boolean; message: string };
};

export function getOrderProtection(
  orderId: number,
): Promise<OrderProtection[]> {
  return http<OrderProtection[]>(
    `/api/payments/v2/me/orders/${orderId}/protection/`, { method: "GET" },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REMBOURSEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export type BuyerRefund = {
  reference: string;
  payment_reference: string;
  amount_xaf: number;
  reason: string;
  reason_label: string;
  status: string;
  status_label: string;
  /** Le retour va vers le numero qui a PAYE, jamais ailleurs. */
  destination_masked: string;
  orders: number[];
  explanation: string;
  created_at: string;
};

export function listMyRefunds(): Promise<BuyerRefund[]> {
  return http<BuyerRefund[]>("/api/payments/v2/me/refunds/", {
    method: "GET",
  });
}