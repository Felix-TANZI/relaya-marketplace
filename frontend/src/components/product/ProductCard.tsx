import {
  Baby,
  Dumbbell,
  Footprints,
  Heart,
  House,
  Laptop,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Smartphone,
  Star,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "@/context/CartContext";
import { isFavoriteProduct, toggleFavoriteProduct } from "@/lib/favorites";
import { customerApi } from "@/services/api/customer";

interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

interface ProductMedia {
  id: number;
  url: string;
  media_type: "image" | "video";
  sort_order: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  parent?: number | null;
}

interface Product {
  id: number;
  title: string;
  description?: string;
  short_description?: string;
  price_xaf: number;
  price_final?: number;
  image?: string;
  images?: ProductImage[];
  media?: ProductMedia[];
  category?: Category | null;
  rating_average?: number | null;
  reviews_count?: number;
  stock_quantity?: number;
  discount?: number;
}

interface ProductCardProps {
  product: Product;
  showPromo?: boolean;
  /** Compact mode for V29 horizontal scroll sections */
  compact?: boolean;
  isMock?: boolean;
}

function getCompactCategoryIcon(categorySlug?: string | null) {
  switch (categorySlug) {
    case "femme":
    case "homme":
      return Shirt;
    case "tech":
      return Laptop;
    case "phone":
      return Smartphone;
    case "beaute":
      return Sparkles;
    case "maison":
      return House;
    case "super":
      return ShoppingBasket;
    case "shoes":
      return Footprints;
    case "sport":
      return Dumbbell;
    case "bebe":
      return Baby;
    default:
      return ShoppingCart;
  }
}

export default function ProductCard({
  product,
  showPromo = false,
  compact = false,
  isMock = false,
}: ProductCardProps) {
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(() => isFavoriteProduct(product.id));
  const [imageError, setImageError] = useState(false);
  const { addItem } = useCart();

  const finalPrice =
    product.price_final ??
    (product.discount
      ? product.price_xaf - (product.price_xaf * product.discount) / 100
      : product.price_xaf);

  const displayImage =
    product.images?.find((img) => img.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    product.media?.find((media) => media.media_type === "image")?.url ||
    product.image;

  const inStock = product.stock_quantity ? product.stock_quantity > 0 : true;
  const canOrder = inStock && !isMock;
  const hasReviews = Boolean(product.reviews_count && product.reviews_count > 0);
  const CompactCategoryIcon = getCompactCategoryIcon(product.category?.slug);
  const productUrl = `/product/${product.id}${isMock ? "?mock=1" : ""}`;

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    if (!canOrder) return;
    addItem({
      id: product.id,
      name: product.title,
      price: finalPrice,
      quantity: 1,
      image: displayImage,
    });
  };

  const handleToggleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nextFavoriteIds = toggleFavoriteProduct(product.id);
    const nextIsFavorite = nextFavoriteIds.includes(product.id);
    setIsFavorite(nextIsFavorite);
    if (!localStorage.getItem('access_token')) return;
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

  useEffect(() => {
    const sync = () => setIsFavorite(isFavoriteProduct(product.id));
    window.addEventListener("belivay-favorites-updated", sync as EventListener);
    return () => window.removeEventListener("belivay-favorites-updated", sync as EventListener);
  }, [product.id]);

  /* ── COMPACT MODE (V29 horizontal scroll) ── */
  if (compact) {
    return (
      <Link to={productUrl} className="group block h-full">
        <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,.04)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-700/50">
            {/* Badges */}
            {showPromo && product.discount ? (
              <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8.5px] font-bold text-white">
                  -{product.discount}%
                </span>
              </div>
            ) : null}
            <div className="absolute left-2 bottom-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/90 bg-white/90 text-primary shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90">
              <CompactCategoryIcon size={12} />
            </div>
            {/* Verified badge */}
            <div className="absolute right-2 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-white bg-green-500 shadow-sm">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            {/* Favorite */}
            <button
              onClick={handleToggleFavorite}
              className={`absolute bottom-2 right-2 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full backdrop-blur-sm transition-all ${isFavorite ? 'bg-pink-50 opacity-100 dark:bg-pink-500/20' : 'bg-white/90 opacity-0 group-hover:opacity-100 dark:bg-gray-800/90'}`}
            >
              <Heart size={11} className={isFavorite ? "fill-pink-500 text-pink-500" : "text-gray-600"} />
            </button>
            {/* Image */}
            {!imageError && displayImage ? (
              <img
                src={displayImage}
                alt={product.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl">
                <ShoppingCart size={28} className="text-gray-300" />
              </div>
            )}
          </div>
          {/* Body */}
          <div className="flex flex-1 flex-col p-1.5">
            <h3 className="mb-0.5 line-clamp-2 text-[10.5px] font-bold leading-tight text-gray-900 dark:text-white">
              {product.title}
            </h3>
            <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold text-gray-400">
              <span className="h-1 w-1 flex-shrink-0 rounded-full bg-green-500" />
              <span className="truncate">Belivay</span>
            </div>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-[12px] font-extrabold text-primary">
                {finalPrice.toLocaleString("fr-FR")}
              </span>
              <span className="text-[8.5px] font-extrabold text-primary">FCFA</span>
            </div>
            {/* Stars + delivery */}
            <div className="mb-1 flex items-center justify-between text-[8.5px]">
              <span className="flex items-center gap-0.5">
                <Star size={9} className="fill-amber-400 text-amber-400" />
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {product.rating_average?.toFixed(1) || "—"} {hasReviews && `(${product.reviews_count})`}
                </span>
              </span>
              <span className="flex items-center gap-0.5 font-semibold text-green-600">
                <Truck size={9} />
                24h
              </span>
            </div>
            {/* CTA */}
            <button
              onClick={handleAddToCart}
              disabled={!canOrder}
              className={`mt-auto rounded-md px-1 py-1 text-[9.5px] font-extrabold transition-all ${
                canOrder
                  ? "bg-primary text-white hover:bg-primary-dark active:scale-95"
                  : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
              }`}
            >
              {canOrder ? "+ Panier" : isMock ? "Démo" : "Épuisé"}
            </button>
          </div>
        </article>
      </Link>
    );
  }

  /* ── DEFAULT MODE (full-size) ── */
  const productSnippet = (
    product.short_description ||
    product.description ||
    t("product_card.marketplace_price")
  ).trim();

  return (
    <Link to={productUrl} className="group block h-full">
      <article className="product-card flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[#f0e3d6] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="relative aspect-[1.02] overflow-hidden bg-gradient-to-br from-[#fff6ee] via-white to-[#fff1e2] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
            {showPromo && product.discount ? (
              <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-lg shadow-primary/25">
                -{product.discount}%
              </span>
            ) : null}
            {!inStock ? (
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white">
                {t('product_card.sold_out')}
              </span>
            ) : null}
            {isMock ? (
              <span className="rounded-full bg-gray-900/80 px-2.5 py-1 text-[11px] font-bold text-white">
                Démo
              </span>
            ) : null}
          </div>
          <button
            onClick={handleToggleFavorite}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:text-red-500 dark:bg-gray-800/90 dark:text-gray-300"
          >
            <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
          </button>
          {!imageError && displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingCart size={36} className="text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="line-clamp-2 min-h-[3rem] text-[14px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary dark:text-white">
            {product.title}
          </h3>
          <p className="line-clamp-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{productSnippet}</p>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-[#fff7ef] px-2 py-1.5 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <Star size={11} className="fill-yellow-400 text-yellow-400" />
              <span className="text-[11px] font-semibold">
                {hasReviews && product.rating_average
                  ? `${product.rating_average.toFixed(1)} · ${product.reviews_count}`
                  : t("product_card.new_on_marketplace")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-green-50 px-2 py-1.5 text-green-700 dark:bg-green-900/20 dark:text-green-300">
              <Truck size={11} />
              <span className="text-[11px] font-semibold">24-72h</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-primary">
              {finalPrice.toLocaleString("fr-FR")} FCFA
            </span>
            {product.discount ? (
              <span className="text-xs text-gray-400 line-through dark:text-gray-500">
                {product.price_xaf.toLocaleString("fr-FR")}
              </span>
            ) : null}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!canOrder}
            className={`add-to-cart mt-auto flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all ${
              canOrder ? "bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5" : "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            <ShoppingCart size={16} />
            {canOrder ? t('product_card.add_to_cart') : isMock ? "Produit démo" : t('product_card.unavailable')}
          </button>
        </div>
      </article>
    </Link>
  );
}
