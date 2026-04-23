import { http } from "@/services/api/http";

export type CourierShipmentEvent = {
  id: number;
  status: string;
  message: string;
  location: string;
  created_at: string;
};

export type CourierShipment = {
  id: number;
  order: number;
  status: string;
  courier: {
    id: number;
    user_id: number;
    phone: string;
    city: string;
    vehicle_type: string;
    is_online: boolean;
  } | null;
  courier_name: string;
  courier_phone: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  city: string;
  order_total_xaf: number;
  fulfillment_status: string;
  vendor_names: string[];
  relay_point: string;
  created_at: string;
  updated_at: string;
  events: CourierShipmentEvent[];
};

export type CourierShipmentAction =
  | "ACCEPT"
  | "DECLINE"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "NOTE";

export const courierApi = {
  listMyShipments: async (): Promise<CourierShipment[]> => {
    return http<CourierShipment[]>("/api/shipping/my-shipments/");
  },

  getShipment: async (id: number): Promise<CourierShipment> => {
    return http<CourierShipment>(`/api/shipping/my-shipments/${id}/`);
  },

  actOnShipment: async (
    id: number,
    payload: { action: CourierShipmentAction; message?: string; location?: string },
  ): Promise<CourierShipment> => {
    return http<CourierShipment>(`/api/shipping/my-shipments/${id}/action/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
