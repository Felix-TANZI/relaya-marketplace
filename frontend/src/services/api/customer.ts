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

export interface ShipmentLocation {
  id: number;
  latitude: string;
  longitude: string;
  accuracy_m: number | null;
  speed_mps: number | null;
  heading_deg: number | null;
  source: 'DEVICE' | 'SIMULATION';
  captured_at: string;
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
  latest_location: ShipmentLocation | null;
  location_history: ShipmentLocation[];
}

export interface DisputeMessage {
  id: number;
  sender: number;
  sender_name: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface DisputeEvidence {
  id: number;
  request: number | null;
  evidence_type: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
  uploader_role: string;
  uploaded_by_name: string;
  file_url: string | null;
  description: string;
  created_at: string;
}

export interface DisputeEvidenceRequest {
  id: number;
  dispute: number;
  recipient_role: 'CLIENT' | 'VENDOR' | 'COURIER' | 'LOGISTICS' | 'RELAY_POINT';
  requested_from: number;
  requested_from_name: string;
  requested_by_name: string;
  evidence_types: string[];
  instructions: string;
  due_at: string | null;
  status: 'PENDING' | 'SUBMITTED' | 'CANCELLED' | 'EXPIRED';
  responded_at: string | null;
  created_at: string;
  evidences: DisputeEvidence[];
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
  evidences: DisputeEvidence[];
  evidence_requests: DisputeEvidenceRequest[];
}

export interface OrderChatMessage {
  id: number;
  shipment: number;
  channel: string;
  sender_role: 'CLIENT' | 'COURIER' | 'SYSTEM';
  sender_name: string;
  message: string;
  created_at: string;
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

  confirmReceipt: async (orderId: number, code: string): Promise<Order> =>
    api.post<Order>(`/orders/${orderId}/confirm-receipt/`, { code }),

  getOrderDisputes: async (orderId: number): Promise<Dispute[]> =>
    api.get<Dispute[]>(`/orders/${orderId}/disputes/`),

  createOrderDispute: async (
    orderId: number,
    data: { reason: string; description: string; order_item: number; files: File[] },
  ): Promise<Dispute> => {
    const form = new FormData();
    form.append('reason', data.reason);
    form.append('description', data.description);
    form.append('order_item', String(data.order_item));
    data.files.forEach((file) => form.append('files', file));
    return api.post<Dispute>(`/orders/${orderId}/disputes/`, form);
  },

  respondToEvidenceRequest: async (
    requestId: number,
    files: File[],
    description: string,
  ): Promise<DisputeEvidenceRequest> => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    form.append('description', description);
    return api.post<DisputeEvidenceRequest>(`/orders/evidence-requests/${requestId}/respond/`, form);
  },

  getPendingEvidenceRequests: async (): Promise<DisputeEvidenceRequest[]> =>
    api.get<DisputeEvidenceRequest[]>('/orders/evidence-requests/pending/'),

  addDisputeMessage: async (
    disputeId: number,
    message: string,
  ): Promise<DisputeMessage> =>
    api.post<DisputeMessage>(`/orders/disputes/${disputeId}/messages/`, { message }),

  getOrderChatMessages: async (orderId: number): Promise<OrderChatMessage[]> =>
    api.get<OrderChatMessage[]>(`/shipping/orders/${orderId}/messages/`),

  sendOrderChatMessage: async (orderId: number, message: string): Promise<OrderChatMessage> =>
    api.post<OrderChatMessage>(`/shipping/orders/${orderId}/messages/`, { message }),
};
