import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, SlidersHorizontal, ChevronDown, ChevronUp,
  ArrowUpDown, Star, Tag, Package,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Category, type Product, type ProductListResponse } from "@/services/api/products";
import { searchMockProducts, MOCK_PRODUCTS } from "@/lib/mockProducts";

type SortKey = "relevance" | "price_asc" | "price_desc" | "newest";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Pertinence" },
  { key: "price_asc", label: "Prix croissant" },
  { key: "price_desc", label: "Prix décroissant" },
  { key: "newest", label: "Plus récents" },
];

const PRICE_PRESETS = [
  { label: "Moins de 5 000 F", min: 0, max: 5000 },
  { label: "5 000 – 15 000 F", min: 5000, max: 15000 },
  { label: "15 000 – 50 000 F", min: 15000, max: 50000 },
  { label: "Plus de 50 000 F", min: 50000, max: 9999999 },
];

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const arr = [...products];
  if (sort === "price_asc")  return arr.sort((a, b) => (a.price_xaf ?? 0) - (b.price_xaf ?? 0));
  if (sort === "price_desc") return arr.sort((a, b) => (b.price_xaf ?? 0) - (a.price_xaf ?? 0));
  if (sort === "newest")     return arr.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  return arr;
}

function normalizeValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [query, setQuery]         = useState(searchParams.get("q") ?? "");
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState(
    searchParams.get("category_label") ?? "",
  );
  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [sort, setSort]           = useState<SortKey>("relevance");
  const [sortOpen, setSortOpen]   = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  /* ── Filter state ── */
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selCat, setSelCat]     = useState<number | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [inStock, setInStock]   = useState(false);

  const closeFiltersAfterApply = () => {
    if (window.innerWidth < 768) setFilterOpen(false);
  };

  /* ── Categories ── */
  useEffect(() => {
    productsApi.listCategories({ page_size: 20 })
      .then((res) => {
        const cats = res.results ?? [];
        if (cats.length > 0) { setCategories(cats); return; }
        throw new Error("empty");
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

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const response: ProductListResponse = await productsApi.list({ search: q, page_size: 40 });
      const results = response.results ?? [];
      setProducts(results.length > 0 ? results : searchMockProducts(q));
    } catch {
      setProducts(searchMockProducts(q));
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Sync URL ── */
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const categoryLabel = searchParams.get("category_label") ?? "";
    setQuery(q);
    setSelectedCategoryLabel(categoryLabel);
    if (q.trim()) {
      runSearch(q);
      return;
    }
    setProducts([]);
    setSearched(false);
  }, [searchParams, runSearch]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const applyPricePreset = (min: number, max: number) => {
    setMinPrice(String(min));
    setMaxPrice(max === 9999999 ? "" : String(max));
    closeFiltersAfterApply();
  };

  /* ── Filter + sort products ── */
  const displayedProducts = (() => {
    let list = [...products];
    if (selCat !== null) list = list.filter((p) => p.category?.id === selCat);
    if (selectedCategoryLabel) {
      const expected = normalizeValue(selectedCategoryLabel);
      list = list.filter((p) =>
        normalizeValue(p.category?.name ?? "").includes(expected),
      );
    }
    const mn = parseFloat(minPrice);
    const mx = parseFloat(maxPrice);
    if (!isNaN(mn)) list = list.filter((p) => (p.price_xaf ?? 0) >= mn);
    if (!isNaN(mx)) list = list.filter((p) => (p.price_xaf ?? 0) <= mx);
    if (inStock)    list = list.filter((p) => (p.stock_quantity ?? 1) > 0);
    if (minRating > 0) list = list.filter((p) => (p.rating_average ?? 0) >= minRating);
    return sortProducts(list, sort);
  })();

  const activeFiltersCount = [
    selCat !== null,
    minPrice !== "" || maxPrice !== "",
    inStock,
    minRating > 0,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelCat(null); setMinPrice(""); setMaxPrice(""); setInStock(false); setMinRating(0);
    setFilterOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex gap-4">

          {/* ── LEFT FILTER SIDEBAR ── */}
          <aside
            className={`flex-shrink-0 transition-all duration-200 max-md:fixed max-md:inset-x-3 max-md:top-[82px] max-md:z-[60] max-md:rounded-xl max-md:shadow-2xl ${
              filterOpen ? "w-[240px] opacity-100 max-md:w-auto" : "w-0 overflow-hidden opacity-0 max-md:pointer-events-none"
            }`}
          >
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" style={{ minWidth: "240px" }}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-gray-900 dark:text-white">Filtres</span>
                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters} className="text-[11px] font-semibold text-primary hover:underline">
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* Prix */}
              <div className="mb-4 border-b border-gray-100 pb-4 dark:border-gray-800">
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-gray-700 dark:text-gray-300">
                  <Tag size={13} /> Prix (FCFA)
                </p>
                <div className="mb-2 flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      closeFiltersAfterApply();
                    }}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      closeFiltersAfterApply();
                    }}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {PRICE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyPricePreset(p.min, p.max)}
                      className="rounded-lg border border-gray-100 px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 transition-all hover:border-primary hover:bg-orange-50 hover:text-primary dark:border-gray-800 dark:text-gray-400 dark:hover:bg-primary/10"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catégorie */}
              {categories.length > 0 && (
                <div className="mb-4 border-b border-gray-100 pb-4 dark:border-gray-800">
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-gray-700 dark:text-gray-300">
                    <Package size={13} /> Catégorie
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelCat(selCat === cat.id ? null : cat.id);
                          closeFiltersAfterApply();
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-left text-[11.5px] font-semibold transition-all ${
                          selCat === cat.id
                            ? "bg-orange-50 text-primary dark:bg-primary/10"
                            : "text-gray-600 hover:bg-gray-50 hover:text-primary dark:text-gray-400 dark:hover:bg-gray-800"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Note minimale */}
              <div className="mb-4 border-b border-gray-100 pb-4 dark:border-gray-800">
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-gray-700 dark:text-gray-300">
                  <Star size={13} /> Note minimale
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setMinRating(minRating === n ? 0 : n);
                        closeFiltersAfterApply();
                      }}
                      className={`flex items-center justify-center rounded-lg border px-2 py-1 text-[11px] font-bold transition-all ${
                        minRating >= n
                          ? "border-amber-300 bg-amber-50 text-amber-600 dark:bg-amber-900/20"
                          : "border-gray-200 text-gray-400 hover:border-amber-300 dark:border-gray-700"
                      }`}
                    >
                      {n}★
                    </button>
                  ))}
                </div>
              </div>

              {/* En stock */}
              <label className="flex cursor-pointer items-center gap-2">
                <div
                  onClick={() => {
                    setInStock((v) => !v);
                    closeFiltersAfterApply();
                  }}
                  className={`relative h-5 w-9 rounded-full transition-colors ${inStock ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${inStock ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </div>
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">En stock uniquement</span>
              </label>
            </div>
          </aside>

          {/* ── MAIN RESULTS AREA ── */}
          <div className="min-w-0 flex-1">

            {/* Pas encore cherché */}
            {!searched && (
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Recherches suggérées
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setQuery(cat.name);
                        setSelectedCategoryLabel("");
                        setSearchParams({ q: cat.name });
                        runSearch(cat.name);
                      }}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-primary hover:bg-orange-50 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[0.85] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            )}

            {/* Results */}
            {!loading && searched && (
              <>
                {/* Sort bar */}
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">
                      <span className="font-extrabold text-gray-900 dark:text-white">{displayedProducts.length}</span>
                      {" "}résultat{displayedProducts.length !== 1 ? "s" : ""} trouvé{displayedProducts.length !== 1 ? "s" : ""}
                      {query && <> pour <span className="text-primary">"{query}"</span></>}
                    </p>
                    {selectedCategoryLabel && (
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold text-primary">
                        [{selectedCategoryLabel}]
                      </span>
                    )}
                  </div>

                  <div className="order-first flex items-center gap-2 sm:order-none">
                    <button
                      type="button"
                      onClick={() => setFilterOpen((v) => !v)}
                      className={`relative flex h-[38px] flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-bold transition-all ${
                        filterOpen || activeFiltersCount > 0
                          ? "border-primary bg-orange-50 text-primary dark:bg-primary/10"
                          : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <SlidersHorizontal size={15} />
                      <span className="hidden sm:inline">Filtres</span>
                      {activeFiltersCount > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setSortOpen((v) => !v)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-bold text-gray-700 transition-all hover:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        <ArrowUpDown size={13} />
                        {SORT_OPTIONS.find((o) => o.key === sort)?.label}
                        {sortOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {sortOpen && (
                        <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                          {SORT_OPTIONS.map((o) => (
                            <button
                              key={o.key}
                              onClick={() => { setSort(o.key); setSortOpen(false); }}
                              className={`w-full px-4 py-2.5 text-left text-[12.5px] font-semibold transition-all first:rounded-t-xl last:rounded-b-xl ${
                                sort === o.key
                                  ? "bg-orange-50 text-primary dark:bg-primary/10"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                              }`}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {displayedProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {displayedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} showPromo />
                    ))}
                  </div>
                ) : (
                  <div className="mt-16 flex flex-col items-center gap-4 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 dark:bg-gray-800">
                      <Search size={36} className="text-primary/60" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      Aucun résultat trouvé
                    </p>
                    <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
                      Essayez avec d'autres mots-clés ou réinitialisez les filtres.
                    </p>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-700"
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
