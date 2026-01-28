import { http } from "@/services/api/http";

export type OrderCreatePayload = {
  city: "YAOUNDE" | "DOUALA";
  address: string;
  phone: string;
  note?: string;
  items: { product_id: number; qty: number }[];
};

export type OrderItem = {
  id: number;
  product: number;
  title_snapshot: string;
  price_xaf_snapshot: number;
  qty: number;
  line_total_xaf: number;
};

export type OrderDetail = {
  id: number;
  status: string;
  city: string;
  address: string;
  note: string | null;
  customer_phone: string;
  subtotal_xaf: number;
  delivery_fee_xaf: number;
  total_xaf: number;
  created_at: string;
  items: OrderItem[];
};

export function createOrder(payload: OrderCreatePayload): Promise<OrderDetail> {
  return http<OrderDetail>("/api/orders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOrder(id: number): Promise<OrderDetail> {
  return http<OrderDetail>(`/api/orders/${id}/`);
}
