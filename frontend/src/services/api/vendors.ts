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
  getPlatformSettings: async (): Promise<PlatformSettings> => {
    const token = localStorage.getItem('access_token');
    return http<PlatformSettings>('/api/vendors/admin/settings/', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },
};