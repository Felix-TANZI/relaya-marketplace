// frontend/src/services/api/vendorsV2.ts
// Espace vendeur v2 — Lot 2 / socle Lot 3 (backend).
// Pont additif au-dessus de vendorsApi (services/api/vendors.ts) : ne remplace
// rien, ajoute les types et appels pour le nouvel endpoint GET
// /api/vendors/v2/money-summary/ et pour la simulation du barème de
// commission officiel M01 (espace_vendeur_synthese_detail/batch3_R3_VD02.md).
//
// Règle produit (verrouillée) : le vendeur ne voit JAMAIS le mot
// "commission" ni le total payé par le client — seulement "Vous gardez X F".
// Les libellés utilisateur eux-mêmes vivent dans le fichier i18n dédié à
// l'écran qui les affichera ; ce fichier n'expose que des données typées.

import { http } from "./http";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — GET /api/vendors/v2/money-summary/
// (voir backend/apps/vendors/views_money_v2.py pour les limites documentées
// de chaque approximation : à_verser/versé via WithdrawalRequest, t_fermeture
// via updated_at, pas de Δ=14j carte bancaire)
// ─────────────────────────────────────────────────────────────────────────────

export type VendorMoneyTier = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

export interface VendorMoneyToPay {
  amount_xaf: number;
  note: string;
}

export interface VendorMoneyReleasing {
  amount_xaf: number;
  next_release_at: string | null;
  days_left: number | null;
}

export interface VendorMoneyInProgress {
  amount_xaf: number;
}

export interface VendorMoneyFrozenOrder {
  order_id: number;
  amount_xaf: number;
  reason: string;
}

export interface VendorMoneyFrozen {
  amount_xaf: number;
  orders: VendorMoneyFrozenOrder[];
}

export interface VendorMoneyPaidOut {
  amount_xaf: number;
  note: string;
}

