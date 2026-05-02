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

export type CourierDashboardLeaderboard = {
  name: string;
  score: string;
  badge: string;
  tone: string;
};

export type CourierDashboardZone = {
  zone: string;
  demand_percent: number;
  hint: string;
};

export type CourierDashboardWeek = {
  label: string;
  earnings_xaf: number;
  deliveries: number;
  percent: number;
};

export type CourierNetworkShop = {
  vendor_id: number;
  vendor_name: string;
  shop_slug: string;
  city: string;
  address: string;
  phone: string;
  is_online: boolean;
  location_name: string;
  representative_name: string;
  representative_phone: string;
  latitude: number | null;
  longitude: number | null;
};

export type CourierNetworkRelayPoint = {
  name: string;
  city: string;
  address: string;
  shipments_count: number;
};

export type CourierNetwork = {
  shops: CourierNetworkShop[];
  relay_points: CourierNetworkRelayPoint[];
};

export type CourierNotification = {
  id: number;
  title: string;
  message: string;
  notification_type: "ORDER" | "PROMOTION" | "PAYMENT" | "SUPPORT" | "SYSTEM";
  action_url: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export type CourierDispute = {
  id: number;
  ref: string;
  label: string;
  status: string;
  status_display: string;
  reason: string;
  reason_display: string;
  detail: string;
  created_at: string;
  updated_at: string;
};

export type CourierShipmentMessage = {
  id: number;
  shipment: number;
  channel: "CLIENT" | "VENDOR" | "SUPPORT";
  sender_role: "COURIER" | "SYSTEM";
  sender_name: string;
  message: string;
  created_at: string;
};

export type CourierDashboard = {
  active_shipments: number;
  delivered_shipments: number;
  today_earnings_xaf: number;
  month_earnings_xaf: number;
  monthly_target_xaf: number;
  monthly_goal_percent: number;
  average_payout_xaf: number;
  online_minutes: number;
  status_label: string;
  distance_km: number;
  average_delivery_minutes: number;
  performance_percent: number;
  recommended_departure: string;
  traffic_label: string;
  weather_label: string;
  leaderboard: CourierDashboardLeaderboard[];
  zone_heatmap: CourierDashboardZone[];
  weekly_progress: CourierDashboardWeek[];
};

export type CourierSettings = {
  id: number;
  is_online: boolean;
  city: string;
  zones: string[];
  vehicle_type: "MOTORBIKE" | "CAR" | "BIKE" | "TRICYCLE" | "VAN";
  preferred_language: "fr" | "en";
  gps_permission_granted: boolean;
  camera_permission_granted: boolean;
  updated_at: string;
};

export type CourierSOSAlert = {
  id: number;
  courier: number;
  courier_name: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  message: string;
  location: string;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  updated_at: string;
};

export const courierApi = {
  getDashboard: async (): Promise<CourierDashboard> => {
    return http<CourierDashboard>("/api/shipping/dashboard/");
  },

  getNetwork: async (): Promise<CourierNetwork> => {
    return http<CourierNetwork>("/api/shipping/network/");
  },

  getSettings: async (): Promise<CourierSettings> => {
    return http<CourierSettings>("/api/shipping/settings/");
  },

  updateSettings: async (payload: Partial<Omit<CourierSettings, "id" | "updated_at">>): Promise<CourierSettings> => {
    return http<CourierSettings>("/api/shipping/settings/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  triggerSOS: async (payload: {
    message?: string;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<CourierSOSAlert> => {
    return http<CourierSOSAlert>("/api/shipping/sos/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getNotifications: async (): Promise<CourierNotification[]> => {
    return http<CourierNotification[]>("/api/auth/notifications/");
  },

  getDisputes: async (): Promise<CourierDispute[]> => {
    return http<CourierDispute[]>("/api/shipping/disputes/");
  },

  getShipmentMessages: async (
    id: number,
    channel?: "CLIENT" | "VENDOR" | "SUPPORT",
  ): Promise<CourierShipmentMessage[]> => {
    const qs = channel ? `?channel=${channel}` : "";
    return http<CourierShipmentMessage[]>(`/api/shipping/my-shipments/${id}/messages/${qs}`);
  },

  sendShipmentMessage: async (
    id: number,
    payload: { channel: "CLIENT" | "VENDOR" | "SUPPORT"; message: string },
  ): Promise<CourierShipmentMessage> => {
    return http<CourierShipmentMessage>(`/api/shipping/my-shipments/${id}/messages/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  scanShipment: async (
    payload: { code: string; action: "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED" },
  ): Promise<CourierShipment> => {
    return http<CourierShipment>("/api/shipping/scan/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  markNotificationRead: async (id: number): Promise<CourierNotification> => {
    return http<CourierNotification>(`/api/auth/notifications/${id}/read/`, {
      method: "POST",
    });
  },

  markAllNotificationsRead: async (): Promise<{ detail: string }> => {
    return http<{ detail: string }>("/api/auth/notifications/read-all/", {
      method: "POST",
    });
  },

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

  listAvailableShipments: async (): Promise<CourierShipment[]> => {
    return http<CourierShipment[]>("/api/shipping/available/");
  },

  claimShipment: async (id: number): Promise<CourierShipment> => {
    return http<CourierShipment>(`/api/shipping/available/${id}/claim/`, {
      method: "POST",
    });
  },
};
