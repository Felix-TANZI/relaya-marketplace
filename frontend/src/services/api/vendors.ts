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
};