import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Search, X, SlidersHorizontal, ArrowLeft } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Category, type Product, type ProductListResponse } from "@/services/api/products";
import { searchMockProducts, MOCK_PRODUCTS } from "@/lib/mockProducts";

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Fetch categories from backend on mount, fallback to mock categories
  useEffect(() => {
    productsApi.listCategories({ page_size: 20 })
      .then((res) => {
        const backendCats = res.results ?? [];
        if (backendCats.length > 0) {
          setCategories(backendCats);
        } else {
          // Dédupliquer les catégories du mock local
          const seen = new Set<number>();
          const mockCats: Category[] = [];
          for (const p of MOCK_PRODUCTS) {
            if (p.category && !seen.has(p.category.id)) {
              seen.add(p.category.id);
              mockCats.push(p.category);
            }
          }
          setCategories(mockCats);
        }
      })
      .catch(() => {
        const seen = new Set<number>();
        const mockCats: Category[] = [];
        for (const p of MOCK_PRODUCTS) {
          if (p.category && !seen.has(p.category.id)) {
            seen.add(p.category.id);
            mockCats.push(p.category);
          }
        }
        setCategories(mockCats);
      });
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Run search when URL param changes
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    if (q.trim()) {
      runSearch(q);
    } else {
      setProducts([]);
      setSearched(false);
    }
  }, [searchParams]);

  const runSearch = async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const response: ProductListResponse = await productsApi.list({ search: q, page_size: 20 });
      const backendResults = response.results ?? [];
      // Si le backend retourne zéro résultat, on utilise le mock local filtré
      setProducts(backendResults.length > 0 ? backendResults : searchMockProducts(q));
    } catch {
      // Si le backend est inaccessible, on utilise le mock local filtré
      setProducts(searchMockProducts(q));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  const handleQuickSearch = (term: string) => {
    setQuery(term);
    setSearchParams({ q: term });
  };

  const handleClear = () => {
    setQuery("");
    setProducts([]);
    setSearched(false);
    setSearchParams({});
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#f8f5f1] dark:bg-gray-950">
      {/* Search Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-shrink-0 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <ArrowLeft size={22} className="text-gray-700 dark:text-gray-300" />
            </button>

            <form onSubmit={handleSubmit} className="flex-1">
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#f8f5f1] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                )}
              </div>
            </form>

            {searched && (
              <button className="flex-shrink-0 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <SlidersHorizontal size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Initial state: no search yet */}
        {!searched && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              {t('search.categories_label')}
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleQuickSearch(cat.name)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary hover:bg-orange-50 dark:hover:bg-gray-800 transition-all"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[0.85] rounded-[1.75rem]" />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {products.length > 0
                ? t('search.results_count', { count: products.length, query: searchParams.get("q") })
                : t('search.no_results', { query: searchParams.get("q") })}
            </p>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} showPromo />
                ))}
              </div>
            ) : (
              <div className="mt-10 flex flex-col items-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 dark:bg-gray-800">
                  <Search size={36} className="text-primary/60" />
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('search.empty_title')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  {t('search.empty_description')}
                </p>
                <button
                  onClick={() => navigate("/categories")}
                  className="mt-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90"
                >
                  {t('search.empty_button')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
