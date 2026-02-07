// frontend/src/services/api/admin.ts
// Service API pour l'administration

import { http } from './http';

// ========== INTERFACES ==========

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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
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

// ========== API ==========

export const adminApi = {
  /**
   * Récupérer les statistiques du dashboard admin
   */
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const token = localStorage.getItem('access_token');
    return http<AdminDashboardStats>('/api/vendors/admin/dashboard/stats/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Liste des vendeurs avec filtre optionnel par statut
   */
  listVendors: async (status?: string): Promise<VendorProfile[]> => {
    const token = localStorage.getItem('access_token');
    const url = status
      ? `/api/vendors/admin/vendors/?status=${status}`
      : '/api/vendors/admin/vendors/';

    return http<VendorProfile[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Détail d'un vendeur
   */
  getVendorDetail: async (vendorId: number): Promise<VendorProfile> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Approuver un vendeur
   */
  approveVendor: async (vendorId: number): Promise<VendorProfile> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/approve/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Rejeter un vendeur
   */
  rejectVendor: async (vendorId: number): Promise<VendorProfile> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/reject/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Suspendre un vendeur
   */
  suspendVendor: async (vendorId: number): Promise<VendorProfile> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/suspend/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },
};