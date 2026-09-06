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

export interface RelayParcel {
  id: number;
  relay_point: number;
  relay_point_name: string;
  status: 'EXPECTED' | 'RECEIVED' | 'STORED' | 'PICKED_UP' | 'RETURN_REQUESTED' | 'RETURNED_TO_VENDOR' | 'RETURNED_TO_BELIVAY';
  pickup_code: string;
  delivery_address: string;
  city: string;
  garde_extended: boolean;
  garde_free_until: string | null;
  garde_deadline: string | null;
  garde_fee_due_xaf: number;
}

export interface ShipmentEvidence {
  id: number;
  stage: string;
  stage_label: string;
  actor_role: string;
  uploaded_by_name: string;
  file_url: string | null;
  description: string;
  created_at: string;
}

export interface Shipment {
  id: number;
  order: number;
  status: string;
  courier_name: string;
  courier_phone: string;
  relay_point: string;
  relay_parcel: RelayParcel | null;
  delivery_evidences: ShipmentEvidence[];
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
  evidences: DisputeEvidence[];
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

export interface OrderReturn {
  id: number;
  order: number;
  order_item: number;
  order_item_title: string;
  requested_by: number;
  requested_by_name: string;
  vendor: number | null;
  vendor_username: string;
  reason: string;
  description: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'AWAITING_DROPOFF' | 'RECEIVED' | 'REFUNDED' | 'CLOSED_NO_REFUND';
  transport_mode: 'RELAY_DROPOFF' | 'COURIER_PICKUP';
  dropoff_relay_point: number | null;
  relay_point_name: string;
  reviewed_at: string | null;
  review_note: string;
  received_at: string | null;
  inspection_passed: boolean | null;
  inspection_note: string;
  refund_amount_xaf: number | null;
  is_free_for_buyer: boolean;
  created_at: string;
  updated_at: string;
}

export interface NearbyRelayPoint {
  id: number;
  name: string;
  address: string;
  city: string;
  opening_hours: string;
  storage_capacity: number;
  occupancy: number;
  has_space: boolean;
  distance_km: number | null;
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
    files: File[] = [],
  ): Promise<DisputeMessage> => {
    if (files.length === 0) {
      return api.post<DisputeMessage>(`/orders/disputes/${disputeId}/messages/`, { message });
    }
    const form = new FormData();
    form.append('message', message);
    files.forEach((file) => form.append('files', file));
    return api.post<DisputeMessage>(`/orders/disputes/${disputeId}/messages/`, form);
  },

  getOrderChatMessages: async (orderId: number): Promise<OrderChatMessage[]> =>
    api.get<OrderChatMessage[]>(`/shipping/orders/${orderId}/messages/`),

  sendOrderChatMessage: async (orderId: number, message: string): Promise<OrderChatMessage> =>
    api.post<OrderChatMessage>(`/shipping/orders/${orderId}/messages/`, { message }),

  getOrderReturns: async (orderId: number): Promise<OrderReturn[]> =>
    api.get<OrderReturn[]>(`/orders/${orderId}/returns/`),

  createOrderReturn: async (
    orderId: number,
    data: { reason: string; description: string; order_item: number; transport_mode?: string },
  ): Promise<OrderReturn> =>
    api.post<OrderReturn>(`/orders/${orderId}/returns/`, data),

  getNearbyRelayPoints: async (params: { city?: string; lat?: number; lng?: number }): Promise<NearbyRelayPoint[]> => {
    const query = new URLSearchParams();
    if (params.city) query.set('city', params.city);
    if (params.lat != null) query.set('lat', String(params.lat));
    if (params.lng != null) query.set('lng', String(params.lng));
    const qs = query.toString();
    return api.get<NearbyRelayPoint[]>(`/shipping/relay-points/nearby/${qs ? `?${qs}` : ''}`);
  },
};
