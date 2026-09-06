// frontend/src/services/api/deliverySettlements.ts
//
// =============================================================================
//  L'ENTREPRISE DE LIVRAISON VUE PAR LE MODULE FINANCIER
//
//  ─────────────────────────────────────────────────────────────────────────
//  CE QUI LA DISTINGUE DU POINT RELAIS
//
//  Le relais est paye par CONTRAT : une charge de BelivaY, sans rapport avec
//  ce que l'acheteur a verse.
//
//  Le transporteur est paye par le SEQUESTRE TRANSPORT : sa part est
//  prelevee sur les frais de livraison de l'acheteur. Elle existe donc des
//  le paiement — mais elle ne lui APPARTIENT qu'a la preuve de livraison.
//
//  Consequence visible ici : une notion de « pas encore acquis » que le
//  relais n'a pas. L'argent est la, il n'est pas encore a lui.
// =============================================================================

import { http } from "@/services/api/http";

// ─────────────────────────────────────────────────────────────────────────────
// MONTANT DU
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryAmountDue {
  payee_code: string;
  payee_type: string;
  payee_type_label: string;
  display_label: string;

  /** Ce que BelivaY doit, DEJA NET des retenues. */
  due_xaf: number;
  released_not_settled_xaf: number;
  pending_bonus_xaf: number;
  /**
   * Retenues restant a imputer.
   *
   * `due_xaf` les a DEJA soustraites. Afficher l'un sans l'autre laisserait
   * un chiffre inexplique.
   */
  outstanding_debt_xaf: number;
  in_settlement_xaf: number;
  /** Livraisons sans preuve validee : ce n'est PAS encore son argent. */
  not_yet_due_xaf: number;
  /** Gele par un litige. */
  frozen_xaf: number;

  next_settlement_cycle: string;
  next_settlement_at: string | null;
  /** Quand cette liste n'est pas vide, la date ne doit PAS etre annoncee. */
  blockers: string[];
}

