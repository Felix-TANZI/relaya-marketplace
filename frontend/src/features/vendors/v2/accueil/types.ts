// frontend/src/features/vendors/v2/accueil/types.ts
// Types front pour l'écran Accueil (VD-04 / VD-D05). Le backend n'expose pas
// encore GET /seller/today (VD-D05.A04) : ces types sont dérivés côté client
// à partir de vendorsApi.getOrders()/getStats()/getProfile()/getPaymentSummary().

import type { FulfillmentStatus } from '@/services/api/vendors';

export type TodoKind = 'prepare' | 'dispute' | 'return';

/** Une ligne de la file "à faire", quel que soit son type (ACC-01). */
export interface TodoItem {
  id: string;
  kind: TodoKind;
  orderId: number;
  /** Échéance connue (ISO) — seules les commandes à préparer en ont une côté API actuelle. */
  dueAt: string | null;
  productTitle: string;
  productImage: string | null;
  qty: number;
  /** "Vous gardez" (vendor_net_amount) — jamais "commission" (ACC-08). */
  keepAmount: number;
  courierName: string | null;
  /** Toujours false : aucun champ COD/payable-au-retrait sur VendorOrder aujourd'hui. */
  isPayableOnPickup: boolean;
  createdAt: string;
  /** Statut de départ pour "C'est prêt" (kind 'prepare' uniquement) — sert à
   * rejouer les transitions PATCH une à une en l'absence de POST /orders/{id}/ready. */
  fulfillmentStatus?: FulfillmentStatus;
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

export interface AccueilState {
  variant: AccueilVariant;
  loading: boolean;
  error: string | null;
  shopName: string;
  isPrepAccess: boolean; // rôle "Préparation" — pas encore de rôle distinct en session (ACC-26, gap noté)
  todos: TodoItem[];
  lowStockCount: number;
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
