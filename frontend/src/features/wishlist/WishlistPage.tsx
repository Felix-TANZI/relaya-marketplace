import { useEffect, useState } from "react";
import { Heart, ShoppingBag, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { productsApi, type Product } from "@/services/api/products";
import { getFavoriteProductIds } from "@/lib/favorites";
import { hasValidAccessToken } from "@/lib/authTokens";
import { customerApi } from "@/services/api/customer";
import { V29_PRODUCTS } from "@/data/v29Products";
import { useAuth } from "@/context/AuthContext";
import CatalogProductCard from "@/components/product/CatalogProductCard";

export default function WishlistPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
          setProducts(list);
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
        setProducts(list);
      } catch {
        setProducts(fallbackProducts);
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

  const gridClass =
    "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5";

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

        {!isAuthenticated ? (
          <div className="mb-5 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm leading-6 text-gray-700 shadow-sm dark:border-orange-900/30 dark:bg-gray-900 dark:text-gray-200">
            Vos favoris sont conservés sur cet appareil. Connectez-vous au moment de commander pour les retrouver avec votre panier et suivre vos achats.
            <Link to="/login" state={{ from: "/wishlist" }} className="ml-1 font-extrabold text-primary hover:underline">
              Se connecter
            </Link>
          </div>
        ) : null}

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
          <div className={gridClass}>{products.map((product) => <CatalogProductCard key={product.id} product={product} showPromo isMock={V29_PRODUCTS.some((item) => item.id === product.id)} />)}</div>
        )}
      </div>
    </div>
  );
}
