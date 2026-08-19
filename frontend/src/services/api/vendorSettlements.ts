// frontend/src/services/api/vendorSettlements.ts
//
// =============================================================================
//  LE VENDEUR VU PAR LE MODULE FINANCIER
//
//  Ce fichier NE REMPLACE PAS `services/api/vendors.ts`. Il l'ENRICHIT.
//
//  Les pages vendeur existantes continuent d'appeler `vendorsApi` pour ce
//  qu'elles savent faire : le solde retirable, les demandes de retrait,
//  l'historique des commandes.
//
//  Ce module ajoute ce que seul le module financier connait :
//
//    - le montant REELLEMENT du, calcule depuis les sequestres liberes
//    - la DATE du prochain reglement, issue du cycle contractuel
//    - les blocages qui empechent un versement (KYC, refroidissement)
//    - l'historique des versements reellement emis vers l'operateur
//    - les retenues et compensations, AVEC leur motif
//
//  ─────────────────────────────────────────────────────────────────────────
//  POURQUOI DEUX SOURCES COHABITENT
//
//  `vendorsApi.getPaymentSummary()` calcule un solde depuis les commandes.
//  Le module financier le calcule depuis le REGISTRE COMPTABLE.
//
//  Les deux devraient concorder — et `compare_all()` le verifie cote
//  serveur. Mais seul le registre sait ce qui a ete effectivement libere,
//  ce qui est retenu, et quand le prochain versement partira.
// =============================================================================

import { http } from "@/services/api/http";

// ─────────────────────────────────────────────────────────────────────────────
// MONTANT DU
// ─────────────────────────────────────────────────────────────────────────────

export type PayeeKind =
  | "VENDOR" | "DELIVERY_COMPANY" | "RELAY_POINT" | "PLATFORM" | "BUYER" | "";

export interface AmountDue {
  payee_code: string;
  /** Expose explicitement : deduire le type d'un prefixe serait fragile. */
  payee_type: PayeeKind;
  payee_type_label: string;
  display_label: string;

  /** Ce que BelivaY doit AUJOURD'HUI, net des retenues. */
  due_xaf: number;
  /** Libere mais pas encore regroupe dans un lot. */
  released_not_settled_xaf: number;
  /** Bonus approuves en attente. */
  pending_bonus_xaf: number;
  /** Retenues restant a imputer. */
  outstanding_debt_xaf: number;
  /** Deja dans un lot en cours de traitement. */
  in_settlement_xaf: number;
  /**
   * Commandes VIVANTES : l'acheteur peut encore etre rembourse.
   *
   * CE N'EST PAS ENCORE L'ARGENT DU VENDEUR. L'afficher comme un solde
   * serait une promesse que le sequestre ne tient pas.
   */
  not_yet_due_xaf: number;
  /** Gele par un litige. */
  frozen_xaf: number;

  next_settlement_cycle: string;
  /**
   * Date reelle du prochain reglement.
   *
   * Nulle pour un cycle au seuil : il depend du montant accumule et non du
   * calendrier. Annoncer une date qui ne tiendrait pas serait pire que ne
   * rien annoncer.
   */
  next_settlement_at: string | null;

  /**
   * Ce qui empeche un versement : KYC non verifie, refroidissement de 72 h
   * apres changement de numero, suspension administrative.
   *
   * Quand cette liste n'est pas vide, la date de versement ne doit PAS
   * etre affichee : ce serait une promesse fausse.
   */
  blockers: string[];
}

export function getAmountDue(): Promise<AmountDue> {
  return http<AmountDue>("/api/payments/v2/partner/due/", { method: "GET" });
}

// ─────────────────────────────────────────────────────────────────────────────
// RELEVES DE REGLEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface SettlementLine {
  reference: string;
  component: string;
  order_id: number | null;
  gross_xaf: number;
  commission_xaf: number;
  net_xaf: number;
  released_at: string | null;
}

export interface SettlementAdjustment {
  reference: string;
  direction: "CREDIT" | "DEBIT";
  direction_label: string;
  category: string;
  category_label: string;
  amount_xaf: number;
  remaining_xaf: number;
  /** Une retenue sans explication est contractuellement indefendable. */
  reason: string;
  status: string;
  created_at: string;
}

export interface SettlementPayout {
  reference: string;
  status: string;
  status_label: string;
  amount_xaf: number;
  msisdn_masked: string;
  operator: string;
  settled_at: string | null;
}