export function getDeliveryDue(): Promise<DeliveryAmountDue> {
  return http<DeliveryAmountDue>("/api/payments/v2/partner/due/", {
    method: "GET",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SEQUESTRES — LA PART TRANSPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryEscrowHold {
  reference: string;
  component: string;
  component_label: string;
  order_id: number | null;
  status: string;
  status_label: string;
  gross_amount_xaf: number;
  /**
   * Ce que BelivaY retient sur la part transport.
   *
   * C'est son argent : il a le droit de savoir ce qui est preleve.
   */
  commission_xaf: number;
  net_amount_xaf: number;
  payable_xaf: number;
  /** Ce qui declenchera la liberation — la preuve de livraison, ici. */
  release_trigger: string;
  auto_confirm_at: string | null;
  release_at: string | null;
  /** Le motif du gel, quand un litige bloque la part. */
  frozen_reason: string;
  settlement_batch_ref: string;
  created_at: string;
}

export function listDeliveryEscrow(
  status?: string,
): Promise<DeliveryEscrowHold[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return http<DeliveryEscrowHold[]>(
    `/api/payments/v2/partner/escrow/${q}`, { method: "GET" },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AJUSTEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryAdjustment {
  reference: string;
  direction: "CREDIT" | "DEBIT";
  direction_label: string;
  category: string;
  category_label: string;
  amount_xaf: number;
  remaining_xaf: number;
  /** Le motif, toujours. Une retenue sans explication est indefendable. */
  reason: string;
  status: string;
  created_at: string;
}

export function listDeliveryAdjustments(): Promise<DeliveryAdjustment[]> {
  return http<DeliveryAdjustment[]>(
    "/api/payments/v2/partner/adjustments/", { method: "GET" },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RELEVES ET VERSEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliverySettlementLine {
  reference: string;
  component: string;
  order_id: number | null;
  gross_xaf: number;
  commission_xaf: number;
  net_xaf: number;
  released_at: string | null;
}

export interface DeliverySettlement {
  reference: string;
  status: string;
  status_label: string;
  period_start: string;
  period_end: string;
  gross_amount_xaf: number;
  adjustments_xaf: number;
  net_amount_xaf: number;
  is_exceptional: boolean;
  lines: DeliverySettlementLine[];
  adjustments: DeliveryAdjustment[];
  payout: {
    reference: string;
    status: string;
    status_label: string;
    amount_xaf: number;
    msisdn_masked: string;
    operator: string;
    settled_at: string | null;
  } | null;
  created_at: string;
}

export function listDeliverySettlements(): Promise<DeliverySettlement[]> {
  return http<DeliverySettlement[]>(
    "/api/payments/v2/partner/settlements/", { method: "GET" },
  );
}

export interface DeliveryPayout {
  reference: string;
  status: string;
  status_label: string;
  amount_xaf: number;
  payee_msisdn_masked: string;
  payee_operator: string;
  requested_at: string;
  settled_at: string | null;
}

export function listDeliveryPayouts(): Promise<DeliveryPayout[]> {
  return http<DeliveryPayout[]>("/api/payments/v2/partner/payouts/", {
    method: "GET",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AIDES D'AFFICHAGE — BILINGUES
//
// L'espace livraison est bilingue : chaque libelle a sa version anglaise.
// Ces aides prennent donc la locale en argument plutot que de supposer le
// francais.
// ─────────────────────────────────────────────────────────────────────────────

type Locale = "fr" | "en";

export function formatLongDate(
  value: string | null, locale: Locale = "fr",
): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  }).format(d);
}

export function formatShortDate(
  value: string | null, locale: Locale = "fr",
): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric", month: "short",
  }).format(d);
}

export function formatPeriod(
  start: string | null, end: string | null, locale: Locale = "fr",
): string {
  const a = start ? new Date(start) : null;
  const b = end ? new Date(end) : null;
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return "";
  }
  const lien = locale === "en" ? "to" : "au";
  return `${a.getDate()} ${lien} ${formatShortDate(end, locale)}`;
}

/** Une date informe ; un compte a rebours ENGAGE. */
export function countdown(
  value: string | null, locale: Locale = "fr",
): string {
  if (!value) return "";
  const cible = new Date(value);
  if (Number.isNaN(cible.getTime())) return "";

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  cible.setHours(0, 0, 0, 0);

  const jours = Math.round(
    (cible.getTime() - aujourdhui.getTime()) / 86_400_000,
  );
  if (jours < 0) return locale === "en" ? "being processed" : "en cours de traitement";
  if (jours === 0) return locale === "en" ? "today" : "aujourd'hui";
  if (jours === 1) return locale === "en" ? "tomorrow" : "demain";
  return locale === "en" ? `in ${jours} days` : `dans ${jours} jours`;
}

/** Traduit un blocage technique en phrase comprehensible. */
export function humanizeBlocker(
  blocker: string, locale: Locale = "fr",
): string {
  const regles: Array<[RegExp, string, string]> = [
    [/kyc/i,
      "Vos pièces d'identité ne sont pas encore vérifiées.",
      "Your identity documents are not verified yet."],
    [/refroidissement|cooling/i,
      "Votre numéro Mobile Money a changé récemment. Un délai de sécurité "
      + "de 72 h s'applique.",
      "Your Mobile Money number changed recently. A 72-hour security delay "
      + "applies."],
    [/suspendu|hold/i,
      "Les versements sont suspendus sur votre compte.",
      "Payouts are suspended on your account."],
    [/numero|msisdn|operateur/i,
      "Aucun numéro Mobile Money n'est enregistré.",
      "No Mobile Money number is registered."],
    [/montant|minimum/i,
      "Le montant dû n'atteint pas encore le minimum de versement.",
      "The amount due has not reached the payout minimum yet."],
  ];
  const trouve = regles.find(([motif]) => motif.test(blocker));
  if (!trouve) return blocker;
  return locale === "en" ? trouve[2] : trouve[1];
}

/**
 * Ce qu'un versement signifie pour le partenaire.
 *
 * `UNKNOWN` n'est PAS un echec : on ignore si l'argent est parti. Ecrire
 * « echoue » serait faux, et le transporteur n'a de toute facon aucune
 * action a faire — la reconciliation tranchera.
 */
export function payoutLabel(status: string, locale: Locale = "fr"): {
  text: string; color: string;
} {
  const table: Record<string, { fr: string; en: string; color: string }> = {
    PAID: { fr: "versé", en: "paid", color: "#10B981" },
    PROCESSING: { fr: "en cours", en: "processing", color: "#F59E0B" },
    APPROVED: { fr: "approuvé", en: "approved", color: "#F59E0B" },
    PENDING_APPROVAL: { fr: "en attente", en: "pending", color: "#F59E0B" },
    UNKNOWN: { fr: "en vérification", en: "under review", color: "#EF4444" },
    FAILED: { fr: "non abouti", en: "not completed", color: "#EF4444" },
    REJECTED: { fr: "rejeté", en: "rejected", color: "#94A3B8" },
    CANCELLED: { fr: "annulé", en: "cancelled", color: "#94A3B8" },
  };
  const trouve = table[status];
  if (!trouve) return { text: status.toLowerCase(), color: "#94A3B8" };
  return {
    text: locale === "en" ? trouve.en : trouve.fr,
    color: trouve.color,
  };
}