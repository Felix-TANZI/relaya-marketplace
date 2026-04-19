import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PromoCarousel from "@/components/PromoCarousel";
import HomeSection from "@/components/HomeSection";
import FlashPanel from "@/components/home/FlashPanel";
import CategorySidebar from "@/components/home/CategorySidebar";
import TrustBannersStrip from "@/components/home/TrustBannersStrip";
import ProductCard from "@/components/product/ProductCard";
import {
  AlertTriangle, ShoppingCart, ShieldCheck, Star, Truck,
  Flame, Sparkles, Shirt, Laptop, Sparkle, Home, Footprints, Bot,
  LayoutGrid, Globe, Smartphone,
} from "lucide-react";
import {
  V29_PRODUCTS,
  getByCat,
  getTopProducts,
  getNewProducts,
  getRecommended,
} from "@/data/v29Products";
import type { LucideIcon } from "lucide-react";

const PAGE_SIZE = 24;

const QUICK_PILLS: { slug: string; icon: LucideIcon; name: string }[] = [
  { slug: "all",    icon: LayoutGrid, name: "Tout" },
  { slug: "femme",  icon: Shirt,      name: "Femme" },
  { slug: "homme",  icon: Shirt,      name: "Homme" },
  { slug: "tech",   icon: Laptop,     name: "Tech" },
  { slug: "beaute", icon: Sparkle,    name: "Beauté" },
  { slug: "shoes",  icon: Footprints, name: "Chaussures" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [page, setPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);

  const allFiltered = useMemo(
    () => activeCat === "all" ? V29_PRODUCTS : getByCat(activeCat),
    [activeCat]
  );

  const visibleProducts = useMemo(
    () => allFiltered.slice(0, page * PAGE_SIZE),
    [allFiltered, page]
  );

  const hasMore = visibleProducts.length < allFiltered.length;

  /* Infinite scroll via IntersectionObserver */
  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  /* Reset page when category changes */
  useEffect(() => { setPage(1); }, [activeCat]);

  /* CSS fixed-top offset */
  useEffect(() => {
    document.documentElement.style.setProperty("--belivay-fixed-top", "100px");
  }, []);

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
  const popular = useMemo(() => activeCat === "all" ? getTopProducts() : getByCat(activeCat), [activeCat]);
  const newProds = useMemo(() => getNewProducts(), []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex min-h-screen">
        {/* LEFT SIDEBAR */}
        <CategorySidebar
          activeCategory={activeCat}
          onSelectCategory={(slug) => { setActiveCat(slug); window.scrollTo({ top: 400, behavior: "smooth" }); }}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 lg:pr-[280px]">
          {/* Carousel */}
          <div className="px-3 pt-3 lg:px-4">
            <PromoCarousel slides={slides} autoPlayMs={5000} />
          </div>

          {/* Quick category pills */}
          <div className="border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900 lg:px-4">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => navigate("/categories")}
                className="flex flex-shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-gray-700 hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800"
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
                    className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                      activeCat === p.slug
                        ? "border-primary bg-orange-50 text-orange-700 shadow-sm dark:bg-primary/10"
                        : "border-gray-200 bg-white text-gray-700 hover:border-primary hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <Icon size={13} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content area */}
          <div className="px-3 pb-10 pt-3 lg:px-4">
            <TrustBannersStrip />

            {/* Litiges card */}
            <div className="mb-4 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-white via-orange-50 to-orange-100/70 p-4 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-primary/10">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-primary">
                    Compte client
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    Litiges ouverts et messages BelivaY
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Le suivi du support est regroupé dans votre compte, section litiges ouverts.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/profile?tab=disputes")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(244,121,32,.26)] transition-all hover:-translate-y-0.5 hover:bg-primary-dark"
                >
                  <AlertTriangle size={16} />
                  Ouvrir mes litiges
                </button>
              </div>
            </div>

            {/* Proof bar */}
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-gray-100 bg-white p-2 shadow-[0_1px_4px_rgba(0,0,0,.03)] dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-gray-100 dark:sm:divide-gray-800">
              {[
                { icon: ShoppingCart, num: "15 240", label: "Produits" },
                { icon: ShieldCheck, num: "3 200", label: "Vendeurs certifiés" },
                { icon: Star, num: "4.8 / 5", label: "Note moyenne" },
                { icon: Truck, num: "24–72h", label: "Livraison" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2 px-2 py-1">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 text-primary dark:bg-primary/10">
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold leading-tight text-primary">{item.num}</p>
                      <p className="text-[9.5px] font-semibold text-gray-400">{item.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Featured horizontal sections */}
            <HomeSection
              title="Produits populaires"
              icon={Flame}
              badge={`${V29_PRODUCTS.length} produits`}
              badgeColor="bg-red-50 text-red-600"
              products={popular}
              rows={2}
            />
            <HomeSection
              title="Nouveaux Arrivages"
              icon={Sparkles}
              badge="Nouveau"
              badgeColor="bg-green-50 text-green-700"
              products={newProds}
              rows={1}
            />

            {/* ── Infinite scroll vertical grid ── */}
            <div className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,.03)] dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-[18px] w-[3px] rounded bg-primary" />
                <Globe size={15} className="text-primary" />
                <h3 className="text-[13px] font-extrabold text-gray-900 dark:text-white">
                  {activeCat === "all" ? "Tous les produits" : `${QUICK_PILLS.find(p => p.slug === activeCat)?.name ?? activeCat}`}
                </h3>
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-700">
                  {allFiltered.length} produits
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visibleProducts.map((p) => (
                  <ProductCard key={p.id} product={p} showPromo compact />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={loaderRef} className="mt-4 flex justify-center">
                {hasMore ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Chargement…
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Tous les produits sont affichés ({allFiltered.length})
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT FLASH PANEL */}
        <FlashPanel />
      </div>
    </div>
  );
}
