// frontend/src/types/order.ts
// Types TypeScript pour les commandes avec séparation des statuts

// Statuts de paiement
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

// Statuts de livraison
export type FulfillmentStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

// Article de commande
export interface OrderItem {
  id: number;
  product: number;
  title_snapshot: string;
  price_xaf_snapshot: number;
  qty: number;
  line_total_xaf: number;
}

// Commande complète
export interface Order {
  id: number;
  user?: number;
  customer_email?: string;
  customer_phone: string;
  city: string;
  address: string;
  note?: string;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  items: OrderItem[];
  is_paid: boolean;
  can_be_fulfilled: boolean;
  created_at: string;
  updated_at: string;
}

// Article de commande (vue vendeur)
export interface VendorOrderItem {
  id: number;
  product: number;
  product_title: string;
  product_price: number;
  qty: number;
  line_total_xaf: number;
}

// Vue vendeur d'une commande
export interface VendorOrder {
  id: number;
  customer_email?: string;
  customer_phone: string;
  city: string;
  address: string;
  note?: string;
  payment_status: PaymentStatus;
  payment_status_display: string;
  fulfillment_status: FulfillmentStatus;
  fulfillment_status_display: string;
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  items: VendorOrderItem[];
  is_paid: boolean;
  can_be_fulfilled: boolean;
  created_at: string;
  updated_at: string;
}

// Données pour créer une commande
export interface CreateOrderData {
  cart_items: Array<{
    product_id: number;
    qty: number;
  }>;
  city: string;
  address: string;
  customer_phone: string;
  customer_email?: string;
  note?: string;
}

// Mise à jour du statut de livraison
export interface UpdateFulfillmentStatusData {
  fulfillment_status: FulfillmentStatus;
}

// Mise à jour du statut de paiement
export interface UpdatePaymentStatusData {
  payment_status: PaymentStatus;
}