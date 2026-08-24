import { useEffect, useRef, useState } from "react";
import { Heart, Link2, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { productsApi, type Product } from "@/services/api/products";
import { getFavoriteProductIds, toggleFavoriteProduct } from "@/lib/favorites";
import { hasValidAccessToken } from "@/lib/authTokens";
import { customerApi } from "@/services/api/customer";
import { V29_PRODUCTS } from "@/data/v29Products";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import CatalogProductCard from "@/components/product/CatalogProductCard";

export default function WishlistPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
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

  /** Partage la page : API native si disponible, sinon copie du lien. */
  const shareWishlist = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: "Ma wishlist BelivaY", url }).catch(() => { /* annulé */ });
      return;
    }
    navigator.clipboard?.writeText(url).then(
      () => showToast("Lien de la wishlist copié", "success"),
      () => showToast("Copie impossible", "error"),
    );
  };

  /** Vide la liste : stockage local d'abord, puis l'API si la session le permet. */
  const removeAll = () => {
    const ids = products.map((product) => product.id);
    if (ids.length === 0) return;

    ids.forEach((id) => {
      removedIdsRef.current.add(id);
      toggleFavoriteProduct(id);
    });
    setProducts([]);
    showToast("Favoris vidés", "success");

    if (!hasValidAccessToken()) return;
    void (async () => {
      try {
        const favorites = await customerApi.getFavorites();
        await Promise.all(
          favorites
            .filter((favorite) => ids.includes(favorite.product.id))
            .map((favorite) => customerApi.removeFavorite(favorite.id)),
        );
      } catch {
        // suppression locale déjà appliquée — on n'interrompt pas l'UI
      }
    })();
  };

  const gridClass =
    "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

  return (
    <div className="min-h-screen bg-[#f5f6f8] px-3 py-5 dark:bg-gray-950 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1600px]">
        {/* ══════════ EN-TÊTE ══════════ */}
        <div className="animate-page-in">
          <h1 className="flex flex-wrap items-baseline gap-2 text-[22px] font-black text-gray-900 dark:text-white sm:text-[26px]">
            {t("wishlist.title")}
            <span className="text-[13px] font-semibold text-gray-400">
              · {products.length} article{products.length > 1 ? "s" : ""}
            </span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={shareWishlist}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a2438] px-4 py-2.5 text-[12.5px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#26324a]"
            >
              <Link2 size={14} />
              Partager ma wishlist
            </button>

            <button
              type="button"
              onClick={removeAll}
              disabled={products.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[12.5px] font-bold text-gray-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:text-red-500 disabled:translate-y-0 disabled:opacity-45 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <Trash2 size={14} />
              Tout retirer
            </button>
          </div>
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
          <div className={`${gridClass} mt-5`}>
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[0.72] rounded-2xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          /* ══════════ AUCUN FAVORI ══════════ */
          <div className="animate-page-in mt-5 rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-10">
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
          <div className={`${gridClass} mt-5`}>
            {products.map((product) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                showPromo
                isMock={V29_PRODUCTS.some((item) => item.id === product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
