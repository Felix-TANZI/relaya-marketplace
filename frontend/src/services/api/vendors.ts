// frontend/src/services/api/vendors.ts
// Service API — espace vendeur BelivaY.
// Types alignés sur le cycle de vie complet du backend.

import { http } from './http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — CYCLE DE VIE
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

/**
 * Statuts de livraison — cycle complet.
 * Le vendeur agit uniquement sur :
 *   PAID_IN_ESCROW → VENDOR_ACKNOWLEDGED → PREPARING → READY_FOR_PICKUP
 * Les autres sont déclenchés par le livreur, l'acheteur ou le système.
 */
export type FulfillmentStatus =
  | 'CREATED'
  | 'PAID_IN_ESCROW'
  | 'VENDOR_ACKNOWLEDGED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'DRIVER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'BUYER_CONFIRMED'
  | 'AUTO_CONFIRMED'
  | 'RELEASED_TO_VENDOR'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'REFUNDED';

export type EscrowStatus =
  | 'PENDING'
  | 'BLOCKED'
  | 'RELEASE_PENDING'
  | 'RELEASED'
  | 'REFUNDED'
  | 'PARTIAL_REFUNDED';

/**
 * Transitions autorisées pour le vendeur — source de vérité frontend.
 * Le backend les valide également : ce tableau permet de désactiver
 * les boutons non pertinents avant l'appel API.
 */
export const VENDOR_ALLOWED_TRANSITIONS: Partial<Record<FulfillmentStatus, FulfillmentStatus[]>> = {
  PAID_IN_ESCROW:      ['VENDOR_ACKNOWLEDGED', 'CANCELLED'],
  VENDOR_ACKNOWLEDGED: ['PREPARING', 'CANCELLED'],
  PREPARING:           ['READY_FOR_PICKUP'],
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface VendorProfile {
  id:                   number;
  username:             string;
  email:                string;
  business_name:        string;
  business_description: string;
  phone:                string;
  address:              string;
  city:                 string;
  id_document:          string;
  status:               'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  created_at:           string;
  updated_at:           string;
  approved_at:          string | null;
}

export interface VendorApplication {
  business_name:        string;
  business_description: string;
  phone:                string;
  address:              string;
  city:                 string;
  id_document:          string;
}

export interface VendorStats {
  total_products:  number;
  active_products: number;
  total_orders:    number;
  total_revenue:   string;
}

export interface ProductImage {
  id:         number;
  image:      string;
  image_url:  string;
  is_primary: boolean;
  order:      number;
  created_at: string;
}

export interface VendorProduct {
  id:             number;
  title:          string;
  description:    string;
  price_xaf:      number;
  stock_quantity: number;
  is_active:      boolean;
  category:       number;
  created_at:     string;
  images?:        ProductImage[];
}

export interface VendorOrderItem {
  id:             number;
  product:        number;
  product_title:  string;
  product_image:  string | null;
  product_price:  number;
  qty:            number;
  line_total_xaf: number;
  created_at:     string;
}

export interface VendorOrder {
  // Identifiants
  id:      number;
  city:    string;
  address: string;
  note:    string | null;

  // Client — masqué par le backend
  // customer_name  : "Acheteur #XXXX" (code anonyme)
  // customer_phone : "Confidentiel"
  customer_name:  string;
  customer_phone: string;

  // Statuts
  payment_status:             PaymentStatus;
  payment_status_display:     string;
  fulfillment_status:         FulfillmentStatus;
  fulfillment_status_display: string;
  escrow_status:              EscrowStatus;
  escrow_status_display:      string;

  // Timing et commission
  vendor_reply_deadline:    string | null;
  commission_rate_snapshot: string; // Decimal sérialisé en string par DRF

  // Montants bruts
  subtotal_xaf:     number;
  delivery_fee_xaf: number;
  total_xaf:        number;

  // Finances vendeur (calculées sur ses articles uniquement)
  vendor_subtotal:   number; // Sous-total avant commission
  commission_rate:   number; // = parseFloat(commission_rate_snapshot)
  commission_amount: number; // BelivaY prélève ce montant
  vendor_net_amount: number; // vendor_subtotal - commission_amount

  // Articles filtrés sur ce vendeur uniquement
  items: VendorOrderItem[];

  // Flags
  is_paid:          boolean;
  can_be_fulfilled: boolean;

  // Horodatages
  created_at: string;
  updated_at: string;
}

export interface VendorOrderFilters {
  payment_status?:     PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
  escrow_status?:      EscrowStatus;
}

/**
 * Paramètres plateforme — chargés depuis l'API, jamais codés en dur.
 * Le frontend les utilise pour afficher les taux, délais, etc.
 */
export interface PlatformSettings {
  id: number;
  platform_commission_percent: string;
  mobile_money_fee_percent:    string;
  delivery_fees:               Record<string, number>;
  vendor_reply_h:              number;
  escrow_auto_confirm_h:       number;
  escrow_release_h:            number;
  litige_window_days:          number;
  minimum_order_amount_xaf:    number;
  default_delivery_days:       number;
  mtn_momo_enabled:            boolean;
  orange_money_enabled:        boolean;
  admin_email:                 string;
  support_email:               string;
  maintenance_mode:            boolean;
  maintenance_message:         string;
  updated_at:                  string;
  updated_by_name:             string;
}


export interface VendorOrderNote {
  order_id:   number;
  content:    string;        // Vide si aucune note
  updated_at: string | null; // null si jamais sauvegardée
}

// ─────────────────────────────────────────────────────────────────────────────
// PAIEMENTS & RETRAITS
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  date:     string; // ISO date YYYY-MM-DD
  released: number; // Montant net libéré ce jour
  blocked:  number; // Montant net bloqué ce jour
}

