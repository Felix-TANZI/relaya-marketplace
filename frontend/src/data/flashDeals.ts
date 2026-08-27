// frontend/src/data/flashDeals.ts
//
// Source unique des offres flash. La page /flash-deals et le ruban mobile de
// l'accueil lisent exactement les mêmes données : campagnes FLASH de l'API quand
// elles existent, jeu de démonstration sinon.

import { useEffect, useState } from "react";
import { productsApi, type Product } from "@/services/api/products";
import { FLASH_DEALS, V29_PRODUCTS, getPromoProducts } from "@/data/v29Products";

/** Vue unifiée d'une offre flash, qu'elle vienne de l'API ou du jeu de démonstration. */
export interface FlashDeal {
  id: number;
  name: string;
  img: string;
  price: number;
  old: number;
  stock: number;
  endsAt?: string;
  isApiProduct: boolean;
}

function parseXaf(value: string) {
  return Number(value.replace(/\s/g, "")) || 0;
}

function getProductImage(product: Product) {
  return product.media?.[0]?.url || product.images?.[0]?.image_url || "";
}

export function discountOf(deal: FlashDeal) {
  return deal.old > deal.price ? Math.round(((deal.old - deal.price) / deal.old) * 100) : 0;
}

/** Part de stock écoulée, bornée pour que la barre reste lisible aux extrêmes. */
export function soldRatio(deal: FlashDeal) {
  return Math.max(8, Math.min(96, 100 - deal.stock * 4));
}

export function productToDeal(product: Product): FlashDeal {
  const campaign = product.active_campaign;
  return {
    id: product.id,
    name: campaign?.title || product.title,
    img: getProductImage(product),
    price: campaign?.promo_price_xaf ?? product.price_final ?? product.price_xaf,
    old: product.compare_at_price ?? product.price_xaf,
    stock: campaign?.remaining_stock ?? product.stock_quantity,
    endsAt: campaign?.ends_at,
    isApiProduct: true,
  };
}

/**
 * Repli hors connexion : les offres flash scénarisées, complétées par les produits
 * du catalogue de démonstration les plus remisés pour garnir la grille.
 */
export function buildFallbackDeals(): FlashDeal[] {
  const named = FLASH_DEALS.map((deal) => {
    const linked = V29_PRODUCTS.find((product) =>
      product.title.toLowerCase().includes(deal.name.toLowerCase().slice(0, 12)),
    );
    return {
      id: linked?.id ?? 0,
      name: deal.name,
      img: deal.img,
      price: parseXaf(deal.price),
      old: parseXaf(deal.old),
      stock: deal.stock,
      isApiProduct: false,
    };
  });

  const extras = getPromoProducts()
    .filter((product) => !named.some((deal) => deal.id === product.id))
    .map((product) => ({
      id: product.id,
      name: product.title,
      img: getProductImage(product),
      price: product.price_final ?? product.price_xaf,
      old: product.compare_at_price ?? product.price_xaf,
      stock: product.stock_quantity,
      isApiProduct: false,
    }));

  return [...named, ...extras].filter((deal) => deal.img && deal.price > 0 && deal.old > deal.price);
}

/** Charge les offres flash de l'API, avec repli automatique sur la démonstration. */
export function useFlashDeals() {
  const [deals, setDeals] = useState<FlashDeal[]>(buildFallbackDeals);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await productsApi.list({ page_size: 100, is_active: true });
        if (!mounted) return;

        const apiDeals = response.results
          .filter((product) => product.active_campaign?.campaign_type === "FLASH")
          .map(productToDeal)
          .filter((deal) => deal.img && deal.price > 0 && deal.old > deal.price);

        if (apiDeals.length) setDeals(apiDeals);
      } catch {
        if (mounted) setDeals(buildFallbackDeals());
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return deals;
}

/** Échéance commune affichée en tête des surfaces flash : première fin connue, sinon +6 h. */
export function useFlashCountdown(deals: FlashDeal[]) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const dates = deals
      .map((deal) => (deal.endsAt ? new Date(deal.endsAt).getTime() : 0))
      .filter((time) => time > Date.now())
      .sort((a, b) => a - b);
    const target = dates[0] ?? Date.now() + 6 * 3600 * 1000;

    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    const raf = requestAnimationFrame(tick);
    const timer = window.setInterval(tick, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, [deals]);

  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    pad(Math.floor(remaining / 3600000)),
    pad(Math.floor((remaining % 3600000) / 60000)),
    pad(Math.floor((remaining % 60000) / 1000)),
  ].join(":");
}

/** Chemin de la fiche produit correspondant à une offre. */
export function dealHref(deal: FlashDeal) {
  if (!deal.id) return "/promotions";
  return deal.isApiProduct ? `/product/${deal.id}` : `/product/${deal.id}?mock=1`;
}
