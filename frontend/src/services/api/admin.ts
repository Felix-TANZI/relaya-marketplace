// frontend/src/services/api/admin.ts
// Service API pour l'administration BelivaY

import { http } from './http';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER AUTH
// ─────────────────────────────────────────────────────────────────────────────

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// VENDORS
// ─────────────────────────────────────────────────────────────────────────────

export interface VendorProfile {
  id:                   number;
  // Champs utilisateur (rétrocompat + nouveaux)
  username:             string;
  email:                string;
  user_id:              number;
  user_email:           string;
  user_full_name:       string;
  // Boutique
  business_name:        string;
  business_description: string;
  phone:                string;
  address:              string;
  city:                 string;
  shop_slug:            string | null;
  id_document:          string;
  status:               'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  // Plan & certification
  plan_code:            'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | null;
  plan_name:            string;
  certification_tier:   'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  total_points?:        number;
  // Métriques
  total_products:       number;
  active_products:      number;
  total_revenue:        number;
  total_orders:         number;
  // Dates
  created_at:           string;
  updated_at:           string;
  approved_at:          string | null;
}

export interface VendorStats {
  kpis: {
    total:     number;
    pending:   number;
    approved:  number;
    rejected:  number;
    suspended: number;
    new_week:  number;
    new_month: number;
    gmv_total: number;
    gmv_month: number;
  };
  gmv_chart:            Array<{ date: string; revenue: number }>;
  status_distribution:  Array<{ status: string; label: string; count: number }>;
  plan_distribution:    Array<{ plan: string; count: number }>;
  cert_distribution:    Array<{ tier: string; count: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  total_users:       number;
  new_users_today:   number;
  new_users_week:    number;
  new_users_month:   number;
  total_vendors:     number;
  pending_vendors:   number;
  approved_vendors:  number;
  rejected_vendors:  number;
  suspended_vendors: number;
  total_products:    number;
  active_products:   number;
  inactive_products: number;
  total_orders:      number;
  pending_orders:    number;
  processing_orders: number;
  shipped_orders:    number;
  delivered_orders:  number;
  cancelled_orders:  number;
  revenue_total:     number;
  revenue_today:     number;
  revenue_week:      number;
  revenue_month:     number;
  paid_orders:       number;
  unpaid_orders:     number;
  failed_payments:   number;
}

export interface RevenueDataPoint {
  date:    string;
  revenue: number;
  orders:  number;
}

export interface TopProduct {
  product_id:     number;
  product_title:  string;
  total_quantity: number;
  total_revenue:  number;
}

export interface TopVendor {
  vendor_id:     number;
  vendor_name:   string;
  business_name: string;
  total_revenue: number;
  total_orders:  number;
}

export interface RecentActivity {
  type:        'order' | 'vendor' | 'product' | string;
  description: string;
  timestamp:   string;
  user?:       string;
  amount?:     number;
}

export interface AdminAnalytics {
  revenue_chart:        RevenueDataPoint[];
  top_products:         TopProduct[];
  top_vendors:          TopVendor[];
  recent_activity:      RecentActivity[];
  average_order_value:  number;
  conversion_rate:      number;
  total_revenue_growth: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER STATS
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerStats {
  kpis: {
    total:           number;
    active_30d:      number;
    banned:          number;
    vendors:         number;
    pending_vendors: number;
    new_this_week:   number;
    new_this_month:  number;
  };
  registrations_chart: Array<{ date: string; count: number }>;
  role_distribution:   Array<{ role: string; count: number }>;
  plan_distribution:   Array<{ plan: string; count: number }>;
}

export interface AdminCourier {
  id: number;
  phone: string;
  city: string;
  zones: string[];
  vehicle_type: 'MOTORBIKE' | 'CAR' | 'BIKE' | 'TRICYCLE' | 'VAN';
  id_card: string;
  preferred_language?: string;
  gps_permission_granted?: boolean;
  camera_permission_granted?: boolean;
  is_active: boolean;
  is_approved: boolean;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCourierPayload {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  zones: string[];
  vehicle_type: AdminCourier['vehicle_type'];
  id_card: string;
}

export type AdminCreateUserRole = 'client' | 'vendor' | 'courier' | 'admin';

export interface AdminCreateUserPayload {
  role: AdminCreateUserRole;
  username: string;
  email?: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  business_name?: string;
  business_description?: string;
  address?: string;
  id_document?: string;
  vendor_status?: 'PENDING' | 'APPROVED';
  zones?: string[];
  vehicle_type?: AdminCourier['vehicle_type'];
  id_card?: string;
  is_approved?: boolean;
  is_superuser?: boolean;
}

export type UpdateCourierPayload = Partial<Omit<CreateCourierPayload, 'username'>> & {
  is_active?: boolean;
  is_approved?: boolean;
  is_online?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminProduct {
  id:              number;
  title:           string;
  slug:            string;
  price_xaf:       number;
  is_active:       boolean;
  vendor:          number;
  vendor_name:     string;
  vendor_business: string;
  category:        number;
  category_name:   string;
  stock_quantity:  number;
  images_count:    number;
  created_at:      string;
  updated_at:      string;
}

export interface AdminProductUpdate {
  title?:       string;
  description?: string;
  price_xaf?:   number;
  is_active?:   boolean;
  category?:    number;
}

export interface AdminProductDetail {
  id:          number;
  title:       string;
  slug:        string;
  description: string;
  price_xaf:   number;
  is_active:   boolean;
  vendor:      number;
  category:    { id: number; name: string; slug: string };
  images:      Array<{ id: number; image: string; image_url: string; is_primary: boolean }>;
  created_at:  string;
  updated_at:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderHistory {
  id:         number;
  user:       number | null;
  user_name:  string;
  action:     string;
  field_name: string;
  old_value:  string;
  new_value:  string;
  timestamp:  string;
  ip_address: string | null;
}

export interface OrderItem {
  id:                 number;
  product_id:         number;
  product_title:      string;
  product_image:      string | null;
  vendor_name:        string;
  qty:                number;
  price_xaf_snapshot: number;
  line_total_xaf:     number;
}

export interface PaymentTransaction {
  id:           string;
  provider:     string;
  status:       string;
  amount_xaf:   number;
  payer_phone:  string;
  external_ref: string | null;
  created_at:   string;
}

export interface AdminOrder {
  id:                       number;
  customer_name:            string;
  customer_email:           string | null;
  customer_phone:           string;
  city:                     string;
  payment_status:           'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  fulfillment_status:       'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  escrow_status?:           string;
  subtotal_xaf:             number;
  delivery_fee_xaf:         number;
  total_xaf:                number;
  commission_rate_snapshot?: number;
  commission_amount?:        number;
  items_count:              number;
  vendor_names:             string[];
  courier_info?:            CourierInfo | null;
  created_at:               string;
  updated_at:               string;
}

export interface AdminOrderDetail {
  id:                       number;
  user:                     number | null;
  customer_name:            string;
  customer_email:           string | null;
  customer_phone:           string;
  city:                     string;
  address:                  string;
  note:                     string | null;
  payment_status:           'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  fulfillment_status:       'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  escrow_status?:           string;
  subtotal_xaf:             number;
  delivery_fee_xaf:         number;
  total_xaf:                number;
  commission_rate_snapshot?: number;
  commission_amount?:        number;
  items:                    OrderItem[];
  history:                  OrderHistory[];
  payment_transactions:     PaymentTransaction[];
  courier_info?:            CourierInfo | null;
  created_at:               string;
  updated_at:               string;
}

export interface AdminOrderUpdate {
  payment_status?:     'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  fulfillment_status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  escrow_status?:      string;
  note?:               string;
}

export interface OrderFilters {
  payment_status?:     string;
  fulfillment_status?: string;
  vendor?:             number;
  date_from?:          string;
  date_to?:            string;
  min_amount?:         number;
  max_amount?:         number;
  search?:             string;
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export interface UserActivityLog {
  id:                number;
  action:            string;
  description:       string;
  performed_by:      number | null;
  performed_by_name: string;
  ip_address:        string | null;
  user_agent:        string | null;
  timestamp:         string;
}

export interface AdminUser {
  id:                   number;
  username:             string;
  email:                string;
  first_name:           string;
  last_name:            string;
  is_staff:             boolean;
  is_active:            boolean;
  is_superuser:         boolean;
  is_vendor:            boolean;
  is_courier?:          boolean;
  is_banned:            boolean;
  total_orders:         number;
  total_spent:          number;
  date_joined:          string;
  last_login:           string | null;
  // Champs enrichis v2
  vendor_status:        'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null;
  vendor_business_name: string | null;
  vendor_plan:          'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | null;
  loyalty_tier:         'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  loyalty_points:       number;
  city:                 string | null;
}

export interface UserStats {
  total_orders:        number;
  paid_orders:         number;
  pending_orders:      number;
  total_spent:         number;
  average_order_value: number;
  total_products?:     number;
  active_products?:    number;
}

export interface UserProfile {
  phone:                 string | null;
  bio:                   string | null;
  is_banned:             boolean;
  ban_reason:            string | null;
  banned_at:             string | null;
  banned_by:             string | null;
  newsletter_subscribed: boolean;
}

export interface VendorProfileBasic {
  id:            number;
  business_name: string;
  status:        'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  created_at:    string;
  approved_at:   string | null;
}

export interface AdminUserDetail {
  id:             number;
  username:       string;
  email:          string;
  first_name:     string;
  last_name:      string;
  is_staff:       boolean;
  is_active:      boolean;
  is_superuser:   boolean;
  date_joined:    string;
  last_login:     string | null;
  is_vendor:      boolean;
  vendor_profile: VendorProfileBasic | null;
  profile:        UserProfile | null;
  activity_logs:  UserActivityLog[];
  stats:          UserStats;
}

export interface AdminUserUpdate {
  is_staff?:    boolean;
  is_active?:   boolean;
  is_superuser?: boolean;
  first_name?:  string;
  last_name?:   string;
  email?:       string;
}

export interface UserFilters {
  role?:      string;
  is_banned?: boolean;
  is_active?: boolean;
  date_from?: string;
  date_to?:   string;
  search?:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTES
// ─────────────────────────────────────────────────────────────────────────────

export interface DisputeMessage {
  id:          number;
  sender:      number;
  sender_name: string;
  message:     string;
  is_internal: boolean;
  created_at:  string;
}

export interface DisputeEvidence {
  id:               number;
  uploaded_by:      number;
  uploaded_by_name: string;
  file:             string;
  file_url:         string | null;
  description:      string;
  created_at:       string;
}

export interface AdminDispute {
  id:             number;
  order:          number;
  order_id:       number;
  opened_by:      number;
  opened_by_name: string;
  customer_name:  string;
  reason:         'NOT_RECEIVED' | 'DAMAGED' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'REFUND_REQUEST' | 'OTHER';
  status:         'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolution:     'REFUND' | 'EXCHANGE' | 'PARTIAL_REFUND' | 'REJECTED' | 'OTHER' | null;
  messages_count: number;
  created_at:     string;
  updated_at:     string;
}

export interface OrderDetailBasic {
  id:                 number;
  total_xaf:          number;
  customer_email:     string | null;
  customer_phone:     string;
  payment_status:     string;
  fulfillment_status: string;
  created_at:         string;
}

export interface AdminDisputeDetail {
  id:                number;
  order:             number;
  order_detail:      OrderDetailBasic;
  opened_by:         number;
  opened_by_name:    string;
  reason:            'NOT_RECEIVED' | 'DAMAGED' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'REFUND_REQUEST' | 'OTHER';
  status:            'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  description:       string;
  resolution:        'REFUND' | 'EXCHANGE' | 'PARTIAL_REFUND' | 'REJECTED' | 'OTHER' | null;
  resolution_note:   string | null;
  resolved_by:       number | null;
  resolved_by_name:  string | null;
  resolved_at:       string | null;
  refund_amount_xaf: number | null;
  vendor_can_reply:  boolean;
  courier_can_reply: boolean;
  messages:          DisputeMessage[];
  evidences:         DisputeEvidence[];
  created_at:        string;
  updated_at:        string;
}

export interface AdminCourierSimple {
  id:       number;
  user_id:  number;
  name:     string;
  phone:    string;
  city:     string;
  username: string;
}

export interface CourierInfo {
  shipment_status: string;
  courier_name:    string | null;
  courier_phone:   string | null;
}

export interface AdminDisputeUpdate {
  status?:            'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolution?:        'REFUND' | 'EXCHANGE' | 'PARTIAL_REFUND' | 'REJECTED' | 'OTHER';
  resolution_note?:   string;
  refund_amount_xaf?: number;
}

export interface DisputeFilters {
  status?: string;
  reason?: string;
  order?:  number;
  search?: string;
}

export interface DisputeStats {
  total_disputes:       number;
  open_disputes:        number;
  in_progress_disputes: number;
  resolved_disputes:    number;
  stats_by_status:      Array<{ status: string; count: number }>;
  stats_by_reason:      Array<{ reason: string; count: number }>;
  stats_by_resolution:  Array<{ resolution: string; count: number }>;
  avg_resolution_days:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export interface PlatformSettings {
  id:                          number;
  delivery_fees:               Record<string, number>;
  platform_commission_percent: string;
  minimum_order_amount_xaf:    number;
  default_delivery_days:       number;
  mtn_momo_enabled:            boolean;
  orange_money_enabled:        boolean;
  admin_email:                 string;
  support_email:               string;
  maintenance_mode:            boolean;
  maintenance_message:         string;
  updated_at:                  string;
  updated_by:                  number | null;
  updated_by_name:             string;
}

export interface PlatformSettingsUpdate {
  delivery_fees?:               Record<string, number>;
  platform_commission_percent?: string;
  minimum_order_amount_xaf?:    number;
  default_delivery_days?:       number;
  mtn_momo_enabled?:            boolean;
  orange_money_enabled?:        boolean;
  admin_email?:                 string;
  support_email?:               string;
  maintenance_mode?:            boolean;
  maintenance_message?:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API OBJECT
// ─────────────────────────────────────────────────────────────────────────────

export const adminApi = {

  // ── COURIERS ──────────────────────────────────────────────────────────────

  listCouriers: async (): Promise<AdminCourier[]> =>
    http<AdminCourier[]>('/api/auth/admin/couriers/', { headers: authHeader() }),

  createCourier: async (data: CreateCourierPayload): Promise<AdminCourier> =>
    http<AdminCourier>('/api/auth/admin/couriers/create/', {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(data),
    }),

  updateCourier: async (id: number, data: UpdateCourierPayload): Promise<AdminCourier> =>
    http<AdminCourier>(`/api/auth/admin/couriers/${id}/update/`, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify(data),
    }),

  deleteCourier: async (id: number): Promise<{ detail: string }> =>
    http<{ detail: string }>(`/api/auth/admin/couriers/${id}/`, {
      method: 'DELETE',
      headers: authHeader(),
    }),

  createUser: async (data: AdminCreateUserPayload): Promise<unknown> =>
    http<unknown>('/api/auth/admin/users/create/', {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(data),
    }),

  // ── DASHBOARD ─────────────────────────────────────────────────────────────

  /** Statistiques globales du dashboard */
  getDashboardStats: async (): Promise<AdminDashboardStats> =>
    http<AdminDashboardStats>('/api/vendors/admin/dashboard/stats/', { headers: authHeader() }),

  /** Données analytiques (graphiques revenus, top produits, vendeurs) */
  getAnalytics: async (): Promise<AdminAnalytics> =>
    http<AdminAnalytics>('/api/vendors/admin/dashboard/analytics/', { headers: authHeader() }),

  /** KPIs clients + graphique inscriptions + distribution rôles/plans */
  getCustomerStats: async (): Promise<CustomerStats> =>
    http<CustomerStats>('/api/vendors/admin/customers/stats/', { headers: authHeader() }),

  /** KPIs vendeurs + GMV chart + distributions statuts/plans/certifications */
  getVendorStats: async (): Promise<VendorStats> =>
    http<VendorStats>('/api/vendors/admin/vendors/stats/', { headers: authHeader() }),

  // ── VENDORS ───────────────────────────────────────────────────────────────

  /** Liste tous les vendeurs (filtre optionnel par statut) */
  listVendors: async (status?: string): Promise<VendorProfile[]> => {
    const url = status
      ? `/api/vendors/admin/vendors/?status=${status}`
      : '/api/vendors/admin/vendors/';
    return http<VendorProfile[]>(url, { headers: authHeader() });
  },

  /** Détail d'un vendeur */
  getVendorDetail: async (vendorId: number): Promise<VendorProfile> =>
    http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/`, { headers: authHeader() }),

  /** Approuver un vendeur */
  approveVendor: async (vendorId: number): Promise<VendorProfile> =>
    http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/approve/`, { method: 'POST', headers: authHeader() }),

  /** Rejeter un vendeur */
  rejectVendor: async (vendorId: number): Promise<VendorProfile> =>
    http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/reject/`, { method: 'POST', headers: authHeader() }),

  /** Suspendre un vendeur */
  suspendVendor: async (vendorId: number): Promise<VendorProfile> =>
    http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/suspend/`, { method: 'POST', headers: authHeader() }),

  // ── PRODUCTS ──────────────────────────────────────────────────────────────

  /** Liste tous les produits */
  listProducts: async (filters?: {
    vendor?: number; category?: number; is_active?: boolean; search?: string;
  }): Promise<AdminProduct[]> => {
    const params = new URLSearchParams();
    if (filters?.vendor)                  params.append('vendor',    filters.vendor.toString());
    if (filters?.category)               params.append('category',  filters.category.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.search)                  params.append('search',    filters.search);
    const qs = params.toString();
    return http<AdminProduct[]>(`/api/vendors/admin/products/${qs ? '?' + qs : ''}`, { headers: authHeader() });
  },

  /** Détail d'un produit */
  getProductDetail: async (productId: number): Promise<AdminProductDetail> =>
    http<AdminProductDetail>(`/api/vendors/admin/products/${productId}/`, { headers: authHeader() }),

  /** Modifier un produit */
  updateProduct: async (productId: number, data: AdminProductUpdate): Promise<AdminProductDetail> =>
    http<AdminProductDetail>(`/api/vendors/admin/products/${productId}/update/`, {
      method: 'PATCH', headers: authHeader(), body: JSON.stringify(data),
    }),

  /** Activer/désactiver un produit */
  toggleProductStatus: async (productId: number): Promise<AdminProductDetail> =>
    http<AdminProductDetail>(`/api/vendors/admin/products/${productId}/toggle-status/`, { method: 'POST', headers: authHeader() }),

  /** Supprimer un produit */
  deleteProduct: async (productId: number): Promise<void> =>
    http<void>(`/api/vendors/admin/products/${productId}/delete/`, { method: 'DELETE', headers: authHeader() }),

  // ── ORDERS ────────────────────────────────────────────────────────────────

  /** Liste toutes les commandes */
  listOrders: async (filters?: OrderFilters): Promise<AdminOrder[]> => {
    const params = new URLSearchParams();
    if (filters?.payment_status)     params.append('payment_status',     filters.payment_status);
    if (filters?.fulfillment_status) params.append('fulfillment_status', filters.fulfillment_status);
    if (filters?.vendor)             params.append('vendor',             filters.vendor.toString());
    if (filters?.date_from)          params.append('date_from',          filters.date_from);
    if (filters?.date_to)            params.append('date_to',            filters.date_to);
    if (filters?.min_amount)         params.append('min_amount',         filters.min_amount.toString());
    if (filters?.max_amount)         params.append('max_amount',         filters.max_amount.toString());
    if (filters?.search)             params.append('search',             filters.search);
    const qs = params.toString();
    return http<AdminOrder[]>(`/api/vendors/admin/orders/${qs ? '?' + qs : ''}`, { headers: authHeader() });
  },

  /** Détail d'une commande */
  getOrderDetail: async (orderId: number): Promise<AdminOrderDetail> =>
    http<AdminOrderDetail>(`/api/vendors/admin/orders/${orderId}/`, { headers: authHeader() }),

  /** Modifier une commande */
  updateOrder: async (orderId: number, data: AdminOrderUpdate): Promise<AdminOrderDetail> =>
    http<AdminOrderDetail>(`/api/vendors/admin/orders/${orderId}/update/`, {
      method: 'PATCH', headers: authHeader(), body: JSON.stringify(data),
    }),

  /** Annuler une commande */
  cancelOrder: async (orderId: number): Promise<AdminOrderDetail> =>
    http<AdminOrderDetail>(`/api/vendors/admin/orders/${orderId}/cancel/`, { method: 'POST', headers: authHeader() }),

  /** URL export CSV commandes */
  exportOrdersCSV: (filters?: OrderFilters): string => {
    const params = new URLSearchParams();
    if (filters?.payment_status)     params.append('payment_status',     filters.payment_status);
    if (filters?.fulfillment_status) params.append('fulfillment_status', filters.fulfillment_status);
    if (filters?.vendor)             params.append('vendor',             filters.vendor.toString());
    if (filters?.date_from)          params.append('date_from',          filters.date_from);
    if (filters?.date_to)            params.append('date_to',            filters.date_to);
    return `/api/vendors/admin/orders/export/csv/?${params.toString()}&token=${localStorage.getItem('access_token')}`;
  },

  // ── USERS ─────────────────────────────────────────────────────────────────

  /** Liste tous les utilisateurs */
  listUsers: async (filters?: UserFilters): Promise<AdminUser[]> => {
    const params = new URLSearchParams();
    if (filters?.role)                    params.append('role',      filters.role);
    if (filters?.is_banned !== undefined) params.append('is_banned', filters.is_banned.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.date_from)               params.append('date_from', filters.date_from);
    if (filters?.date_to)                 params.append('date_to',   filters.date_to);
    if (filters?.search)                  params.append('search',    filters.search);
    const qs = params.toString();
    return http<AdminUser[]>(`/api/vendors/admin/users/${qs ? '?' + qs : ''}`, { headers: authHeader() });
  },

  /** Détail d'un utilisateur */
  getUserDetail: async (userId: number): Promise<AdminUserDetail> =>
    http<AdminUserDetail>(`/api/vendors/admin/users/${userId}/`, { headers: authHeader() }),

  /** Modifier un utilisateur */
  updateUser: async (userId: number, data: AdminUserUpdate): Promise<AdminUserDetail> =>
    http<AdminUserDetail>(`/api/vendors/admin/users/${userId}/update/`, {
      method: 'PATCH', headers: authHeader(), body: JSON.stringify(data),
    }),

  /** Bannir un utilisateur */
  banUser: async (userId: number, reason: string): Promise<AdminUserDetail> =>
    http<AdminUserDetail>(`/api/vendors/admin/users/${userId}/ban/`, {
      method: 'POST', headers: authHeader(), body: JSON.stringify({ reason }),
    }),

  /** Débannir un utilisateur */
  unbanUser: async (userId: number): Promise<AdminUserDetail> =>
    http<AdminUserDetail>(`/api/vendors/admin/users/${userId}/unban/`, { method: 'POST', headers: authHeader() }),

  /** Supprimer un utilisateur */
  deleteUser: async (userId: number): Promise<void> =>
    http<void>(`/api/vendors/admin/users/${userId}/delete/`, { method: 'DELETE', headers: authHeader() }),

  /** URL export CSV utilisateurs */
  exportUsersCSV: (filters?: UserFilters): string => {
    const params = new URLSearchParams();
    if (filters?.role)                    params.append('role',      filters.role);
    if (filters?.is_banned !== undefined) params.append('is_banned', filters.is_banned.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    return `/api/vendors/admin/users/export/csv/?${params.toString()}&token=${localStorage.getItem('access_token')}`;
  },

  // ── DISPUTES ──────────────────────────────────────────────────────────────

  /** Liste tous les litiges */
  listDisputes: async (filters?: DisputeFilters): Promise<AdminDispute[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.reason) params.append('reason', filters.reason);
    if (filters?.order)  params.append('order',  filters.order.toString());
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString();
    return http<AdminDispute[]>(`/api/vendors/admin/disputes/${qs ? '?' + qs : ''}`, { headers: authHeader() });
  },

  /** Statistiques litiges */
  getDisputeStats: async (): Promise<DisputeStats> =>
    http<DisputeStats>('/api/vendors/admin/disputes/stats/', { headers: authHeader() }),

  /** Détail d'un litige */
  getDisputeDetail: async (disputeId: number): Promise<AdminDisputeDetail> =>
    http<AdminDisputeDetail>(`/api/vendors/admin/disputes/${disputeId}/`, { headers: authHeader() }),

  /** Modifier un litige */
  updateDispute: async (disputeId: number, data: AdminDisputeUpdate): Promise<AdminDisputeDetail> =>
    http<AdminDisputeDetail>(`/api/vendors/admin/disputes/${disputeId}/update/`, {
      method: 'PATCH', headers: authHeader(), body: JSON.stringify(data),
    }),

  /** Ajouter un message au litige */
  addDisputeMessage: async (
    disputeId: number, message: string, isInternal = false,
  ): Promise<AdminDisputeDetail> =>
    http<AdminDisputeDetail>(`/api/vendors/admin/disputes/${disputeId}/message/`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ message, is_internal: isInternal }),
    }),

  /** Résoudre un litige */
  resolveDispute: async (
    disputeId: number, resolution: string,
    resolutionNote: string, refundAmount?: number,
  ): Promise<AdminDisputeDetail> =>
    http<AdminDisputeDetail>(`/api/vendors/admin/disputes/${disputeId}/resolve/`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ resolution, resolution_note: resolutionNote, refund_amount_xaf: refundAmount }),
    }),

