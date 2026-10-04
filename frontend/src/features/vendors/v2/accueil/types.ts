// frontend/src/features/vendors/v2/accueil/types.ts
// Types front pour l'écran Accueil (VD-04 / VD-D05). Le backend n'expose pas
// encore GET /seller/today (VD-D05.A04) : ces types sont dérivés côté client
// à partir de vendorsApi.getOrders()/getStats()/getProfile()/getPaymentSummary().

import type { FulfillmentStatus } from '@/services/api/vendors';

export type TodoKind = 'prepare' | 'dispute' | 'return';

/** Sous-ensemble des statuts OrderReturn encore "ouverts" pour le vendeur (accueil/useAccueilData.ts). */
export type OpenReturnStatus = 'REQUESTED' | 'APPROVED' | 'AWAITING_DROPOFF' | 'RECEIVED';

/** Une ligne de la file "à faire", quel que soit son type (ACC-01). */
export interface TodoItem {
  id: string;
  kind: TodoKind;
  orderId: number;
  /** Échéance connue (ISO) — commandes à préparer (vendor_reply_deadline), litiges non
   * encore répondus (vendor_deadline_iso) ou retours reçus en attente d'inspection (+48h). */
  dueAt: string | null;
  productTitle: string;
  productImage: string | null;
  qty: number;
  /** "Vous gardez" (prepare) / montant gelé (dispute, retour) — jamais "commission" (ACC-08). */
  keepAmount: number;
  courierName: string | null;
  /** Toujours false : aucun champ COD/payable-au-retrait sur VendorOrder aujourd'hui. */
  isPayableOnPickup: boolean;
  createdAt: string;
  /** Statut de départ pour "C'est prêt" (kind 'prepare' uniquement) — sert à
   * rejouer les transitions PATCH une à une en l'absence de POST /orders/{id}/ready. */
  fulfillmentStatus?: FulfillmentStatus;

  // ── kind === 'dispute' (vendorsApi.getDisputes(), ACC-04/05) ─────────────
  /** Identifiant réel du litige — sert à ouvrir la bonne fiche (/seller/v2/litiges/:id). */
  disputeId?: number;
  /** "Le client dit : « … »" — reason_display du litige, jamais un texte inventé. */
  disputeReason?: string | null;
  /** Vrai si le vendeur a déjà répondu : le litige est en médiation, plus de compte à rebours vendeur. */
  disputeReplied?: boolean;

  // ── kind === 'return' (vendorsApi.getReturns(), ACC-06) ──────────────────
  /** Identifiant réel du retour — sert à ouvrir la bonne fiche (/seller/v2/retours/:id). */
  returnId?: number;
  returnStatus?: OpenReturnStatus;
  /** Code brut du motif de retour (ex. HIDDEN_DEFECT) — libellé résolu au rendu. */
  returnReasonCode?: string;
  /** Date de réception réelle du colis retourné chez le vendeur, si déjà arrivé. */
  returnReceivedAt?: string | null;
}

export type LaunchTier = 'BRONZE' | 'ARGENT' | 'OR' | 'PLATINE';

export interface LaunchTierInfo {
  current: LaunchTier;
  activeProducts: number;
  nextThreshold: number | null; // null = déjà Platine
  thresholds: { argent: number; or: number; platine: number };
}

export interface OnboardingGesture {
  key: 'add_product' | 'set_hours' | 'verify_payout';
  done: boolean;
  path: string;
}

export type AccueilVariant = 'offline' | 'suspended' | 'first_day' | 'empty' | 'todo';

/** Produit sous son seuil de stock, prêt à afficher en carte riche (ACC-06). */
export interface LowStockItem {
  productId: number;
  title: string;
  image: string | null;
  quantityLeft: number;
  threshold: number;
}

export interface AccueilState {
  variant: AccueilVariant;
  loading: boolean;
  error: string | null;
  shopName: string;
  /** Prénom dérivé pour la salutation ("Bonjour Franck") — voir format.ts:deriveFirstName. */
  firstName: string;
  /** VendorProfile.id — sert de clé de persistance locale (ex. "Masquer" de ScoreApproachingCard). */
  vendorId: number | null;
  isPrepAccess: boolean; // rôle "Préparation" — pas encore de rôle distinct en session (ACC-26, gap noté)
  /** Prénom du compte "Préparation" connecté (identité bar + salutation, ACC-26) — toujours
   * null aujourd'hui : aucune session de rôle distincte n'existe encore côté backend pour le
   * renseigner. Le rendu qui en dépend (ShopIdentityBar, salutation) est déjà câblé pour le
   * jour où ce champ sera rempli ; en attendant il retombe sur un libellé générique "Accès
   * Préparation" sans nom (voir sl6_accueil.prep_role_label). */
  staffFirstName: string | null;
  todos: TodoItem[];
  /** Nombre total de produits sous leur seuil (tous, pas seulement lowStockItem). */
  lowStockCount: number;
  /** Le produit le plus urgent en stock bas, prêt pour une carte riche (photo, quantité, seuil). */
  lowStockItem: LowStockItem | null;
  launchTier: LaunchTierInfo | null;
  gestures: OnboardingGesture[];
  /** Déjà libéré de l'escrow (à verser + versé) — "Gagné avec BelivaY" cumulé (ACC-12/A12). */
  lifetimeEarnedXaf: number | null;
  /** Encore en escrow mais sur le point de se libérer (VD-09 "se libère"). */
  releasingXaf: number | null;
  /** Prochain versement — toujours un vendredi (KYC-04). */
  nextPayoutLabel: string | null;
  /** Montant en attente de ce prochain versement ("à verser"). */
  nextPayoutAmountXaf: number | null;
  /** Nombre total de commandes (lifetime — aucun endpoint mensuel aujourd'hui, VD-D05.A12 gap). */
  totalOrdersCount: number | null;
  /** Heure du dernier chargement réussi — affichée dans le bandeau "hors connexion" (OFF-01). */
  lastLoadedAt: string | null;
}
