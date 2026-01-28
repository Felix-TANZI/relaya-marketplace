export type Category = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  parent: number | null;
};

export type ProductMedia = {
  id: number;
  url: string;
  media_type: "image" | "video";
  sort_order: number;
};

export type Inventory = {
  quantity: number;
};

export type Product = {
  id: number;
  title: string;
  slug: string;
  price_xaf: number;
  is_active: boolean;
  category: Category;
  media: ProductMedia[];
  created_at: string;
};

export type ProductDetail = {
  id: number;
  title: string;
  slug: string;
  description: string;
  price_xaf: number;
  is_active: boolean;
  category: Category;
  media: ProductMedia[];
  inventory: Inventory | null;
  created_at: string;
};
