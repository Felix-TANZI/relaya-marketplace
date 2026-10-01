import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Search, SlidersHorizontal, ChevronDown, ChevronUp,
  ArrowUpDown, Star, Tag, Package, Lightbulb, Clock, X, Mic,
  ShoppingBag, Heart, ShoppingCart,
} from "lucide-react";
import { productsApi, type Category, type Product, type ProductListResponse, type SearchMeta } from "@/services/api/products";
import { searchMockProducts, MOCK_PRODUCTS } from "@/lib/mockProducts";
import { useCart } from "@/context/CartContext";
import { isFavoriteProduct, toggleFavoriteProduct } from "@/lib/favorites";
import { hasValidAccessToken } from "@/lib/authTokens";
import { customerApi } from "@/services/api/customer";

type SortKey = "relevance" | "price_asc" | "price_desc" | "newest";

const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: "relevance", labelKey: "cl4_search.sort_relevance" },
  { key: "price_asc", labelKey: "cl4_search.sort_price_asc" },
  { key: "price_desc", labelKey: "cl4_search.sort_price_desc" },
  { key: "newest", labelKey: "cl4_search.sort_newest" },
];

const PRICE_PRESETS = [
  { labelKey: "cl4_search.price_preset_under_5k", min: 0, max: 5000 },
  { labelKey: "cl4_search.price_preset_5_15k", min: 5000, max: 15000 },
  { labelKey: "cl4_search.price_preset_15_50k", min: 15000, max: 50000 },
  { labelKey: "cl4_search.price_preset_over_50k", min: 50000, max: 9999999 },
];

/* Historique de recherche — conservé en localStorage, aucune API dédiée
   n'existe côté backend pour ça. On garde jusqu'à 10 entrées, on en affiche 3. */
const SEARCH_HISTORY_KEY = "belivay_search_history";
const MAX_HISTORY_ENTRIES = 10;
const HISTORY_DISPLAY_COUNT = 3;

type SearchHistoryEntry = { query: string; createdAt: string };

function readSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSearchHistory(entries: SearchHistoryEntry[]) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* stockage indisponible (navigation privée, quota…) : l'historique reste en mémoire pour la session en cours */
  }
}

