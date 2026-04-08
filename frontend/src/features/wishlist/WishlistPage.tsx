import { useEffect, useState } from "react";
import { Heart, ShoppingBag, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Product } from "@/services/api/products";
import { getFavoriteProductIds } from "@/lib/favorites";
import { customerApi } from "@/services/api/customer";

export default function WishlistPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      if (localStorage.getItem("access_token")) {
        const favorites = await customerApi.getFavorites();
        setProducts(favorites.map((favorite) => favorite.product));
        return;
      }

      const ids = getFavoriteProductIds();
      if (ids.length === 0) {
        setProducts([]);
        return;
      }

      const response = await productsApi.list({ page_size: 100 });
      setProducts((response.results || []).filter((product) => ids.includes(product.id)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  useEffect(() => {
    const onFavoritesUpdated = () => {
      void fetchProducts();
    };

    window.addEventListener("belivay-favorites-updated", onFavoritesUpdated);
    return () => {
      window.removeEventListener("belivay-favorites-updated", onFavoritesUpdated);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f5f1] px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[2rem] border border-pink-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Favoris
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                Votre sélection coup de cœur
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Retrouvez ici les produits mis de côté pour comparer tranquillement avant achat.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-pink-50 px-4 py-3 dark:bg-pink-900/20">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-600">
                  Produits suivis
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {products.length}
                </div>
              </div>
              <div className="rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Astuce
                </div>
                <div className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Le cœur sur les cartes produit met cette liste à jour en direct.
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[0.85] rounded-[1.75rem]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[2rem] border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-pink-50 text-pink-500 dark:bg-pink-900/20">
              <Heart size={34} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
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
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {products.length} produit{products.length > 1 ? "s" : ""} enregistré{products.length > 1 ? "s" : ""}
              </div>
              <Link to="/catalog" className="text-sm font-semibold text-primary">
                Voir plus de produits →
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} showPromo />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
