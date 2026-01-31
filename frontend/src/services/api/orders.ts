//  frontend/src/services/api/orders.ts
// Service API pour les commandes
// Interagit avec le backend pour créer et récupérer les commandes

import { api } from './client';

export interface OrderItem {
  product_id: number;
  qty: number;
}

export interface OrderCreateData {
  city: 'YAOUNDE' | 'DOUALA';
  address: string;
  phone: string;
  note?: string;
  items: OrderItem[];
}

export interface OrderItemDetail {
  id: number;
  product: number;
  title_snapshot: string;
  price_xaf_snapshot: number;
  qty: number;
  line_total_xaf: number;
}

export interface Order {
  id: number;
  status: string;
  city: string;
  address: string;
  note: string;
  customer_phone: string;
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  created_at: string;
  items: OrderItemDetail[];
}

export const ordersApi = {
  // Créer une commande
  create: async (data: OrderCreateData): Promise<Order> => {
    return api.post<Order>('/orders/', data);
  },

  // Récupérer les détails d'une commande
  get: async (id: number): Promise<Order> => {
    return api.get<Order>(`/orders/${id}/`);
  },

    // Récupérer mes commandes
  getMyOrders: async (): Promise<Order[]> => {
    return api.get<Order[]>('/orders/my-orders/');
  },
};