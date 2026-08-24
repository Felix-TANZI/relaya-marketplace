import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PromoCarousel from "@/components/PromoCarousel";
import HomeSection from "@/components/HomeSection";
import TrustBannersStrip from "@/components/home/TrustBannersStrip";
import FlashPanel from "@/components/home/FlashPanel";
import FlashPromoBanner from "@/components/home/FlashPromoBanner";
import SectionBanner from "@/components/home/SectionBanner";
import WhyBelivaySection from "@/components/home/WhyBelivaySection";
import CategorySidebar from "@/components/home/CategorySidebar";
import ProductCard from "@/components/product/ProductCard";
import {
  ArrowRight, LayoutGrid, ShoppingCart, ShieldCheck, Star, Truck,
  Flame, Sparkles, Globe, Zap, Timer, Gem,
} from "lucide-react";
import {
  V29_PRODUCTS,
  FLASH_DEALS,
  getByCat,
  getTopProducts,
  getNewProducts,
} from "@/data/v29Products";
import { productsApi, type Product } from "@/services/api/products";
import {
  CATEGORY_THEMES,
  HERO_MIN_HEIGHT,
  getCategoryTheme,
  matchesCategory,
} from "@/data/categoryThemes";
import useSidebarTrack from "@/hooks/useSidebarTrack";

type SortKey = "relevance" | "price-asc" | "price-desc" | "rating" | "newest";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Pertinence" },
  { key: "price-asc", label: "Prix croissant" },
  { key: "price-desc", label: "Prix décroissant" },
  { key: "rating", label: "Mieux notés" },
  { key: "newest", label: "Plus récents" },
];

/* Liens produits des Flash Deals mock (aligné sur FlashPanel) */
const FLASH_LINK: Record<string, number> = {
  "Ensemble Wax 3 Pièces": 9,
  "Laptop HP Intel i5": 10,
  "Coffret Beauté Naturelle": 3,
  "Chaussures Sport Running": 18,
  "Pagne Hollandais Vlisco": 28,
};