  toggleDisputeReply: async (
    disputeId: number, role: 'vendor' | 'courier', allow: boolean,
  ): Promise<AdminDisputeDetail> =>
    http<AdminDisputeDetail>(`/api/vendors/admin/disputes/${disputeId}/toggle-reply/`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ role, allow }),
    }),

  // ── BROADCAST ÉTENDU ─────────────────────────────────────────────────────

  listCouriersSimple: async (): Promise<AdminCourierSimple[]> =>
    http<AdminCourierSimple[]>('/api/vendors/admin/couriers/', { headers: authHeader() }),

  broadcastExtended: async (payload: {
    audience: string;
    title: string;
    message: string;
    type?: string;
    vendor_user_id?: number;
    courier_user_id?: number;
  }): Promise<{ success: boolean; recipients: number; audience: string; title: string }> =>
    http('/api/vendors/admin/notifications/broadcast-extended/', {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify(payload),
    }),

  // ── KYC ───────────────────────────────────────────────────────────────────

  /** File d'attente KYC — vendeurs en attente de validation */
  getKYCQueue: async (status = 'PENDING') =>
    http(`/api/vendors/admin/kyc/?status=${status}`, { headers: authHeader() }),

  // ── WITHDRAWALS ───────────────────────────────────────────────────────────

  /** Liste les demandes de retrait */
  listWithdrawals: async (status?: string) => {
    const url = status
      ? `/api/vendors/admin/withdrawals/?status=${status}`
      : '/api/vendors/admin/withdrawals/';
    return http(url, { headers: authHeader() });
  },

  /** Approuver un retrait */
  approveWithdrawal: async (wdId: number, adminNote?: string) =>
    http(`/api/vendors/admin/withdrawals/${wdId}/approve/`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ admin_note: adminNote ?? '' }),
    }),

  /** Rejeter un retrait */
  rejectWithdrawal: async (wdId: number, reason: string) =>
    http(`/api/vendors/admin/withdrawals/${wdId}/reject/`, {
      method: 'POST', headers: authHeader(), body: JSON.stringify({ reason }),
    }),

  // ── PLANS ─────────────────────────────────────────────────────────────────

  /** Liste les plans d'abonnement avec compteurs abonnés */
  listPlans: async () =>
    http('/api/vendors/admin/plans/', { headers: authHeader() }),

  /** Modifier un plan */
  updatePlan: async (planId: number, data: Record<string, unknown>) =>
    http(`/api/vendors/admin/plans/${planId}/`, {
      method: 'PATCH', headers: authHeader(), body: JSON.stringify(data),
    }),

  // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────

  /** Liste les abonnements vendeurs */
  listSubscriptions: async (status?: string) => {
    const url = status
      ? `/api/vendors/admin/subscriptions/?status=${status}`
      : '/api/vendors/admin/subscriptions/';
    return http(url, { headers: authHeader() });
  },

  /** Approuver un abonnement */
  approveSubscription: async (subId: number) =>
    http(`/api/vendors/admin/subscriptions/${subId}/approve/`, { method: 'POST', headers: authHeader() }),

  /** Rejeter un abonnement */
  rejectSubscription: async (subId: number) =>
    http(`/api/vendors/admin/subscriptions/${subId}/reject/`, { method: 'POST', headers: authHeader() }),

  // ── REVIEWS ───────────────────────────────────────────────────────────────

  /** Liste les avis produits */
  listReviews: async (filters?: { is_approved?: boolean; rating?: number }) => {
    const params = new URLSearchParams();
    if (filters?.is_approved !== undefined) params.append('is_approved', filters.is_approved.toString());
    if (filters?.rating)                    params.append('rating',      filters.rating.toString());
    const qs = params.toString();
    return http(`/api/vendors/admin/reviews/${qs ? '?' + qs : ''}`, { headers: authHeader() });
  },

  /** Statistiques avis */
  getReviewStats: async () =>
    http('/api/vendors/admin/reviews/stats/', { headers: authHeader() }),

  /** Basculer approbation d'un avis */
  toggleReview: async (reviewId: number) =>
    http(`/api/vendors/admin/reviews/${reviewId}/toggle/`, { method: 'POST', headers: authHeader() }),

  /** Supprimer un avis */
  deleteReview: async (reviewId: number) =>
    http(`/api/vendors/admin/reviews/${reviewId}/delete/`, { method: 'DELETE', headers: authHeader() }),

  // ── MODIFICATIONS BOUTIQUE ────────────────────────────────────────────────

  /** Liste les demandes de modification de champs sensibles */
  listModifications: async (status = 'PENDING') =>
    http(`/api/vendors/admin/modifications/?status=${status}`, { headers: authHeader() }),

  /** Approuver une modification (applique automatiquement les changements) */
  approveModification: async (modId: number, adminNote?: string) =>
    http(`/api/vendors/admin/modifications/${modId}/approve/`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ admin_note: adminNote ?? '' }),
    }),

  /** Rejeter une modification */
  rejectModification: async (modId: number, reason: string) =>
    http(`/api/vendors/admin/modifications/${modId}/reject/`, {
      method: 'POST', headers: authHeader(), body: JSON.stringify({ reason }),
    }),

  // ── CERTIFICATIONS ────────────────────────────────────────────────────────

  /** Répartition des certifications + classement vendeurs */
  getCertificationsStats: async () =>
    http('/api/vendors/admin/certifications/', { headers: authHeader() }),

  // ── FINANCES ──────────────────────────────────────────────────────────────

  /** KPIs financiers + graphique commissions 30j + top vendeurs + retraits en attente */
  getFinancesStats: async () =>
    http('/api/vendors/admin/finances/stats/', { headers: authHeader() }),

  /** Compte plateforme — solde, escrow, santé système */
  getAccountStats: async () =>
    http('/api/vendors/admin/account/stats/', { headers: authHeader() }),

  // ── AUDIT ─────────────────────────────────────────────────────────────────

  /** Journal d'audit — toutes les actions admin tracées */
  getAuditLog: async (entityType?: string) => {
    const url = entityType
      ? `/api/vendors/admin/audit/?entity_type=${entityType}`
      : '/api/vendors/admin/audit/';
    return http(url, { headers: authHeader() });
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────

  /** Envoyer une notification broadcast à une audience */
  broadcastNotification: async (audience: string, title: string, message: string) =>
    http('/api/vendors/admin/notifications/broadcast/', {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ audience, title, message }),
    }),

  // ── SETTINGS ──────────────────────────────────────────────────────────────

  /** Récupérer les paramètres plateforme */
  getSettings: async (): Promise<PlatformSettings> =>
    http<PlatformSettings>('/api/vendors/admin/settings/', { headers: authHeader() }),

  /** Modifier les paramètres plateforme */
  updateSettings: async (data: PlatformSettingsUpdate): Promise<PlatformSettings> =>
    http<PlatformSettings>('/api/vendors/admin/settings/update/', {
      method: 'PATCH', headers: authHeader(), body: JSON.stringify(data),
    }),
};
