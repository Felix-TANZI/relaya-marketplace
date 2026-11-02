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
  address_precision?: Record<string, unknown>;
  note: string | null;
  authorized_pickup_name?: string;
  authorized_pickup_phone?: string;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  /** Spec v2.1 : frais Mobile Money (R02.3) et total réellement payé (R02.2). */
  frais_momo_xaf?: number;
  total_a_payer_xaf?: number;
  /** R51.4, R51.5 : frais d'absence à payer avant le retrait (avec leurs frais Mobile Money). */
  frais_absence_xaf?: number;
  frais_momo_absence_xaf?: number;
  frais_absence_paye_le?: string | null;
  /** Nom du relais de retrait (servi par OrderDetailSerializer). */
  relay_point_name?: string | null;
  /** Heure promise, figée au paiement, qui fait foi pour le client (R45.6, R45.7). */
  promesse_at?: string | null;
  promesse_texte?: string;
  items: OrderItemDetail[];
  is_paid: boolean;
  can_be_fulfilled: boolean;
  created_at: string;
  updated_at: string;
}