/** Réponse de GET /api/vendors/v2/money-summary/ — approximation des 5 états VD-09. */
export interface VendorMoneySummary {
  to_pay: VendorMoneyToPay;
  releasing: VendorMoneyReleasing;
  in_progress: VendorMoneyInProgress;
  frozen: VendorMoneyFrozen;
  paid_out: VendorMoneyPaidOut;
  in_circulation_xaf: number;
  tier: VendorMoneyTier;
  release_delay_days: number;
  limitations: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — barème de commission officiel M01
// (espace_vendeur_synthese_detail/batch3_R3_VD02.md ; mêmes chiffres que
// backend/apps/vendors/commission.py — à garder synchronisés si le barème
// change côté back).
// ─────────────────────────────────────────────────────────────────────────────

/** Familles de commission M01 (barème par tranches de prix, "Proposé" en console). */
export type CommissionFamily = "A" | "B" | "C" | "D" | "E";

/** Palier de certification vendeur au sens du barème M01 (pas le CertificationTier Django actuel). */
export type CommissionTier = "bronze" | "argent" | "or" | "platine";

/** Résultat d'une simulation de commission — jamais affiché avec le mot "commission" côté client vendeur. */
export interface CommissionPreview {
  price_xaf: number;
  family: CommissionFamily;
  tier: CommissionTier;
  is_discovery_offer: boolean;
  /** Ce que le vendeur voit : "Vous gardez {kept_xaf} F". */
  kept_xaf: number;
  /** Montant prélevé — donnée interne, ne jamais l'afficher tel quel au vendeur. */
  commission_xaf: number;
  effective_rate: number;
  floor_applied: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// BARÈME M01 CÔTÉ CLIENT — recopié à l'identique de commission.py
// Sert de repli tant que /api/vendors/v2/commission-preview/ (ou équivalent)
// n'existe pas côté backend, pour que les écrans "Vous gardez X F" construits
// en parallèle puissent déjà fonctionner sans attendre ce lot.
// MANQUE BACKEND : pas d'endpoint de simulation de commission côté API à ce jour.
// ─────────────────────────────────────────────────────────────────────────────

const FAMILY_TRANCHES: Record<CommissionFamily, Array<[number, number | null, number]>> = {
  A: [[0, 20_000, 0.135], [20_000, 100_000, 0.05], [100_000, 500_000, 0.025], [500_000, null, 0.02]],
  B: [[0, 20_000, 0.235], [20_000, 100_000, 0.185], [100_000, 500_000, 0.135], [500_000, null, 0.135]],
  C: [[0, 10_000, 0.075], [10_000, 50_000, 0.06], [50_000, null, 0.05]],
  D: [[0, 20_000, 0.15], [20_000, 100_000, 0.115], [100_000, 500_000, 0.085], [500_000, null, 0.085]],
  E: [[0, 10_000, 0.125], [10_000, 50_000, 0.09], [50_000, null, 0.09]],
};

const TIER_MULTIPLIERS: Record<CommissionTier, number> = {
  bronze: 1.0,
  argent: 0.85,
  or: 0.70,
  platine: 0.60,
};

const DISCOVERY_MULTIPLIER = 0.80;
const FLOOR_FLAT_XAF = 700;
const FLOOR_PERCENT = 0.02;
const MIN_MARGIN_FLAT_XAF = 200;
const MIN_MARGIN_PERCENT = 0.005;

function bronzeTrancheAmount(priceXaf: number, family: CommissionFamily): number {
  let total = 0;
  for (const [low, high, rate] of FAMILY_TRANCHES[family]) {
    if (priceXaf <= low) break;
    const upper = high === null ? priceXaf : Math.min(priceXaf, high);
    const part = upper - low;
    if (part > 0) total += part * rate;
  }
  return total;
}

/**
 * Calcule la commission M01 et le montant gardé, entièrement côté client —
 * même formule que backend/apps/vendors/commission.py::calculate_commission.
 * À utiliser tant qu'un endpoint de simulation dédié n'existe pas côté API.
 */
export function previewCommissionClientSide(
  priceXaf: number,
  family: CommissionFamily,
  tier: CommissionTier,
  isDiscoveryOffer = false,
): CommissionPreview {
  const base = bronzeTrancheAmount(priceXaf, family);
  let multiplier = TIER_MULTIPLIERS[tier];
  if (isDiscoveryOffer) multiplier *= DISCOVERY_MULTIPLIER;

  const sigmaComArticle = base * multiplier;
  const floorFlat = FLOOR_FLAT_XAF;
  const floorPercent = priceXaf * FLOOR_PERCENT;
  const minMargin = Math.max(MIN_MARGIN_FLAT_XAF, priceXaf * MIN_MARGIN_PERCENT);

  const commissionRaw = Math.max(floorFlat, floorPercent, minMargin, sigmaComArticle);
  const commissionXaf = Math.round(commissionRaw);
  const baseRateCommissionXaf = Math.round(sigmaComArticle);

  return {
    price_xaf: priceXaf,
    family,
    tier,
    is_discovery_offer: isDiscoveryOffer,
    kept_xaf: priceXaf - commissionXaf,
    commission_xaf: commissionXaf,
    effective_rate: priceXaf ? commissionXaf / priceXaf : 0,
    floor_applied: commissionXaf > baseRateCommissionXaf,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const vendorsV2Api = {
  /** GET /api/vendors/v2/money-summary/ — approximation des 5 états VD-09. */
  getMoneySummary: async (): Promise<VendorMoneySummary> => {
    const token = localStorage.getItem("access_token");
    return http<VendorMoneySummary>("/api/vendors/v2/money-summary/", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Simule la commission M01 pour un prix/famille/palier donnés.
   * MANQUE BACKEND : pas d'endpoint de simulation côté API — calcul fait
   * intégralement côté client via previewCommissionClientSide().
   */
  previewCommission: (
    priceXaf: number,
    family: CommissionFamily,
    tier: CommissionTier,
    isDiscoveryOffer = false,
  ): CommissionPreview => previewCommissionClientSide(priceXaf, family, tier, isDiscoveryOffer),
};
