import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Banknote,
  ChevronDown,
  ChevronRight,
  Filter,
  LayoutGrid,
  ListFilter,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  TicketPercent,
  Truck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CategorySidebar from "@/components/home/CategorySidebar";
import ProductCard from "@/components/product/ProductCard";
import useSidebarTrack from "@/hooks/useSidebarTrack";
import {
  CATEGORY_THEMES,
  HERO_MIN_HEIGHT,
  getCategoryTheme,
  matchesCategory,
} from "@/data/categoryThemes";
import { V29_PRODUCTS } from "@/data/v29Products";
import { productsApi, type Product } from "@/services/api/products";

type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "newest" | "discount";

const SORT_OPTIONS: { key: SortKey; label: string; icon: LucideIcon }[] = [
  { key: "relevance", label: "Pertinence", icon: Zap },
  { key: "price-asc", label: "Prix croissant", icon: ArrowUp },
  { key: "price-desc", label: "Prix décroissant", icon: ArrowDown },
  { key: "rating", label: "Mieux notés", icon: Star },
  { key: "newest", label: "Plus récents", icon: Sparkles },
  { key: "discount", label: "Meilleures remises", icon: TicketPercent },
];

type PriceKey = "all" | "under-10k" | "10k-30k" | "30k-100k" | "over-100k";

const PRICE_RANGES: { key: PriceKey; label: string; min: number; max: number | null }[] = [
  { key: "all", label: "Tous les prix", min: 0, max: null },
  { key: "under-10k", label: "Moins de 10 000 FCFA", min: 0, max: 10000 },
  { key: "10k-30k", label: "10 000 – 30 000 FCFA", min: 10000, max: 30000 },
  { key: "30k-100k", label: "30 000 – 100 000 FCFA", min: 30000, max: 100000 },
  { key: "over-100k", label: "Plus de 100 000 FCFA", min: 100000, max: null },
];

type RatingKey = "all" | "4-plus" | "5-only";

const RATING_FILTERS: { key: RatingKey; label: string; stars: number; min: number }[] = [
  { key: "all", label: "Toutes les notes", stars: 0, min: 0 },
  { key: "4-plus", label: "et plus", stars: 4, min: 4 },
  { key: "5-only", label: "uniquement", stars: 5, min: 5 },
];

const PAGE_STEP = 20;

