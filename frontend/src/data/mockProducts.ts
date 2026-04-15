import { type Product } from "@/services/api/products";

interface MockVendor {
  id: number;
  shop_name: string;
  is_premium?: boolean;
}

export interface MockProduct extends Product {
  vendor?: MockVendor;
  name?: string;
}

function mp(id: number, title: string, slug: string, price_xaf: number, price_final: number, discount: number, catId: number, catName: string, catSlug: string, vendor: MockVendor, stock: number, rating: number, reviews: number, desc: string, is_featured?: boolean): MockProduct {
  return {
    id,
    title,
    slug,
    price_xaf,
    price_final,
    discount,
    category: { id: catId, name: catName, slug: catSlug, is_active: true },
    vendor,
    name: title,
    stock_quantity: stock,
    rating_average: rating,
    reviews_count: reviews,
    is_active: true,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    description: desc,
    media: [],
    images: [],
  };
}

const v1: MockVendor = { id: 1, shop_name: "Elegance Afrique", is_premium: true };
const v2: MockVendor = { id: 2, shop_name: "TechZone CMR", is_premium: true };
const v3: MockVendor = { id: 3, shop_name: "BeautyQueen Dla", is_premium: true };
const v4: MockVendor = { id: 4, shop_name: "Maison Cameroun", is_premium: true };
const v5: MockVendor = { id: 5, shop_name: "ShoePlanet" };
const v6: MockVendor = { id: 6, shop_name: "HomeStyle CMR" };
const v7: MockVendor = { id: 7, shop_name: "NaturalShop" };

// 20 mock products
export const mockProducts: MockProduct[] = [
  // Premium vendor products (8)
  mp(1001, "Robe Wax Premium Kente", "robe-wax-premium-kente", 45000, 35000, 22, 1, "Mode Femme", "mode-femme", v1, 15, 4.8, 124, "Robe en tissu Wax africain authentique, coupe évasée"),
  mp(1002, "Samsung Galaxy A55 5G", "samsung-galaxy-a55-5g", 195000, 175000, 10, 2, "Téléphones", "telephones", v2, 8, 4.7, 89, "Smartphone Samsung Galaxy A55 5G, 128Go"),
  mp(1003, "Parfum Bois d'Ébène Cameroun", "parfum-bois-ebene", 28000, 22000, 21, 3, "Beauté & Santé", "beaute-sante", v3, 30, 4.9, 67, "Parfum artisanal aux essences de bois d'ébène"),
  mp(1004, "Costume Bazin Brodé Homme", "costume-bazin-brode", 85000, 68000, 20, 4, "Mode Homme", "mode-homme", v1, 5, 4.6, 45, "Costume traditionnel en Bazin riche brodé"),
  mp(1005, "iPhone 15 Pro Max 256Go", "iphone-15-pro-max", 850000, 780000, 8, 2, "Téléphones", "telephones", v2, 3, 4.9, 210, "Apple iPhone 15 Pro Max, Titane naturel"),
  mp(1006, "Crème Éclaircissante Karité Bio", "creme-karite-bio", 15000, 12000, 20, 3, "Beauté & Santé", "beaute-sante", v3, 50, 4.5, 178, "Crème hydratante au beurre de karité 100% bio"),
  mp(1007, "Ensemble Pagne Femme Ndop", "ensemble-pagne-ndop", 55000, 42000, 24, 1, "Mode Femme", "mode-femme", v4, 12, 4.7, 56, "Ensemble en tissu Ndop, fait main au Cameroun"),
  mp(1008, "Laptop HP Pavilion 15", "laptop-hp-pavilion-15", 320000, 285000, 11, 5, "Électronique", "electronique", v2, 6, 4.4, 33, "HP Pavilion 15, Intel i5, 8Go RAM"),

  // Category products (12)
  mp(1009, "Sneakers Nike Air Max 90", "sneakers-nike-air-max", 65000, 52000, 20, 6, "Chaussures", "chaussures", v5, 20, 4.6, 92, "Nike Air Max 90, authentiques"),
  mp(1010, "Mixeur Blender 1.5L", "mixeur-blender-1-5l", 18000, 14500, 19, 7, "Maison & Déco", "maison-deco", v6, 25, 4.3, 41, "Blender multifonction 1.5L avec 3 vitesses"),
  mp(1011, "Huile de Coco Vierge 500ml", "huile-coco-vierge", 5500, 4500, 18, 8, "Supermarché", "supermarche", v7, 100, 4.8, 234, "Huile de coco vierge pressée à froid"),
  mp(1012, "Sandales Artisanales Cuir", "sandales-artisanales-cuir", 22000, 18000, 18, 6, "Chaussures", "chaussures", v5, 14, 4.5, 67, "Sandales en cuir artisanal camerounais"),
  mp(1013, "Sac à Main en Raphia", "sac-main-raphia", 35000, 28000, 20, 1, "Mode Femme", "mode-femme", v4, 8, 4.7, 89, "Sac à main tissé en raphia naturel"),
  mp(1014, "Ventilateur Plafonnier LED", "ventilateur-plafonnier-led", 42000, 35000, 17, 7, "Maison & Déco", "maison-deco", v6, 10, 4.2, 28, "Ventilateur de plafond avec éclairage LED intégré"),
  mp(1015, "Écouteurs Bluetooth JBL Tune", "ecouteurs-bluetooth-jbl", 25000, 19500, 22, 5, "Électronique", "electronique", v2, 18, 4.6, 156, "JBL Tune 520BT, son puissant, 57h autonomie"),
  mp(1016, "Chemise Brodée Homme", "chemise-brodee-homme", 28000, 22000, 21, 4, "Mode Homme", "mode-homme", v1, 22, 4.4, 78, "Chemise en coton avec broderie traditionnelle"),
  mp(1017, "Kit Maquillage Professionnel", "kit-maquillage-pro", 38000, 30000, 21, 3, "Beauté & Santé", "beaute-sante", v3, 15, 4.8, 112, "Kit complet: fond de teint, mascara, rouge"),
  mp(1018, "Riz Parfumé Cameroun 25kg", "riz-parfume-cameroun-25kg", 16000, 13500, 16, 8, "Supermarché", "supermarche", v7, 200, 4.3, 345, "Riz parfumé local, qualité premium, sac 25kg"),
  mp(1019, "Montre Connectée Sport", "montre-connectee-sport", 35000, 28000, 20, 5, "Électronique", "electronique", v2, 9, 4.5, 67, "Smartwatch sport, GPS, cardio, étanche IP68"),
  mp(1020, "Table Basse en Bois Massif", "table-basse-bois-massif", 75000, 62000, 17, 7, "Maison & Déco", "maison-deco", v6, 4, 4.9, 23, "Table basse artisanale en bois de padouk"),
];

// Flash sale products (higher discounts)
export const flashSaleProducts = mockProducts.filter(p => p.discount >= 20);

// Premium vendor products
export const premiumProducts = mockProducts.filter(p => p.vendor?.is_premium);

// Products by category
export function getProductsByCategory(categorySlug: string): MockProduct[] {
  return mockProducts.filter(p => p.category?.slug === categorySlug);
}

export function getCategoryGroups() {
  const groups: Record<string, { name: string; products: MockProduct[] }> = {};
  for (const p of mockProducts) {
    const slug = p.category?.slug || "other";
    if (!groups[slug]) {
      groups[slug] = { name: p.category?.name || "Autre", products: [] };
    }
    groups[slug].products.push(p);
  }
  return groups;
}
