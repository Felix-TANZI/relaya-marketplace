// frontend/src/features/vendors/v2/catalogue/types.ts
// Types front pour "Mes produits" / "Une offre" / "Nouvelle offre" (VD-08,
// espace_vendeur_synthese_detail/batch5_VD06-08.md §3). Aucun endpoint dédié
// (GET /offers, GET /offers/{id}/price-advice, POST /sheet-requests,
// PUT /offers/{id} {cod_allowed}) n'existe côté backend à ce jour : tout ici
// dérive de vendorsApi (products/masters/conditions/disputes) — voir helpers.ts
// pour le détail de chaque pont et de ses limites documentées.

import type {
  MasterFiche,
  ProductCondition,
  VendorProduct,
} from '@/services/api/vendors';
import type { CommissionFamily, CommissionTier } from '@/services/api/vendorsV2';

// ── Mes produits (PRD-01 à PRD-07) ──────────────────────────────────────────

/** Un seul des quatre sujets d'attention réellement détectables aujourd'hui (PRD-05). */
export type ProductAttentionType = 'low_stock' | 'cheaper' | 'moderation' | 'dispute';

export interface ProductAttention {
  type: ProductAttentionType;
  /** Libellé déjà traduit (i18n), prêt à afficher sur la bande. */
  label: string;
  /** Libellé déjà traduit du bouton d'action de la bande. */
  actionLabel: string;
}

/** État simplifié pour le liseré (PRD-06). "moderation" n'est jamais posé
 * aujourd'hui : aucun champ ne distingue "en vérification" de "en pause"
 * sur VendorProduct (seul is_active existe) — voir helpers.ts::stateOf. */
export type ProductCardState = 'selling' | 'moderation' | 'paused';

export interface ProductListItem {
  product: VendorProduct;
  state: ProductCardState;
  attentions: ProductAttention[];
  /** "Vous gardez" par vente — estimation locale (voir helpers.ts::keptPerSale). */
  keptPerSaleXaf: number;
  primaryImageUrl: string | null;
  /** Résumé "Ce mois" (ventes réglées + ventes gelées par litige) — voir helpers.ts::useMonthlyProductStats. */
  monthly: MonthlyProductStats;
}

/**
 * Résumé mensuel par produit (Produits.jpg : "Ce mois : 3 ventes · 53 520 F
 * gardés" / "Ce mois : 2 ventes en litige · 670 648 F gelés"). Reconstruit
 * depuis vendorsApi.getOrders() — voir helpers.ts::useMonthlyProductStats
 * pour le détail et les approximations assumées (pas d'endpoint dédié).
 */
export interface MonthlyProductStats {
  /** Lignes livrées et réglées ce mois-ci (escrow_status RELEASED). */
  salesCount: number;
  /** Montant gardé correspondant (approximé, voir helpers.ts). */
  keptXaf: number;
  /** Lignes actuellement gelées par un litige ce mois-ci. */
  disputedSalesCount: number;
  /** Montant qui serait gardé une fois le litige résolu (approximé). */
  frozenXaf: number;
}

// ── Une offre (OFR-01 à OFR-05) ─────────────────────────────────────────────

export interface OfferZoneInfo {
  name: string;
  first: boolean;
}

// ── Nouvelle offre — brouillon porté en mémoire le temps des 4 étapes ───────
// (DUP-03/REC-01 : le produit n'est créé qu'à la publication ou au brouillon,
// jamais avant, pour ne pas laisser d'offres fantômes si le vendeur abandonne.)

export type WizardStep = 1 | 2 | 3 | 4;

export interface DraftPhoto {
  file: File;
  previewUrl: string;
}

export interface NewOfferDraft {
  // Étape 1 — produit
  master: MasterFiche | null;
  /** Texte tapé par le vendeur — réutilisé pour préremplir "Demander une fiche". */
  searchQuery: string;

  // Étape 2 — photos réelles (3 à 8, PHO-01)
  photos: DraftPhoto[];

  // Étape 3 — stock, état, prix
  color: string;
  stockQuantity: string;
  conditionId: number | null;
  priceXaf: string;
  weightKg: string;
  dimensionsCm: string;

  // Bridge duplication (DUP-01) : produit déjà créé côté serveur par
  // vendorsApi.duplicateProduct(), on saute l'étape 1 et on édite ce brouillon.
  duplicateOfProductId: number | null;
}

export function emptyDraft(): NewOfferDraft {
  return {
    master: null,
    searchQuery: '',
    photos: [],
    color: '',
    stockQuantity: '',
    conditionId: null,
    priceXaf: '',
    weightKg: '',
    dimensionsCm: '',
    duplicateOfProductId: null,
  };
}

export type { MasterFiche, ProductCondition, CommissionFamily, CommissionTier };