export interface PendingWithdrawal {
  id:         number;
  reference:  string;
  amount_xaf: number;
  fee_xaf:    number;
  net_xaf:    number;
  operator:   'ORANGE_MONEY' | 'MTN_MOMO';
  phone:      string;
  created_at: string;
}

export interface VendorPaymentSummary {
  // Soldes
  total_released_xaf:        number; // Fonds libérés (versés)
  total_blocked_xaf:         number; // En escrow (bloqué)
  total_release_pending_xaf: number; // En cours de libération (24h)
  total_gross_xaf:           number; // CA brut total (libéré)
  total_commission_xaf:      number; // Commission BelivaY prélevée
  released_orders_count:     number;
  blocked_orders_count:      number;

  // Paramètres depuis PlatformSettings (jamais codés en dur)
  commission_rate:         string; // Decimal → string
  withdrawal_fee_percent:  string; // Decimal → string
  minimum_withdrawal_xaf:  number;

  // Projection et graphique
  projection_monthly_xaf: number;
  chart_30_days:          ChartDataPoint[];

  // Retrait en cours (null si aucun)
  pending_withdrawal: PendingWithdrawal | null;
}

export type WithdrawalOperator = 'ORANGE_MONEY' | 'MTN_MOMO';
export type WithdrawalStatus  = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface WithdrawalRequest {
  id:                  number;
  reference:           string;
  amount_xaf:          number;
  fee_percent_snapshot: string;
  fee_amount_xaf:      number;
  net_amount_xaf:      number;
  operator:            WithdrawalOperator;
  operator_display:    string;
  phone_number:        string;
  status:              WithdrawalStatus;
  status_display:      string;
  admin_note:          string;
  processed_at:        string | null;
  created_at:          string;
  updated_at:          string;
}

