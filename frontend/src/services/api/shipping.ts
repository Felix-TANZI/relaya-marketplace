import { http } from "@/services/api/http";

export type ShipmentEvent = {
  id: number;
  status: string;
  message: string;
  location: string;
  created_at: string;
};

export type Shipment = {
  id: number;
  order: number;
  status: string;
  courier_name: string;
  courier_phone: string;
  relay_point: string;
  created_at: string;
  updated_at: string;
  events: ShipmentEvent[];
};

export function trackShipment(orderId: number): Promise<Shipment> {
  return http<Shipment>(`/api/shipping/track/?order_id=${orderId}`, { method: "GET" });
}
