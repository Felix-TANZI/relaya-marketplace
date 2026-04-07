import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Flame,
  Home as HomeIcon,
  Monitor,
  Package,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Star,
  Truck,
  X,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import CatalogAssistantPanel from "./CatalogAssistantPanel";
import {
  productsApi,
  type Category,
  type Product,
  type ProductListResponse,
} from "@/services/api/products";

type CategoryWithChildren = Category & {
  children: Category[];
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "Téléphones & Tablettes": Smartphone,
  "Téléphones": Smartphone,
  "Électronique": Monitor,
  "Mode Femme": Shirt,
  "Mode Homme": Shirt,
  "Beauté & Santé": Sparkles,
  "Maison & Cuisine": HomeIcon,
  "Maison & Bureau": HomeIcon,
  "Supermarché": ShoppingBag,
  Audio: Sparkles,
  Gaming: Monitor,
  Montres: Sparkles,
  Ordinateurs: Monitor,
  Tablettes: Smartphone,
};

const TRUST_ICONS = [Truck, ShieldCheck, Flame];

export default function CatalogPage() {
  const { t } = useTranslation();

  const TRUST_POINTS = [
    { icon: Truck, title: t('catalog_page.free_delivery'), description: t('catalog_page.free_delivery_desc') },
    { icon: ShieldCheck, title: t('catalog_page.secure_payment'), description: t('catalog_page.secure_payment_desc') },
    { icon: Flame, title: t('catalog_page.active_promos'), description: t('catalog_page.active_promos_desc') },
  ];

  const SORT_OPTIONS = [
    { value: "pertinence", label: t('catalog_page.relevance') },
    { value: "price_asc", label: t('catalog_page.price_asc') },
    { value: "price_desc", label: t('catalog_page.price_desc') },
    { value: "recent", label: t('catalog_page.newest') },
  ];

  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    searchParams.get("category") ? parseInt(searchParams.get("category")!, 10) : null,
  );
  const [showPromoOnly, setShowPromoOnly] = useState(searchParams.get("promo") === "1");
  const [showFreeDeliveryOnly, setShowFreeDeliveryOnly] = useState(
    searchParams.get("free_delivery") === "1",
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([5000, 100000]);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(searchParams.get("recent") === "1");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "pertinence");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const pageSize = 12;

  const hierarchicalCategories = useMemo<CategoryWithChildren[]>(() => {
    const parents = categories.filter((category) => !category.parent);
    return parents.map((parent) => ({
      ...parent,
      children: categories.filter((category) => category.parent === parent.id),
    }));
  }, [categories]);

  const visibleProducts = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const filteredProducts = products.filter((product) => {
      const hasPromo = Boolean(product.discount && product.discount > 0);
      const hasFreeDelivery = product.price_xaf >= 30000;
      const matchesRating = minRating === 0 || (product.rating_average ?? 0) >= minRating;
      const isRecent = now - new Date(product.created_at).getTime() <= thirtyDaysMs;

      if (showPromoOnly && !hasPromo) {
        return false;
      }

      if (showFreeDeliveryOnly && !hasFreeDelivery) {
        return false;
      }

      if (showNewOnly && !isRecent) {
        return false;
      }

      if (!matchesRating) {
        return false;
      }

      return true;
    });

    return [...filteredProducts].sort((leftProduct, rightProduct) => {
      if (sortBy === "price_asc") {
        return leftProduct.price_xaf - rightProduct.price_xaf;
      }

      if (sortBy === "price_desc") {
        return rightProduct.price_xaf - leftProduct.price_xaf;
      }

      if (sortBy === "recent") {
        return (
          new Date(rightProduct.created_at).getTime() -
          new Date(leftProduct.created_at).getTime()
        );
      }

      const leftScore = (leftProduct.discount ?? 0) * 1000 + (leftProduct.reviews_count ?? 0);
      const rightScore =
        (rightProduct.discount ?? 0) * 1000 + (rightProduct.reviews_count ?? 0);
      return rightScore - leftScore;
    });
  }, [
    products,
    showPromoOnly,
    showFreeDeliveryOnly,
    minRating,
    showNewOnly,
    sortBy,
  ]);

  const featuredCategories = hierarchicalCategories.slice(0, 6);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await productsApi.listCategories();
        setCategories(response.results || []);
      } catch (fetchError) {
        console.error("Error loading categories:", fetchError);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, string | number | boolean> = {
          page: currentPage,
          page_size: pageSize,
        };

        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (priceRange[0] > 5000) params.price_min = priceRange[0];
        if (priceRange[1] < 100000) params.price_max = priceRange[1];
        if (inStockOnly) params.in_stock = true;

        const response: ProductListResponse = await productsApi.list(params);
        setProducts(response.results || []);
        setTotalCount(response.count || 0);
      } catch (fetchError) {
        console.error("Error loading products:", fetchError);
        setError(t('catalog_page.load_error'));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, selectedCategory, priceRange, sortBy, currentPage, inStockOnly]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((previous) =>
      previous.includes(categoryId)
        ? previous.filter((id) => id !== categoryId)
        : [...previous, categoryId],
    );
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setShowPromoOnly(false);
    setShowFreeDeliveryOnly(false);
    setPriceRange([5000, 100000]);
    setMinRating(0);
    setInStockOnly(false);
    setShowNewOnly(false);
    setSortBy("pertinence");
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    searchQuery,
    selectedCategory,
    showPromoOnly,
    showFreeDeliveryOnly,
    priceRange[0] > 5000,
    priceRange[1] < 100000,
    minRating > 0,
    inStockOnly,
    showNewOnly,
  ].filter(Boolean).length;

  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategory)?.name || t('catalog_page.all_categories');

  const totalPages = Math.ceil(totalCount / pageSize);
  const currentSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortBy)?.label || "Pertinence";

  const renderFilterPanel = () => (
    <div className="space-y-6">
      <div
        data-tutorial="catalog-categories"
        className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('catalog_page.categories')}</h3>
          <span className="text-xs font-medium text-gray-400">
            {categoriesLoading ? "..." : `${categories.length} ${t('catalog_page.available')}`}
          </span>
        </div>

        <button
          onClick={() => setSelectedCategory(null)}
          className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
            selectedCategory === null
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-primary dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          <ShoppingBag size={18} />
          <span className="text-sm font-semibold">{t('catalog_page.full_catalog')}</span>
        </button>

        <div className="space-y-1">
          {hierarchicalCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category.name] || ShoppingBag;
            const hasChildren = category.children.length > 0;
            const isExpanded = expandedCategories.includes(category.id);
            const isSelected = selectedCategory === category.id;

            return (
              <div key={category.id}>
                <button
                  onClick={() => {
                    setSelectedCategory(isSelected ? null : category.id);
                    if (hasChildren) {
                      toggleCategory(category.id);
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "bg-orange-50 text-primary dark:bg-primary/10"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-sm font-medium">{category.name}</span>
                  {hasChildren &&
                    (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                </button>

                {hasChildren && isExpanded && (
                  <div className="ml-6 mt-1 space-y-1 border-l border-gray-100 pl-3 dark:border-gray-700">
                    {category.children.map((subCategory) => (
                      <button
                        key={subCategory.id}
                        onClick={() => setSelectedCategory(subCategory.id)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                          selectedCategory === subCategory.id
                            ? "bg-orange-50 font-medium text-primary dark:bg-primary/10"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {subCategory.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('catalog_page.filters')}</h3>
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">
              {activeFiltersCount}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={showPromoOnly}
              onChange={(event) => setShowPromoOnly(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('catalog_page.promos_only')}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={showFreeDeliveryOnly}
              onChange={(event) => setShowFreeDeliveryOnly(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <Truck size={14} />
              {t('catalog_page.free_delivery')}
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <Package size={14} />
              {t('catalog_page.in_stock_only')}
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={showNewOnly}
              onChange={(event) => setShowNewOnly(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <Sparkles size={14} />
              {t('catalog_page.newest')}
            </span>
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('catalog_page.min_rating')}
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setMinRating(rating === minRating ? 0 : rating)}
                  className={`rounded p-1 transition-colors ${
                    rating <= minRating
                      ? "text-yellow-500"
                      : "text-gray-300 hover:text-yellow-400"
                  }`}
                >
                  <Star
                    size={20}
                    fill={rating <= minRating ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('catalog_page.price_range')}
            </label>
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700">
              <span className="text-gray-600 dark:text-gray-300">
                {priceRange[0].toLocaleString()} FCFA
              </span>
              <span className="text-gray-400">-</span>
              <span className="text-gray-600 dark:text-gray-300">
                {priceRange[1].toLocaleString()} FCFA
              </span>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min="5000"
                max="100000"
                step="1000"
                value={priceRange[0]}
                onChange={(event) =>
                  setPriceRange([
                    Math.min(parseInt(event.target.value, 10), priceRange[1]),
                    priceRange[1],
                  ])
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary"
              />
              <input
                type="range"
                min="5000"
                max="100000"
                step="1000"
                value={priceRange[1]}
                onChange={(event) =>
                  setPriceRange([
                    priceRange[0],
                    Math.max(parseInt(event.target.value, 10), priceRange[0]),
                  ])
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={handleApplyFilters}
            className="w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
          >
            {t('catalog_page.apply_filters')}
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="w-full rounded-2xl px-6 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
            >
              {t('catalog_page.reset_all')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f5f1] dark:bg-gray-950">
      <div className="border-b border-orange-100 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="container mx-auto px-4 py-3">
          <div className="grid gap-3 md:grid-cols-3">
            {TRUST_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.title}
                  className="flex items-center gap-3 rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {point.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {point.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#fff1e3] via-white to-[#fff7ef] p-6 shadow-sm ring-1 ring-orange-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 dark:ring-gray-800 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm dark:bg-gray-800">
                <Flame size={14} />
                {t('catalog_page.mega_promos')}
              </div>
              <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-5xl">
                {t('catalog_page.hero_title')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300 lg:text-base">
                {t('catalog_page.hero_desc')}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                  {selectedCategoryName}
                </span>
                {!error && (
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                    {visibleProducts.length} {t('catalog_page.visible_products')}
                  </span>
                )}
                {showPromoOnly && (
                  <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                    {t('catalog_page.promotions')}
                  </span>
                )}
                {showFreeDeliveryOnly && (
                  <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                    {t('catalog_page.free_delivery')}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {featuredCategories.map((category) => {
                const Icon = CATEGORY_ICONS[category.name] || ShoppingBag;
                const isSelected = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-white text-primary shadow-md dark:bg-gray-800"
                        : "border-white bg-white/80 text-gray-700 hover:border-orange-200 hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{category.name}</p>
                      <p className="text-xs text-gray-400">
                        {category.children.length > 0
                          ? `${category.children.length} ${t('catalog_page.subcategories')}`
                          : t('catalog_page.explore')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className="hidden w-80 flex-shrink-0 lg:block">{renderFilterPanel()}</aside>

          <main className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {t('catalog_page.client_catalog')}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {t('catalog_page.current_selection')}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {error
                    ? t('catalog_page.sort_error')
                    : t('catalog_page.results_summary', { total: totalCount, visible: visibleProducts.length })}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 lg:hidden"
                >
                  <SlidersHorizontal size={18} />
                  {t('catalog_page.filters')}
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setSortMenuOpen((previous) => !previous)}
                    className="flex min-w-[170px] items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm outline-none ring-primary/20 transition-all focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <span>{currentSortLabel}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${sortMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {sortMenuOpen && (
                    <div className="absolute right-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setSortMenuOpen(false);
                          }}
                          className={`block w-full px-4 py-3 text-left text-sm transition-colors ${
                            sortBy === option.value
                              ? "bg-orange-50 font-semibold text-primary dark:bg-primary/10"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="skeleton mb-4 aspect-square rounded-2xl" />
                    <div className="skeleton mb-2 h-3 w-20 rounded-full" />
                    <div className="skeleton mb-2 h-4 w-full rounded-full" />
                    <div className="skeleton mb-4 h-4 w-2/3 rounded-full" />
                    <div className="skeleton h-10 rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[2rem] border border-red-100 bg-white p-10 text-center shadow-sm dark:border-red-900/30 dark:bg-gray-900">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20">
                  <Package size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('catalog_page.catalog_unavailable')}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                  {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-6 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="rounded-[2rem] border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-primary dark:bg-primary/10">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('catalog_page.no_match')}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                  {t('catalog_page.no_match_desc')}
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-6 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
                >
                  {t('catalog_page.reset_filters')}
                </button>
              </div>
            ) : (
              <>
                <div
                  data-tutorial="catalog-products"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                >
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} showPromo />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                    {currentPage > 1 && (
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {t('catalog_page.previous')}
                      </button>
                    )}

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-10 w-10 rounded-2xl text-sm font-semibold transition-all ${
                            currentPage === page
                              ? "bg-primary text-white shadow-lg shadow-primary/20"
                              : "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}

                    {currentPage < totalPages && (
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {t('catalog_page.next')}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
          <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-[#f8f5f1] p-4 dark:bg-gray-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('catalog_page.catalog_filters')}</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="rounded-2xl bg-white p-2 text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300"
              >
                <X size={22} />
              </button>
            </div>
            {renderFilterPanel()}
          </div>
        </div>
      )}

      <CatalogAssistantPanel
        products={visibleProducts}
        selectedCategoryName={selectedCategoryName}
        filters={{
          promoOnly: showPromoOnly,
          freeDeliveryOnly: showFreeDeliveryOnly,
          inStockOnly,
          minRating,
        }}
      />
    </div>
  );
}
