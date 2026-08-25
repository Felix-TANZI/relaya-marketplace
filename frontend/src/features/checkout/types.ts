export type DeliveryCity = "YAOUNDE" | "DOUALA";

export type CheckoutDraft = {
  city: DeliveryCity;
  district?: string;
  address: string;
  phone: string;
  note?: string;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
};
