import { api } from "./client";

export interface ApiCartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  isDemo?: boolean;
  color?: string | null;
  storage?: string | null;
}

export interface ApiCart {
  items: ApiCartItem[];
  updated_at: string;
}

export const cartApi = {
  get: () => api.get<ApiCart>("/auth/cart/"),
  save: (items: ApiCartItem[]) => api.put<ApiCart>("/auth/cart/", { items }),
  clear: () => api.delete<ApiCart>("/auth/cart/"),
};
