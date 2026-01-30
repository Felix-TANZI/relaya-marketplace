// frontend/src/features/catalog/CatalogPage.tsx
// Page du catalogue des produits

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, Grid3x3, List, AlertCircle } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { Button, Badge } from "@/components/ui";
import { productsApi, Product } from "@/services/api";

const CATEGORIES = [
  "catalog.all",
  "catalog.phones",
  "catalog.computers",
  "catalog.tablets",
  "catalog.audio",
  "catalog.watches",
  "catalog.gaming",
];

export default function CatalogPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("catalog.all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Charger les produits depuis l'API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productsApi.list({
          page_size: 50,
          search: searchQuery || undefined,
        });
        setProducts(response.results);
      } catch (err) {
        console.error("Erreur chargement produits:", err);
        setError(t('catalog.error_message'));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, t]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "catalog.all" || product.category?.name === t(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Transformer les produits API en format ProductCard
  const transformedProducts = filteredProducts.map((product) => ({
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
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary"
                size={20}
              />
              <input
                type="text"
                placeholder={t('catalog.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={18} />
                {t('catalog.filters')}
              </Button>

              <div className="flex gap-1 glass border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-holo-cyan text-white"
                      : "text-dark-text-secondary hover:text-dark-text"
                  }`}
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-holo-cyan text-white"
                      : "text-dark-text-secondary hover:text-dark-text"
                  }`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedCategory === category
                  ? "bg-gradient-holographic animate-gradient-bg text-white shadow-md"
                  : "glass border border-white/10 text-dark-text-secondary hover:border-holo-cyan hover:text-dark-text"
              }`}
            >
              {t(category)}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="glass border border-red-500/30 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-red-400 mb-2">{t('catalog.error')}</h3>
              <p className="text-dark-text-secondary text-sm mb-4">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                {t('catalog.retry')}
              </Button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-dark-text-secondary">
            {transformedProducts.length} {t('catalog.products_found')}
            {transformedProducts.length > 1 ? t('catalog.products_found_plural') : ""} {t('catalog.products_found_plural_verb')}
            {transformedProducts.length > 1 ? "s" : ""}
          </p>
          {searchQuery && <Badge variant="cyan">{t('catalog.search_label')} {searchQuery}</Badge>}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl glass border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : transformedProducts.length > 0 ? (
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
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Search className="text-dark-text-tertiary" size={32} />
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-dark-text">
              {t('catalog.no_products')}
            </h3>
            <p className="text-dark-text-secondary mb-6">
              {t('catalog.no_products_desc')}
            </p>
            <Button
              variant="gradient"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("catalog.all");
              }}
            >
              {t('catalog.reset_filters')}
            </Button>
          </div>
        )}

        {/* Load More */}
        {transformedProducts.length > 0 && !loading && (
          <div className="text-center mt-12">
            <Button variant="secondary" size="lg">
              {t('catalog.load_more')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}