export interface WithdrawalCreatePayload {
  amount_xaf:   number;
  operator:     WithdrawalOperator;
  phone_number: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LITIGES VENDEUR
// ─────────────────────────────────────────────────────────────────────────────

export type DisputeStatus    = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type VendorReplyType  = 'ACCEPT' | 'CONTEST' | 'COMPROMISE';
export type DisputeSenderRole = 'VENDOR' | 'ADMIN' | 'SYSTEM';

export interface VendorDisputeMessage {
  id:             number;
  sender_display: string;   // "Admin BelivaY" pour les admins, nom boutique pour vendeur
  sender_role:    DisputeSenderRole;
  message:        string;
  created_at:     string;
}

export interface VendorDisputeEvidence {
  id:               number;
  file_url:         string;
  description:      string;
  uploaded_by_name: string;
  created_at:       string;
}

export interface VendorDisputeListItem {
  id:                   number;
  order:                number;
  order_ref:            string;    // "BLV-00042"
  order_total_xaf:      number;
  vendor_escrow_amount: number;    // Montant vendeur en escrow sur cette commande
  reason:               string;
  reason_display:       string;
  status:               DisputeStatus;
  status_display:       string;
  description:          string;    // Plainte acheteur — visible vendeur
  vendor_contacted:     boolean;   // Admin a initié le contact
  vendor_replied:       boolean;   // Vendeur a soumis sa réponse formelle
  vendor_reply_type:    VendorReplyType | null;
  vendor_reply_display: string | null;
  vendor_deadline_iso:  string;    // ISO datetime — deadline réponse vendeur
  hours_remaining:      number;    // Heures restantes (0 si dépassé)
  assigned_admin_name:  string | null;
  unread_messages:      number;
  created_at:           string;
  updated_at:           string;
}

export interface VendorDisputeDetail extends VendorDisputeListItem {
  resolution:            string | null;
  resolution_note:       string | null;
  refund_amount_xaf:     number | null;
  vendor_reply_text:     string;
  vendor_proposed_amount: number | null;
  vendor_replied_at:     string | null;
  messages:              VendorDisputeMessage[];
  evidences:             VendorDisputeEvidence[];
  resolved_at:           string | null;
}

export interface VendorDisputeReplyPayload {
  reply_type:      VendorReplyType;
  reply_text:      string;
  proposed_amount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUITS VENDEUR — TYPES ENRICHIS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductAttribute {
  id:             number;
  name:           string;
  attribute_type: 'SIZE' | 'COLOR' | 'MATERIAL' | 'OTHER';
  values:         string[];    // Valeurs définies par l'admin
  is_required:    boolean;
  display_order:  number;
}

export interface ProductAttributeValue {
  attribute:       ProductAttribute;
  selected_values: string[];   // Valeurs choisies par le vendeur
}

export interface VendorProductEnriched {
  id:                number;
  title:             string;
  slug:              string;
  description:       string;
  short_description: string;
  sku:               string;
  price_xaf:         number;
  compare_at_price:  number | null;  // Prix barré
  promo_end_date:    string | null;  // YYYY-MM-DD
  discount:          number;         // Legacy (%)
  discount_percent:  number;         // Calculé depuis compare_at_price ou discount
  is_on_promotion:   boolean;
  is_active:         boolean;
  stock_quantity:    number;
  stock_threshold:   number | null;  // Seuil alerte par produit (null = global)
  category: {
    id:   number;
    name: string;
    slug: string;
  };
  images:           ProductImage[];
  attribute_values: ProductAttributeValue[];
  rating_average:   number | null;
  reviews_count:    number;
  created_at:       string;
  updated_at:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOUTIQUE / PLANS / CERTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface ShopInfo {
  slug:                 string;
  business_name:        string;
  business_description: string;
  city:                 string;
  whatsapp_phone:       string;
  preparation_delay:    '24H' | '48H' | '72H' | 'CUSTOM';
  return_policy:        string;
  banner_url:           string | null;
  photo_url:            string | null;
  certification_tier:   'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  is_online:            boolean;
  public_url:           string | null;
  shop_slug:            string;
}

export interface PublicShop extends ShopInfo {
  member_since: string;
  stats: {
    total_products: number;
    avg_rating:     number | null;
    reviews_count:  number;
  };
  products: VendorProduct[];
}

export interface SubscriptionPlan {
  id:               number;
  code:             'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
  name:             string;
  description:      string;
  price_monthly_xaf: number;
  price_annual_xaf:  number;
  commission_rate:  number;
  max_products:     number | null;
  max_boosts_month: number;
  features:         string[];
  is_current:       boolean;
  is_popular:       boolean;
}

export interface PlansResponse {
  plans:            SubscriptionPlan[];
  current_plan:     { code: string; name: string; expires_at: string | null };
  active_plan_code: string;
}

export interface SubscribePayload {
  plan_code:     string;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  operator:      'ORANGE_MONEY' | 'MTN_MOMO';
  phone_number:  string;
}

export interface CertificationTierInfo {
  code:        string;
  label:       string;
  threshold:   number;
  benefits:    string[];
  is_current:  boolean;
  is_unlocked: boolean;
}

export interface CertificationData {
  total_points:       number;
  current_tier:       string;
  current_tier_label: string;
  next_tier:          string | null;
  next_tier_label:    string | null;
  next_threshold:     number;
  progress_pct:       number;
  points_remaining:   number;
  breakdown: Record<string, { points: number; detail: string }>;
  tiers:     CertificationTierInfo[];
  how_to_earn: { action: string; points: string }[];
}
// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const vendorsApi = {

  // ── Profil ────────────────────────────────────────────────────────────────

