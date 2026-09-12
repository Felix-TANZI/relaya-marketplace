// frontend/src/components/product/CatalogProductCard.tsx
// Carte produit compacte pensée pour la grille du catalogue (3–5 colonnes).
// Icône panier + cœur favori en overlay (cohérent avec la page Favoris),
// image et titre cliquables vers la fiche produit.
// Reprend la logique panier + favori de ProductCard — aucune dépendance à
// ProductCard, donc pas de double bouton.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Heart, ShoppingBag, ShoppingCart, Star, Truck } from "lucide-react";
import type { Product } from "@/services/api/products";
import { useCart } from "@/context/CartContext";
import { toggleFavoriteProduct, isFavoriteProduct } from "@/lib/favorites";
import { hasValidAccessToken } from "@/lib/authTokens";
import { customerApi } from "@/services/api/customer";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

interface CatalogProductCardProps {
  product: Product;
  showPromo?: boolean;
  isMock?: boolean;
}

export default function CatalogProductCard({
  product,
  showPromo = false,
  isMock = false,
}: CatalogProductCardProps) {
  const { addItem } = useCart();
  const [isFavorite, setIsFavorite] = useState(() => isFavoriteProduct(product.id));
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const sync = () => setIsFavorite(isFavoriteProduct(product.id));
    window.addEventListener("belivay-favorites-updated", sync);
    return () => window.removeEventListener("belivay-favorites-updated", sync);
  }, [product.id]);

  const finalPrice = product.price_final ?? product.price_xaf;
  const discountPercent = product.discount_percent ?? product.discount ?? 0;
  const hasPromotion = Boolean(product.is_on_promotion ?? discountPercent > 0);
  const compareAt =
    product.compare_at_price && product.compare_at_price > finalPrice
      ? product.compare_at_price
      : product.discount
        ? product.price_xaf
        : null;
  const image =
    product.images?.find((img) => img.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    product.media?.find((media) => media.media_type === "image")?.url;
  const inStock = product.stock_quantity ? product.stock_quantity > 0 : true;
  const productUrl = `/product/${product.master_slug ?? product.id}${isMock ? "?mock=1" : ""}`;

  const handleAddToCart = () => {
    if (!inStock) return;
    addItem({
      id: product.id,
      master_id: product.master ?? undefined,
      name: product.title,
      price: finalPrice,
      quantity: 1,
      image,
      isDemo: isMock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1100);
  };

  const handleToggleFavorite = async () => {
    const nextIds = toggleFavoriteProduct(product.id);
    const nextIsFavorite = nextIds.includes(product.id);
    setIsFavorite(nextIsFavorite);
    if (!hasValidAccessToken()) return;
    try {
      if (nextIsFavorite) {
        await customerApi.addFavorite(product.id);
        return;
      }
      const favorites = await customerApi.getFavorites();
      const favorite = favorites.find((item) => item.product.id === product.id);
      if (favorite) await customerApi.removeFavorite(favorite.id);
    } catch {
      const reverted = toggleFavoriteProduct(product.id);
      setIsFavorite(reverted.includes(product.id));
    }
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="relative aspect-square overflow-hidden bg-[#fff7ef] dark:bg-gray-800">
        <Link to={productUrl} className="block h-full w-full">
          {image ? (
            <img
              src={image}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-primary/40">
              <ShoppingBag size={28} />
            </div>
          )}
        </Link>

        {showPromo && hasPromotion && discountPercent > 0 && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
            -{discountPercent}%
          </span>
        )}

        {!inStock && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-gray-800/85 px-1.5 py-0.5 text-[9px] font-black text-white">
            Rupture
          </span>
        )}

        {/* Favori */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition hover:scale-110 active:scale-95 ${
            isFavorite
              ? "bg-pink-500 text-white"
              : "bg-white/90 text-gray-400 hover:text-pink-500 dark:bg-gray-900/80"
          }`}
        >
          <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {/* Ajouter au panier */}
        {inStock && (
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={`Ajouter ${product.title} au panier`}
            className={`absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:scale-110 active:scale-95 ${
              added ? "bg-green-500 text-white" : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {added ? <Check size={15} /> : <ShoppingCart size={15} />}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <Link to={productUrl} className="block">
          <h3 className="line-clamp-2 min-h-[38px] text-[13px] font-bold leading-[1.4] text-gray-800 transition-colors hover:text-primary dark:text-gray-100">
            {product.title}
          </h3>
        </Link>
        <p className="mt-1 truncate text-xs text-gray-500">{product.category?.name ?? "Vendeur BelivaY"}</p>
        <div className="mt-2 flex min-h-5 items-center gap-1 text-xs text-gray-500">
          <Star size={13} className="fill-amber-400 text-amber-400" />
          <span className="font-bold text-gray-700 dark:text-gray-200">{(product.rating_average ?? 0).toFixed(1)}</span>
          <span>({product.reviews_count ?? 0})</span>
          <span className="ml-auto inline-flex items-center gap-1"><Truck size={12} /> 24-72 h</span>
        </div>
        <div className="mt-2 flex min-h-6 flex-wrap items-baseline gap-x-1.5">
          <span className="text-base font-black tabular-nums text-primary">{fmt(finalPrice)}</span>
          {compareAt && <span className="text-xs text-gray-400 line-through">{fmt(compareAt)}</span>}
        </div>
        <button type="button" onClick={handleAddToCart} disabled={!inStock} className="mt-3 hidden min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-[13px] font-bold text-white transition hover:bg-primary-dark disabled:bg-gray-300 sm:flex"><ShoppingCart size={15} />{added ? "Ajouté" : inStock ? "Ajouter au panier" : "Indisponible"}</button>
      </div>
    </article>
  );
}
