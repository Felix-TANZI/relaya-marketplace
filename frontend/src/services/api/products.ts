// frontend/src/services/api/products.ts
// Service API pour la gestion des produits avec filtres avancés

import { http } from './http';

export interface ProductMedia {
  id: number;
  url: string;
  media_type: 'image' | 'video';
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  title: string;
  slug: string;
  description: string;
  price_xaf: number;
  stock_quantity: number;
  is_active: boolean;
  category: Category | null;
  media: ProductMedia[];
  created_at: string;
  updated_at: string;
}

export interface ProductListParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: number;
  category_slug?: string;
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  is_active?: boolean;
  ordering?: string;
}

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

/**
 * Convertit un objet de paramètres en query string
 */
function buildQueryString(params: ProductListParams): string {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const productsApi = {
  /**
   * Liste des produits avec filtres avancés
   */
  list: async (params: ProductListParams = {}): Promise<ProductListResponse> => {
    const queryString = buildQueryString(params);
    return http<ProductListResponse>(`/api/catalog/products/${queryString}`);
  },

  /**
   * Détails d'un produit
   */
  get: async (id: number): Promise<Product> => {
    return http<Product>(`/api/catalog/products/${id}/`);
  },

  /**
   * Liste des catégories
   */
  listCategories: async (): Promise<{ results: Category[] }> => {
    return http<{ results: Category[] }>('/api/catalog/categories/?page_size=100');
  },
};