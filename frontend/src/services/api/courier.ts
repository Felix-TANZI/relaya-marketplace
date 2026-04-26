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

export const courierApi = {
  getDashboard: async (): Promise<CourierDashboard> => {
    return http<CourierDashboard>("/api/shipping/dashboard/");
  },

  getNotifications: async (): Promise<CourierNotification[]> => {
    return http<CourierNotification[]>("/api/auth/notifications/");
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
};
