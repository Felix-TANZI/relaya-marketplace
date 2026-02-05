// frontend/src/services/api/vendors.ts
// Service API pour l'espace vendeur

import { http } from './http';

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

export interface VendorApplication {
  business_name: string;
  business_description: string;
  phone: string;
  address: string;
  city: string;
  id_document: string;
}

export interface VendorStats {
  total_products: number;
  active_products: number;
  total_orders: number;
  total_revenue: string;
}

export interface VendorProduct {
  id: number;
  title: string;
  description: string;
  price_xaf: number;
  stock_quantity: number;
  is_active: boolean;
  category: number;
  created_at: string;
  images?: ProductImage[];
}

export interface VendorOrderItem {
  id: number;
  product: number;
  product_title: string;
  product_image: string | null;
  product_price: number; // ← AJOUTÉ
  title_snapshot: string;
  qty: number;
  price_xaf_snapshot: number;
  line_total_xaf: number;
  created_at: string;
}

export interface VendorOrder {
  id: number;
  status: string;
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'; // ← AJOUTÉ
  fulfillment_status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'; // ← AJOUTÉ
  is_paid: boolean; // ← AJOUTÉ
  can_be_fulfilled: boolean; // ← AJOUTÉ
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  city: string;
  address: string;
  note: string | null;
  items: VendorOrderItem[];
  vendor_total: number;
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  created_at: string;
  updated_at: string;
}

// ← AJOUTÉ : Interface pour les filtres
export interface VendorOrderFilters {
  payment_status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  fulfillment_status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}

export interface ProductImage {
  id: number;
  image: string;
  image_url: string;
  is_primary: boolean;
  order: number;
  created_at: string;
}

export const vendorsApi = {
  /**
   * Demander à devenir vendeur
   */
  apply: async (data: VendorApplication): Promise<VendorProfile> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProfile>('/api/vendors/apply/', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Récupérer le profil vendeur
   */
  getProfile: async (): Promise<VendorProfile> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProfile>('/api/vendors/profile/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Récupérer les statistiques du vendeur
   */
  getStats: async (): Promise<VendorStats> => {
    const token = localStorage.getItem('access_token');
    return http<VendorStats>('/api/vendors/stats/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Récupérer les produits du vendeur
   */
  getProducts: async (): Promise<VendorProduct[]> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProduct[]>('/api/vendors/products/', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Créer un produit
   */
  createProduct: async (data: Partial<VendorProduct>): Promise<VendorProduct> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProduct>('/api/vendors/products/', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Mettre à jour un produit
   */
  updateProduct: async (id: number, data: Partial<VendorProduct>): Promise<VendorProduct> => {
    const token = localStorage.getItem('access_token');
    return http<VendorProduct>(`/api/vendors/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Supprimer un produit
   */
  deleteProduct: async (id: number): Promise<void> => {
    const token = localStorage.getItem('access_token');
    await http<void>(`/api/vendors/products/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Upload une image pour un produit
   */
  uploadImage: async (productId: number, file: File, isPrimary: boolean = false): Promise<ProductImage> => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('is_primary', isPrimary.toString());
    
    const response = await fetch(`http://localhost:8000/api/vendors/products/${productId}/images/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Supprimer une image
   */
  deleteImage: async (productId: number, imageId: number): Promise<void> => {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`http://localhost:8000/api/vendors/products/${productId}/images/${imageId}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  },

  /**
   * Définir l'image principale
   */
  setPrimaryImage: async (productId: number, imageId: number): Promise<ProductImage> => {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`http://localhost:8000/api/vendors/products/${productId}/images/${imageId}/set-primary/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  },

  /**
   * Récupérer les commandes du vendeur
   * ← MODIFIÉ : accepte maintenant VendorOrderFilters au lieu de status
   */
  getOrders: async (filters?: VendorOrderFilters): Promise<VendorOrder[]> => {
    const token = localStorage.getItem('access_token');
    
    const params = new URLSearchParams();
    if (filters?.payment_status) {
      params.append('payment_status', filters.payment_status);
    }
    if (filters?.fulfillment_status) {
      params.append('fulfillment_status', filters.fulfillment_status);
    }
    
    const queryString = params.toString();
    const url = `/api/vendors/orders/${queryString ? `?${queryString}` : ''}`;
    
    return http<VendorOrder[]>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Récupérer le détail d'une commande
   */
  getOrderDetail: async (orderId: number): Promise<VendorOrder> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrder>(`/api/vendors/orders/${orderId}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Mettre à jour le statut d'une commande
   */
  updateOrderStatus: async (orderId: number, status: string): Promise<VendorOrder> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrder>(`/api/vendors/orders/${orderId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // ← AJOUTÉ : Mettre à jour le statut de paiement
  updatePaymentStatus: async (
    orderId: number,
    data: { payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' }
  ): Promise<VendorOrder> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrder>(`/api/vendors/orders/${orderId}/payment-status/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // ← AJOUTÉ : Mettre à jour le statut de livraison
  updateFulfillmentStatus: async (
    orderId: number,
    data: { fulfillment_status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' }
  ): Promise<VendorOrder> => {
    const token = localStorage.getItem('access_token');
    return http<VendorOrder>(`/api/vendors/orders/${orderId}/fulfillment-status/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },
};