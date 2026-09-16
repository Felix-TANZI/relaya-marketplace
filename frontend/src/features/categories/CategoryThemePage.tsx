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
  Layers,
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
import useStorefrontCategories from "@/hooks/useStorefrontCategories";
import { HERO_MIN_HEIGHT, getCategoryTheme, matchesCategory } from "@/data/categoryThemes";
import { categoryIcon } from "@/data/categoryIcon";
import { toStorefrontCategory } from "@/data/storefrontCategories";
import { V29_PRODUCTS } from "@/data/v29Products";
import { productsApi, type Product, type ProductListParams } from "@/services/api/products";
import {
  categorySubtreeIds,
  findCategoryBySlug,
  type CategoryTreeNode,
} from "@/services/api/categories";

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

/**
 * Page portée par une catégorie de la base. Une sous-catégorie finale s'affiche
 * dans la page de son parent, où elle devient la pastille sélectionnée : l'URL
 * reste partageable et le bouton retour du navigateur défait la sélection.
 */
interface DbContext {
  page: CategoryTreeNode;
  selected: CategoryTreeNode | null;
  ancestors: CategoryTreeNode[];
  root: CategoryTreeNode;
}

/* Une pastille ronde de la rangée « sous-catégories ». */
interface CircleItem {
  key: string;
  label: string;
  image: string | null;
  icon: LucideIcon;
  active: boolean;
  count?: number;
  onSelect: () => void;
}

function productCategoryIn(product: Product, ids: Set<number>) {
  const id = product.category?.id;
  return id !== undefined && ids.has(id);
}

