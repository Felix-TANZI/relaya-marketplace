// frontend/src/services/api/relaySettlements.ts
//
// =============================================================================
//  LE POINT RELAIS VU PAR LE MODULE FINANCIER
//
//  ─────────────────────────────────────────────────────────────────────────
//  UN RELAIS N'EST PAS PAYE PAR L'ACHETEUR
//
//  Sa remuneration decoule du CONTRAT signe avec BelivaY, pas des frais de
//  livraison. C'est une charge de la plateforme, pas une part du paiement.
//
//  Consequence visible ici : il existe une GRILLE TARIFAIRE — un montant par
//  categorie de colis — que le vendeur n'a pas. C'est son contrat, et il doit
//  pouvoir le consulter.
// =============================================================================

import type { TFunction } from "i18next";

import { http } from "@/services/api/http";

// ─────────────────────────────────────────────────────────────────────────────
// MONTANT DU
// ─────────────────────────────────────────────────────────────────────────────

export interface RelayAmountDue {
  payee_code: string;
  payee_type: string;
  payee_type_label: string;
  display_label: string;

  /** Ce que BelivaY doit, DEJA NET des retenues. */
  due_xaf: number;
  /** Acquis mais pas encore regroupe dans un lot. */
  released_not_settled_xaf: number;
  /** Bonus approuves en attente. */
  pending_bonus_xaf: number;
  /**
   * Retenues restant a imputer.
   *
   * `due_xaf` les a DEJA soustraites. Afficher l'un sans l'autre laisserait
   * un chiffre inexplique — et un gerant qui ne comprend pas son montant
   * ouvre un litige.
   */
  outstanding_debt_xaf: number;
  in_settlement_xaf: number;
  not_yet_due_xaf: number;
  frozen_xaf: number;

  next_settlement_cycle: string;
  /** Nulle pour un cycle au seuil : il depend du montant, pas du calendrier. */
  next_settlement_at: string | null;

  /**
   * Ce qui empeche un versement.
   *
   * Quand cette liste n'est pas vide, la date de versement ne doit PAS etre
   * annoncee : ce serait une promesse fausse.
   */
  blockers: string[];
}