export default function HomePage() {
  const navigate = useNavigate();
  const { mainRef, trackTop: mainTop, trackHeight: mainHeight, topOffset } = useSidebarTrack();
  const [activeCat, setActiveCat] = useState("all");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [lastCat, setLastCat] = useState(activeCat);
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [usingMockProducts, setUsingMockProducts] = useState(true);

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
        if (!cancelled) {
          setApiProducts([]);
          setUsingMockProducts(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sourceProducts = usingMockProducts ? V29_PRODUCTS : apiProducts;

  const allFiltered = useMemo(
    () => {
      if (usingMockProducts) {
        return activeCat === "all" ? V29_PRODUCTS : getByCat(activeCat);
      }

      if (activeCat === "all") return sourceProducts;

      return sourceProducts.filter((product) => matchesCategory(product, activeCat));
    },
    [activeCat, sourceProducts, usingMockProducts]
  );

  const sortedProducts = useMemo(() => {
    const items = [...allFiltered];
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
      default:
        return items;
    }
  }, [allFiltered, sort]);

  const visibleProducts = useMemo(
    () => sortedProducts.slice(0, visibleCount),
    [sortedProducts, visibleCount]
  );

  /* La grille est coupée en trois blocs, séparés par les bandeaux Premium. */
  const productChunks = useMemo(() => {
    const firstCut = Math.min(8, visibleProducts.length);
    const secondCut = Math.min(firstCut + 8, visibleProducts.length);
    return [
      visibleProducts.slice(0, firstCut),
      visibleProducts.slice(firstCut, secondCut),
      visibleProducts.slice(secondCut),
    ];
  }, [visibleProducts]);
  const hasMoreProducts = visibleCount < sortedProducts.length;

  /* CSS fixed-top offset */
  useEffect(() => {
    document.documentElement.style.setProperty("--belivay-fixed-top", "100px");
  }, []);

  // Reset pagination when the active category changes (during render, no effect).
  if (activeCat !== lastCat) {
    setLastCat(activeCat);
    setVisibleCount(20);
  }

  /* ── Carousel slides ──
     Chaque frame ouvre la page du thème correspondant (/categorie/:slug). Les deux frames
     éditoriales n'ont pas de catégorie propre : la frame de marque mène à « Tout voir »,
     et « Made in Cameroon » au Supermarché, qui porte le sous-thème du même nom. */
  const slides = [
    {
      label: "CEMAC · CMR · Gabon · RCA · Tchad",
      title: "Achetez en toute confiance au Cameroun & Afrique centrale",
      subtitle: "MoMo sécurisé · Vendeurs certifiés · Escrow BelivaY · Remboursement 7j",
      bg: "url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&h=500&fit=crop&q=85) center/cover",
      labelBg: "rgba(244,121,32,0.9)",
      action: () => navigate("/categorie/all"),
    },
    { label: "Mode Femme", title: "Robes · Pagnes · Wax Premium", subtitle: "3 400 produits · Vendeurs certifiés BelivaY", bg: "url(https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=1400&h=500&fit=crop&q=85) center/cover", action: () => navigate("/categorie/femme") },
    { label: "Électronique", title: "Smartphones & Accessoires", subtitle: "Livraison gratuite dès 30 000 FCFA · Vendeurs certifiés Or", bg: "url(https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#2563EB", action: () => navigate("/categorie/tech") },
    { label: "Beauté & Soins", title: "Cosmétiques & Soins Authentiques", subtitle: "2 600 produits vérifiés · Livraison express", bg: "url(https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#e11d48", action: () => navigate("/categorie/beaute") },
    { label: "Made in Cameroon", title: "Produits artisanaux locaux", subtitle: "Soutenez les PME camerounaises · Certifié BelivaY", bg: "url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#059669", action: () => navigate("/categorie/super") },
    { label: "Maison & Déco", title: "Aménagez votre intérieur", subtitle: "1 720 produits · Meubles · Déco · Électroménager", bg: "url(https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#78716c", action: () => navigate("/categorie/maison") },
    { label: "Mode Homme", title: "Bazin · Costume · Chemise Brodée", subtitle: "2 100 produits · Tenues de cérémonie et casual", bg: "url(https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#1D4ED8", action: () => navigate("/categorie/homme") },
    { label: "Chaussures", title: "Sneakers · Escarpins · Sandales", subtitle: "1 100 produits · Toutes pointures disponibles", bg: "url(https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#7C3AED", action: () => navigate("/categorie/shoes") },
  ];

  /* ── Featured sections (horizontal scroll, top of page) ── */
  const popular = useMemo(() => {
    if (usingMockProducts) {
      return activeCat === "all" ? getTopProducts() : getByCat(activeCat);
    }

    return [...allFiltered]
      .sort((a, b) => (((b.discount_percent ?? b.discount ?? 0) * 1000) + (b.reviews_count ?? 0)) - (((a.discount_percent ?? a.discount ?? 0) * 1000) + (a.reviews_count ?? 0)))
      .slice(0, 24);
  }, [activeCat, allFiltered, usingMockProducts]);

  /* Chiffres du bandeau promotions, calculés sur le catalogue réellement affiché. */
  const promoStats = useMemo(() => {
    const discountOf = (product: { discount_percent?: number; discount?: number }) =>
      product.discount_percent ?? product.discount ?? 0;

    const onPromotion = sourceProducts.filter((product) => discountOf(product) > 0);

    // Dates brutes uniquement : c'est le bandeau qui lira l'horloge, dans un effet.
    const endDates = onPromotion
      .map((product) => product.promo_end_date)
      .filter((date): date is string => Boolean(date))
      .map((date) => new Date(date).getTime())
      .filter((time) => Number.isFinite(time))
      .sort((a, b) => a - b);

    return {
      count: onPromotion.length,
      maxDiscount: onPromotion.reduce((max, product) => Math.max(max, discountOf(product)), 0),
      endDates,
    };
  }, [sourceProducts]);

  const newProds = useMemo(() => {
    if (usingMockProducts) return getNewProducts();

    return [...sourceProducts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
  }, [sourceProducts, usingMockProducts]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fff 14%,#f8fafc 100%)] dark:bg-gray-950">
      <div className="mx-auto max-w-[1760px] px-1 pb-12 pt-3 sm:px-2 lg:px-3">
        <div className="flex items-stretch gap-2 xl:gap-3">
          <CategorySidebar
            activeCategory={activeCat}
            onSelectCategory={(slug) => navigate(`/categorie/${slug}`)}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
            trackTop={mainTop}
            trackHeight={mainHeight}
            topOffset={topOffset}
          />

          <main ref={mainRef} className="min-w-0 flex-1 space-y-3 sm:space-y-4">
            <section className="overflow-hidden rounded-[24px] border border-[#f1d2bb] bg-white shadow-[0_16px_42px_rgba(244,121,32,.08)] sm:rounded-[30px] dark:border-gray-800 dark:bg-gray-900">
              {/* Le visuel touche les bords haut, gauche et droite de la frame ;
                  seule la marge basse subsiste, pour ne pas coller à « Explorer ». */}
              <div className="pb-3 sm:pb-4">
                <PromoCarousel
                  slides={slides}
                  autoPlayMs={5000}
                  minHeightClass={HERO_MIN_HEIGHT}
                  roundedClass="rounded-none"
                />
              </div>

              <div className="border-y border-gray-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-900">
                {/* Explorer est hors de la zone scrollable : les thèmes s'arrêtent devant lui. */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("/categories")}
                    className="flex flex-shrink-0 items-center gap-2 rounded-full border border-[#ecd3c1] bg-white py-1.5 pl-1.5 pr-4 text-[12px] font-bold text-gray-700 transition-all hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#fff1e5] text-primary shadow-sm ring-2 ring-white dark:bg-primary/20">
                      <LayoutGrid size={15} />
                    </span>
                    Explorer
                  </button>

                  <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-hide">
                  {CATEGORY_THEMES.map((c) => {
                    const active = activeCat === c.slug;
                    return (
                      <button
                        key={c.slug}
                        onClick={() => setActiveCat(c.slug)}
                        className={`flex flex-shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-[12px] font-bold transition-all ${
                          active
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-[#ecd3c1] bg-white text-gray-700 hover:border-primary hover:bg-[#fff4eb] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        <img
                          src={c.thumb}
                          alt=""
                          loading="lazy"
                          className="h-8 w-8 flex-shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white"
                        />
                        {c.name}
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>

              {/* Stats — icône puis information, sur une seule ligne à toutes les tailles. */}
              <div className="grid grid-cols-2 gap-2 bg-white px-3 py-2.5 sm:px-4 md:grid-cols-4 dark:bg-gray-900">
                {[
                  { icon: ShoppingCart, num: "15 240", label: "Produits", tint: "#fff1e5", color: "#F47920" },
                  { icon: ShieldCheck, num: "3 200", label: "Vendeurs certifiés", tint: "#e7f8ee", color: "#059669" },
                  { icon: Star, num: "4.8 / 5", label: "Note moyenne", tint: "#fff4d9", color: "#F59E0B" },
                  { icon: Truck, num: "24–72h", label: "Livraison", tint: "#fff1e5", color: "#F47920" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex cursor-default items-center gap-2 rounded-2xl border border-[#f3e4d7] bg-[#fffaf6] p-2 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:border-[#f0c9a8] hover:shadow-[0_8px_20px_rgba(244,121,32,.14)] dark:border-gray-800 dark:bg-gray-800"
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: item.tint, color: item.color }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-black leading-none text-[#c85e14] dark:text-primary">{item.num}</p>
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-[#8a6b55] dark:text-gray-400">{item.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ═══ Catégories — mobile uniquement (la sidebar PC est masquée < lg) ═══ */}
            <section className="rounded-[22px] border border-[#f1d2bb] bg-white p-3 shadow-[0_10px_30px_rgba(244,121,32,.06)] lg:hidden dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="h-[16px] w-[3px] rounded bg-primary" />
                <LayoutGrid size={15} className="text-primary" />
                <h3 className="text-[14px] font-extrabold text-gray-900 dark:text-white">Catégories</h3>
                <button
                  onClick={() => navigate("/categories")}
                  className="ml-auto text-[11px] font-bold text-[#c85e14] dark:text-primary"
                >
                  Tout voir
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                {CATEGORY_THEMES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <Link
                      key={c.slug}
                      to={`/categorie/${c.slug}`}
                      className="flex w-[60px] flex-shrink-0 flex-col items-center gap-1.5"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f0e0d2] bg-[#fffaf6] text-[#b5703f] transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        <Icon size={20} />
                      </span>
                      <span className="text-center text-[10.5px] font-bold leading-tight text-gray-600 dark:text-gray-400">
                        {c.shortName}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* ═══ Flash Deals — mobile/tablette (le panneau PC est masqué < xl) ═══ */}
            <section className="overflow-hidden rounded-[22px] border border-[#f3d0cf] bg-[linear-gradient(180deg,#fff4f4,#fff)] p-3 shadow-[0_10px_30px_rgba(239,68,68,.06)] xl:hidden dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0e6] text-primary dark:bg-primary/10">
                  <Zap size={15} fill="currentColor" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Offres rapides</p>
                  <h3 className="text-[14px] font-extrabold text-gray-900 dark:text-white">Flash Deals</h3>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#111827] px-2.5 py-1 text-[10px] font-bold text-white">
                  <Timer size={11} className="text-primary" />
                  Stock limité
                </span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
                {FLASH_DEALS.map((d) => {
                  const oldN = Number(d.old.replace(/\s/g, ""));
                  const newN = Number(d.price.replace(/\s/g, ""));
                  const pct = oldN > 0 ? Math.round(((oldN - newN) / oldN) * 100) : 0;
                  const linkId = FLASH_LINK[d.name];
                  return (
                    <button
                      key={d.name}
                      onClick={() => navigate(linkId ? `/product/${linkId}?mock=1` : "/promotions")}
                      className="flex w-[150px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-[#f0e0d8] bg-white text-left dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="relative h-[110px] w-full">
                        <img src={d.img} alt={d.name} loading="lazy" className="h-full w-full object-cover" />
                        {pct > 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                            -{pct}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-2.5">
                        <p className="line-clamp-2 text-[11.5px] font-semibold leading-tight text-gray-800 dark:text-gray-100">{d.name}</p>
                        <div className="mt-auto">
                          <p className="text-[13px] font-black text-[#c85e14] dark:text-primary">
                            {d.price} <span className="text-[10px] font-semibold">FCFA</span>
                          </p>
                          <p className="text-[10px] font-medium text-gray-400 line-through">{d.old} FCFA</p>
                        </div>
                        <span className="text-[9.5px] font-bold text-red-500">Plus que {d.stock} en stock</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <FlashPromoBanner
              count={promoStats.count}
              maxDiscount={promoStats.maxDiscount}
              endDates={promoStats.endDates}
            />

            <TrustBannersStrip />

            {/* Tri du catalogue de l'accueil — aligné à gauche, comme une barre d'outils. */}
            <div className="flex items-center gap-2.5 rounded-[18px] border border-[#eef2f7] bg-[#f7f8fa] px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">
              <label
                htmlFor="home-sort"
                className="text-[12px] font-semibold text-gray-500 dark:text-gray-400"
              >
                Trier :
              </label>
              <select
                id="home-sort"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as SortKey);
                  setVisibleCount(20);
                }}
                className="rounded-lg border border-[#e3e7ee] bg-white px-3 py-1.5 text-[12.5px] font-bold text-gray-800 outline-none transition hover:border-primary focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <section className="rounded-[22px] border border-[#f4d9dd] bg-[linear-gradient(180deg,#fff5f6,#fff)] p-3 shadow-[0_12px_32px_rgba(15,23,42,.05)] sm:rounded-[28px] sm:p-4 dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
              <HomeSection
                title="Produits populaires"
                icon={Flame}
                badge={`${sourceProducts.length} produits`}
                badgeColor="bg-red-50 text-red-600"
                products={popular}
                rows={2}
                isMockProducts={usingMockProducts}
              />
            </section>

            <section className="rounded-[22px] border border-[#d8eadb] bg-[linear-gradient(180deg,#f6fff8,#fff)] p-3 shadow-[0_12px_32px_rgba(15,23,42,.05)] sm:rounded-[28px] sm:p-4 dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
              <HomeSection
                title="Nouveaux Arrivages"
                icon={Sparkles}
                badge="Nouveau"
                badgeColor="bg-green-50 text-green-700"
                products={newProds}
                rows={1}
                isMockProducts={usingMockProducts}
              />
            </section>

            <section className="overflow-hidden rounded-[22px] border border-[#dbe7f3] bg-[linear-gradient(180deg,#f7fbff,#fff)] p-3 shadow-[0_12px_32px_rgba(15,23,42,.05)] sm:rounded-[28px] sm:p-4 dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0f172a)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-[18px] w-[3px] rounded bg-primary" />
                  <Globe size={16} className="text-primary" />
                  <div>
                    <h3 className="text-[16px] font-extrabold text-gray-900 dark:text-white">
                      {activeCat === "all" ? "Catalogue de l'accueil" : getCategoryTheme(activeCat)?.name ?? activeCat}
                    </h3>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400">
                      Sélection finie pour garder le footer visible et une lecture claire de la page.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#e9f2fb] px-3 py-1 text-[11px] font-bold text-[#2b6aa6] dark:bg-gray-800 dark:text-blue-300">
                  {allFiltered.length} produits au total
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {productChunks[0].length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                    {productChunks[0].map((p) => (
                      <ProductCard key={p.id} product={p} showPromo compact isMock={usingMockProducts} />
                    ))}
                  </div>
                ) : null}

                <SectionBanner
                  to="/premium"
                  className="-mx-3 sm:-mx-4"
                  ariaLabel="BelivaY Premium — cashback 5 % et livraison prioritaire, s'inscrire"
                  title="BelivaY Premium"
                  badge="Sponso"
                  subtitle="Cashback 5% + livraison prioritaire 24h"
                  icon={Gem}
                  iconAnimation="animate-gem-sparkle"
                  iconClassName="text-amber-200 drop-shadow-[0_0_6px_rgba(253,224,71,.7)]"
                  gradient="linear-gradient(100deg,#3B0F76 0%,#4C1D95 20%,#5B21B6 44%,#7C3AED 72%,#9F7AEA 100%)"
                  shadow="0 14px 36px rgba(76,29,149,.38)"
                  watermark={["PREMIUM", "CASHBACK", "BELIVAY", "VIP", "PRIORITE", "MEMBRE"]}
                />

                {productChunks[1].length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                    {productChunks[1].map((p) => (
                      <ProductCard key={p.id} product={p} showPromo compact isMock={usingMockProducts} />
                    ))}
                  </div>
                ) : null}

                <SectionBanner
                  to="/selection-premium"
                  className="-mx-3 sm:-mx-4"
                  ariaLabel="Sélection Premium — les produits les mieux notés"
                  title="Sélection Premium"
                  badge="Curated"
                  subtitle="Sélection Premium · Produits triés sur le volet"
                  icon={Star}
                  iconAnimation="animate-gem-sparkle"
                  iconClassName="text-amber-100 drop-shadow-[0_0_6px_rgba(253,230,138,.8)]"
                  gradient="linear-gradient(100deg,#5C2C06 0%,#7C3E08 18%,#A85B0A 44%,#D97706 72%,#F5A623 92%,#FBBF24 100%)"
                  shadow="0 14px 36px rgba(124,45,18,.36)"
                  watermark={["SELECTION", "TOP NOTE", "BELIVAY", "CURATED", "5 ETOILES", "ELITE"]}
                />

                {productChunks[2].length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                    {productChunks[2].map((p) => (
                      <ProductCard key={p.id} product={p} showPromo compact isMock={usingMockProducts} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex justify-center">
                {hasMoreProducts ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => Math.min(count + 20, sortedProducts.length))}
                    className="inline-flex items-center gap-2 rounded-full border border-[#cfe1f2] bg-white px-5 py-3 text-sm font-bold text-[#245f95] transition hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-blue-300"
                  >
                    Voir plus d'articles
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <span className="rounded-full border border-[#d6e5f2] bg-white px-5 py-3 text-sm font-bold text-[#5e7891] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Tous les articles de cette sélection sont affichés
                  </span>
                )}
              </div>
            </section>

            <WhyBelivaySection />
          </main>

          <FlashPanel trackTop={mainTop} trackHeight={mainHeight} topOffset={topOffset} />
        </div>
      </div>
    </div>
  );
}