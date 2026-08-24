import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Baby,
  Dumbbell,
  Flame,
  Footprints,
  Gift,
  House,
  Laptop,
  PackageSearch,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { V29_PRODUCTS } from "@/data/v29Products";
import { productsApi, type Product } from "@/services/api/products";

/* ─────────────────────────── Règles de sélection ─────────────────────────── */

/** Note minimale pour entrer dans la sélection. */
const MIN_RATING = 4;
/** Remise minimale pour entrer par la porte « bonne affaire ». */
const MIN_DISCOUNT = 20;
/** Au-dessus de cette note, l'article devient un coup de cœur. */
const HEART_RATING = 4.5;

type SortKey = "rating" | "pertinence" | "discount" | "price-asc" | "price-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rating", label: "Top rated" },
  { value: "pertinence", label: "Pertinence" },
  { value: "discount", label: "Plus fortes remises" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
];

/** Petite icône descriptive devant chaque pastille de catégorie. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  femme: Shirt,
  homme: Shirt,
  tech: Laptop,
  phone: Smartphone,
  beaute: Sparkles,
  maison: House,
  sport: Dumbbell,
  shoes: Footprints,
  chaussures: Footprints,
  bebe: Baby,
  supermarche: ShoppingBasket,
};

interface SectionDef {
  key: "hearts" | "deals" | "month";
  title: string;
  icon: LucideIcon;
  iconClass: string;
  subtitle: string;
  chip: string;
  chipClass: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: "hearts",
    title: "Nos Coups de Cœur",
    icon: Star,
    iconClass: "text-amber-500",
    subtitle: `Notés ${HEART_RATING} étoiles et plus par les acheteurs`,
    chip: "Top noté",
    chipClass: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    key: "deals",
    title: "Meilleures Affaires",
    icon: Flame,
    iconClass: "animate-flame-flicker text-[#F47920]",
    subtitle: `Bien notés et remisés d'au moins ${MIN_DISCOUNT} %`,
    chip: "Meilleur prix",
    chipClass:
      "bg-orange-50 text-[#C85E14] ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300",
  },
  {
    key: "month",
    title: "Sélection du Mois",
    icon: Gift,
    iconClass: "text-violet-500",
    subtitle: "Le reste de la sélection, recommandé par la communauté",
    chip: "Recommandé",
    chipClass:
      "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300",
  },
];

/* ─────────────────────────────── Utilitaires ────────────────────────────── */

function discountOf(product: Product): number {
  return product.discount_percent ?? product.discount ?? 0;
}

function ratingOf(product: Product): number {
  return product.rating_average ?? 0;
}

function priceOf(product: Product): number {
  return product.price_final ?? product.price_xaf ?? 0;
}

/* ────────────────────────────────── Page ────────────────────────────────── */

