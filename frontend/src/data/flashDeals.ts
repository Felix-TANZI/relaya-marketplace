// frontend/src/data/flashDeals.ts
//
// Source unique des offres flash (feuille de route D9). La page /flash-deals et
// le ruban mobile de l'accueil lisent exactement les mêmes données :
// GET /api/catalog/flash-deals/, déjà dans l'ordre des préférences du client.
//
// Plus de jeu de démonstration : sans vente flash en cours, il n'y a rien à
// montrer. Le prix, le stock et le compte à rebours sont ceux du serveur, les
// mêmes pour tous ; le compte à rebours part de `server_now` (l'heure du
// serveur), jamais de l'horloge du téléphone.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { http } from "@/services/api/http";
import type { Product } from "@/services/api/products";

/** Vue unifiée d'une offre flash. */
export interface FlashDeal {
  id: number;
  name: string;
  img: string;
  price: number;
  old: number;
  /** Stock flash restant. */
  stock: number;
  /** Stock flash réservé au départ. */
  reserved: number;
  endsAt?: string;
  isApiProduct: boolean;
}

interface FlashDealsResponse {
  ouvert: boolean;
  server_now: string;
  deals: Array<{
    id: number;
    title: string;
    ends_at: string;
    promo_price_xaf: number;
    reference_price_xaf: number;
    stock_reserved: number;
    remaining_stock: number;
    product: Product;
  }>;
}

/** Écart entre l'horloge du serveur et celle du téléphone, mesuré au dernier chargement. */
let decalageServeurMs = 0;
export const maintenantServeur = () => Date.now() + decalageServeurMs;

/** Recale l'horloge sur `server_now` d'une réponse du serveur (flash-deals, campagne active d'un produit). */
export function caleSurServeur(serverNow?: string) {
  if (serverNow) decalageServeurMs = new Date(serverNow).getTime() - Date.now();
}

function getProductImage(product: Product) {
  return product.media?.[0]?.url || product.images?.[0]?.image_url || "";
}

export function discountOf(deal: FlashDeal) {
  return deal.old > deal.price ? Math.round(((deal.old - deal.price) / deal.old) * 100) : 0;
}

/** Part du stock flash déjà vendue, bornée pour que la barre reste lisible aux extrêmes. */
export function soldRatio(deal: FlashDeal) {
  if (!deal.reserved) return 8;
  return Math.max(8, Math.min(96, Math.round(((deal.reserved - deal.stock) / deal.reserved) * 100)));
}

/** Charge les offres flash du serveur, dans l'ordre des préférences du client. */
export function useFlashDeals() {
  const { i18n } = useTranslation();
  const [deals, setDeals] = useState<FlashDeal[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await http<FlashDealsResponse>("/api/catalog/flash-deals/");
        if (!mounted) return;
        decalageServeurMs = new Date(data.server_now).getTime() - Date.now();
        setDeals(
          data.deals
            .map((d) => ({
              id: d.product.id,
              name: d.title || d.product.title,
              img: getProductImage(d.product),
              price: d.promo_price_xaf,
              old: d.reference_price_xaf,
              stock: d.remaining_stock,
              reserved: d.stock_reserved,
              endsAt: d.ends_at,
              isApiProduct: true,
            }))
            .filter((deal) => deal.price > 0 && deal.old > deal.price),
        );
      } catch {
        if (mounted) setDeals([]);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [i18n.language]);

  return deals;
}

/** Échéance commune affichée en tête des surfaces flash : la première fin, à l'heure du serveur. */
export function useFlashCountdown(deals: FlashDeal[]) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const dates = deals
      .map((deal) => (deal.endsAt ? new Date(deal.endsAt).getTime() : 0))
      .filter((time) => time > maintenantServeur())
      .sort((a, b) => a - b);
    const target = dates[0];
    if (!target) {
      setRemaining(0);
      return undefined;
    }
    const tick = () => setRemaining(Math.max(0, target - maintenantServeur()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
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
  return deal.id ? `/product/${deal.id}` : "/flash-deals";
}

/** Temps restant avant `endsAt`, à l'heure du serveur, en heures, minutes, secondes. */
export function useDeadlineCountdown(endsAt?: string) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const calcul = () => (endsAt ? Math.max(0, Math.floor((new Date(endsAt).getTime() - maintenantServeur()) / 1000)) : 0);
    setLeft(calcul());
    const id = window.setInterval(() => setLeft(calcul()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return {
    h: String(Math.floor(left / 3600)).padStart(2, "0"),
    m: String(Math.floor((left % 3600) / 60)).padStart(2, "0"),
    s: String(left % 60).padStart(2, "0"),
  };
}
