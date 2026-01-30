// frontend/src/services/api/orders.ts
// Service API pour les commandes

import { api } from "./client";

// Détail d'un item de commande
export interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Détail d'une commande
export interface Order {
  id: number;
  status: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total_price: number;
  items: OrderItem[];
  shipping_address: string;
  shipping_city: "YAOUNDE" | "DOUALA";
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderData {
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
  shipping_address: string;
  shipping_city: "YAOUNDE" | "DOUALA";
  phone_number: string;
}

export const ordersApi = {
  // Liste des commandes de l'utilisateur
  list: () => api.get<Order[]>("/orders/"),

  // Détail d'une commande
  get: (id: number) => api.get<Order>(`/orders/${id}/`),

  // Créer une commande
  create: (data: CreateOrderData) => api.post<Order>("/orders/", data),

  // Annuler une commande
  cancel: (id: number) => api.post(`/orders/${id}/cancel/`, {}),
};