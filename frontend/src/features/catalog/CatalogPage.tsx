// frontend/src/features/catalog/CatalogPage.tsx
// Page du catalogue des produits avec filtres avancés

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, Grid3x3, List, AlertCircle, X } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { Button, Badge } from "@/components/ui";
import { productsApi, Product, Category, ProductListParams } from "@/services/api/products";

export default function CatalogPage() {
  const { t } = useTranslation();
  
  // État des produits et catégories
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // État des filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("-created_at");
  
  // État UI
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  // Charger les catégories au montage
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsApi.listCategories();
        setCategories(response.results);
      } catch (err) {
        console.error("Erreur chargement catégories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Charger les produits avec les filtres
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Construire les paramètres de requête
        const params: ProductListParams = {
          page: currentPage,
          page_size: 20,
          ordering: sortBy,
        };

        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (priceMin) params.price_min = parseInt(priceMin);
        if (priceMax) params.price_max = parseInt(priceMax);
        if (inStockOnly) params.in_stock = true;

        const response = await productsApi.list(params);
        
        setProducts(response.results);
        setTotalCount(response.count);
        setHasNext(response.next !== null);
      } catch (err) {
        console.error("Erreur chargement produits:", err);
        setError(t('catalog.error_message'));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, selectedCategory, priceMin, priceMax, inStockOnly, sortBy, currentPage, t]);

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setPriceMin("");
    setPriceMax("");
    setInStockOnly(false);
    setSortBy("-created_at");
    setCurrentPage(1);
  };

  // Nombre de filtres actifs
  const activeFiltersCount = [
    searchQuery,
    selectedCategory,
    priceMin,
    priceMax,
    inStockOnly,
  ].filter(Boolean).length;

  // Transformer les produits API en format ProductCard
  const transformedProducts = products.map((product) => ({
    id: product.id,
    name: product.title,
    price: product.price_xaf,
    image: product.media?.find((m) => m.sort_order === 0)?.url,
    category: product.category?.name,
    rating: 4.5,
    inStock: product.stock_quantity > 0,
    isNew: false,
  }));

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-4">
            <span className="text-gradient animate-gradient-bg">{t('catalog.title')}</span>
          </h1>
          <p className="text-dark-text-secondary text-lg">
            {t('catalog.subtitle')}
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="glass border border-white/10 rounded-2xl p-4 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('catalog.search_placeholder')}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-bg-tertiary border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
            </div>

            {/* Filters Toggle */}
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <SlidersHorizontal size={20} />
              {t('catalog.filters')}
              {activeFiltersCount > 0 && (
                <Badge variant="cyan" className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {/* View Mode */}
            <div className="hidden lg:flex gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === "grid"
                    ? "bg-gradient-holographic text-white"
                    : "glass border border-white/10 text-dark-text-secondary hover:text-dark-text"
                }`}
              >
                <Grid3x3 size={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-3 rounded-xl transition-all ${
                  viewMode === "list"
                    ? "bg-gradient-holographic text-white"
                    : "glass border border-white/10 text-dark-text-secondary hover:text-dark-text"
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Catégorie */}
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    {t('product.category')}
                  </label>
                  <select
                    value={selectedCategory || ""}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value ? parseInt(e.target.value) : null);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-dark-bg-tertiary border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text"
                  >
                    <option value="">{t('catalog.all')}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prix Min */}
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Prix min (XAF)
                  </label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => {
                      setPriceMin(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="0"
                    className="w-full px-4 py-2 rounded-xl bg-dark-bg-tertiary border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text"
                  />
                </div>

                {/* Prix Max */}
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Prix max (XAF)
                  </label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => {
                      setPriceMax(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="1000000"
                    className="w-full px-4 py-2 rounded-xl bg-dark-bg-tertiary border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text"
                  />
                </div>

                {/* Tri */}
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Trier par
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-dark-bg-tertiary border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text"
                  >
                    <option value="-created_at">Plus récents</option>
                    <option value="created_at">Plus anciens</option>
                    <option value="price_xaf">Prix croissant</option>
                    <option value="-price_xaf">Prix décroissant</option>
                    <option value="title">Nom A-Z</option>
                    <option value="-title">Nom Z-A</option>
                  </select>
                </div>
              </div>

              {/* Stock checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-5 h-5 rounded border-white/20 bg-dark-bg-tertiary text-holo-cyan focus:ring-2 focus:ring-holo-cyan/20"
                />
                <label htmlFor="inStock" className="text-dark-text font-medium cursor-pointer">
                  {t('product.in_stock')} uniquement
                </label>
              </div>

              {/* Reset Button */}
              {activeFiltersCount > 0 && (
                <Button variant="secondary" onClick={resetFilters} size="sm">
                  <X size={16} />
                  {t('catalog.reset_filters')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-dark-text-secondary">
            {loading ? (
              t('catalog.loading')
            ) : (
              <>
                <span className="font-semibold text-dark-text">{totalCount}</span>{" "}
                {totalCount > 1 ? t('catalog.products_found_plural') : t('catalog.products_found')}{" "}
                {t('catalog.products_found_plural_verb')}
              </>
            )}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
              <p className="text-dark-text-secondary">{t('catalog.loading')}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="text-red-400" size={40} />
              </div>
              <h2 className="font-display font-bold text-2xl text-dark-text mb-4">
                {t('catalog.error')}
              </h2>
              <p className="text-dark-text-secondary mb-8">{error}</p>
              <Button variant="gradient" onClick={() => window.location.reload()}>
                {t('catalog.retry')}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && transformedProducts.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md mx-auto px-4">
              <h2 className="font-display font-bold text-2xl text-dark-text mb-4">
                {t('catalog.no_products')}
              </h2>
              <p className="text-dark-text-secondary mb-8">
                {t('catalog.no_products_desc')}
              </p>
              <Button variant="gradient" onClick={resetFilters}>
                {t('catalog.reset_filters')}
              </Button>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && transformedProducts.length > 0 && (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "flex flex-col gap-4"
              }
            >
              {transformedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalCount > 20 && (
              <div className="mt-12 flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  Précédent
                </Button>
                <span className="text-dark-text">
                  Page {currentPage} sur {Math.ceil(totalCount / 20)}
                </span>
                <Button
                  variant="secondary"
                  disabled={!hasNext}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}