export default function SelectionPremiumPage() {
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [usingMockProducts, setUsingMockProducts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("rating");
  const [categorySlug, setCategorySlug] = useState<string>("all");

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

  /* Le vivier : bien noté, ou franchement remisé. */
  const pool = useMemo(
    () =>
      sourceProducts.filter(
        (product) => ratingOf(product) >= MIN_RATING || discountOf(product) >= MIN_DISCOUNT
      ),
    [sourceProducts]
  );

  /* Les tuiles du hero : deux chiffres calculés, deux garanties de la plateforme. */
  const stats = useMemo(() => {
    const rated = pool.filter((product) => ratingOf(product) > 0);
    return {
      count: pool.length,
      rating: rated.length
        ? rated.reduce((total, product) => total + ratingOf(product), 0) / rated.length
        : 0,
    };
  }, [pool]);

  /* Les pastilles de catégories proviennent du vivier lui-même. */
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    pool.forEach((product) => {
      if (product.category?.slug && !seen.has(product.category.slug)) {
        seen.set(product.category.slug, product.category.name);
      }
    });
    return Array.from(seen, ([slug, name]) => ({ slug, name }));
  }, [pool]);

  const filtered = useMemo(() => {
    const list =
      categorySlug === "all"
        ? [...pool]
        : pool.filter((product) => product.category?.slug === categorySlug);

    switch (sort) {
      case "discount":
        return list.sort((a, b) => discountOf(b) - discountOf(a));
      case "price-asc":
        return list.sort((a, b) => priceOf(a) - priceOf(b));
      case "price-desc":
        return list.sort((a, b) => priceOf(b) - priceOf(a));
      case "pertinence":
        /* Pertinence : la note, puis le nombre d'avis, puis la remise. */
        return list.sort(
          (a, b) =>
            ratingOf(b) - ratingOf(a) ||
            (b.reviews_count ?? 0) - (a.reviews_count ?? 0) ||
            discountOf(b) - discountOf(a)
        );
      default:
        return list.sort(
          (a, b) => ratingOf(b) - ratingOf(a) || (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
        );
    }
  }, [pool, categorySlug, sort]);

  /* Les trois rayons de la page, dans l'ordre de la maquette. */
  const grouped = useMemo(() => {
    const hearts: Product[] = [];
    const deals: Product[] = [];
    const month: Product[] = [];

    filtered.forEach((product) => {
      if (ratingOf(product) >= HEART_RATING) hearts.push(product);
      else if (discountOf(product) >= MIN_DISCOUNT) deals.push(product);
      else month.push(product);
    });

    return { hearts, deals, month };
  }, [filtered]);

  const isEmpty = !loading && filtered.length === 0;

  /* Deux chiffres issus du catalogue, deux garanties fixes de la plateforme. */
  const heroTiles: { value: string; label: string; tone: string; icon: LucideIcon }[] = [
    { value: `${stats.count}`, label: "Produits", tone: "text-[#F47920]", icon: Tag },
    {
      value: stats.rating ? `${stats.rating.toFixed(1)}+` : "—",
      label: "Note moy.",
      tone: "text-[#F47920]",
      icon: Star,
    },
    { value: "100%", label: "Escrow", tone: "text-emerald-600", icon: ShieldCheck },
    { value: "24–72h", label: "Livraison", tone: "text-blue-600", icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8ee_0%,#fff_14%,#f4f5f7_100%)] dark:bg-gray-950">
      <div className="mx-auto max-w-[1400px] px-3 pb-16 pt-4 sm:px-4">
        {/* ═══════════════════ Frame d'en-tête + statistiques ═══════════════════ */}
        <section
          className="animate-page-in relative overflow-hidden rounded-[12px] p-5 ring-1 ring-inset ring-white/20 shadow-[0_12px_32px_rgba(217,119,6,.24)] sm:rounded-[14px] sm:p-7"
          style={{
            background:
              "linear-gradient(102deg,#92400E 0%,#B45309 26%,#D97706 55%,#F59E0B 80%,#FBBF24 100%)",
          }}
        >
          {/* Étoile filigrane, côté droit */}
          <Star
            aria-hidden
            size={150}
            fill="currentColor"
            className="pointer-events-none absolute -right-8 -top-8 animate-gem-sparkle text-white/15"
          />
          {/* Reflet qui balaie la frame */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-promo-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          <div className="relative z-10 text-center">
            <h1 className="flex items-center justify-center gap-2 text-[19px] font-black leading-tight sm:text-[25px]">
              <Star
                size={21}
                fill="currentColor"
                className="animate-gem-sparkle text-amber-100 drop-shadow-[0_0_6px_rgba(253,230,138,.8)]"
              />
              <span className="text-white drop-shadow-[0_2px_6px_rgba(120,53,15,.35)]">
                Sélection Premium BelivaY
              </span>
            </h1>

            <p className="mx-auto mt-2 max-w-[440px] text-[12px] font-semibold leading-relaxed text-white/85 sm:text-[12.5px]">
              Les meilleurs produits de nos vendeurs certifiés — qualité garantie, escrow sécurisé
            </p>

            {/* Les quatre tuiles blanches, à l'intérieur de la frame */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              {heroTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <article
                    key={tile.label}
                    className="group rounded-[14px] bg-white px-3 py-3 text-center shadow-[0_4px_14px_rgba(180,83,9,.10)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_26px_rgba(244,121,32,.18)]"
                  >
                    <p
                      className={`flex items-center justify-center gap-1.5 text-[17px] font-black leading-none ${tile.tone}`}
                    >
                      <Icon
                        size={13}
                        className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />
                      {tile.value}
                    </p>
                    <p className="mt-1.5 text-[10.5px] font-semibold text-gray-400">{tile.label}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════ Pastilles de catégories + tri ═══════════════ */}
        <section className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategorySlug("all")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-all duration-200 ${
                categorySlug === "all"
                  ? "bg-[#F47920] text-white shadow-[0_6px_16px_rgba(244,121,32,.32)]"
                  : "border border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-[#F47920] hover:text-[#F47920] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              }`}
            >
              <Sparkles size={11} />
              Tout
            </button>

            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.slug] ?? Tag;
              const active = categorySlug === category.slug;
              return (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setCategorySlug(category.slug)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-all duration-200 ${
                    active
                      ? "bg-[#F47920] text-white shadow-[0_6px_16px_rgba(244,121,32,.32)]"
                      : "border border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-[#F47920] hover:text-[#F47920] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  <Icon size={11} className={active ? "text-white" : "text-[#F47920]"} />
                  {category.name}
                </button>
              );
            })}
          </div>

          <label className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-3 pr-1.5 text-[11.5px] font-bold text-gray-600 transition-colors duration-200 focus-within:border-[#F47920] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <Star size={11} className="text-[#F47920]" fill="currentColor" />
            <span className="sr-only">Trier la sélection</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="cursor-pointer rounded-full bg-transparent py-1 pr-1 text-[11.5px] font-bold text-gray-700 outline-none dark:text-gray-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* ═══════════════════════════ Les 3 rayons ═══════════════════════════ */}
        {loading ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[0.72] rounded-[14px]" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-[22px] border border-[#f3e2c4] bg-white py-14 text-center dark:border-gray-800 dark:bg-gray-900">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-500/15">
              <PackageSearch size={26} />
            </span>
            <p className="text-[15px] font-extrabold text-gray-900 dark:text-white">
              Aucun article ne remplit encore les critères
            </p>
            <p className="max-w-md text-[12.5px] text-gray-500 dark:text-gray-400">
              La sélection retient les articles notés {MIN_RATING} étoiles ou remisés d'au moins{" "}
              {MIN_DISCOUNT} %. Elle se remplira à mesure que les commandes sont notées.
            </p>
            <Link
              to="/catalog"
              className="mt-1 rounded-full border border-[#f0d9b0] bg-white px-5 py-2.5 text-sm font-bold text-[#C85E14] transition-colors duration-200 hover:border-[#F47920] dark:border-gray-700 dark:bg-gray-800 dark:text-amber-300"
            >
              Parcourir tout le catalogue
            </Link>
          </div>
        ) : (
          SECTIONS.map((section) => {
            const products = grouped[section.key];
            if (products.length === 0) return null;

            const Icon = section.icon;

            return (
              <section key={section.key} className="mt-6">
                <header className="mb-3 flex flex-wrap items-center gap-2">
                  <Icon size={16} className={section.iconClass} />
                  <h2 className="text-[15px] font-extrabold text-gray-900 dark:text-white">
                    {section.title}
                  </h2>
                  <span className="text-[11.5px] text-gray-400">
                    · {section.subtitle} · {products.length} article
                    {products.length > 1 ? "s" : ""}
                  </span>
                </header>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
                  {products.map((product) => (
                    <div key={product.id} className="flex flex-col gap-1.5">
                      <span
                        className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-[0.1em] ring-1 ${section.chipClass}`}
                      >
                        <Icon size={9} />
                        {section.chip}
                      </span>

                      <ProductCard product={product} showPromo compact isMock={usingMockProducts} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
