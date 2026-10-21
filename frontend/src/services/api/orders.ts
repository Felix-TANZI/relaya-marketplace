// frontend/src/services/api/orders.ts
// Service API pour les commandes
// Interagit avec le backend pour créer et récupérer les commandes

import { api } from './client';
import type { Order } from '@/types/order';
import type { LocationPrecisionResult } from './location';

export interface OrderItem {
  product_id: number;
  qty: number;
  title?: string;
  price_xaf?: number;
  image_url?: string;
  is_demo?: boolean;
}

export interface OrderCreateData {
  delivery_method?: 'DELIVERY' | 'PICKUP';
  delivery_mode?: 'DELIVERY' | 'PICKUP';
  city: 'YAOUNDE' | 'DOUALA';
  district?: string;
  address: string;
  address_precision?: LocationPrecisionResult | Record<string, unknown>;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  customer_phone: string;
  customer_email?: string;
  note?: string;
  relay_point_id?: number;
  authorized_pickup_name?: string;
  authorized_pickup_phone?: string;
  cart_items: OrderItem[];
}

/** Frais et total d'un panier avant le paiement (POST /orders/frais/, spec v2.1 A1 et A2). */
export interface DevisPanier {
  ok: boolean;
  /** Code de refus (R91.3 : panier_min, boutique_min, relais_interdit, devis_hg ; ou donnée manquante). */
  refus: { refus: string; b?: number; manque?: number } | null;
  /** Messages à afficher tels quels (R84.2, R10.2…) ; « Payer » reste bloqué tant qu'il y en a. */
  messages: string[];
  frais: {
    st: number;
    frais_bruts: number;
    couverture: number;
    frais_client: number;
    base_paiement: number;
    frais_momo: number;
    total_a_payer: number;
    /** R07.5 : « Livraison offerte » ou « Livraison offerte jusqu'à … F » ; vide sans couverture. */
    libelle_livraison: string;
    /** R07.6 : ce qui manque au panier pour obtenir la livraison offerte. */
    manque_livraison_offerte?: number;
  } | null;
  /** Heure promise (R45.6), à montrer avant le paiement (R12.1) : « Livré demain avant 13 h ». */
  promesse?: { texte: string; a: string } | null;
}

export type DevisPanierData = Pick<OrderCreateData,
  'delivery_mode' | 'district' | 'delivery_latitude' | 'delivery_longitude' | 'relay_point_id' | 'cart_items'>;

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
   * Frais et total du panier avant le paiement (recalculés à chaque changement, R84.3)
   */
  devis: async (data: DevisPanierData): Promise<DevisPanier> => {
    return api.post<DevisPanier>('/orders/frais/', data);
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

  /**
   * Annuler une commande
   */
  cancel: async (id: number, reason?: string): Promise<Order> => {
    return api.post<Order>(`/orders/${id}/cancel/`, { reason: reason || "OTHER" });
  },

  extendRelayGarde: async (id: number): Promise<{ garde_deadline: string; garde_extended: boolean }> => {
    return api.post(`/orders/${id}/extend-relay-garde/`);
  },
};
