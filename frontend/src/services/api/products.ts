// frontend/src/services/api/products.ts
// Service API pour les produits

import { api } from "./client";

export interface Product {
  id: number;
  title: string;
  slug: string;
  description?: string;
  price_xaf: number;
  is_active: boolean;
  stock_quantity: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  media?: Array<{
    id: number;
    url: string;
    media_type: string;
    sort_order: number;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export const productsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: number;
    ordering?: string;
  }) => api.get<ProductsResponse>("/products/", { params }),

  get: (id: number) => api.get<Product>(`/products/${id}/`),

  create: (data: Partial<Product>) => api.post<Product>("/products/", data),

  update: (id: number, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}/`, data),

  delete: (id: number) => api.delete(`/products/${id}/`),
};