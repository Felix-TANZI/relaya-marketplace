export type DeliveryCity = "YAOUNDE" | "DOUALA";

export type CheckoutDraft = {
  city: DeliveryCity;
  address: string;
  phone: string;
  note?: string;
};
