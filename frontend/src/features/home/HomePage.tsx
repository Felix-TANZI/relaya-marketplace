import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PromoCarousel from "@/components/PromoCarousel";
import HomeSection from "@/components/HomeSection";
import FlashPanel from "@/components/home/FlashPanel";
import CategorySidebar from "@/components/home/CategorySidebar";
import TrustBannersStrip from "@/components/home/TrustBannersStrip";
import { ShoppingCart, ShieldCheck, Star, Truck } from "lucide-react";
import {
  V29_PRODUCTS,
  getByCat,
  getTopProducts,
  getNewProducts,
  getRecommended,
} from "@/data/v29Products";

const QUICK_PILLS = [
  { slug: "all", emoji: "🛍️", name: "Tout" },
  { slug: "femme", emoji: "👗", name: "Femme" },
  { slug: "homme", emoji: "👔", name: "Homme" },
  { slug: "tech", emoji: "💻", name: "Tech" },
  { slug: "beaute", emoji: "💄", name: "Beauté" },
  { slug: "shoes", emoji: "👟", name: "Chaussures" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* ── Carousel slides ── */
  const slides = [
    {
      label: "🌍 CEMAC · CMR · Gabon · RCA · Tchad",
      title: "Achetez en toute confiance au Cameroun & Afrique centrale",
      subtitle: "MoMo sécurisé · Vendeurs certifiés · Escrow BelivaY · Remboursement 7j",
      bg: "linear-gradient(108deg, #E86010 0%, #F47920 40%, #FF8C35 70%, #FFA040 100%)",
      labelBg: "rgba(255,255,255,0.2)",
      action: () => navigate("/catalog"),
    },
    { label: "👗 Mode Femme", title: "Robes · Pagnes · Wax Premium", subtitle: "3 400 produits · Vendeurs certifiés BelivaY", bg: "url(https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=1400&h=500&fit=crop&q=85) center/cover", action: () => { setActiveCat("femme"); navigate("/catalog?search=mode+femme"); } },
    { label: "📱 Électronique", title: "Smartphones & Accessoires", subtitle: "Livraison gratuite dès 30 000 FCFA · Vendeurs certifiés Or", bg: "url(https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#2563EB", action: () => { setActiveCat("tech"); navigate("/catalog?search=electronique"); } },
    { label: "💄 Beauté & Soins", title: "Cosmétiques & Soins Authentiques", subtitle: "2 600 produits vérifiés · Livraison express", bg: "url(https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#e11d48", action: () => { setActiveCat("beaute"); navigate("/catalog?search=beaute"); } },
    { label: "🌍 Made in Cameroon", title: "Produits artisanaux locaux", subtitle: "Soutenez les PME camerounaises · Certifié BelivaY", bg: "url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#059669", action: () => navigate("/catalog?search=artisanal") },
    { label: "🏠 Maison & Déco", title: "Aménagez votre intérieur", subtitle: "1 720 produits · Meubles · Déco · Électroménager", bg: "url(https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#78716c", action: () => { setActiveCat("maison"); navigate("/catalog?search=maison"); } },
    { label: "👔 Mode Homme", title: "Bazin · Costume · Chemise Brodée", subtitle: "2 100 produits · Tenues de cérémonie et casual", bg: "url(https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#1D4ED8", action: () => { setActiveCat("homme"); navigate("/catalog?search=homme"); } },
    { label: "👟 Chaussures", title: "Sneakers · Escarpins · Sandales", subtitle: "1 100 produits · Toutes pointures disponibles", bg: "url(https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1400&h=500&fit=crop&q=85) center/cover", labelBg: "#7C3AED", action: () => { setActiveCat("shoes"); navigate("/catalog?search=chaussures"); } },
  ];

  /* ── Sections ── */
  const popular = useMemo(() => activeCat === "all" ? getTopProducts() : getByCat(activeCat), [activeCat]);
  const newProds = useMemo(() => getNewProducts(), []);
  const fashion = useMemo(() => [...getByCat("femme"), ...getByCat("homme")], []);
  const tech = useMemo(() => [...getByCat("tech"), ...getByCat("phone")], []);
  const beauty = useMemo(() => getByCat("beaute"), []);
  const homeGrocery = useMemo(() => [...getByCat("maison"), ...getByCat("super")], []);
  const sportShoes = useMemo(() => [...getByCat("sport"), ...getByCat("shoes")], []);
  const recommended = useMemo(() => getRecommended(), []);

  /* ── Set CSS variable for fixed top offset ── */
  useEffect(() => {
    document.documentElement.style.setProperty("--belivay-fixed-top", "100px");
  }, []);

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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="7" height="7" />
                  <rect x="15" y="3" width="7" height="7" />
                  <rect x="2" y="14" width="7" height="7" />
                  <rect x="15" y="14" width="7" height="7" />
                </svg>
                Catégories
              </button>
              {QUICK_PILLS.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setActiveCat(p.slug)}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                    activeCat === p.slug
                      ? "border-primary bg-orange-50 text-orange-700 shadow-sm dark:bg-primary/10"
                      : "border-gray-200 bg-white text-gray-700 hover:border-primary hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  <span className="text-base">{p.emoji}</span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sections area */}
          <div className="px-3 pb-10 pt-3 lg:px-4">
            {/* Trust Banners */}
            <TrustBannersStrip />

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

            {/* S1: Produits populaires (2 rows) */}
            <HomeSection
              title="Produits populaires"
              emoji="🔥"
              badge={`${V29_PRODUCTS.length} produits`}
              badgeColor="bg-red-50 text-red-600"
              products={popular}
              rows={2}
              onSeeMore={() => navigate("/catalog")}
            />

            {/* S2: Nouveaux Arrivages */}
            <HomeSection
              title="Nouveaux Arrivages"
              emoji="✨"
              badge="Nouveau"
              badgeColor="bg-green-50 text-green-700"
              products={newProds}
              rows={1}
              onSeeMore={() => navigate("/catalog?recent=1")}
            />

            {/* S3: Mode & Fashion (2 rows) */}
            <HomeSection
              title="Mode & Fashion"
              emoji="👗"
              badge="Tendance"
              badgeColor="bg-pink-50 text-pink-600"
              products={fashion}
              rows={2}
              onSeeMore={() => { setActiveCat("femme"); navigate("/catalog?search=mode"); }}
            />

            {/* S4: Électronique & Tech (2 rows) */}
            <HomeSection
              title="Électronique & Tech"
              emoji="💻"
              badge="High-Tech"
              badgeColor="bg-blue-50 text-blue-600"
              products={tech}
              rows={2}
              onSeeMore={() => { setActiveCat("tech"); navigate("/catalog?search=tech"); }}
            />

            {/* S5: Beauté & Soins */}
            <HomeSection
              title="Beauté & Soins"
              emoji="💄"
              badge="Bio"
              badgeColor="bg-violet-50 text-violet-700"
              products={beauty}
              rows={1}
              onSeeMore={() => { setActiveCat("beaute"); navigate("/catalog?search=beaute"); }}
            />

            {/* S6: Maison & Alimentation (2 rows) */}
            <HomeSection
              title="Maison & Alimentation"
              emoji="🏠"
              products={homeGrocery}
              rows={2}
              onSeeMore={() => { setActiveCat("maison"); navigate("/catalog?search=maison"); }}
            />

            {/* S7: Sport & Chaussures */}
            <HomeSection
              title="Sport & Chaussures"
              emoji="👟"
              products={sportShoes}
              rows={1}
              onSeeMore={() => { setActiveCat("shoes"); navigate("/catalog?search=chaussures"); }}
            />

            {/* S8: Pour vous IA */}
            <HomeSection
              title="Pour vous"
              emoji="🤖"
              badge="IA"
              badgeColor="bg-violet-100 text-violet-700"
              products={recommended}
              rows={1}
              onSeeMore={() => navigate("/catalog")}
            />
          </div>
        </main>

        {/* RIGHT FLASH PANEL */}
        <FlashPanel />
      </div>
    </div>
  );
}
