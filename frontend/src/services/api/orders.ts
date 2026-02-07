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
  city: 'YAOUNDE' | 'DOUALA';
  address: string;
  phone: string;
  note?: string;
  items: OrderItem[];
}

// Ré-exporter le type Order depuis types/order.ts
export type { Order };

export const ordersApi = {
  /**
   * Créer une commande
   */
  create: async (data: OrderCreateData): Promise<Order> => {
    return api.post<Order>('/orders/', data);
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