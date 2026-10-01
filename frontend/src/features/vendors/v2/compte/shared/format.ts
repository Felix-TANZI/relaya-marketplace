// frontend/src/features/vendors/v2/compte/shared/format.ts
// Utilitaires partagés par les écrans "Vendre plus" et "Mon compte" — VD-10/VD-11.
// Aucune valeur métier fabriquée ici : uniquement du formatage et des constantes
// canoniques reprises telles quelles des documents de spec (jamais inventées).

/** Montant en francs CFA, séparateur d'espaces, jamais de décimale (DS-10 : arrondi au franc). */
export function formatXAF(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${Math.round(n).toLocaleString('fr-FR')} F`;
}

export function formatPct(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n.toFixed(digits)} %`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PALIERS — VD-10 §PAL-01
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paliers du produit final : Bronze/Argent/Or/Platine uniquement.
 * VD-D11.A01 supprime explicitement le palier "Diamant" de l'ancien moteur
 * à points. Seuils Trust Score canoniques : Argent ≥ 65, Or ≥ 80, Platine ≥ 90
 * (tenus 14 jours, règle C4).
 */
export type SellerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export const TIER_ORDER: SellerTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export const TIER_THRESHOLD: Record<SellerTier, number> = {
  BRONZE: 0,
  SILVER: 65,
  GOLD: 80,
  PLATINUM: 90,
};

/** Vitesse de libération par palier — VD-09 §LIB-01, VD-10 §PAL-02. */
export const TIER_RELEASE_DAYS: Record<SellerTier, number> = {
  BRONZE: 3,
  SILVER: 3,
  GOLD: 1,
  PLATINUM: 1,
};

/**
 * Multiplicateur canonique appliqué à la commission par palier (VD-10, exemple
 * ITEL AC52 à 20 000 F) — PAS les anciens pourcentages d'abonnement (20/18/12/
 * 10/5 %) qui sont retirés de la production (VD-D13.A02). Ici la référence est
 * Bronze (× 1) ; Argent garde 15 % de commission en plus, Or 30 %, Platine 40 %.
 */
export const TIER_KEEP_BONUS_PCT: Record<SellerTier, number> = {
  BRONZE: 0,
  SILVER: 15,
  GOLD: 30,
  PLATINUM: 40,
};

/**
 * QUESTION OUVERTE (non tranchée) : le backend actuel (VendorProfile.
 * certification_tier, cf. frontend/src/services/api/vendors.ts) connaît encore
 * les valeurs BRONZE/SILVER/GOLD/DIAMOND. Le paquet VD-10 (VD-D11.A01) supprime
 * le palier "Diamant" sans indiquer explicitement ce que devient un compte déjà
 * marqué DIAMOND. En attendant cet arbitrage on ne casse rien : on l'affiche au
 * palier affiché le plus proche (Platine) — jamais un 5e palier visible.
 */
export function mapLegacyTier(code: string | null | undefined): SellerTier {
  switch (code) {
    case 'DIAMOND':
      return 'PLATINUM';
    case 'GOLD':
      return 'GOLD';
    case 'SILVER':
      return 'SILVER';
    default:
      return 'BRONZE';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST SCORE — VD-10 §SCO (six critères pondérés)
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreCriterion {
  key: 'punctuality' | 'quality' | 'satisfaction' | 'disputes' | 'documents' | 'seniority';
  weight: number;
}

/** Pondération verrouillée par la spec (règle C1) — jamais recalculée côté client. */
export const SCORE_CRITERIA: ScoreCriterion[] = [
  { key: 'punctuality', weight: 25 },
  { key: 'quality', weight: 20 },
  { key: 'satisfaction', weight: 20 },
  { key: 'disputes', weight: 15 },
  { key: 'documents', weight: 10 },
  { key: 'seniority', weight: 10 },
];

// ─────────────────────────────────────────────────────────────────────────────
// PLANS — VD-10 §PLN (jamais les anciens taux 20/18/12/10/5 %)
// ─────────────────────────────────────────────────────────────────────────────

export type SellerPlanKey = 'FREE' | 'BOOST' | 'PRO' | 'CUSTOM';

/**
 * Pont avec l'ancien catalogue backend (FREE/STARTER/PRO/BUSINESS) vers les
 * noms produit actuels (VD-D11.A13) : Free/Boost/Pro/Sur-mesure.
 */
export function mapLegacyPlanCode(code: string): SellerPlanKey {
  switch (code) {
    case 'STARTER':
      return 'BOOST';
    case 'PRO':
      return 'PRO';
    case 'BUSINESS':
      return 'CUSTOM';
    default:
      return 'FREE';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT
// ─────────────────────────────────────────────────────────────────────────────

/** Numéro WhatsApp support unique — repris de app/layout/Header.tsx et Footer.tsx. */
export const SUPPORT_WHATSAPP_NUMBER = '237689002812';

export function buildWhatsAppSupportLink(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
