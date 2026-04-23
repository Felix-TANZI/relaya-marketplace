import type { CourierShipment } from "@/services/api/courier";

const now = new Date();

function hoursAgo(hours: number) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

export const MOCK_COURIER_SHIPMENTS: CourierShipment[] = [
  {
    id: 501,
    order: 145,
    status: "ASSIGNED",
    courier: {
      id: 1,
      user_id: 1,
      phone: "+237 690 111 222",
      city: "Yaoundé",
      vehicle_type: "MOTORBIKE",
      is_online: true,
    },
    courier_name: "Livreur Demo",
    courier_phone: "+237 690 111 222",
    customer_name: "Amina T.",
    customer_phone: "+237 677 111 000",
    delivery_address: "Bastos, face pharmacie du Coin",
    city: "Yaoundé",
    order_total_xaf: 24500,
    fulfillment_status: "DRIVER_ASSIGNED",
    vendor_names: ["BelivaY Market"],
    relay_point: "",
    created_at: hoursAgo(8),
    updated_at: hoursAgo(1),
    events: [
      { id: 1, status: "ASSIGNED", message: "Mission assignée", location: "Bastos Hub", created_at: hoursAgo(1) },
    ],
  },
  {
    id: 502,
    order: 146,
    status: "OUT_FOR_DELIVERY",
    courier: {
      id: 1,
      user_id: 1,
      phone: "+237 690 111 222",
      city: "Yaoundé",
      vehicle_type: "MOTORBIKE",
      is_online: true,
    },
    courier_name: "Livreur Demo",
    courier_phone: "+237 690 111 222",
    customer_name: "Paul N.",
    customer_phone: "+237 699 231 120",
    delivery_address: "Mvog-Ada, carrefour Jouvence",
    city: "Yaoundé",
    order_total_xaf: 68500,
    fulfillment_status: "OUT_FOR_DELIVERY",
    vendor_names: ["TechYaoundé"],
    relay_point: "",
    created_at: hoursAgo(15),
    updated_at: hoursAgo(0.5),
    events: [
      { id: 2, status: "PICKED_UP", message: "Colis pris en charge", location: "Akwa dépôt", created_at: hoursAgo(3) },
      { id: 3, status: "OUT_FOR_DELIVERY", message: "En route vers le client", location: "Essos", created_at: hoursAgo(0.5) },
    ],
  },
  {
    id: 503,
    order: 147,
    status: "DELIVERED",
    courier: {
      id: 1,
      user_id: 1,
      phone: "+237 690 111 222",
      city: "Yaoundé",
      vehicle_type: "MOTORBIKE",
      is_online: true,
    },
    courier_name: "Livreur Demo",
    courier_phone: "+237 690 111 222",
    customer_name: "Jean M.",
    customer_phone: "+237 655 900 800",
    delivery_address: "Nlongkak, immeuble Mboa",
    city: "Yaoundé",
    order_total_xaf: 18000,
    fulfillment_status: "DELIVERED",
    vendor_names: ["Maison Wax Premium"],
    relay_point: "",
    created_at: hoursAgo(36),
    updated_at: hoursAgo(24),
    events: [
      { id: 4, status: "ASSIGNED", message: "Mission assignée", location: "Nlongkak", created_at: hoursAgo(30) },
      { id: 5, status: "PICKED_UP", message: "Colis récupéré", location: "Marché central", created_at: hoursAgo(28) },
      { id: 6, status: "DELIVERED", message: "Colis livré", location: "Nlongkak", created_at: hoursAgo(24) },
    ],
  },
];