export default function CategoryThemePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const theme = getCategoryTheme(slug);

  const { mainRef, trackTop, trackHeight, topOffset } = useSidebarTrack();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [usingMockProducts, setUsingMockProducts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeFacet, setActiveFacet] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [lastSlug, setLastSlug] = useState(slug);

  /* Zone de filtres — menu de tri et panneau de réglages */
  const filterZoneRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<PriceKey>("all");
  const [rating, setRating] = useState<RatingKey>("all");

  /* Changement de thème : on repart d'une page propre (pendant le rendu, sans effet). */
  if (slug !== lastSlug) {
    setLastSlug(slug);
    setActiveFacet(null);
    setSort("relevance");
    setVisibleCount(PAGE_STEP);
    setSortOpen(false);
    setFiltersOpen(false);
    setPriceRange("all");
    setRating("all");
  }

  /* Les deux panneaux se referment au clic à l'extérieur, comme le menu du Header. */
  useEffect(() => {
    if (!sortOpen && !filtersOpen) return;

    const closeAll = () => {
      setSortOpen(false);
      setFiltersOpen(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (!filterZoneRef.current?.contains(event.target as Node)) closeAll();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAll();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sortOpen, filtersOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  useEffect(() => {
    document.documentElement.style.setProperty("--belivay-fixed-top", "100px");
  }, []);

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

  const categoryProducts = useMemo(
    () => sourceProducts.filter((product) => matchesCategory(product, slug)),
    [sourceProducts, slug]
  );

  const facetProducts = useMemo(() => {
    if (!activeFacet) return categoryProducts;
    const needle = activeFacet.toLowerCase();
    return categoryProducts.filter((product) =>
      `${product.title} ${product.short_description ?? ""} ${product.description ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [categoryProducts, activeFacet]);

  /* Effectif de chaque sous-catégorie, affiché en pastille dans le panneau. */
  const facetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!theme) return counts;

    for (const facet of theme.facets) {
      const needle = facet.toLowerCase();
      counts[facet] = categoryProducts.filter((product) =>
        `${product.title} ${product.short_description ?? ""} ${product.description ?? ""}`
          .toLowerCase()
          .includes(needle)
      ).length;
    }

    return counts;
  }, [categoryProducts, theme]);

  const activeFilterCount =
    (activeFacet ? 1 : 0) + (priceRange !== "all" ? 1 : 0) + (rating !== "all" ? 1 : 0);

  const filteredProducts = useMemo(() => {
    const range = PRICE_RANGES.find((item) => item.key === priceRange);
    const minRating = RATING_FILTERS.find((item) => item.key === rating)?.min ?? 0;

    return facetProducts.filter((product) => {
      const price = product.price_final ?? product.price_xaf;

      if (range && priceRange !== "all") {
        if (price < range.min) return false;
        if (range.max !== null && price >= range.max) return false;
      }
      if (minRating > 0 && (product.rating_average ?? 0) < minRating) return false;

      return true;
    });
  }, [facetProducts, priceRange, rating]);

  const sortedProducts = useMemo(() => {
    const items = [...filteredProducts];
    const finalPrice = (product: Product) => product.price_final ?? product.price_xaf;

    switch (sort) {
      case "price-asc":
        return items.sort((a, b) => finalPrice(a) - finalPrice(b));
      case "price-desc":
        return items.sort((a, b) => finalPrice(b) - finalPrice(a));
      case "rating":
        return items.sort(
          (a, b) =>
            (b.rating_average ?? 0) - (a.rating_average ?? 0) ||
            (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
        );
      case "newest":
        return items.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "discount":
        return items.sort(
          (a, b) =>
            (b.discount_percent ?? b.discount ?? 0) - (a.discount_percent ?? a.discount ?? 0)
        );
      default: {
        /* Pertinence : la remise pèse le plus, les avis départagent. */
        const score = (product: Product) =>
          (product.discount_percent ?? product.discount ?? 0) * 1000 + (product.reviews_count ?? 0);
        return items.sort((a, b) => score(b) - score(a));
      }
    }
  }, [filteredProducts, sort]);

  const visibleProducts = sortedProducts.slice(0, visibleCount);
  const hasMoreProducts = visibleCount < sortedProducts.length;

  const otherThemes = CATEGORY_THEMES.filter((item) => item.slug !== slug && item.slug !== "all");

  /* Slug inconnu — on ne laisse pas l'utilisateur sur une page vide. */
  if (!theme) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fff_14%,#f8fafc_100%)] px-4 py-16 dark:bg-gray-950">
        <div className="mx-auto max-w-lg rounded-[24px] border border-[#f1d2bb] bg-white p-8 text-center shadow-[0_16px_42px_rgba(244,121,32,.08)] dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff1e5] text-primary dark:bg-primary/10">
            <PackageSearch size={26} />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-gray-900 dark:text-white">
            Cette catégorie n'existe pas
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Le thème « {slug} » n'est pas au catalogue. Parcourez la liste complète des catégories
            pour trouver ce que vous cherchez.
          </p>
          <Link
            to="/categories"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-white transition hover:bg-primary-dark"
          >
            <LayoutGrid size={16} />
            Voir toutes les catégories
          </Link>
        </div>
      </div>
    );
  }

  const { accent } = theme;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fff_14%,#f8fafc_100%)] dark:bg-gray-950">
      <div className="mx-auto max-w-[1760px] px-1 pb-12 pt-3 sm:px-2 lg:px-3">
        <div className="flex items-stretch gap-2 xl:gap-3">
          <CategorySidebar
            activeCategory={slug}
            onSelectCategory={(nextSlug) => navigate(`/categorie/${nextSlug}`)}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
            trackTop={trackTop}
            trackHeight={trackHeight}
            topOffset={topOffset}
          />

          <main ref={mainRef} className="min-w-0 flex-1 space-y-3 sm:space-y-4">
            {/* ═══ Hero du thème ═══ */}
            <section
              className={`relative flex overflow-hidden rounded-[24px] shadow-[0_16px_42px_rgba(15,23,42,.12)] sm:rounded-[30px] ${HERO_MIN_HEIGHT}`}
              style={{ border: `1px solid ${accent}33` }}
            >
              <div
                className="absolute inset-0"
                style={{ background: `url(${theme.image}) center/cover` }}
              />
              {/* Ombrage neutre — aucune teinte, uniquement de quoi garder le texte lisible. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/35" />

              <div className="relative z-10 flex w-full flex-col justify-center p-4 text-white sm:p-7">
                <nav className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-white/75">
                  <Link to="/" className="transition hover:text-white">
                    Accueil
                  </Link>
                  <ChevronRight size={12} />
                  <Link to="/categories" className="transition hover:text-white">
                    Catégories
                  </Link>
                  <ChevronRight size={12} />
                  <span className="text-white">{theme.name}</span>
                </nav>

                <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
                  {theme.label}
                </span>

                <h1 className="mt-2.5 max-w-2xl text-2xl font-black leading-tight sm:text-[32px]">
                  {theme.title}
                </h1>
                <p className="mt-1 text-[13px] font-semibold text-white/85 sm:text-sm">
                  {theme.subtitle}
                </p>
                <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-white/80 sm:text-[13.5px]">
                  {theme.description}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                  {[
                    { icon: ShoppingCart, num: theme.count, label: "Produits" },
                    { icon: ShieldCheck, num: theme.vendors, label: "Vendeurs certifiés" },
                    { icon: Star, num: theme.rating, label: "Note moyenne" },
                    { icon: Truck, num: theme.delivery, label: "Livraison" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="flex items-center gap-2.5 rounded-2xl border border-white/25 bg-white/15 p-2.5 backdrop-blur-sm md:rounded-[20px] md:p-3"
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
                          <Icon size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-black leading-none">{stat.num}</p>
                          <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-white/75">
                            {stat.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ═══ Sous-thèmes + tri ═══ */}
            <section className="rounded-[22px] border border-[#f1d2bb] bg-white p-3 shadow-[0_10px_30px_rgba(244,121,32,.06)] sm:p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={() => setActiveFacet(null)}
                  className={`flex-shrink-0 rounded-full border px-4 py-2 text-[12px] font-bold transition-all ${
                    activeFacet === null
                      ? "border-transparent text-white shadow-sm"
                      : "border-[#ecd3c1] bg-white text-gray-700 hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                  style={activeFacet === null ? { background: accent } : undefined}
                >
                  Tout le thème
                </button>
                {theme.facets.map((facet) => {
                  const active = activeFacet === facet;
                  return (
                    <button
                      key={facet}
                      onClick={() => {
                        setActiveFacet(active ? null : facet);
                        setVisibleCount(PAGE_STEP);
                      }}
                      className={`flex-shrink-0 rounded-full border px-4 py-2 text-[12px] font-bold transition-all ${
                        active
                          ? "border-transparent text-white shadow-sm"
                          : "border-[#ecd3c1] bg-white text-gray-700 hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                      style={active ? { background: accent } : undefined}
                    >
                      {facet}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#f5e2d4] pt-3 dark:border-gray-800">
                <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400">
                  <span className="text-[14px] font-black text-gray-900 dark:text-white">
                    {sortedProducts.length}
                  </span>{" "}
                  {sortedProducts.length > 1 ? "articles disponibles" : "article disponible"}
                  {activeFacet ? ` · ${activeFacet}` : ""}
                </p>

                {/* ── Zone de filtre, calée à droite : tri + panneau de filtres ── */}
                <div ref={filterZoneRef} className="relative ml-auto flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setSortOpen((open) => !open);
                        setFiltersOpen(false);
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={sortOpen}
                      aria-label="Trier les articles"
                      className={`flex h-[38px] items-center gap-2 rounded-xl border bg-white pl-3 pr-2.5 text-[12.5px] font-bold text-gray-800 transition-all dark:bg-gray-800 dark:text-gray-100 ${
                        sortOpen
                          ? "border-primary shadow-[0_0_0_3px_rgba(244,121,32,.15)]"
                          : "border-[#ecd3c1] hover:border-primary dark:border-gray-700"
                      }`}
                    >
                      {/* Éclair bicolore : cœur orange clair, contour orange foncé. */}
                      <Zap size={14} fill="#F8A45E" stroke="#E86010" strokeWidth={2} />
                      {SORT_OPTIONS.find((option) => option.key === sort)?.label}
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform ${sortOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {sortOpen ? (
                      <div
                        role="listbox"
                        className="absolute right-0 top-[calc(100%+6px)] z-40 w-[220px] overflow-hidden rounded-[14px] border border-[#ecd3c1] bg-white py-1 shadow-[0_16px_48px_rgba(9,14,26,.14)] dark:border-gray-700 dark:bg-gray-800"
                      >
                        {SORT_OPTIONS.map((option) => {
                          const OptionIcon = option.icon;
                          const selected = sort === option.key;
                          return (
                            <button
                              key={option.key}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => {
                                setSort(option.key);
                                setSortOpen(false);
                                setVisibleCount(PAGE_STEP);
                              }}
                              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-bold transition ${
                                selected
                                  ? "bg-[#fff4eb] text-primary dark:bg-primary/15"
                                  : "text-gray-700 hover:bg-[#fff7ef] dark:text-gray-200 dark:hover:bg-gray-700"
                              }`}
                            >
                              <OptionIcon
                                size={14}
                                className="flex-shrink-0 text-primary"
                                {...(option.key === "relevance" || option.key === "rating"
                                  ? { fill: "currentColor" }
                                  : {})}
                              />
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen((open) => !open);
                      setSortOpen(false);
                    }}
                    title="Filtres"
                    aria-label="Ouvrir les filtres"
                    aria-expanded={filtersOpen}
                    className={`relative flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl border transition-all ${
                      filtersOpen || activeFilterCount > 0
                        ? "border-primary bg-[#fff4eb] text-primary dark:bg-primary/15"
                        : "border-[#ecd3c1] bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <Filter size={15} strokeWidth={2.5} />
                    {activeFilterCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>

                  {filtersOpen ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-40 flex max-h-[70vh] w-[286px] flex-col overflow-hidden rounded-[14px] border border-[#ecd3c1] bg-white shadow-[0_16px_48px_rgba(9,14,26,.14)] dark:border-gray-700 dark:bg-gray-800">
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {/* ── Sous-catégories ── */}
                        <div className="flex items-center gap-2 px-3 pt-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#fff1e5] text-primary dark:bg-primary/20">
                            <ListFilter size={12} />
                          </span>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                            Sous-catégories
                          </p>
                        </div>

                        <div className="flex flex-col px-2 pb-1 pt-1.5">
                          {[
                            {
                              label: "Tous les articles",
                              count: categoryProducts.length,
                              value: null as string | null,
                            },
                            ...theme.facets.map((facet) => ({
                              label: facet,
                              count: facetCounts[facet] ?? 0,
                              value: facet as string | null,
                            })),
                          ].map((item) => {
                              const selected = activeFacet === item.value;
                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => {
                                    setActiveFacet(item.value);
                                    setVisibleCount(PAGE_STEP);
                                  }}
                                  className={`flex items-center gap-2 rounded-xl border-l-[3px] py-2 pl-2 pr-2.5 text-left text-[12.5px] font-bold transition ${
                                    selected
                                      ? "border-l-primary bg-[#fff4eb] text-primary dark:bg-primary/15"
                                      : "border-l-transparent text-gray-700 hover:bg-[#fff7ef] dark:text-gray-200 dark:hover:bg-gray-700"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                                      selected ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    }`}
                                  />
                                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                  <span
                                    className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                                      selected
                                        ? "bg-primary/15 text-primary"
                                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                    }`}
                                  >
                                    {item.count}
                                  </span>
                                </button>
                              );
                            })}
                        </div>

                        {/* ── Prix ── */}
                        <div className="flex items-center gap-2 border-t border-[#f5e2d4] px-3 pt-3 dark:border-gray-700">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#fff1e5] text-primary dark:bg-primary/20">
                            <Banknote size={12} />
                          </span>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                            Prix
                          </p>
                        </div>

                        <div className="flex flex-col px-2 pb-1 pt-1.5">
                          {PRICE_RANGES.map((range) => {
                            const selected = priceRange === range.key;
                            return (
                              <label
                                key={range.key}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-bold transition ${
                                  selected
                                    ? "bg-[#fff4eb] text-primary dark:bg-primary/15"
                                    : "text-gray-700 hover:bg-[#fff7ef] dark:text-gray-200 dark:hover:bg-gray-700"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="price-range"
                                  checked={selected}
                                  onChange={() => {
                                    setPriceRange(range.key);
                                    setVisibleCount(PAGE_STEP);
                                  }}
                                  className="h-4 w-4 flex-shrink-0 accent-[#F47920]"
                                />
                                {range.label}
                              </label>
                            );
                          })}
                        </div>

                        {/* ── Note ── */}
                        <div className="flex items-center gap-2 border-t border-[#f5e2d4] px-3 pt-3 dark:border-gray-700">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#fff1e5] text-primary dark:bg-primary/20">
                            <Star size={12} fill="currentColor" />
                          </span>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                            Note
                          </p>
                        </div>

                        <div className="flex flex-col px-2 pb-2 pt-1.5">
                          {RATING_FILTERS.map((option) => {
                            const selected = rating === option.key;
                            return (
                              <label
                                key={option.key}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-bold transition ${
                                  selected
                                    ? "bg-[#fff4eb] text-primary dark:bg-primary/15"
                                    : "text-gray-700 hover:bg-[#fff7ef] dark:text-gray-200 dark:hover:bg-gray-700"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="rating-filter"
                                  checked={selected}
                                  onChange={() => {
                                    setRating(option.key);
                                    setVisibleCount(PAGE_STEP);
                                  }}
                                  className="h-4 w-4 flex-shrink-0 accent-[#F47920]"
                                />
                                {option.stars > 0 ? (
                                  <span className="flex items-center gap-0.5">
                                    {Array.from({ length: option.stars }).map((_, index) => (
                                      <Star
                                        key={index}
                                        size={11}
                                        fill="currentColor"
                                        className="text-amber-400"
                                      />
                                    ))}
                                  </span>
                                ) : null}
                                {option.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveFacet(null);
                          setPriceRange("all");
                          setRating("all");
                          setVisibleCount(PAGE_STEP);
                        }}
                        disabled={activeFilterCount === 0}
                        className="flex-shrink-0 border-t border-[#f5e2d4] py-2.5 text-[12px] font-extrabold text-primary transition hover:bg-[#fff7ef] disabled:text-gray-300 disabled:hover:bg-transparent dark:border-gray-700 dark:hover:bg-gray-700 dark:disabled:text-gray-600"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* ═══ Grille produits ═══ */}
            <section className="rounded-[22px] border border-[#f1d2bb] bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,.05)] sm:rounded-[28px] sm:p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-[18px] w-[3px] rounded" style={{ background: accent }} />
                <theme.icon size={16} style={{ color: accent }} />
                <div>
                  <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white">
                    {theme.name}
                  </h2>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    Sélection du thème, triée par {SORT_OPTIONS.find((o) => o.key === sort)?.label.toLowerCase()}.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="skeleton aspect-[0.72] rounded-[14px]" />
                  ))}
                </div>
              ) : visibleProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
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
                    {hasMoreProducts ? (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleCount((count) =>
                            Math.min(count + PAGE_STEP, sortedProducts.length)
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-[#ecd3c1] bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        Voir plus d'articles
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <span className="rounded-full border border-[#ecd3c1] bg-white px-5 py-3 text-sm font-bold text-[#5e7891] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        Tous les articles de ce thème sont affichés
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: `${accent}1a`, color: accent }}
                  >
                    <PackageSearch size={26} />
                  </div>
                  <p className="text-[15px] font-extrabold text-gray-900 dark:text-white">
                    {activeFacet
                      ? `Aucun article « ${activeFacet} » pour le moment`
                      : "Ce thème n'a pas encore d'articles en ligne"}
                  </p>
                  <p className="max-w-md text-[12.5px] text-gray-500 dark:text-gray-400">
                    Les vendeurs enrichissent le catalogue chaque jour. En attendant, explorez le
                    reste de la boutique ou retirez le filtre en cours.
                  </p>
                  <div className="mt-1 flex flex-wrap justify-center gap-2">
                    {activeFacet ? (
                      <button
                        onClick={() => setActiveFacet(null)}
                        className="rounded-full px-5 py-2.5 text-sm font-extrabold text-white transition hover:opacity-90"
                        style={{ background: accent }}
                      >
                        Retirer le filtre
                      </button>
                    ) : null}
                    <Link
                      to="/catalog"
                      className="rounded-full border border-[#ecd3c1] bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Parcourir tout le catalogue
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* ═══ Passerelle vers les autres thèmes ═══ */}
            <section className="rounded-[22px] border border-[#f1d2bb] bg-white p-3 shadow-[0_10px_30px_rgba(244,121,32,.06)] sm:p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-[16px] w-[3px] rounded bg-primary" />
                <LayoutGrid size={15} className="text-primary" />
                <h2 className="text-[14px] font-extrabold text-gray-900 dark:text-white">
                  Explorer d'autres thèmes
                </h2>
                <Link
                  to="/categories"
                  className="ml-auto text-[11px] font-bold text-[#c85e14] dark:text-primary"
                >
                  Tout voir
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {otherThemes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.slug}
                      to={`/categorie/${item.slug}`}
                      className="flex items-center gap-2.5 rounded-2xl border border-[#f0e0d2] bg-[#fffaf6] p-2.5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                    >
                      <span
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${item.accent}1a`, color: item.accent }}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-extrabold text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                        <span className="block text-[10.5px] font-semibold text-gray-400 dark:text-gray-500">
                          {item.count} produits
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
