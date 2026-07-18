import { useEffect, useState } from "react";
import { CreditCard, Heart, ShoppingBag, ShoppingCart, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Product } from "@/services/api/products";
import { getFavoriteProductIds } from "@/lib/favorites";
import { hasValidAccessToken } from "@/lib/authTokens";
import { customerApi } from "@/services/api/customer";
import { V29_PRODUCTS } from "@/data/v29Products";
import { useCart } from "@/context/CartContext";

const CHECKOUT_SELECTED_CART_IDS_KEY = "belivay_checkout_selected_cart_ids";

export default function WishlistPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      if (hasValidAccessToken()) {
        try {
          const favorites = await customerApi.getFavorites();
          const apiProducts = favorites.map((favorite) => favorite.product);
          const fallbackProducts = V29_PRODUCTS.filter((product) =>
            getFavoriteProductIds().includes(product.id),
          );
          const knownIds = new Set(apiProducts.map((product) => product.id));

          setProducts([
            ...apiProducts,
            ...fallbackProducts.filter((product) => !knownIds.has(product.id)),
          ]);
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

        setProducts([
          ...apiProducts,
          ...fallbackProducts.filter((product) => !knownIds.has(product.id)),
        ]);
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

  const handleBuyNow = (product: Product) => {
    addProductToCart(product);
    window.sessionStorage.setItem(CHECKOUT_SELECTED_CART_IDS_KEY, JSON.stringify([product.id]));
    navigate("/checkout");
  };

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
                <div key={product.id} className="rounded-[1.75rem] bg-white p-2 shadow-sm dark:bg-gray-900">
                  <ProductCard
                    product={product}
                    showPromo
                    isMock={V29_PRODUCTS.some((item) => item.id === product.id)}
                  />
                  <div className="grid gap-2 p-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => addProductToCart(product)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 px-3 py-2.5 text-xs font-bold text-primary transition hover:bg-orange-50 dark:border-primary/30 dark:hover:bg-primary/10"
                    >
                      <ShoppingCart size={15} />
                      Ajouter au panier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBuyNow(product)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2.5 text-xs font-bold text-white transition hover:bg-primary-dark"
                    >
                      <CreditCard size={15} />
                      Acheter maintenant
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
