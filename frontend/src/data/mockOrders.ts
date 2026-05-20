import type { Order } from "@/types/order";

const MOCK_ORDERS_KEY = "belivay_mock_orders";

/** Save a mock order (called after checkout when API is down) */
export function saveMockOrder(order: Partial<Order> & { id: number }) {
  const existing = getMockOrders();
  existing.unshift(order as Order);
  localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(existing));
}

/** Get all mock orders from localStorage */
export function getMockOrders(): Order[] {
  try {
    const raw = localStorage.getItem(MOCK_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getResilientOrders(apiOrders: Order[] = []): Order[] {
  return apiOrders;
}

export function getResilientOrderById(id: number, apiOrder?: Order | null): Order | null {
  if (apiOrder && apiOrder.id === id) {
    return apiOrder;
  }

  return null;
}

/** Default demo orders (shown when API is unavailable and no mock orders exist) */
export const demoOrders: Order[] = [
  {
    id: 78432,
    user: 1,
    customer_email: null,
    customer_phone: "237 6XX XXX XXX",
    city: "Yaoundé",
    address: "Quartier Bastos, Yaoundé",
    note: null,
    payment_status: "PAID",
    fulfillment_status: "SHIPPED",
    delivery_mode: "DELIVERY",
    subtotal_xaf: 87000,
    delivery_fee_xaf: 2000,
    total_xaf: 89000,
    is_paid: true,
    can_be_fulfilled: true,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    items: [
      { id: 1, product: 1001, title_snapshot: "Robe Wax Premium Kente", price_xaf_snapshot: 35000, qty: 1, line_total_xaf: 35000 },
      { id: 2, product: 1015, title_snapshot: "Écouteurs Bluetooth JBL Tune", price_xaf_snapshot: 19500, qty: 2, line_total_xaf: 39000 },
      { id: 3, product: 1011, title_snapshot: "Huile de Coco Vierge 500ml", price_xaf_snapshot: 4500, qty: 3, line_total_xaf: 13500 },
    ],
  },
  {
    id: 78201,
    user: 1,
    customer_email: null,
    customer_phone: "237 6XX XXX XXX",
    city: "Douala",
    address: "Akwa, Douala",
    note: null,
    payment_status: "PAID",
    fulfillment_status: "DELIVERED",
    delivery_mode: "DELIVERY",
    subtotal_xaf: 195000,
    delivery_fee_xaf: 2000,
    total_xaf: 197000,
    is_paid: true,
    can_be_fulfilled: false,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    items: [
      { id: 4, product: 1002, title_snapshot: "Samsung Galaxy A55 5G", price_xaf_snapshot: 175000, qty: 1, line_total_xaf: 175000 },
      { id: 5, product: 1016, title_snapshot: "Chemise Brodée Homme", price_xaf_snapshot: 22000, qty: 1, line_total_xaf: 22000 },
    ],
  },
  {
    id: 77890,
    user: 1,
    customer_email: null,
    customer_phone: "237 6XX XXX XXX",
    city: "Yaoundé",
    address: "Retrait au centre BelivaY",
    note: "CLICK_AND_COLLECT",
    payment_status: "PAID",
    fulfillment_status: "PROCESSING",
    delivery_mode: "PICKUP",
    subtotal_xaf: 52000,
    delivery_fee_xaf: 0,
    total_xaf: 52000,
    is_paid: true,
    can_be_fulfilled: true,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: 6, product: 1009, title_snapshot: "Sneakers Nike Air Max 90", price_xaf_snapshot: 52000, qty: 1, line_total_xaf: 52000 },
    ],
  },
  {
    id: 77501,
    user: 1,
    customer_email: null,
    customer_phone: "237 6XX XXX XXX",
    city: "Yaoundé",
    address: "Mvan, Yaoundé",
    note: null,
    payment_status: "PAID",
    fulfillment_status: "DELIVERED",
    delivery_mode: "DELIVERY",
    subtotal_xaf: 68000,
    delivery_fee_xaf: 2000,
    total_xaf: 70000,
    is_paid: true,
    can_be_fulfilled: false,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 16 * 86400000).toISOString(),
    items: [
      { id: 7, product: 1004, title_snapshot: "Costume Bazin Brodé Homme", price_xaf_snapshot: 68000, qty: 1, line_total_xaf: 68000 },
    ],
  },
  {
    id: 77100,
    user: 1,
    customer_email: null,
    customer_phone: "237 6XX XXX XXX",
    city: "Douala",
    address: "Bonapriso, Douala",
    note: null,
    payment_status: "REFUNDED",
    fulfillment_status: "CANCELLED",
    delivery_mode: "DELIVERY",
    subtotal_xaf: 28000,
    delivery_fee_xaf: 2000,
    total_xaf: 30000,
    is_paid: false,
    can_be_fulfilled: false,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    items: [
      { id: 8, product: 1003, title_snapshot: "Parfum Bois d'Ébène Cameroun", price_xaf_snapshot: 22000, qty: 1, line_total_xaf: 22000 },
      { id: 9, product: 1011, title_snapshot: "Huile de Coco Vierge 500ml", price_xaf_snapshot: 4500, qty: 1, line_total_xaf: 4500 },
    ],
  },
];
