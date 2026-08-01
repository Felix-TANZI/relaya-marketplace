import { useEffect, useRef, useState } from "react";
import { Check, Heart, ShoppingBag, ShoppingCart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { productsApi, type Product } from "@/services/api/products";
import { getFavoriteProductIds, toggleFavoriteProduct } from "@/lib/favorites";
import { hasValidAccessToken } from "@/lib/authTokens";
import { customerApi } from "@/services/api/customer";
import { V29_PRODUCTS } from "@/data/v29Products";
import { useCart } from "@/context/CartContext";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export default function WishlistPage() {
  const { t } = useTranslation();
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [justAddedId, setJustAddedId] = useState<number | null>(null);
  const removedIdsRef = useRef<Set<number>>(new Set());

  const fetchProducts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      if (hasValidAccessToken()) {
        try {
          const favorites = await customerApi.getFavorites();
          const apiProducts = favorites.map((favorite) => favorite.product);
          const fallbackProducts = V29_PRODUCTS.filter((product) =>
            getFavoriteProductIds().includes(product.id),
          );
          const knownIds = new Set(apiProducts.map((product) => product.id));
          const list = [
            ...apiProducts,
            ...fallbackProducts.filter((product) => !knownIds.has(product.id)),
          ];
          setProducts(list.filter((product) => !removedIdsRef.current.has(product.id)));
          return;
        } catch {
          // fall through to resilient local favorites
        }
      }

      const ids = getFavoriteProductIds();
      if (ids.length === 0) {
        setProducts([]);
        return;
      }

      const fallbackProducts = V29_PRODUCTS.filter((product) => ids.includes(product.id));

      try {
        const response = await productsApi.list({ page_size: 100 });
        const apiProducts = (response.results || []).filter((product) => ids.includes(product.id));
        const knownIds = new Set(apiProducts.map((product) => product.id));
        const list = [
          ...apiProducts,
          ...fallbackProducts.filter((product) => !knownIds.has(product.id)),
        ];
        setProducts(list.filter((product) => !removedIdsRef.current.has(product.id)));
      } catch {
        setProducts(fallbackProducts.filter((product) => !removedIdsRef.current.has(product.id)));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  useEffect(() => {
    const onFavoritesUpdated = () => void fetchProducts(true);
    window.addEventListener("belivay-favorites-updated", onFavoritesUpdated);
    return () => window.removeEventListener("belivay-favorites-updated", onFavoritesUpdated);
  }, []);

  const addProductToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.title,
      price: product.price_final,
      quantity: 1,
      image:
        product.images?.find((image) => image.is_primary)?.image_url ||
        product.images?.[0]?.image_url ||
        product.media?.find((media) => media.media_type === "image")?.url,
      isDemo: V29_PRODUCTS.some((item) => item.id === product.id),
    });
  };

  const handleAdd = (product: Product) => {
    addProductToCart(product);
    setJustAddedId(product.id);
    window.setTimeout(
      () => setJustAddedId((current) => (current === product.id ? null : current)),
      1100,
    );
  };

  const handleRemove = (product: Product) => {
    const id = product.id;
    setRemovingIds((prev) => new Set(prev).add(id));

    window.setTimeout(() => {
      removedIdsRef.current.add(id);
      setProducts((current) => current.filter((item) => item.id !== id));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      toggleFavoriteProduct(id);

      if (hasValidAccessToken()) {
        void (async () => {
          try {
            const favorites = await customerApi.getFavorites();
            const favorite = favorites.find((item) => item.product.id === id);
            if (favorite) await customerApi.removeFavorite(favorite.id);
          } catch {
            // suppression locale déjà appliquée — on n'interrompt pas l'UI
          }
        })();
      }
    }, 280);
  };

  const gridClass =
    "grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10";

  return (
    <div className="min-h-screen bg-[#f8f5f1] px-3 py-4 dark:bg-gray-950 sm:px-4 sm:py-8">
      <style>{`
        @keyframes wishlistIn { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes wishlistOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(.85); } }
        @keyframes wishlistHeart { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
      `}</style>

      <div className="mx-auto max-w-[1600px]">
        {/* ══════════ EN-TÊTE ══════════ */}
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-3"
          style={{ animation: "wishlistIn .4s ease-out both" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-500 dark:bg-pink-900/20"
              style={{ animation: "wishlistHeart 2.6s ease-in-out infinite" }}
            >
              <Heart size={20} fill="currentColor" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white sm:text-2xl">
                {t("wishlist.title")}
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-sm">
                {products.length} produit{products.length > 1 ? "s" : ""} coup de cœur
              </p>
            </div>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3.5 py-2 text-[12px] font-bold text-pink-600 transition hover:bg-pink-50 dark:border-pink-900/30 dark:bg-gray-900 dark:text-pink-300 dark:hover:bg-pink-900/10"
          >
            <ShoppingBag size={14} />
            Explorer le catalogue
          </Link>
        </div>

        {loading ? (
          /* ══════════ CHARGEMENT ══════════ */
          <div className={gridClass}>
            {Array.from({ length: 18 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="aspect-square animate-pulse bg-gray-100 dark:bg-gray-800" />
                <div className="space-y-1.5 p-2">
                  <div className="h-2.5 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* ══════════ AUCUN FAVORI ══════════ */
          <div
            className="rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-10"
            style={{ animation: "wishlistIn .4s ease-out both" }}
          >
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-pink-50 text-pink-500 dark:bg-pink-900/20">
              <Heart size={34} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
              {t("wishlist.empty_title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-500 dark:text-gray-400">
              {t("wishlist.empty_description")}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
              >
                <ShoppingBag size={18} />
                {t("wishlist.empty_button")}
              </Link>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <Sparkles size={18} />
                Explorer avec la recherche
              </Link>
            </div>
          </div>
        ) : (
          /* ══════════ GRILLE FAVORIS ══════════ */
          <div className={gridClass}>
            {products.map((product, index) => {
              const removing = removingIds.has(product.id);
              const finalPrice = product.price_final ?? product.price_xaf;
              const discountPercent = product.discount_percent ?? product.discount ?? 0;
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
              const isMock = V29_PRODUCTS.some((item) => item.id === product.id);
              const detail = `/product/${product.master_slug ?? product.id}${isMock ? "?mock=1" : ""}`;
              const added = justAddedId === product.id;

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
                  style={
                    removing
                      ? { animation: "wishlistOut .28s ease-in forwards" }
                      : { animation: "wishlistIn .45s ease-out both", animationDelay: `${Math.min(index, 24) * 35}ms` }
                  }
                >
                  <div className="relative aspect-square overflow-hidden bg-[#fff7ef] dark:bg-gray-800">
                    <Link to={detail} className="block h-full w-full">
                      {image ? (
                        <img
                          src={image}
                          alt={product.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-primary/40">
                          <ShoppingBag size={28} />
                        </div>
                      )}
                    </Link>

                    {discountPercent > 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow">
                        -{discountPercent}%
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemove(product)}
                      aria-label={`Retirer ${product.title} des favoris`}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-pink-500 shadow-sm backdrop-blur-sm transition hover:scale-110 hover:bg-pink-500 hover:text-white active:scale-95 dark:bg-gray-900/80"
                    >
                      <Heart size={14} fill="currentColor" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      aria-label={`Ajouter ${product.title} au panier`}
                      className={`absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:scale-110 active:scale-95 ${
                        added ? "bg-green-500 text-white" : "bg-primary text-white hover:bg-primary-dark"
                      }`}
                    >
                      {added ? <Check size={15} /> : <ShoppingCart size={15} />}
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col p-2">
                    <Link to={detail} className="block">
                      <h3 className="line-clamp-2 min-h-[28px] text-[11px] font-semibold leading-tight text-gray-800 transition-colors hover:text-primary dark:text-gray-100 sm:text-xs">
                        {product.title}
                      </h3>
                    </Link>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-[12px] font-black text-primary sm:text-[13px]">{fmt(finalPrice)}</span>
                      {compareAt && (
                        <span className="text-[9px] text-gray-400 line-through">{fmt(compareAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}