export interface SettlementBatch {
  reference: string;
  status: string;
  status_label: string;
  period_start: string;
  period_end: string;
  gross_amount_xaf: number;
  adjustments_xaf: number;
  net_amount_xaf: number;
  is_exceptional: boolean;
  /** Le detail ligne par ligne : c'est ce qui permet de VERIFIER. */
  lines: SettlementLine[];
  adjustments: SettlementAdjustment[];
  payout: SettlementPayout | null;
  created_at: string;
}

export function listSettlements(): Promise<SettlementBatch[]> {
  return http<SettlementBatch[]>("/api/payments/v2/partner/settlements/", {
    method: "GET",
  });
}

export function getSettlement(reference: string): Promise<SettlementBatch> {
  return http<SettlementBatch>(
    `/api/payments/v2/partner/settlements/${reference}/`, { method: "GET" },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSEMENTS REELLEMENT EMIS
// ─────────────────────────────────────────────────────────────────────────────

export interface PartnerPayout {
  reference: string;
  status: string;
  status_label: string;
  amount_xaf: number;
  payee_msisdn_masked: string;
  payee_operator: string;
  requested_at: string;
  settled_at: string | null;
}

/**
 * L'historique des versements EMIS vers l'operateur.
 *
 * A ne pas confondre avec `vendorsApi.getWithdrawals()`, qui liste les
 * DEMANDES du vendeur. Un versement peut exister sans demande — c'est le
 * cas nominal du reglement par cycle.
 */
export function listPayouts(): Promise<PartnerPayout[]> {
  return http<PartnerPayout[]>("/api/payments/v2/partner/payouts/", {
    method: "GET",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SEQUESTRES ET AJUSTEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface PartnerEscrowHold {
  reference: string;
  component: string;
  component_label: string;
  order_id: number | null;
  status: string;
  status_label: string;
  gross_amount_xaf: number;
  /** Le partenaire voit SA commission : elle est la sienne. */
  commission_xaf: number;
  net_amount_xaf: number;
  payable_xaf: number;
  release_trigger: string;
  auto_confirm_at: string | null;
  release_at: string | null;
  frozen_reason: string;
  settlement_batch_ref: string;
  created_at: string;
}

export function listEscrow(status?: string): Promise<PartnerEscrowHold[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return http<PartnerEscrowHold[]>(
    `/api/payments/v2/partner/escrow/${q}`, { method: "GET" },
  );
}

export function listAdjustments(): Promise<SettlementAdjustment[]> {
  return http<SettlementAdjustment[]>(
    "/api/payments/v2/partner/adjustments/", { method: "GET" },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AIDES D'AFFICHAGE
// ─────────────────────────────────────────────────────────────────────────────

const FORMAT_LONG = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long",
});

/** « vendredi 15 août » */
export function formatSettlementDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : FORMAT_LONG.format(date);
}

/**
 * « dans 4 jours », « demain », « aujourd'hui ».
 *
 * Une date est une information ; un compte a rebours est un ENGAGEMENT.
 * C'est ce qui rend la promesse de BelivaY concrete pour un partenaire.
 */
export function countdownLabel(value: string | null): string {
  if (!value) return "";
  const cible = new Date(value);
  if (Number.isNaN(cible.getTime())) return "";

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  cible.setHours(0, 0, 0, 0);

  const jours = Math.round(
    (cible.getTime() - aujourdhui.getTime()) / 86_400_000,
  );

  if (jours < 0) return "en cours de traitement";
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  return `dans ${jours} jours`;
}

/**
 * Traduit un blocage technique en phrase comprehensible.
 *
 * Le message d'origine reste en repli : mieux vaut une phrase technique
 * qu'un partenaire sans explication.
 */
export function humanizeBlocker(blocker: string): string {
  const regles: Array<[RegExp, string]> = [
    [/kyc/i, "Vos pièces d'identité ne sont pas encore vérifiées."],
    [/refroidissement|cooling/i,
      "Votre numéro Mobile Money a changé récemment. "
      + "Un délai de sécurité de 72 h s'applique."],
    [/suspendu|hold/i, "Les versements sont suspendus sur votre compte."],
    [/numero|msisdn/i, "Aucun numéro Mobile Money n'est enregistré."],
    [/montant|minimum/i,
      "Le montant dû n'atteint pas encore le minimum de versement."],
  ];
  const trouve = regles.find(([motif]) => motif.test(blocker));
  return trouve ? trouve[1] : blocker;
}