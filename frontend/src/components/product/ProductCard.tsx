import { Heart, ShoppingCart, Star, Store, Truck } from "lucide-react";
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
}

export default function ProductCard({
  product,
  showPromo = false,
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
  const hasReviews = Boolean(product.reviews_count && product.reviews_count > 0);
  const productSnippet = (
    product.short_description ||
    product.description ||
    t("product_card.marketplace_price")
  ).trim();

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();

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

    if (!localStorage.getItem('access_token')) {
      return;
    }

    try {
      if (nextIsFavorite) {
        await customerApi.addFavorite(product.id);
        return;
      }

      const favorites = await customerApi.getFavorites();
      const favorite = favorites.find((item) => item.product.id === product.id);
      if (favorite) {
        await customerApi.removeFavorite(favorite.id);
      }
    } catch (error) {
      console.error('Erreur mise a jour favoris:', error);
      const revertedFavoriteIds = toggleFavoriteProduct(product.id);
      setIsFavorite(revertedFavoriteIds.includes(product.id));
    }
  };

  useEffect(() => {
    const syncFavoriteState = () => setIsFavorite(isFavoriteProduct(product.id));

    window.addEventListener(
      "belivay-favorites-updated",
      syncFavoriteState as EventListener,
    );

    return () => {
      window.removeEventListener(
        "belivay-favorites-updated",
        syncFavoriteState as EventListener,
      );
    };
  }, [product.id]);

  return (
    <Link to={`/product/${product.id}`} className="group block h-full">
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
          </div>

          <button
            onClick={handleToggleFavorite}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:text-red-500 dark:bg-gray-800/90 dark:text-gray-300"
          >
            <Heart
              size={18}
              className={isFavorite ? "fill-red-500 text-red-500" : ""}
            />
          </button>

          {!imageError && displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-primary shadow-sm dark:bg-gray-800">
                <ShoppingCart size={36} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            {product.category ? (
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary dark:bg-primary/10">
                {product.category.name}
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                {t('product_card.catalog')}
              </span>
            )}

            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
              <Store size={12} />
              Belivay
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="line-clamp-2 min-h-[3rem] text-[15px] font-semibold leading-6 text-gray-900 transition-colors group-hover:text-primary dark:text-white">
              {product.title}
            </h3>
            <p className="line-clamp-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {productSnippet}
            </p>
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-2xl bg-[#fff7ef] px-3 py-2 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">
                {hasReviews && product.rating_average
                  ? `${product.rating_average.toFixed(1)} · ${product.reviews_count} ${t("product_card.reviews")}`
                  : t("product_card.new_on_marketplace")}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-3 py-2 text-green-700 dark:bg-green-900/20 dark:text-green-300">
              <Truck size={13} />
              <span className="font-semibold">{t("product_card.max_72h")}</span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {finalPrice.toLocaleString()} FCFA
              </div>
              {product.discount ? (
                <div className="text-xs text-gray-400 line-through dark:text-gray-500">
                  {product.price_xaf.toLocaleString()} FCFA
                </div>
              ) : (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {t('product_card.marketplace_price')}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 text-right">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  inStock
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                    : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
                }`}
              >
                {inStock ? t("product_card.max_72h") : t("product_card.unavailable")}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                Belivay Express
              </span>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2">
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className={`add-to-cart flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                inStock
                  ? "bg-primary text-white hover:bg-primary-dark"
                  : "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              <ShoppingCart size={18} />
              {inStock ? t('product_card.add_to_cart') : t('product_card.unavailable')}
            </button>
            <span className="hidden rounded-2xl border border-[#f0e3d6] px-3 py-3 text-xs font-semibold text-gray-500 sm:inline-flex dark:border-gray-700 dark:text-gray-400">
              Voir
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
