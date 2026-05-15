import { api } from './client';
import type { Product } from './products';
import type { Order } from '@/types/order';

export interface Favorite {
  id: number;
  product: Product;
  created_at: string;
}

export interface CustomerNotification {
  id: number;
  title: string;
  message: string;
  notification_type: 'ORDER' | 'PROMOTION' | 'PAYMENT' | 'SUPPORT' | 'SYSTEM';
  action_url: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: number;
  status: string;
  message: string;
  location: string;
  created_at: string;
}

export interface Shipment {
  id: number;
  order: number;
  status: string;
  courier_name: string;
  courier_phone: string;
  relay_point: string;
  created_at: string;
  updated_at: string;
  events: ShipmentEvent[];
}

export interface DisputeMessage {
  id: number;
  sender: number;
  sender_name: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface Dispute {
  id: number;
  order: number;
  opened_by: number;
  reason: string;
  status: string;
  description: string;
  resolution: string | null;
  resolution_note: string | null;
  refund_amount_xaf: number | null;
  created_at: string;
  updated_at: string;
  messages: DisputeMessage[];
}

export const customerApi = {
  getFavorites: async (): Promise<Favorite[]> => api.get<Favorite[]>('/auth/favorites/'),

  addFavorite: async (productId: number): Promise<Favorite> =>
    api.post<Favorite>('/auth/favorites/', { product_id: productId }),

  removeFavorite: async (favoriteId: number): Promise<void> =>
    api.delete<void>(`/auth/favorites/${favoriteId}/`),

  getNotifications: async (): Promise<CustomerNotification[]> =>
    api.get<CustomerNotification[]>('/auth/notifications/?audience=customer'),

  markNotificationRead: async (id: number): Promise<CustomerNotification> =>
    api.post<CustomerNotification>(`/auth/notifications/${id}/read/`),

  deleteNotification: async (id: number): Promise<void> =>
    api.delete<void>(`/auth/notifications/${id}/`),

  markAllNotificationsRead: async (): Promise<{ detail: string }> =>
    api.post<{ detail: string }>('/auth/notifications/read-all/'),

  getOrderTracking: async (orderId: number): Promise<Shipment> =>
    api.get<Shipment>(`/orders/${orderId}/tracking/`),

  confirmReceipt: async (orderId: number): Promise<Order> =>
    api.post<Order>(`/orders/${orderId}/confirm-receipt/`),

  getOrderDisputes: async (orderId: number): Promise<Dispute[]> =>
    api.get<Dispute[]>(`/orders/${orderId}/disputes/`),

  createOrderDispute: async (
    orderId: number,
    data: { reason: string; description: string },
  ): Promise<Dispute> => api.post<Dispute>(`/orders/${orderId}/disputes/`, data),

  addDisputeMessage: async (
    disputeId: number,
    message: string,
  ): Promise<DisputeMessage> =>
    api.post<DisputeMessage>(`/orders/disputes/${disputeId}/messages/`, { message }),
};
