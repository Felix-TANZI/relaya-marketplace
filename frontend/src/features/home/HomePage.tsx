import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PromoCarousel from "@/components/PromoCarousel";
import HomeSection from "@/components/HomeSection";
import TrustBannersStrip from "@/components/home/TrustBannersStrip";
import FlashPanel from "@/components/home/FlashPanel";
import CategorySidebar from "@/components/home/CategorySidebar";
import ProductCard from "@/components/product/ProductCard";
import {
  ArrowRight, LayoutGrid, ShoppingCart, ShieldCheck, Star, Truck,
  Flame, Sparkles, Shirt, Laptop, Sparkle, Footprints, Globe, UserCircle,
  Zap, Timer, ShoppingBag, Smartphone, Home, Dumbbell, Baby,
} from "lucide-react";
import {
  V29_PRODUCTS,
  FLASH_DEALS,
  getByCat,
  getTopProducts,
  getNewProducts,
} from "@/data/v29Products";
import type { LucideIcon } from "lucide-react";
import { productsApi, type Product } from "@/services/api/products";

const QUICK_PILLS: { slug: string; icon: LucideIcon; name: string }[] = [
  { slug: "all",    icon: LayoutGrid, name: "Tout" },
  { slug: "femme",  icon: Shirt,      name: "Femme" },
  { slug: "homme",  icon: Shirt,      name: "Homme" },
  { slug: "tech",   icon: Laptop,     name: "Tech" },
  { slug: "beaute", icon: Sparkle,    name: "Beauté" },
  { slug: "shoes",  icon: Footprints, name: "Chaussures" },
];