  apply: async (data: VendorApplication): Promise<VendorProfile> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProfile>('/api/vendors/apply/', {
      method: 'POST',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  getProfile: async (): Promise<VendorProfile> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProfile>('/api/vendors/profile/', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  getStats: async (): Promise<VendorStats> => {
    const token = localStorage.getItem('access_token');
    return http<VendorStats>('/api/vendors/stats/', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  // ── Produits ──────────────────────────────────────────────────────────────

  getProducts: async (): Promise<VendorProduct[]> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProduct[]>('/api/vendors/products/', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  createProduct: async (data: Partial<VendorProduct>): Promise<VendorProduct> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProduct>('/api/vendors/products/', {
      method: 'POST',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  updateProduct: async (id: number, data: Partial<VendorProduct>): Promise<VendorProduct> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProduct>(`/api/vendors/products/${id}/`, {
      method: 'PATCH',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  deleteProduct: async (id: number): Promise<void> => {
    const token = localStorage.getItem('access_token');
    await http<void>(`/api/vendors/products/${id}/`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  uploadImage: async (productId: number, file: File, isPrimary = false): Promise<ProductImage> => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('is_primary', isPrimary.toString());
    const res = await fetch(
      `http://localhost:8000/api/vendors/products/${productId}/images/`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  deleteImage: async (productId: number, imageId: number): Promise<void> => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(
      `http://localhost:8000/api/vendors/products/${productId}/images/${imageId}/`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  setPrimaryImage: async (productId: number, imageId: number): Promise<ProductImage> => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(
      `http://localhost:8000/api/vendors/products/${productId}/images/${imageId}/set-primary/`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ── Commandes ─────────────────────────────────────────────────────────────

  getOrders: async (filters?: VendorOrderFilters): Promise<VendorOrder[]> => {
    const token  = localStorage.getItem('access_token');
    const params = new URLSearchParams();
    if (filters?.payment_status)     params.append('payment_status',    filters.payment_status);
    if (filters?.fulfillment_status) params.append('fulfillment_status', filters.fulfillment_status);
    if (filters?.escrow_status)      params.append('escrow_status',      filters.escrow_status);
    const qs  = params.toString();
    const url = `/api/vendors/orders/${qs ? `?${qs}` : ''}`;
    return http<VendorOrder[]>(url, { headers: { Authorization: `Bearer ${token}` } });
  },

  getOrderDetail: async (orderId: number): Promise<VendorOrder> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrder>(`/api/vendors/orders/${orderId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Transition statut livraison — vendeur uniquement.
   * Seules les transitions de VENDOR_ALLOWED_TRANSITIONS sont acceptées par le backend.
   */
  updateFulfillmentStatus: async (
    orderId: number,
    data: { fulfillment_status: FulfillmentStatus },
  ): Promise<VendorOrder> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrder>(`/api/vendors/orders/${orderId}/fulfillment-status/`, {
      method: 'PATCH',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  /** Mise à jour statut paiement — admin / système paiement uniquement. */
  updatePaymentStatus: async (
    orderId: number,
    data: { payment_status: PaymentStatus },
  ): Promise<VendorOrder> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrder>(`/api/vendors/orders/${orderId}/payment-status/`, {
      method: 'PATCH',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  // ── Paramètres plateforme ─────────────────────────────────────────────────

  /**
   * Charge les paramètres depuis l'API.
   * Aucune valeur (commission, délais, frais) n'est codée en dur dans le frontend.
   */
  /**
   * Mettre à jour le statut d'une commande (compatibilité ascendante)
   * Préférer updateFulfillmentStatus pour les nouvelles pages.
   */
  updateOrderStatus: async (orderId: number, status: string): Promise<VendorOrder> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrder>(`/api/vendors/orders/${orderId}/status/`, {
      method: 'PATCH',
      body:   JSON.stringify({ status }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  getPlatformSettings: async (): Promise<PlatformSettings> => {
    const token = localStorage.getItem('access_token');
    return http<PlatformSettings>('/api/vendors/admin/settings/', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },


  // ── Paiements & Escrow ───────────────────────────────────────────────────

  /**
   * Résumé financier complet du vendeur.
   * Toutes les valeurs de configuration (taux, frais, min) viennent
   * de PlatformSettings — jamais codées en dur côté frontend.
   */
  getPaymentSummary: async (): Promise<VendorPaymentSummary> => {
    const token = localStorage.getItem('access_token');
    return http<VendorPaymentSummary>('/api/vendors/payments/summary/', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /** Liste des demandes de retrait du vendeur. */
  getWithdrawals: async (): Promise<WithdrawalRequest[]> => {
    const token = localStorage.getItem('access_token');
    return http<WithdrawalRequest[]>('/api/vendors/withdrawals/', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Soumet une demande de retrait Mobile Money.
   * Les frais sont calculés côté backend (PlatformSettings.withdrawal_fee_percent).
   * Un seul retrait PENDING autorisé à la fois.
   */
  createWithdrawal: async (data: WithdrawalCreatePayload): Promise<WithdrawalRequest> => {
    const token = localStorage.getItem('access_token');
    return http<WithdrawalRequest>('/api/vendors/withdrawals/create/', {
      method: 'POST',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  /** Annule une demande de retrait PENDING. */
  cancelWithdrawal: async (withdrawalId: number): Promise<WithdrawalRequest> => {
    const token = localStorage.getItem('access_token');
    return http<WithdrawalRequest>(`/api/vendors/withdrawals/${withdrawalId}/cancel/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },


  // ── Produits — actions enrichies ─────────────────────────────────────────

  /**
   * Récupère les attributs disponibles pour une catégorie.
   * Utilisé dans le formulaire produit pour charger les options dynamiquement.
   */
  getProductAttributes: async (categoryId: number): Promise<ProductAttribute[]> => {
    const token = localStorage.getItem('access_token');
    return http<ProductAttribute[]>(`/api/vendors/products/attributes/?category=${categoryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /** Duplique un produit (nouveau titre, stock=0, inactif). */
  duplicateProduct: async (productId: number): Promise<VendorProductEnriched> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProductEnriched>(`/api/vendors/products/${productId}/duplicate/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Met à jour le stock directement depuis la liste (sans formulaire).
   * Aussi accepte stock_threshold optionnel.
   */
  updateProductStock: async (
    productId: number,
    quantity: number,
    stockThreshold?: number | null,
  ): Promise<VendorProductEnriched> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProductEnriched>(`/api/vendors/products/${productId}/stock/`, {
      method: 'PATCH',
      body:   JSON.stringify({ quantity, stock_threshold: stockThreshold }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  /** Télécharge la liste produits en CSV. */
  exportProductsCSV: async (): Promise<Blob> => {
    const token = localStorage.getItem('access_token');
    const res   = await fetch('/api/vendors/products/export/csv/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur export CSV');
    return res.blob();
  },

  /** Importe des produits depuis un fichier CSV. */
  importProductsCSV: async (file: File): Promise<{ created: number; errors: { ligne: number; erreur: string }[]; message: string }> => {
    const token = localStorage.getItem('access_token');
    const form  = new FormData();
    form.append('file', file);
    return http(`/api/vendors/products/import/csv/`, {
      method: 'POST',
      body:   form,
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Ouvre la fiche produit HTML dans un overlay imprimable.
   * Même approche que openInvoice dans orderUtils.ts.
   */
  openProductSheet: async (productId: number): Promise<void> => {
    const token = localStorage.getItem('access_token');
    const data  = await http<{ html: string; filename: string }>(
      `/api/vendors/products/${productId}/pdf/`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    // Ouvrir dans un overlay iframe imprimable
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      border: 'none', zIndex: '9999', background: '#F5F0E8',
    });
    document.body.appendChild(iframe);
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(data.html);
    iframe.contentDocument?.close();
    // Bouton fermeture
    const closeBtn = document.createElement('button');
    Object.assign(closeBtn.style, {
      position: 'fixed', top: '16px', right: '16px', zIndex: '10000',
      padding: '8px 18px', background: '#F47920', color: '#fff',
      border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700',
    });
    closeBtn.textContent = 'Fermer';
    closeBtn.onclick = () => {
      document.body.removeChild(iframe);
      document.body.removeChild(closeBtn);
    };
    document.body.appendChild(closeBtn);
  },
  // ── Litiges vendeur ──────────────────────────────────────────────────────

  /** Liste des litiges sur les commandes du vendeur. */
  getDisputes: async (filter?: 'urgent' | 'mediation' | 'closed'): Promise<VendorDisputeListItem[]> => {
    const token = localStorage.getItem('access_token');
    const qs    = filter ? `?filter=${filter}` : '';
    return http<VendorDisputeListItem[]>(`/api/vendors/disputes/${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /** Détail d'un litige avec messages et pièces jointes. */
  getDisputeDetail: async (disputeId: number): Promise<VendorDisputeDetail> => {
    const token = localStorage.getItem('access_token');
    return http<VendorDisputeDetail>(`/api/vendors/disputes/${disputeId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Soumet la réponse formelle du vendeur (formulaire séparé du chat).
   * Ne génère pas de message dans le fil de discussion.
   */
  submitDisputeReply: async (disputeId: number, data: VendorDisputeReplyPayload): Promise<VendorDisputeDetail> => {
    const token = localStorage.getItem('access_token');
    return http<VendorDisputeDetail>(`/api/vendors/disputes/${disputeId}/reply/`, {
      method: 'POST',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  /** Envoyer un message à l'admin dans le cadre d'un litige. */
  sendDisputeMessage: async (disputeId: number, message: string): Promise<VendorDisputeMessage> => {
    const token = localStorage.getItem('access_token');
    return http<VendorDisputeMessage>(`/api/vendors/disputes/${disputeId}/messages/`, {
      method: 'POST',
      body:   JSON.stringify({ message }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Upload une pièce jointe pour un litige.
   * Utilise FormData (multipart/form-data).
   */
  uploadDisputeEvidence: async (disputeId: number, file: File, description?: string): Promise<VendorDisputeEvidence> => {
    const token = localStorage.getItem('access_token');
    const form  = new FormData();
    form.append('file', file);
    if (description) form.append('description', description);
    return http<VendorDisputeEvidence>(`/api/vendors/disputes/${disputeId}/evidences/`, {
      method: 'POST',
      body:   form,
      headers: { Authorization: `Bearer ${token}` }, // pas de Content-Type → auto multipart
    });
  },

  // ── Boutique ──────────────────────────────────────────────────────────────

  updateShop: async (data: Partial<ShopInfo>): Promise<ShopInfo> => {
    const token = localStorage.getItem('access_token');
    return http<ShopInfo>('/api/vendors/shop/update/', {
      method: 'PATCH',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  uploadShopPhoto: async (file: File): Promise<{ photo_url: string }> => {
    const token = localStorage.getItem('access_token');
    const form  = new FormData();
    form.append('photo', file);
    return http<{ photo_url: string }>('/api/vendors/shop/photo/', {
      method: 'POST', body: form,
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  uploadShopBanner: async (file: File): Promise<{ banner_url: string }> => {
    const token = localStorage.getItem('access_token');
    const form  = new FormData();
    form.append('banner', file);
    return http<{ banner_url: string }>('/api/vendors/shop/banner/', {
      method: 'POST', body: form,
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getShopQr: async (): Promise<{ slug: string; public_url: string; shop_name: string }> => {
    const token = localStorage.getItem('access_token');
    return http('/api/vendors/shop/qr/', { headers: { Authorization: `Bearer ${token}` } });
  },

  // ── Certifications ────────────────────────────────────────────────────────

  getCertifications: async (): Promise<CertificationData> => {
    const token = localStorage.getItem('access_token');
    return http<CertificationData>('/api/vendors/certifications/', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // ── Plans ─────────────────────────────────────────────────────────────────

  getPlans: async (): Promise<PlansResponse> => {
    const token = localStorage.getItem('access_token');
    return http<PlansResponse>('/api/vendors/plans/', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  subscribePlan: async (data: SubscribePayload): Promise<{
    message: string; reference: string; plan: string; amount: number; status: string;
  }> => {
    const token = localStorage.getItem('access_token');
    return http('/api/vendors/plans/subscribe/', {
      method: 'POST',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  getSubscriptionHistory: async () => {
    const token = localStorage.getItem('access_token');
    return http('/api/vendors/plans/history/', { headers: { Authorization: `Bearer ${token}` } });
  },

  // ── Note interne vendeur ──────────────────────────────────────────────────

  /**
   * Récupère la note interne du vendeur sur une commande.
   * Retourne { content: '' } si aucune note n'a encore été écrite.
   */
  getNote: async (orderId: number): Promise<VendorOrderNote> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrderNote>(`/api/vendors/orders/${orderId}/note/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Enregistre ou met à jour la note interne sur une commande.
   * Passer content='' pour effacer la note.
   */
  saveNote: async (orderId: number, content: string): Promise<VendorOrderNote> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrderNote>(`/api/vendors/orders/${orderId}/note/`, {
      method: 'PATCH',
      body:   JSON.stringify({ content }),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },
};