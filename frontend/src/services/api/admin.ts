// frontend/src/services/api/admin.ts
// Service API pour l'administration

import { http } from "./http";

//  INTERFACES

export interface VendorProfile {
  id: number;
  username: string;
  email: string;
  business_name: string;
  business_description: string;
  phone: string;
  address: string;
  city: string;
  id_document: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface AdminDashboardStats {
  // Utilisateurs
  total_users: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;

  // Vendeurs
  total_vendors: number;
  pending_vendors: number;
  approved_vendors: number;
  rejected_vendors: number;
  suspended_vendors: number;

  // Produits
  total_products: number;
  active_products: number;
  inactive_products: number;

  // Commandes
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;

  // Revenus
  revenue_total: number;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;

  // Paiements
  paid_orders: number;
  unpaid_orders: number;
  failed_payments: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface TopProduct {
  product_id: number;
  product_title: string;
  total_quantity: number;
  total_revenue: number;
}

export interface TopVendor {
  vendor_id: number;
  vendor_name: string;
  business_name: string;
  total_revenue: number;
  total_orders: number;
}

export interface RecentActivity {
  type: "order" | "vendor" | "product";
  description: string;
  timestamp: string;
  user?: string;
  amount?: number;
}

export interface AdminAnalytics {
  revenue_chart: RevenueDataPoint[];
  top_products: TopProduct[];
  top_vendors: TopVendor[];
  recent_activity: RecentActivity[];
  average_order_value: number;
  conversion_rate: number;
  total_revenue_growth: number;
}


export interface AdminProduct {
  id: number;
  title: string;
  slug: string;
  price_xaf: number;
  is_active: boolean;
  vendor: number;
  vendor_name: string;
  vendor_business: string;
  category: number;
  category_name: string;
  stock_quantity: number;
  images_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminProductUpdate {
  title?: string;
  description?: string;
  price_xaf?: number;
  is_active?: boolean;
  category?: number;
}

export interface AdminProductDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  price_xaf: number;
  is_active: boolean;
  vendor: number;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  images: Array<{
    id: number;
    image: string;
    image_url: string;
    is_primary: boolean;
  }>;
  created_at: string;
  updated_at: string;
}


//  ORDERS 

export interface OrderHistory {
  id: number;
  user: number | null;
  user_name: string;
  action: string;
  field_name: string;
  old_value: string;
  new_value: string;
  timestamp: string;
  ip_address: string | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_title: string;
  product_image: string | null;
  vendor_name: string;
  qty: number;
  price_xaf_snapshot: number;
  line_total_xaf: number;
}

export interface PaymentTransaction {
  id: string;
  provider: string;
  status: string;
  amount_xaf: number;
  payer_phone: string;
  external_ref: string | null;
  created_at: string;
}

export interface AdminOrder {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  city: string;
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  fulfillment_status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  items_count: number;
  vendor_names: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminOrderDetail {
  id: number;
  user: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  city: string;
  address: string;
  note: string | null;
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  fulfillment_status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  items: OrderItem[];
  history: OrderHistory[];
  payment_transactions: PaymentTransaction[];
  created_at: string;
  updated_at: string;
}

export interface AdminOrderUpdate {
  payment_status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  fulfillment_status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  note?: string;
}

export interface OrderFilters {
  payment_status?: string;
  fulfillment_status?: string;
  vendor?: number;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
}

//  USERS 

export interface UserActivityLog {
  id: number;
  action: string;
  description: string;
  performed_by: number | null;
  performed_by_name: string;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
  is_vendor: boolean;
  is_banned: boolean;
  total_orders: number;
  total_spent: number;
  date_joined: string;
  last_login: string | null;
}

export interface UserStats {
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  total_spent: number;
  average_order_value: number;
  total_products?: number;
  active_products?: number;
}

export interface UserProfile {
  phone: string | null;
  bio: string | null;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  newsletter_subscribed: boolean;
}

export interface VendorProfileBasic {
  id: number;
  business_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  created_at: string;
  approved_at: string | null;
}

export interface AdminUserDetail {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  is_vendor: boolean;
  vendor_profile: VendorProfileBasic | null;
  profile: UserProfile | null;
  activity_logs: UserActivityLog[];
  stats: UserStats;
}

export interface AdminUserUpdate {
  is_staff?: boolean;
  is_active?: boolean;
  is_superuser?: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface UserFilters {
  role?: string;
  is_banned?: boolean;
  is_active?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

//  API

export const adminApi = {
  /**
   * Récupérer les statistiques du dashboard admin
   */
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const token = localStorage.getItem("access_token");
    return http<AdminDashboardStats>("/api/vendors/admin/dashboard/stats/", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Liste des vendeurs avec filtre optionnel par statut
   */
  listVendors: async (status?: string): Promise<VendorProfile[]> => {
    const token = localStorage.getItem("access_token");
    const url = status
      ? `/api/vendors/admin/vendors/?status=${status}`
      : "/api/vendors/admin/vendors/";

    return http<VendorProfile[]>(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Détail d'un vendeur
   */
  getVendorDetail: async (vendorId: number): Promise<VendorProfile> => {
    const token = localStorage.getItem("access_token");
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Approuver un vendeur
   */
  approveVendor: async (vendorId: number): Promise<VendorProfile> => {
    const token = localStorage.getItem("access_token");
    return http<VendorProfile>(
      `/api/vendors/admin/vendors/${vendorId}/approve/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },

  /**
   * Rejeter un vendeur
   */
  rejectVendor: async (vendorId: number): Promise<VendorProfile> => {
    const token = localStorage.getItem("access_token");
    return http<VendorProfile>(
      `/api/vendors/admin/vendors/${vendorId}/reject/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },

  /**
   * Suspendre un vendeur
   */
  suspendVendor: async (vendorId: number): Promise<VendorProfile> => {
    const token = localStorage.getItem("access_token");
    return http<VendorProfile>(
      `/api/vendors/admin/vendors/${vendorId}/suspend/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },

  /**
   * Récupérer les données analytiques (graphiques)
   */
  getAnalytics: async (): Promise<AdminAnalytics> => {
    const token = localStorage.getItem("access_token");
    return http<AdminAnalytics>("/api/vendors/admin/dashboard/analytics/", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Liste tous les produits (admin)
   */
  listProducts: async (filters?: {
    vendor?: number;
    category?: number;
    is_active?: boolean;
    search?: string;
  }): Promise<AdminProduct[]> => {
    const token = localStorage.getItem('access_token');
    
    const params = new URLSearchParams();
    if (filters?.vendor) params.append('vendor', filters.vendor.toString());
    if (filters?.category) params.append('category', filters.category.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const url = `/api/vendors/admin/products/${params.toString() ? '?' + params.toString() : ''}`;
    
    return http<AdminProduct[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Détail d'un produit (admin)
   */
  getProductDetail: async (productId: number): Promise<AdminProductDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminProductDetail>(`/api/vendors/admin/products/${productId}/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Modifier un produit (admin)
   */
  updateProduct: async (productId: number, data: AdminProductUpdate): Promise<AdminProductDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminProductDetail>(`/api/vendors/admin/products/${productId}/update/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Supprimer un produit (admin)
   */
  deleteProduct: async (productId: number): Promise<void> => {
    const token = localStorage.getItem('access_token');
    return http<void>(`/api/vendors/admin/products/${productId}/delete/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Activer/désactiver un produit (admin)
   */
  toggleProductStatus: async (productId: number): Promise<AdminProductDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminProductDetail>(`/api/vendors/admin/products/${productId}/toggle-status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  //  ORDERS 

  /**
   * Liste toutes les commandes (admin)
   */
  listOrders: async (filters?: OrderFilters): Promise<AdminOrder[]> => {
    const token = localStorage.getItem('access_token');
    
    const params = new URLSearchParams();
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.fulfillment_status) params.append('fulfillment_status', filters.fulfillment_status);
    if (filters?.vendor) params.append('vendor', filters.vendor.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.min_amount) params.append('min_amount', filters.min_amount.toString());
    if (filters?.max_amount) params.append('max_amount', filters.max_amount.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const url = `/api/vendors/admin/orders/${params.toString() ? '?' + params.toString() : ''}`;
    
    return http<AdminOrder[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Détail d'une commande (admin)
   */
  getOrderDetail: async (orderId: number): Promise<AdminOrderDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminOrderDetail>(`/api/vendors/admin/orders/${orderId}/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Modifier une commande (admin)
   */
  updateOrder: async (orderId: number, data: AdminOrderUpdate): Promise<AdminOrderDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminOrderDetail>(`/api/vendors/admin/orders/${orderId}/update/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Annuler une commande (admin)
   */
  cancelOrder: async (orderId: number): Promise<AdminOrderDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminOrderDetail>(`/api/vendors/admin/orders/${orderId}/cancel/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Exporter les commandes en CSV
   */
  exportOrdersCSV: (filters?: OrderFilters): string => {
    const params = new URLSearchParams();
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.fulfillment_status) params.append('fulfillment_status', filters.fulfillment_status);
    if (filters?.vendor) params.append('vendor', filters.vendor.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    
    const token = localStorage.getItem('access_token');
    return `/api/vendors/admin/orders/export/csv/?${params.toString()}&token=${token}`;
  },


  //  USERS 

  /**
   * Liste tous les utilisateurs (admin)
   */
  listUsers: async (filters?: UserFilters): Promise<AdminUser[]> => {
    const token = localStorage.getItem('access_token');
    
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.is_banned !== undefined) params.append('is_banned', filters.is_banned.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    
    const url = `/api/vendors/admin/users/${params.toString() ? '?' + params.toString() : ''}`;
    
    return http<AdminUser[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Détail d'un utilisateur (admin)
   */
  getUserDetail: async (userId: number): Promise<AdminUserDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminUserDetail>(`/api/vendors/admin/users/${userId}/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Modifier un utilisateur (admin)
   */
  updateUser: async (userId: number, data: AdminUserUpdate): Promise<AdminUserDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminUserDetail>(`/api/vendors/admin/users/${userId}/update/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Bannir un utilisateur (admin)
   */
  banUser: async (userId: number, reason: string): Promise<AdminUserDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminUserDetail>(`/api/vendors/admin/users/${userId}/ban/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Débannir un utilisateur (admin)
   */
  unbanUser: async (userId: number): Promise<AdminUserDetail> => {
    const token = localStorage.getItem('access_token');
    return http<AdminUserDetail>(`/api/vendors/admin/users/${userId}/unban/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Supprimer un utilisateur (admin)
   */
  deleteUser: async (userId: number): Promise<void> => {
    const token = localStorage.getItem('access_token');
    return http<void>(`/api/vendors/admin/users/${userId}/delete/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Exporter les utilisateurs en CSV
   */
  exportUsersCSV: (filters?: UserFilters): string => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.is_banned !== undefined) params.append('is_banned', filters.is_banned.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const token = localStorage.getItem('access_token');
    return `/api/vendors/admin/users/export/csv/?${params.toString()}&token=${token}`;
  },
};
