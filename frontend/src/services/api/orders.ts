// frontend/src/services/api/orders.ts
// Service API pour les commandes
// Interagit avec le backend pour créer et récupérer les commandes

import { api } from './client';
import type { Order } from '@/types/order';

export interface OrderItem {
  product_id: number;
  qty: number;
}

export interface OrderCreateData {
  delivery_method?: 'DELIVERY' | 'PICKUP';
  delivery_mode?: 'DELIVERY' | 'PICKUP';
  city: 'YAOUNDE' | 'DOUALA';
  address: string;
  customer_phone: string;
  customer_email?: string;
  note?: string;
  cart_items: OrderItem[];
}

// Ré-exporter le type Order depuis types/order.ts
export type { Order };

export const ordersApi = {
  /**
   * Créer une commande
   */
  create: async (data: OrderCreateData): Promise<Order> => {
    const payload = {
      ...data,
      delivery_mode: data.delivery_mode ?? data.delivery_method ?? 'DELIVERY',
    };
    delete payload.delivery_method;

    return api.post<Order>('/orders/', payload);
  },

  /**
   * Récupérer les détails d'une commande
   */
  get: async (id: number): Promise<Order> => {
    return api.get<Order>(`/orders/${id}/`);
  },

  /**
   * Récupérer mes commandes
   */
  getMyOrders: async (): Promise<Order[]> => {
    return api.get<Order[]>('/orders/my-orders/');
  },
};
