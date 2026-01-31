// frontend/src/services/api/products.ts
// Service API pour les produits
// Interagit avec le backend pour récupérer et gérer les produits

import { api } from './client';

export interface ProductMedia {
  id: number;
  url: string;
  media_type: string;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price_xaf: number;
  stock_quantity: number;
  category?: Category;
  media?: ProductMedia[];
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export interface ProductListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

//  Helper pour filtrer les undefined
function cleanParams(params?: ProductListParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  
  const cleaned: Record<string, string | number | boolean> = {};
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  });
  
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export const productsApi = {
  // Liste des produits
  list: async (params?: ProductListParams): Promise<ProductListResponse> => {
    return api.get<ProductListResponse>('/catalog/products/', { params: cleanParams(params) });
  },

  // Détail d'un produit
  get: async (id: number): Promise<Product> => {
    return api.get<Product>(`/catalog/products/${id}/`);
  },

  // Créer un produit (pour les vendeurs plus tard)
  create: async (data: Partial<Product>): Promise<Product> => {
    return api.post<Product>('/catalog/products/', data);
  },

  // Mettre à jour un produit
  update: async (id: number, data: Partial<Product>): Promise<Product> => {
    return api.put<Product>(`/catalog/products/${id}/`, data);
  },

  // Supprimer un produit
  delete: async (id: number): Promise<void> => {
    return api.delete<void>(`/catalog/products/${id}/`);
  },
};