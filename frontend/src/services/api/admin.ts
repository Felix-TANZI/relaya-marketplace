// frontend/src/services/api/admin.ts
// Service API pour l'administration

import { http } from './http';
import type { VendorProfile } from './vendors';

export interface AdminStats {
  total_vendors: number;
  pending_vendors: number;
  approved_vendors: number;
  rejected_vendors: number;
  suspended_vendors: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
}

export const adminApi = {
  /**
   * Liste tous les vendeurs
   */
  listVendors: async (status?: string): Promise<VendorProfile[]> => {
    const params = status ? `?status=${status}` : '';
    return http<VendorProfile[]>(`/api/vendors/admin/vendors/${params}`);
  },

  /**
   * Détail d'un vendeur
   */
  getVendorDetail: async (vendorId: number): Promise<VendorProfile> => {
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/`);
  },

  /**
   * Approuver un vendeur
   */
  approveVendor: async (vendorId: number): Promise<VendorProfile> => {
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/approve/`, {
      method: 'POST',
    });
  },

  /**
   * Rejeter un vendeur
   */
  rejectVendor: async (vendorId: number): Promise<VendorProfile> => {
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/reject/`, {
      method: 'POST',
    });
  },

  /**
   * Suspendre un vendeur
   */
  suspendVendor: async (vendorId: number): Promise<VendorProfile> => {
    return http<VendorProfile>(`/api/vendors/admin/vendors/${vendorId}/suspend/`, {
      method: 'POST',
    });
  },
};