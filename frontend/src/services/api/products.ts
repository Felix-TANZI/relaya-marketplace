// frontend/src/services/api/products.ts

import { api } from './client';

export interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  parent?: number | null;
}

export interface ProductImage {
  id: number;
  image: string;
  image_url: string;
  is_primary: boolean;
  order: number;
  created_at: string;
}

export interface ProductMedia {
  id: number;
  url: string;
  media_type: 'image' | 'video';
  sort_order: number;
}

export interface Product {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  price_xaf: number;
  compare_at_price?: number | null;
  promo_end_date?: string | null;
  discount: number;
  discount_percent?: number;
  is_on_promotion?: boolean;
  active_campaign?: {
    id: number;
    campaign_type: 'REGULAR' | 'FLASH';
    title: string;
    ends_at: string;
    promo_price_xaf: number;
    discount_percent: number;
    remaining_stock: number;
  } | null;
  price_final: number;
  stock_quantity: number;
  is_active: boolean;
  category: Category | null;
  media: ProductMedia[];
  images?: ProductImage[];
  rating_average?: number | null;
  reviews_count?: number;
  created_at: string;
  updated_at: string;
  master_slug?: string | null;
}

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export interface CategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
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

export interface CategoryListParams {
  page?: number;
  page_size?: number;
  name?: string;
  is_active?: boolean;
  has_parent?: boolean;
  parent?: number;
}

export interface MasterOffer {
  id: number;
  price_xaf: number;
  compare_at_price: number | null;
  price_final: number;
  discount_percent: number;
  is_on_promotion: boolean;
  condition: string | null;
  seller_note: string;
  stock_quantity: number;
  is_active: boolean;
  short_description?: string;
  real_image?: string | null;
}

export interface MasterImage {
  id: number;
  image: string;
  is_primary: boolean;
}

export interface MasterFicheCard {
  id: number;
  title: string;
  slug: string;
  brand: string;
  category: Category | null;
  primary_image: string | null;
  offers_count: number;
  buy_box: MasterOffer | null;
  created_at: string;
}

export interface MasterFicheDetail extends MasterFicheCard {
  description: string;
  images: MasterImage[];
  offers: MasterOffer[];
}

export interface MasterListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MasterFicheCard[];
}

export interface MasterListParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: number;
  ordering?: string;
}

export interface ProductReview {
  id: number;
  user_name: string;
  user_first_name?: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
}

export const productsApi = {
  list: async (params?: ProductListParams): Promise<ProductListResponse> => {
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ) : undefined;
    const response = await api.get<ProductListResponse>('/catalog/products/', { params: cleanParams });
    return response;
  },

  get: async (id: number): Promise<Product> => {
    const response = await api.get<Product>(`/catalog/products/${id}/`);
    return response;
  },

  getSimilar: async (id: number, limit: number = 4): Promise<Product[]> => {
    const product = await productsApi.get(id);
    if (!product.category) return [];
    
    const response = await productsApi.list({
      category: product.category.id,
      page_size: limit + 1,
      is_active: true
    });
    
    return response.results.filter(p => p.id !== id).slice(0, limit);
  },

  listCategories: async (params?: CategoryListParams): Promise<CategoryListResponse> => {
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ) : undefined;
    const response = await api.get<CategoryListResponse>('/catalog/categories/', { params: cleanParams });
    return response;
  },

  getCategory: async (id: number): Promise<Category> => {
    const response = await api.get<Category>(`/catalog/categories/${id}/`);
    return response;
  },

  listMasters: async (params?: MasterListParams): Promise<MasterListResponse> => {
    const clean = params ? Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ) : undefined;
    return api.get<MasterListResponse>('/catalog/master-products/', { params: clean });
  },

  getMaster: async (slugOrId: string | number): Promise<MasterFicheDetail> =>
    api.get<MasterFicheDetail>(`/catalog/master-products/${slugOrId}/`),

  getReviews: async (productId: number): Promise<ProductReview[]> =>
    api.get<ProductReview[]>(`/catalog/products/${productId}/reviews/`),
};