function pushSearchHistory(query: string): SearchHistoryEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return readSearchHistory();
  const existing = readSearchHistory().filter(
    (entry) => entry.query.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [{ query: trimmed, createdAt: new Date().toISOString() }, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  writeSearchHistory(next);
  return next;
}

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
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type SpeechRecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

interface SpeechRecognitionLike {
  lang: string;
  onresult: (event: SpeechRecognitionResultEvent) => void;
  start: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function productImage(product: Product) {
  return (
    product.images?.find((img) => img.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    product.media?.find((media) => media.media_type === "image")?.url
  );
}

/** Ligne de résultat — liste à une colonne (vignette carrée + texte), au lieu
 * de la grille à 2 colonnes utilisée ailleurs dans le catalogue. */
function SearchResultRow({ product }: { product: Product }) {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [isFavorite, setIsFavorite] = useState(() => isFavoriteProduct(product.id));

  useEffect(() => {
    const sync = () => setIsFavorite(isFavoriteProduct(product.id));
    window.addEventListener("belivay-favorites-updated", sync);
    return () => window.removeEventListener("belivay-favorites-updated", sync);
  }, [product.id]);

  const finalPrice = product.price_final ?? product.price_xaf;
  const inStock = product.stock_quantity ? product.stock_quantity > 0 : true;
  const image = productImage(product);
  const productUrl = `/product/${product.master_slug ?? product.id}`;

  const handleToggleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault();
    const nextIds = toggleFavoriteProduct(product.id);
    const nextIsFavorite = nextIds.includes(product.id);
    setIsFavorite(nextIsFavorite);
    if (!hasValidAccessToken()) return;
    try {
      if (nextIsFavorite) {
        await customerApi.addFavorite(product.id);
        return;
      }
      const favorites = await customerApi.getFavorites();
      const favorite = favorites.find((item) => item.product.id === product.id);
      if (favorite) await customerApi.removeFavorite(favorite.id);
    } catch {
      const reverted = toggleFavoriteProduct(product.id);
      setIsFavorite(reverted.includes(product.id));
    }
  };

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    if (!inStock) return;
    addItem({
      id: product.id,
      master_id: product.master ?? undefined,
      name: product.title,
      price: finalPrice,
      quantity: 1,
      image,
    });
  };

  return (
    <Link
      to={productUrl}
      className="flex gap-3 border-b border-gray-100 bg-white px-3 py-3 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
    >
      <div className="relative h-[84px] w-[84px] flex-shrink-0 overflow-hidden rounded-xl bg-[#fff7ef] dark:bg-gray-800">
        {image ? (
          <img src={image} alt={product.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-primary/40">
            <ShoppingBag size={24} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[13.5px] font-bold leading-snug text-gray-900 dark:text-white">
            {product.title}
          </h3>
          <span
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              inStock
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {inStock ? t("cl4_search.in_stock_badge") : t("product_card.sold_out")}
          </span>
        </div>

        <p className="mt-1.5 text-[15px] font-black text-primary">
          {finalPrice.toLocaleString("fr-FR")} FCFA
        </p>

        {/* Pas de ligne logistique ("Livraison à domicile" / "+900F de retrait") :
            le backend n'expose pas encore de type de livraison ni de distance par
            produit pour ce compte démo. On omet plutôt que d'inventer une valeur. */}

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? t("product_detail.removed_from_favorites") : t("product_detail.add_to_favorites")}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-pink-300 hover:text-pink-500 dark:border-gray-700"
          >
            <Heart size={13} className={isFavorite ? "fill-pink-500 text-pink-500" : ""} />
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock}
            className="flex h-7 flex-shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-bold text-white transition disabled:bg-gray-300"
          >
            <ShoppingCart size={12} />
            {inStock ? t("product_card.add_to_cart") : t("product_card.unavailable")}
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);

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

  useEffect(() => {
    setSearchHistory(readSearchHistory());
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const response: ProductListResponse = await productsApi.list({ search: q, page_size: 40 });
      const results = response.results ?? [];
      setSearchMeta(response.search_meta ?? null);
      setProducts(results.length > 0 ? results : searchMockProducts(q));
    } catch {
      setSearchMeta(null);
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
      setSearchHistory(pushSearchHistory(q));
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

  const submitSearch = (value?: string) => {
    const trimmed = (value ?? query).trim();
    const params: Record<string, string> = {};
    if (trimmed) params.q = trimmed;
    if (selectedCategoryLabel) params.category_label = selectedCategoryLabel;
    setSearchParams(params);
  };

  const handleSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") submitSearch();
  };

  const clearSearchInput = () => {
    setQuery("");
    setSearchParams({});
  };

  const handleVoiceSearch = () => {
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      submitSearch(transcript);
    };
    rec.start();
  };

  const removeHistoryItem = (historyQuery: string) => {
    const next = readSearchHistory().filter((entry) => entry.query !== historyQuery);
    writeSearchHistory(next);
    setSearchHistory(next);
  };

  const clearHistory = () => {
    writeSearchHistory([]);
    setSearchHistory([]);
  };

  const displayedHistory = searchHistory.slice(0, HISTORY_DISPLAY_COUNT);

  return (
    /* Mode plein écran dédié : pas de header/logo/panier/avatar du site — cet
       overlay se pose au-dessus du chrome global (header fixe + bandeau pub)
       plutôt que de modifier AppLayout, pour ne rien casser sur les autres pages. */
    <div className="fixed inset-0 z-[65] flex flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 overflow-y-auto">
        {/* ── Barre du haut : retour + champ de recherche ── */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={t("cl4_search.back_aria")}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex h-11 flex-1 items-center overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <span className="pl-3 text-gray-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKey}
                placeholder={t("header.search_placeholder") ?? undefined}
                aria-label={t("cl4_search.search_input_aria")}
                autoFocus
                className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              />
              {query ? (
                <button
                  type="button"
                  onClick={clearSearchInput}
                  aria-label={t("cl4_search.clear_search_aria")}
                  className="flex h-full flex-shrink-0 items-center px-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleVoiceSearch}
                aria-label={t("cl4_search.voice_search_aria")}
                className="flex h-full flex-shrink-0 items-center px-2.5 text-gray-400 hover:text-primary"
              >
                <Mic size={16} />
              </button>
              <button
                type="button"
                onClick={() => submitSearch()}
                aria-label={t("header.run_search")}
                className="flex h-full w-12 flex-shrink-0 items-center justify-center bg-primary text-white transition hover:bg-primary-dark"
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-3 py-4">
          {!searched ? (
            /* ── Avant toute recherche : historique + suggestions ── */
            <div>
              {displayedHistory.length > 0 && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gray-400">
                      {t("cl4_search.history_heading")}
                    </p>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-[12px] font-bold text-primary hover:underline"
                    >
                      {t("cl4_search.history_clear")}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white px-3 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                    {displayedHistory.map((entry) => (
                      <div key={entry.query} className="flex items-center justify-between gap-2 py-3">
                        <button
                          type="button"
                          onClick={() => submitSearch(entry.query)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <Clock size={16} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate text-[14px] font-semibold text-gray-800 dark:text-gray-100">
                            {entry.query}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryItem(entry.query)}
                          aria-label={t("cl4_search.history_remove_aria")}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pas de section "Recherché dans ta zone" : nécessiterait une API de
                  tendances de recherche géolocalisées qui n'existe pas encore côté
                  backend — on ne l'invente pas plutôt que d'afficher de fausses données. */}

              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {t("cl4_search.suggested_searches")}
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setQuery(cat.name);
                      setSelectedCategoryLabel("");
                      setSearchParams({ q: cat.name });
                    }}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-primary hover:bg-orange-50 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              {/* ── LEFT FILTER SIDEBAR / panneau flottant mobile ── */}
              <aside
                className={`flex-shrink-0 transition-all duration-200 max-md:fixed max-md:inset-x-3 max-md:top-[78px] max-md:z-[20] max-md:rounded-xl max-md:shadow-2xl ${
                  filterOpen ? "w-[240px] opacity-100 max-md:w-auto" : "w-0 overflow-hidden opacity-0 max-md:pointer-events-none"
                }`}
              >
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" style={{ minWidth: "240px" }}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[13px] font-extrabold text-gray-900 dark:text-white">{t("cl4_search.filters_heading")}</span>
                    {activeFiltersCount > 0 && (
                      <button onClick={resetFilters} className="text-[11px] font-semibold text-primary hover:underline">
                        {t("cl4_search.reset")}
                      </button>
                    )}
                  </div>

                  {/* Prix */}
                  <div className="mb-4 border-b border-gray-100 pb-4 dark:border-gray-800">
                    <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-gray-700 dark:text-gray-300">
                      <Tag size={13} /> {t("cl4_search.price_fcfa")}
                    </p>
                    <div className="mb-2 flex gap-2">
                      <input
                        type="number"
                        placeholder={t("cl4_search.min_placeholder") ?? undefined}
                        value={minPrice}
                        onChange={(e) => {
                          setMinPrice(e.target.value);
                          closeFiltersAfterApply();
                        }}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      />
                      <input
                        type="number"
                        placeholder={t("cl4_search.max_placeholder") ?? undefined}
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
                          key={p.labelKey}
                          onClick={() => applyPricePreset(p.min, p.max)}
                          className="rounded-lg border border-gray-100 px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 transition-all hover:border-primary hover:bg-orange-50 hover:text-primary dark:border-gray-800 dark:text-gray-400 dark:hover:bg-primary/10"
                        >
                          {t(p.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catégorie */}
                  {categories.length > 0 && (
                    <div className="mb-4 border-b border-gray-100 pb-4 dark:border-gray-800">
                      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-gray-700 dark:text-gray-300">
                        <Package size={13} /> {t("cl4_search.category_heading")}
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
                      <Star size={13} /> {t("cl4_search.min_rating_heading")}
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
                    <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">{t("cl4_search.in_stock_only")}</span>
                  </label>
                </div>
              </aside>

              {/* ── MAIN RESULTS AREA ── */}
              <div className="min-w-0 flex-1">
                {/* Résultats approchants — on explique pourquoi ils diffèrent de la demande. */}
                {searchMeta?.is_fallback && displayedProducts.length > 0 && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3 dark:border-primary/30 dark:bg-primary/10">
                    <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                    <p className="text-[12.5px] font-semibold leading-relaxed text-[#8a5a2b] dark:text-orange-200">
                      {searchMeta.mode === "fuzzy" && (
                        <>
                          {t("cl4_search.fallback_fuzzy_prefix")}{" "}
                          <span className="font-extrabold">« {searchMeta.query} »</span>
                          {t("cl4_search.fallback_fuzzy_suffix")}
                        </>
                      )}
                      {searchMeta.mode === "loose" && (
                        <>
                          {t("cl4_search.fallback_loose_prefix")}{" "}
                          <span className="font-extrabold">« {searchMeta.query} »</span>
                          {t("cl4_search.fallback_loose_suffix")}
                        </>
                      )}
                      {searchMeta.mode === "related" && (
                        <>
                          {t("cl4_search.fallback_related_prefix")}{" "}
                          <span className="font-extrabold">« {searchMeta.query} »</span>{" "}
                          {t("cl4_search.fallback_related_middle")}
                          {searchMeta.suggested_category && (
                            <>
                              {" "}:{" "}
                              <span className="font-extrabold">{searchMeta.suggested_category.name}</span>
                            </>
                          )}
                          .
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* Compteur + barre de filtres/tri */}
                <div className="mb-3 flex flex-col gap-3">
                  <p className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">
                    <span className="font-extrabold text-gray-900 dark:text-white">{displayedProducts.length}</span>
                    {" "}{t(displayedProducts.length > 1 ? "cl4_search.results_found_plural" : "cl4_search.results_found")}
                    {query && <> {t("cl4_search.results_for_prefix")} <span className="text-primary">"{query}"</span></>}
                    {selectedCategoryLabel && (
                      <span className="ml-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold text-primary">
                        [{selectedCategoryLabel}]
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    {/* "Filtres" n'apparaît qu'ici, une fois la recherche effectuée (CRE-37) */}
                    <button
                      type="button"
                      onClick={() => setFilterOpen((v) => !v)}
                      className={`relative flex h-[38px] flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-bold transition-all ${
                        filterOpen || activeFiltersCount > 0
                          ? "border-primary bg-orange-50 text-primary dark:bg-primary/10"
                          : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      <SlidersHorizontal size={15} />
                      {t("cl4_search.filters_heading")}
                      {activeFiltersCount > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>

                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setSortOpen((v) => !v)}
                        className="flex h-[38px] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-[12px] font-bold text-gray-700 transition-all hover:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        <ArrowUpDown size={13} />
                        {t(SORT_OPTIONS.find((o) => o.key === sort)?.labelKey ?? "")}
                        {sortOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {sortOpen && (
                        <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
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
                              {t(o.labelKey)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Loading */}
                {loading && (
                  <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex gap-3 border-b border-gray-100 bg-white p-3 last:border-b-0 dark:border-gray-800 dark:bg-gray-900">
                        <div className="h-[84px] w-[84px] flex-shrink-0 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                          <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                          <div className="h-5 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results — liste à 1 colonne */}
                {!loading && (
                  displayedProducts.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                      {displayedProducts.map((product) => (
                        <SearchResultRow key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-16 flex flex-col items-center gap-4 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 dark:bg-gray-800">
                        <Search size={36} className="text-primary/60" />
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("cl4_search.no_results_title")}
                      </p>
                      <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
                        {t("cl4_search.no_results_desc")}
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={resetFilters}
                          className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-orange-700"
                        >
                          {t("cl4_search.reset_filters_button")}
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