export function getRelayDue(): Promise<RelayAmountDue> {
  return http<RelayAmountDue>("/api/payments/v2/partner/due/", {
    method: "GET",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GRILLE TARIFAIRE — LE CONTRAT
// ─────────────────────────────────────────────────────────────────────────────

export type ParcelSize = "SMALL" | "STANDARD" | "LARGE" | "BULKY";

export interface RelayTariffLine {
  parcel_size: ParcelSize;
  parcel_size_label: string;
  amount_xaf: number;
  /**
   * Faux si ce relais REFUSE cette categorie.
   *
   * On l'affiche quand meme : la masquer laisserait croire qu'elle n'existe
   * pas, alors que le gerant doit savoir pourquoi il ne recoit jamais
   * d'encombrants.
   */
  is_accepted: boolean;
  contract_reference: string;
  /**
   * Vrai si le tarif vient d'un contrat propre a ce relais, faux s'il vient
   * de la grille generale. Un gerant a le droit de savoir ce qui est
   * negociable.
   */
  is_negotiated: boolean;
}

export function getRelayTariff(): Promise<RelayTariffLine[]> {
  return http<RelayTariffLine[]>("/api/payments/v2/partner/relay-tariff/", {
    method: "GET",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AJUSTEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface RelayAdjustment {
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

export function listRelayAdjustments(): Promise<RelayAdjustment[]> {
  return http<RelayAdjustment[]>("/api/payments/v2/partner/adjustments/", {
    method: "GET",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RELEVES ET VERSEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface RelaySettlementLine {
  reference: string;
  component: string;
  order_id: number | null;
  gross_xaf: number;
  commission_xaf: number;
  net_xaf: number;
  released_at: string | null;
}

export interface RelaySettlement {
  reference: string;
  status: string;
  status_label: string;
  period_start: string;
  period_end: string;
  gross_amount_xaf: number;
  adjustments_xaf: number;
  net_amount_xaf: number;
  is_exceptional: boolean;
  lines: RelaySettlementLine[];
  adjustments: RelayAdjustment[];
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

export function listRelaySettlements(): Promise<RelaySettlement[]> {
  return http<RelaySettlement[]>("/api/payments/v2/partner/settlements/", {
    method: "GET",
  });
}

export interface RelayPayout {
  reference: string;
  status: string;
  status_label: string;
  amount_xaf: number;
  payee_msisdn_masked: string;
  payee_operator: string;
  requested_at: string;
  settled_at: string | null;
}

export function listRelayPayouts(): Promise<RelayPayout[]> {
  return http<RelayPayout[]>("/api/payments/v2/partner/payouts/", {
    method: "GET",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AIDES D'AFFICHAGE
// ─────────────────────────────────────────────────────────────────────────────

const LONG = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long",
});
const COURT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric", month: "short",
});

export function formatLong(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : LONG.format(d);
}

export function formatCourt(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : COURT.format(d);
}

export function formatPeriode(
  debut: string | null, fin: string | null, t: TFunction,
): string {
  const a = debut ? new Date(debut) : null;
  const b = fin ? new Date(fin) : null;
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return "";
  }
  const memeMois = a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear();
  const lien = t("misc1_relay_settlements.period_join");
  return memeMois
    ? `${a.getDate()} ${lien} ${COURT.format(b)}`
    : `${COURT.format(a)} ${lien} ${COURT.format(b)}`;
}

/** Une date informe ; un compte a rebours ENGAGE. */
export function compteARebours(value: string | null, t: TFunction): string {
  if (!value) return "";
  const cible = new Date(value);
  if (Number.isNaN(cible.getTime())) return "";

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  cible.setHours(0, 0, 0, 0);

  const jours = Math.round(
    (cible.getTime() - aujourdhui.getTime()) / 86_400_000,
  );
  if (jours < 0) return t("misc1_relay_settlements.processing");
  if (jours === 0) return t("misc1_relay_settlements.today");
  if (jours === 1) return t("misc1_relay_settlements.tomorrow");
  return t("misc1_relay_settlements.in_days", { count: jours });
}

/**
 * Traduit un blocage technique en phrase comprehensible.
 *
 * Le message d'origine reste en repli : mieux vaut une phrase technique
 * qu'un gerant sans explication.
 */
export function humaniserBlocage(blocage: string, t: TFunction): string {
  const regles: Array<[RegExp, string]> = [
    [/kyc/i, t("misc1_relay_settlements.blocker_kyc")],
    [/refroidissement|cooling/i, t("misc1_relay_settlements.blocker_cooling")],
    [/suspendu|hold/i, t("misc1_relay_settlements.blocker_suspended")],
    [/numero|msisdn|operateur/i, t("misc1_relay_settlements.blocker_no_number")],
    [/montant|minimum/i, t("misc1_relay_settlements.blocker_below_minimum")],
  ];
  const trouve = regles.find(([motif]) => motif.test(blocage));
  return trouve ? trouve[1] : blocage;
}

/**
 * Ce qu'un versement signifie pour le partenaire.
 *
 * `UNKNOWN` n'est PAS un echec : on ignore si l'argent est parti. Ecrire
 * « echoue » serait faux, et le gerant n'a de toute facon aucune action a
 * faire — la reconciliation tranchera.
 */
export function libellePayout(status: string, t: TFunction): {
  texte: string; couleur: string;
} {
  const table: Record<string, { texte: string; couleur: string }> = {
    PAID: { texte: t("misc1_relay_settlements.status_paid"), couleur: "#10B981" },
    PROCESSING: { texte: t("misc1_relay_settlements.status_processing"), couleur: "#F59E0B" },
    APPROVED: { texte: t("misc1_relay_settlements.status_approved"), couleur: "#F59E0B" },
    PENDING_APPROVAL: { texte: t("misc1_relay_settlements.status_pending_approval"), couleur: "#F59E0B" },
    UNKNOWN: { texte: t("misc1_relay_settlements.status_unknown"), couleur: "#EF4444" },
    FAILED: { texte: t("misc1_relay_settlements.status_failed"), couleur: "#EF4444" },
    REJECTED: { texte: t("misc1_relay_settlements.status_rejected"), couleur: "#94A3B8" },
    CANCELLED: { texte: t("misc1_relay_settlements.status_cancelled"), couleur: "#94A3B8" },
  };
  return table[status] ?? { texte: status.toLowerCase(), couleur: "#94A3B8" };
}