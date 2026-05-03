// frontend/src/types/order.ts
// Types TypeScript pour les commandes

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type FulfillmentStatus =
  | 'CREATED'
  | 'PAID_IN_ESCROW'
  | 'VENDOR_ACKNOWLEDGED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'DRIVER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'BUYER_CONFIRMED'
  | 'AUTO_CONFIRMED'
  | 'RELEASED_TO_VENDOR'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED';
export type DeliveryMethod = 'DELIVERY' | 'PICKUP';

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
  user: number;
  customer_email: string | null;
  customer_phone: string;
  delivery_mode?: DeliveryMethod;
  city: string;
  address: string;
  note: string | null;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  items: OrderItemDetail[];
  is_paid: boolean;
  can_be_fulfilled: boolean;
  created_at: string;
  updated_at: string;
}
