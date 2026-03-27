import { Link } from "react-router-dom";
import {
  Flame,
  Gift,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Product, type ProductListResponse } from "@/services/api/products";

const categoryTiles = [
  { name: "Toutes les categories", link: "/categories", emoji: "🧺" },
  { name: "Mode Femme", link: "/catalog?search=mode", emoji: "👗" },
  { name: "Mode Homme", link: "/catalog?search=homme", emoji: "👔" },
  { name: "Téléphones & Tablettes", link: "/catalog?search=telephone", emoji: "📱" },
  { name: "Maison & Bureau", link: "/catalog?search=maison", emoji: "🏠" },
  { name: "Beauté & Santé", link: "/catalog?search=beaute", emoji: "🧴" },
  { name: "Supermarché", link: "/catalog?search=supermarche", emoji: "🛒" },
];

const trustCards = [
  {
    icon: Truck,
    title: "Livraison offerte",
    text: "Dès 30 000 FCFA d'achat",
  },
  {
    icon: ShieldCheck,
    title: "Paiement securise",
    text: "Transactions protegees",
  },
  {
    icon: Flame,
    title: "Promotions actives",
    text: "Offres du moment",
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response: ProductListResponse = await productsApi.list({ page_size: 12 });
        setProducts(response.results || []);
      } catch (error) {
        console.error("Error loading home products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const promoProducts = useMemo(
    () => products.filter((product) => (product.discount ?? 0) > 0).slice(0, 4),
    [products],
  );
  const spotlightProducts = promoProducts.length > 0 ? promoProducts : products.slice(0, 4);
  const popularProducts = products.slice(0, 4);
  const newestProducts = [...products]
    .sort(
      (leftProduct, rightProduct) =>
        new Date(rightProduct.created_at).getTime() -
        new Date(leftProduct.created_at).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f8f5f1] dark:bg-gray-950">
      <section className="border-b border-orange-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="container mx-auto grid gap-3 px-4 py-4 md:grid-cols-3">
          {trustCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex items-center gap-3 rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {card.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#fff1e4] via-white to-[#fff6ef] p-6 shadow-sm ring-1 ring-orange-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 dark:ring-gray-800 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm dark:bg-gray-800">
              <Flame size={14} />
              Mega promotions Africa Wide
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-6xl">
              Achetez local, vite et en confiance sur Belivay.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
              Decouvrez les meilleures promotions, vos categories favorites et un parcours
              client plus clair pour commander, suivre et payer sans friction.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/catalog?promo=1"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
              >
                <Gift size={18} />
                Voir les promotions
              </Link>
              <Link
                to="/categories"
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Store size={18} />
                Explorer les categories
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Livraison
                </p>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  Offerte des 30 000 FCFA
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Suivi
                </p>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  Commandes en temps reel
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Paiement
                </p>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  Mobile Money securise
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Categories</h2>
              <Link to="/categories" className="text-sm font-semibold text-primary">
                Tout voir
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categoryTiles.map((category) => (
                <Link
                  key={category.name}
                  to={category.link}
                  className="rounded-2xl border border-gray-100 bg-[#fcfbf8] p-4 transition-all hover:border-orange-200 hover:bg-orange-50 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <div className="mb-3 text-3xl">{category.emoji}</div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {category.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Pour vous
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              Mega promotions
            </h2>
          </div>
          <Link to="/catalog?promo=1" className="text-sm font-semibold text-primary">
            Voir plus
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[0.85] rounded-[1.75rem]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {spotlightProducts.map((product) => (
              <ProductCard key={product.id} product={product} showPromo />
            ))}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 pb-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Me populaires</h2>
              <Link to="/catalog" className="text-sm font-semibold text-primary">
                Explorer
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {popularProducts.map((product) => (
                <ProductCard key={product.id} product={product} showPromo />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPinned size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Parcours client
                </p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Suivez vos commandes facilement
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-[#fff7ef] p-4 dark:bg-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Commande #BK-12345 en cours
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Le livreur a recupere votre colis. ETA aujourd'hui a 14h.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-400">10:15</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    Commande recue
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-400">14:30</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    Preparation terminee
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-400">14:45</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    Livreur recu
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
                >
                  <Truck size={18} />
                  Suivre mes commandes
                </Link>
                <Link
                  to="/notifications"
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Sparkles size={18} />
                  Voir les notifications
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Nouveautes
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              Derniers ajouts
            </h2>
          </div>
          <Link to="/catalog?recent=1" className="text-sm font-semibold text-primary">
            Voir tout
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {newestProducts.map((product) => (
            <ProductCard key={product.id} product={product} showPromo />
          ))}
        </div>
      </section>
    </div>
  );
}
