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
};
