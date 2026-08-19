import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PackageSearch, Star } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { V29_PRODUCTS } from "@/data/v29Products";
import { productsApi, type Product } from "@/services/api/products";

const PAGE_STEP = 24;

/** Note minimale pour entrer dans la sélection. */
const MIN_RATING = 4;

export default function SelectionPremiumPage() {
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [usingMockProducts, setUsingMockProducts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  useEffect(() => {
    let cancelled = false;

    productsApi
      .list({ page_size: 100, is_active: true })
      .then((response) => {
        if (cancelled) return;
        const results = response.results ?? [];
        if (results.length > 0) {
          setApiProducts(results);
          setUsingMockProducts(results.length < 20);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setApiProducts([]);
        setUsingMockProducts(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sourceProducts = usingMockProducts ? V29_PRODUCTS : apiProducts;

  /* Les mieux notés d'abord ; à note égale, celui qui a le plus d'avis passe devant. */
  const selection = useMemo(
    () =>
      sourceProducts
        .filter((product) => (product.rating_average ?? 0) >= MIN_RATING)
        .sort(
          (a, b) =>
            (b.rating_average ?? 0) - (a.rating_average ?? 0) ||
            (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
        ),
    [sourceProducts]
  );

  const visibleProducts = selection.slice(0, visibleCount);
  const hasMore = visibleCount < selection.length;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf0_0%,#fff_16%,#f8fafc_100%)] dark:bg-gray-950">
      <div className="mx-auto max-w-[1400px] px-3 pb-14 pt-4 sm:px-4">
        {/* ═══ Hero ═══ */}
        <section
          className="relative overflow-hidden rounded-[24px] p-6 text-white shadow-[0_18px_44px_rgba(217,119,6,.26)] sm:rounded-[30px] sm:p-10"
          style={{
            background:
              "linear-gradient(102deg,#92400E 0%,#B45309 26%,#D97706 55%,#F59E0B 80%,#FBBF24 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-promo-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-sm">
              <Star size={12} className="animate-gem-sparkle text-amber-100" fill="currentColor" />
              Curated
            </span>

            <h1 className="mt-3 text-[28px] font-black leading-tight sm:text-[40px]">
              Sélection Premium
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/85 sm:text-[15px]">
              Les articles les mieux notés du catalogue : {MIN_RATING} étoiles minimum, classés par
              note puis par nombre d'avis. Aucun placement payant — seul le jugement des acheteurs
              détermine l'ordre.
            </p>
          </div>
        </section>

        {/* ═══ Grille ═══ */}
        <section className="mt-4 rounded-[22px] border border-[#f3e2c4] bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,.05)] sm:rounded-[28px] sm:p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-[18px] w-[3px] rounded bg-amber-500" />
            <Star size={16} className="text-amber-500" fill="currentColor" />
            <div>
              <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white">
                Produits triés sur le volet
              </h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                {selection.length} article{selection.length > 1 ? "s" : ""} au-dessus de{" "}
                {MIN_RATING} étoiles.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="skeleton aspect-[0.72] rounded-[14px]" />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    showPromo
                    compact
                    isMock={usingMockProducts}
                  />
                ))}
              </div>

              <div className="mt-5 flex justify-center">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((count) => Math.min(count + PAGE_STEP, selection.length))
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-[#f0d9b0] bg-white px-5 py-3 text-sm font-bold text-[#92400E] transition hover:border-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
                  >
                    Voir plus d'articles
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <span className="rounded-full border border-[#f0d9b0] bg-white px-5 py-3 text-sm font-bold text-[#8a6b55] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Toute la sélection est affichée
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-500/15">
                <PackageSearch size={26} />
              </span>
              <p className="text-[15px] font-extrabold text-gray-900 dark:text-white">
                Aucun article n'atteint encore {MIN_RATING} étoiles
              </p>
              <p className="max-w-md text-[12.5px] text-gray-500 dark:text-gray-400">
                La sélection se construit à partir des avis laissés par les acheteurs. Elle se
                remplira à mesure que les commandes sont notées.
              </p>
              <Link
                to="/catalog"
                className="mt-1 rounded-full border border-[#f0d9b0] bg-white px-5 py-2.5 text-sm font-bold text-[#92400E] transition hover:border-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
              >
                Parcourir tout le catalogue
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
