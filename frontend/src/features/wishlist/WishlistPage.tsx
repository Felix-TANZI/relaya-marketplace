import { useEffect, useMemo, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Product } from "@/services/api/products";
import { getFavoriteProductIds } from "@/lib/favorites";
import { customerApi } from "@/services/api/customer";

export default function WishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(getFavoriteProductIds());

    syncFavorites();
    window.addEventListener("belivay-favorites-updated", syncFavorites as EventListener);

    return () => {
      window.removeEventListener("belivay-favorites-updated", syncFavorites as EventListener);
    };
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (localStorage.getItem('access_token')) {
          const favorites = await customerApi.getFavorites();
          setProducts(favorites.map((favorite) => favorite.product));
          return;
        }

        const response = await productsApi.list({ page_size: 50 });
        setProducts(response.results || []);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const favoriteProducts = useMemo(
    () => (
      localStorage.getItem('access_token')
        ? products
        : products.filter((product) => favoriteIds.includes(product.id))
    ),
    [products, favoriteIds],
  );

  return (
    <div className="min-h-screen bg-[#f8f5f1] py-10 dark:bg-gray-950">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Mon espace client
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                Mes favoris
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Retrouve les produits que tu as mis de cote pour y revenir plus tard.
              </p>
            </div>
            <div className="rounded-2xl bg-pink-50 px-4 py-3 text-right dark:bg-pink-900/20">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Produits suivis</p>
              <p className="text-2xl font-bold text-pink-600">{favoriteProducts.length}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[0.85] rounded-[1.75rem]" />
            ))}
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div className="rounded-[2rem] border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <Heart className="mx-auto mb-4 text-pink-500" size={34} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Aucun favori pour l'instant
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
              Ajoute des produits a ta liste depuis le catalogue pour les retrouver ici.
            </p>
            <Link
              to="/catalog"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
            >
              <ShoppingBag size={18} />
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} showPromo />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