/* Catégories complètes — surface mobile (mirroir de la sidebar PC) */
const MOBILE_CATEGORIES: { slug: string; icon: LucideIcon; name: string }[] = [
  { slug: "all",    icon: ShoppingBag,  name: "Tout" },
  { slug: "femme",  icon: Shirt,        name: "Femme" },
  { slug: "homme",  icon: Shirt,        name: "Homme" },
  { slug: "tech",   icon: Laptop,       name: "Électro" },
  { slug: "phone",  icon: Smartphone,   name: "Phones" },
  { slug: "beaute", icon: Sparkles,     name: "Beauté" },
  { slug: "maison", icon: Home,         name: "Maison" },
  { slug: "super",  icon: ShoppingCart, name: "Marché" },
  { slug: "shoes",  icon: Footprints,   name: "Chauss." },
  { slug: "sport",  icon: Dumbbell,     name: "Sport" },
  { slug: "bebe",   icon: Baby,         name: "Bébé" },
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
  const mainRef = useRef<HTMLElement | null>(null);
  const [activeCat, setActiveCat] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [lastCat, setLastCat] = useState(activeCat);
  const [mainTop, setMainTop] = useState(0);
  const [mainHeight, setMainHeight] = useState(0);
  const [topOffset, setTopOffset] = useState(132);
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

      return sourceProducts.filter((product) => {
        const slug = product.category?.slug?.toLowerCase() ?? "";
        const name = product.category?.name?.toLowerCase() ?? "";

        if (activeCat === "tech") {
          return slug.includes("tech") || slug.includes("electron") || name.includes("électron") || name.includes("electron");
        }

        if (activeCat === "beaute") {
          return slug.includes("beaute") || slug.includes("beauté") || name.includes("beauté") || name.includes("beaute");
        }

        if (activeCat === "shoes") {
          return slug.includes("chauss") || name.includes("chauss");
        }

        return slug.includes(activeCat) || name.includes(activeCat);
      });
    },
    [activeCat, sourceProducts, usingMockProducts]
  );

  const visibleProducts = useMemo(
    () => allFiltered.slice(0, visibleCount),
    [allFiltered, visibleCount]
  );
  const hasMoreProducts = visibleCount < allFiltered.length;

  /* CSS fixed-top offset */
  useEffect(() => {
    document.documentElement.style.setProperty("--belivay-fixed-top", "100px");
  }, []);

  // Reset pagination when the active category changes (during render, no effect).
  if (activeCat !== lastCat) {
    setLastCat(activeCat);
    setVisibleCount(20);
  }

  useEffect(() => {
    const updateMetrics = () => {
      const main = mainRef.current;
      const header = document.querySelector("header");
      if (!main) return;

      const rect = main.getBoundingClientRect();
      setMainTop(rect.top + window.scrollY);
      setMainHeight(main.offsetHeight);
      setTopOffset(Math.round((header?.getBoundingClientRect().bottom ?? 120) + 12));
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    const timer = window.setInterval(updateMetrics, 350);

    return () => {
      window.removeEventListener("resize", updateMetrics);
      window.clearInterval(timer);
    };
  }, [activeCat, visibleCount]);

  /* ── Carousel slides ── */
  const slides = [
    {
      label: "CEMAC · CMR · Gabon · RCA · Tchad",
      title: "Achetez en toute confiance au Cameroun & Afrique centrale",
      subtitle: "MoMo sécurisé · Vendeurs certifiés · Escrow BelivaY · Remboursement 7j",
      bg: "linear-gradient(108deg, #E86010 0%, #F47920 40%, #FF8C35 70%, #FFA040 100%)",
      labelBg: "rgba(255,255,255,0.2)",
      action: () => {},
    },
    { label: "Mode Femme", title: "Robes · Pagnes · Wax Premium", subtitle: "3 400 produits · Vendeurs certifiés BelivaY", bg: "url(https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=1400&h=500&fit=crop&q=85) center/cover", action: () => setActiveCat("femme") },
    { label: "Électronique", title: "Smartphones & Accessoires", subtitle: "Livraison gratuite dès 30 000 FCFA · Vendeurs certifiés Or", bg: "url(https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#2563EB", action: () => setActiveCat("tech") },
    { label: "Beauté & Soins", title: "Cosmétiques & Soins Authentiques", subtitle: "2 600 produits vérifiés · Livraison express", bg: "url(https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#e11d48", action: () => setActiveCat("beaute") },
    { label: "Made in Cameroon", title: "Produits artisanaux locaux", subtitle: "Soutenez les PME camerounaises · Certifié BelivaY", bg: "url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#059669", action: () => {} },
    { label: "Maison & Déco", title: "Aménagez votre intérieur", subtitle: "1 720 produits · Meubles · Déco · Électroménager", bg: "url(https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#78716c", action: () => setActiveCat("maison") },
    { label: "Mode Homme", title: "Bazin · Costume · Chemise Brodée", subtitle: "2 100 produits · Tenues de cérémonie et casual", bg: "url(https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#1D4ED8", action: () => setActiveCat("homme") },
    { label: "Chaussures", title: "Sneakers · Escarpins · Sandales", subtitle: "1 100 produits · Toutes pointures disponibles", bg: "url(https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#7C3AED", action: () => setActiveCat("shoes") },
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
            onSelectCategory={(slug) => {
              setActiveCat(slug);
              window.scrollTo({ top: 180, behavior: "smooth" });
            }}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
            trackTop={mainTop}
            trackHeight={mainHeight}
            topOffset={topOffset}
          />

          <main ref={mainRef} className="min-w-0 flex-1 space-y-3 sm:space-y-4">
            <section className="overflow-hidden rounded-[24px] border border-[#f1d2bb] bg-white shadow-[0_16px_42px_rgba(244,121,32,.08)] sm:rounded-[30px] dark:border-gray-800 dark:bg-gray-900">
              <div className="p-3 sm:p-4">
                <PromoCarousel slides={slides} autoPlayMs={5000} />
              </div>

              <div className="border-y border-[#f5e2d4] bg-[#fffaf5] px-3 py-2.5 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-900/80">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => navigate("/profile")}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#ecd3c1] bg-white px-4 py-2 text-[11.5px] font-bold text-gray-700 hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <UserCircle size={13} />
                    Mon compte
                  </button>
                  <button
                    onClick={() => navigate("/categories")}
                    className="flex flex-shrink-0 items-center gap-1 rounded-full border border-[#ecd3c1] bg-white px-4 py-2 text-[11.5px] font-bold text-gray-700 hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <LayoutGrid size={13} />
                    Catégories
                  </button>
                  {QUICK_PILLS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.slug}
                        onClick={() => setActiveCat(p.slug)}
                        className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-bold transition-all ${
                          activeCat === p.slug
                            ? "border-primary bg-[#fff1e5] text-[#c85e14] shadow-sm dark:bg-primary/10 dark:text-primary"
                            : "border-[#ecd3c1] bg-white text-gray-700 hover:border-primary hover:bg-[#fff4eb] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        <Icon size={13} />
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stats — téléphone : grille 2×2 compacte (cellules horizontales) ; ≥ md : 4 colonnes d'origine */}
              <div className="grid grid-cols-2 gap-2 bg-white px-3 py-3 sm:px-4 md:grid-cols-4 md:gap-3 md:py-4 dark:bg-gray-900">
                {[
                  { icon: ShoppingCart, num: "15 240", label: "Produits" },
                  { icon: ShieldCheck, num: "3 200", label: "Vendeurs certifiés" },
                  { icon: Star, num: "4.8 / 5", label: "Note moyenne" },
                  { icon: Truck, num: "24–72h", label: "Livraison" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 rounded-2xl border border-[#f3e4d7] bg-[#fffaf6] p-2.5 md:block md:rounded-[20px] md:p-4 dark:border-gray-800 dark:bg-gray-800"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff1e5] text-primary md:h-10 md:w-10 md:rounded-2xl dark:bg-primary/10">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-black leading-none text-[#c85e14] md:mt-3 md:text-[22px]">{item.num}</p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a6b55] md:mt-1 md:text-[11px] md:tracking-[0.12em] dark:text-gray-400">{item.label}</p>
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
                {MOBILE_CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const active = activeCat === c.slug;
                  return (
                    <button
                      key={c.slug}
                      onClick={() => setActiveCat(c.slug)}
                      className="flex w-[60px] flex-shrink-0 flex-col items-center gap-1.5"
                    >
                      <span
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition ${
                          active
                            ? "border-primary bg-[#fff1e5] text-primary dark:bg-primary/15"
                            : "border-[#f0e0d2] bg-[#fffaf6] text-[#b5703f] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        <Icon size={20} />
                      </span>
                      <span
                        className={`text-center text-[10.5px] font-bold leading-tight ${
                          active ? "text-[#c85e14] dark:text-primary" : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {c.name}
                      </span>
                    </button>
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

            <TrustBannersStrip />

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
                      {activeCat === "all" ? "Catalogue de l'accueil" : `${QUICK_PILLS.find((p) => p.slug === activeCat)?.name ?? activeCat}`}
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

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
                {visibleProducts.map((p) => (
                  <ProductCard key={p.id} product={p} showPromo compact isMock={usingMockProducts} />
                ))}
              </div>

              <div className="mt-5 flex justify-center">
                {hasMoreProducts ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => Math.min(count + 20, allFiltered.length))}
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
          </main>

          <FlashPanel trackTop={mainTop} trackHeight={mainHeight} topOffset={topOffset} />
        </div>
      </div>
    </div>
  );
}