export default function CategoryThemePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tree, categories: storefront, loading: treeLoading } = useStorefrontCategories();

  /* ── Résolution : catégorie de la base, sinon thème statique ── */
  const context = useMemo<DbContext | null>(() => {
    if (!slug || slug === "all") return null;
    const match = findCategoryBySlug(tree, slug);
    if (!match) return null;
    const { node, ancestors } = match;
    const leafUnderParent = node.children.length === 0 && ancestors.length > 0;
    const page = leafUnderParent ? ancestors[ancestors.length - 1] : node;
    return {
      page,
      selected: leafUnderParent ? node : null,
      ancestors: leafUnderParent ? ancestors.slice(0, -1) : ancestors,
      root: ancestors[0] ?? node,
    };
  }, [tree, slug]);

  const rootStorefront = context
    ? storefront.find((category) => category.node?.id === context.root.id)
    : undefined;

  const theme = useMemo(() => {
    if (!context) return getCategoryTheme(slug);
    const base = toStorefrontCategory(context.page);
    // Bannière : l'image de la page, sinon celle de l'ancêtre le plus proche,
    // sinon la photo de secours de l'univers.
    const inherited = [context.page, ...[...context.ancestors].reverse()].find((n) => n.image_url)?.image_url;
    return {
      ...base,
      accent: rootStorefront?.accent ?? base.accent,
      image: inherited || rootStorefront?.image || base.image,
      icon: rootStorefront?.icon ?? base.icon,
      label: context.page.id === context.root.id ? "Catégorie" : context.root.name,
      description: base.description || rootStorefront?.description || "",
    };
  }, [context, rootStorefront, slug]);

  const pageKey = context?.page.slug ?? slug;
  const selectedNode = context?.selected ?? null;
  const pageCategoryId = context?.page.id ?? null;

  const { mainRef, trackTop, trackHeight, topOffset } = useSidebarTrack();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [usingMockProducts, setUsingMockProducts] = useState(true);
  /* Chargement déduit : la dernière réponse reçue concerne-t-elle la page affichée ? */
  const productsKey = pageCategoryId === null ? "catalog" : `category-${pageCategoryId}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = treeLoading || loadedKey !== productsKey;
  const [activeFacet, setActiveFacet] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [lastPageKey, setLastPageKey] = useState(pageKey);
  const [lastSelected, setLastSelected] = useState(selectedNode?.id ?? null);

  /* Zone de filtres — menu de tri et panneau de réglages */
  const filterZoneRef = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<PriceKey>("all");
  const [rating, setRating] = useState<RatingKey>("all");

  /* Changement de page : on repart d'une page propre (pendant le rendu, sans effet).
     Choisir une sous-catégorie garde le tri et les filtres de prix / note. */
  if (pageKey !== lastPageKey) {
    setLastPageKey(pageKey);
    setActiveFacet(null);
    setSort("relevance");
    setVisibleCount(PAGE_STEP);
    setSortOpen(false);
    setFiltersOpen(false);
    setPriceRange("all");
    setRating("all");
  }
  if ((selectedNode?.id ?? null) !== lastSelected) {
    setLastSelected(selectedNode?.id ?? null);
    setVisibleCount(PAGE_STEP);
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

  /* On remonte en haut en changeant de page, pas en choisissant une sous-catégorie. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pageKey]);

  useEffect(() => {
    document.documentElement.style.setProperty("--belivay-fixed-top", "100px");
  }, []);

  /* Produits : ceux de la catégorie et de ses sous-catégories pour une page de la
     base ; tout le catalogue (ou la démo) pour un thème statique. */
  useEffect(() => {
    if (treeLoading) return;
    let cancelled = false;

    const params: ProductListParams = { page_size: 100, is_active: true };
    if (pageCategoryId !== null) params.category = pageCategoryId;

    productsApi
      .list(params)
      .then((response) => {
        if (cancelled) return;
        const results = response.results ?? [];
        if (pageCategoryId !== null) {
          // Une catégorie de l'admin n'affiche que ses vrais produits.
          setApiProducts(results);
          setUsingMockProducts(false);
        } else if (results.length > 0) {
          setApiProducts(results);
          setUsingMockProducts(results.length < 20);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setApiProducts([]);
        setUsingMockProducts(pageCategoryId === null);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(productsKey);
      });

    return () => {
      cancelled = true;
    };
  }, [pageCategoryId, productsKey, treeLoading]);

  const sourceProducts = usingMockProducts ? V29_PRODUCTS : apiProducts;

  const categoryProducts = useMemo(
    () => (context ? sourceProducts : sourceProducts.filter((product) => matchesCategory(product, slug))),
    [context, sourceProducts, slug]
  );

  /* Effectif de chaque sous-catégorie de la base (sous-arbre compris). */
  const childCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const child of context?.page.children ?? []) {
      const ids = categorySubtreeIds(child);
      counts[child.id] = categoryProducts.filter((product) => productCategoryIn(product, ids)).length;
    }
    return counts;
  }, [categoryProducts, context]);

  const facetProducts = useMemo(() => {
    if (selectedNode) {
      const ids = categorySubtreeIds(selectedNode);
      return categoryProducts.filter((product) => productCategoryIn(product, ids));
    }
    if (!activeFacet) return categoryProducts;
    const needle = activeFacet.toLowerCase();
    return categoryProducts.filter((product) =>
      `${product.title} ${product.short_description ?? ""} ${product.description ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [categoryProducts, activeFacet, selectedNode]);

  /* Effectif de chaque sous-thème statique, affiché en pastille dans le panneau. */
  const facetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!theme || context) return counts;

    for (const facet of theme.facets) {
      const needle = facet.toLowerCase();
      counts[facet] = categoryProducts.filter((product) =>
        `${product.title} ${product.short_description ?? ""} ${product.description ?? ""}`
          .toLowerCase()
          .includes(needle)
      ).length;
    }

    return counts;
  }, [categoryProducts, context, theme]);

  const activeSubLabel = selectedNode?.name ?? activeFacet;
  const activeFilterCount =
    (activeSubLabel ? 1 : 0) + (priceRange !== "all" ? 1 : 0) + (rating !== "all" ? 1 : 0);

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

  const currentRootSlug = context?.root.slug ?? slug;
  const otherThemes = storefront.filter((item) => item.slug !== currentRootSlug && item.slug !== "all");

  /* ── Pastilles rondes : sous-catégories de la page, ou univers depuis « Tout voir » ── */
  const clearSelection = () => {
    if (context) navigate(`/categorie/${context.page.slug}`);
    else setActiveFacet(null);
  };

  const circleItems: CircleItem[] = context
    ? context.page.children.map((child) => {
        const active = selectedNode?.id === child.id;
        return {
          key: child.slug,
          label: child.name,
          image: child.image_url,
          icon: categoryIcon({ slug: child.slug, name: child.name, iconName: child.icon_name }),
          active,
          count: childCounts[child.id],
          onSelect: () => navigate(`/categorie/${active ? context.page.slug : child.slug}`),
        };
      })
    : slug === "all"
      ? storefront
          .filter((category) => category.node)
          .map((category) => ({
            key: category.slug,
            label: category.name,
            image: category.thumb || null,
            icon: category.icon,
            active: false,
            onSelect: () => navigate(`/categorie/${category.slug}`),
          }))
      : [];

  /* Slug inconnu — on ne laisse pas l'utilisateur sur une page vide. */
  if (!theme) {
    if (treeLoading) {
      return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fff_14%,#f8fafc_100%)] px-4 py-6 dark:bg-gray-950">
          <div className="mx-auto max-w-[1400px] space-y-3">
            <div className={`skeleton rounded-[24px] ${HERO_MIN_HEIGHT}`} />
            <div className="skeleton h-[120px] rounded-[22px]" />
          </div>
        </div>
      );
    }
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
            La catégorie « {slug} » n'est pas au catalogue. Parcourez la liste complète des catégories
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

  /* Chiffres du hero : réels pour une catégorie de la base, éditoriaux pour un thème. */
  const ratedProducts = categoryProducts.filter((product) => (product.rating_average ?? 0) > 0);
  const averageRating = ratedProducts.length
    ? ratedProducts.reduce((sum, product) => sum + (product.rating_average ?? 0), 0) / ratedProducts.length
    : 0;
  const heroStats = context
    ? [
        { icon: ShoppingCart, num: loading ? "…" : categoryProducts.length.toLocaleString("fr-FR"), label: "Produits" },
        { icon: Layers, num: String(context.page.children.length), label: "Sous-catégories" },
        { icon: Star, num: averageRating ? `${averageRating.toFixed(1)} / 5` : "—", label: "Note moyenne" },
        { icon: Truck, num: theme.delivery, label: "Livraison" },
      ]
    : [
        { icon: ShoppingCart, num: theme.count, label: "Produits" },
        { icon: ShieldCheck, num: theme.vendors, label: "Vendeurs certifiés" },
        { icon: Star, num: theme.rating, label: "Note moyenne" },
        { icon: Truck, num: theme.delivery, label: "Livraison" },
      ];

  /* Sous-catégories proposées dans le panneau de filtres. */
  const panelSubItems = context
    ? [
        { key: "__all__", label: "Tous les articles", count: categoryProducts.length, selected: !selectedNode, onSelect: clearSelection },
        ...context.page.children.map((child) => ({
          key: child.slug,
          label: child.name,
          count: childCounts[child.id] ?? 0,
          selected: selectedNode?.id === child.id,
          onSelect: () => navigate(`/categorie/${child.slug}`),
        })),
      ]
    : [
        { key: "__all__", label: "Tous les articles", count: categoryProducts.length, selected: activeFacet === null, onSelect: () => setActiveFacet(null) },
        ...theme.facets.map((facet) => ({
          key: facet,
          label: facet,
          count: facetCounts[facet] ?? 0,
          selected: activeFacet === facet,
          onSelect: () => setActiveFacet(facet),
        })),
      ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fff_14%,#f8fafc_100%)] dark:bg-gray-950">
      <div className="mx-auto max-w-[1760px] px-1 pb-12 pt-3 sm:px-2 lg:px-3">
        <div className="flex items-stretch gap-2 xl:gap-3">
          <CategorySidebar
            activeCategory={currentRootSlug}
            onSelectCategory={(nextSlug) => navigate(`/categorie/${nextSlug}`)}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
            trackTop={trackTop}
            trackHeight={trackHeight}
            topOffset={topOffset}
          />

          <main ref={mainRef} className="min-w-0 flex-1 space-y-3 sm:space-y-4">
            {/* ═══ Hero de la catégorie ═══ */}
            <section
              className={`relative flex overflow-hidden rounded-[24px] shadow-[0_16px_42px_rgba(15,23,42,.12)] sm:rounded-[30px] ${HERO_MIN_HEIGHT}`}
              style={{ border: `1px solid ${accent}33` }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: theme.image
                    ? `url(${theme.image}) center/cover`
                    : `linear-gradient(135deg, ${accent} 0%, ${accent}aa 55%, #111827 130%)`,
                }}
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
                  {context?.ancestors.map((ancestor) => (
                    <span key={ancestor.id} className="flex items-center gap-1">
                      <ChevronRight size={12} />
                      <Link to={`/categorie/${ancestor.slug}`} className="transition hover:text-white">
                        {ancestor.name}
                      </Link>
                    </span>
                  ))}
                  <ChevronRight size={12} />
                  <span className="text-white">{theme.name}</span>
                </nav>

                <span className="mt-3 inline-block self-start rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
                  {theme.label}
                </span>

                <h1 className="mt-2.5 max-w-2xl text-2xl font-black leading-tight sm:text-[32px]">
                  {theme.title}
                </h1>
                <p className="mt-1 text-[13px] font-semibold text-white/85 sm:text-sm">
                  {theme.subtitle}
                </p>
                {theme.description ? (
                  <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-white/80 sm:text-[13.5px]">
                    {theme.description}
                  </p>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                  {heroStats.map((stat) => {
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

            {/* ═══ Sous-catégories + tri ═══ */}
            <section className="rounded-[22px] border border-[#f1d2bb] bg-white p-3 shadow-[0_10px_30px_rgba(244,121,32,.06)] sm:p-4 dark:border-gray-800 dark:bg-gray-900">
              {circleItems.length > 0 ? (
                /* Pastilles rondes illustrées par l'admin — l'image de chaque sous-catégorie. */
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 sm:gap-4">
                  {context ? (
                    <CategoryCircle
                      label="Tout"
                      image={null}
                      icon={LayoutGrid}
                      active={!selectedNode}
                      accent={accent}
                      onSelect={clearSelection}
                    />
                  ) : null}
                  {circleItems.map((item) => (
                    <CategoryCircle
                      key={item.key}
                      label={item.label}
                      image={item.image}
                      icon={item.icon}
                      active={item.active}
                      count={item.count}
                      accent={accent}
                      onSelect={item.onSelect}
                    />
                  ))}
                </div>
              ) : null}

              {!context && theme.facets.length > 0 ? (
                <div className={`flex gap-2 overflow-x-auto scrollbar-hide pb-1 ${circleItems.length > 0 ? "mt-3" : ""}`}>
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
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#f5e2d4] pt-3 dark:border-gray-800">
                <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400">
                  <span className="text-[14px] font-black text-gray-900 dark:text-white">
                    {sortedProducts.length}
                  </span>{" "}
                  {sortedProducts.length > 1 ? "articles disponibles" : "article disponible"}
                  {activeSubLabel ? ` · ${activeSubLabel}` : ""}
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
                        {panelSubItems.length > 1 ? (
                          <>
                            <div className="flex items-center gap-2 px-3 pt-3">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#fff1e5] text-primary dark:bg-primary/20">
                                <ListFilter size={12} />
                              </span>
                              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                                Sous-catégories
                              </p>
                            </div>

                            <div className="flex flex-col px-2 pb-1 pt-1.5">
                              {panelSubItems.map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => {
                                    item.onSelect();
                                    setVisibleCount(PAGE_STEP);
                                  }}
                                  className={`flex items-center gap-2 rounded-xl border-l-[3px] py-2 pl-2 pr-2.5 text-left text-[12.5px] font-bold transition ${
                                    item.selected
                                      ? "border-l-primary bg-[#fff4eb] text-primary dark:bg-primary/15"
                                      : "border-l-transparent text-gray-700 hover:bg-[#fff7ef] dark:text-gray-200 dark:hover:bg-gray-700"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                                      item.selected ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                    }`}
                                  />
                                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                  <span
                                    className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                                      item.selected
                                        ? "bg-primary/15 text-primary"
                                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                    }`}
                                  >
                                    {item.count}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </>
                        ) : null}

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
                          if (selectedNode) clearSelection();
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
                    {selectedNode ? `${theme.name} · ${selectedNode.name}` : theme.name}
                  </h2>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    Sélection triée par {SORT_OPTIONS.find((o) => o.key === sort)?.label.toLowerCase()}.
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
                        Tous les articles de cette catégorie sont affichés
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
                    {activeSubLabel
                      ? `Aucun article « ${activeSubLabel} » pour le moment`
                      : "Cette catégorie n'a pas encore d'articles en ligne"}
                  </p>
                  <p className="max-w-md text-[12.5px] text-gray-500 dark:text-gray-400">
                    Les vendeurs enrichissent le catalogue chaque jour. En attendant, explorez le
                    reste de la boutique ou retirez le filtre en cours.
                  </p>
                  <div className="mt-1 flex flex-wrap justify-center gap-2">
                    {activeSubLabel ? (
                      <button
                        onClick={clearSelection}
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

            {/* ═══ Passerelle vers les autres catégories ═══ */}
            {otherThemes.length > 0 ? (
              <section className="rounded-[22px] border border-[#f1d2bb] bg-white p-3 shadow-[0_10px_30px_rgba(244,121,32,.06)] sm:p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-[16px] w-[3px] rounded bg-primary" />
                  <LayoutGrid size={15} className="text-primary" />
                  <h2 className="text-[14px] font-extrabold text-gray-900 dark:text-white">
                    Explorer d'autres catégories
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
                        {item.thumb ? (
                          <img
                            src={item.thumb}
                            alt=""
                            loading="lazy"
                            className="h-10 w-10 flex-shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ background: `${item.accent}1a`, color: item.accent }}
                          >
                            <Icon size={18} />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-extrabold text-gray-900 dark:text-white">
                            {item.name}
                          </span>
                          <span className="block text-[10.5px] font-semibold text-gray-400 dark:text-gray-500">
                            {item.count ? `${item.count} produits` : item.subtitle}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

/* Pastille ronde d'une sous-catégorie : son image (définie par l'admin) ou son icône. */
function CategoryCircle({
  label, image, icon: Icon, active, count, accent, onSelect,
}: {
  label: string;
  image: string | null;
  icon: LucideIcon;
  active: boolean;
  count?: number;
  accent: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="group flex w-[72px] flex-shrink-0 flex-col items-center gap-1.5 sm:w-[84px]"
    >
      <span
        className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full transition-transform group-hover:-translate-y-0.5 sm:h-16 sm:w-16"
        style={{
          boxShadow: active
            ? `0 0 0 2px #fff, 0 0 0 4px ${accent}, 0 6px 16px ${accent}40`
            : "0 0 0 2px #fff, 0 0 0 3px #f0dccd, 0 4px 10px rgba(15,23,42,.08)",
          background: image ? undefined : `${accent}14`,
          color: accent,
        }}
      >
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Icon size={22} />
        )}
      </span>
      <span
        className={`w-full truncate text-center text-[11.5px] font-bold ${
          active ? "" : "text-gray-700 dark:text-gray-200"
        }`}
        style={active ? { color: accent } : undefined}
      >
        {label}
      </span>
      {count !== undefined ? (
        <span className="-mt-1 text-[10px] font-semibold text-gray-400">{count}</span>
      ) : null}
    </button>
  );
}
