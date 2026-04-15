import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Crown,
  Flame,
  Gift,
  Lock,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Timer,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PromoCarousel from "@/components/PromoCarousel";
import ProductSlider from "@/components/ProductSlider";
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Product, type ProductListResponse } from "@/services/api/products";
import { type MockProduct, mockProducts, flashSaleProducts, premiumProducts, getCategoryGroups } from "@/data/mockProducts";

/* ── Flash countdown hook ── */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : seconds)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const h = String(Math.floor(left / 3600)).padStart(2, "0");
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  return { h, m, s };
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashFilter, setFlashFilter] = useState("all");
  const countdown = useCountdown(6 * 3600 + 16 * 60 + 2);

  /* ── Carousel slides (V8) ── */
  const carouselSlides = [
    {
      label: t("home.slide_hero_label"),
      title: t("home.slide_hero_title"),
      subtitle: t("home.slide_hero_subtitle"),
      bg: "linear-gradient(108deg, #E86010 0%, #F47920 40%, #FF8C35 70%, #FFA040 100%)",
      labelBg: "rgba(255,255,255,0.2)",
      action: () => navigate("/catalog"),
    },
    { label: t("home.slide_women_label"), title: t("home.slide_women_title"), subtitle: t("home.slide_women_subtitle"), bg: "linear-gradient(135deg, #7C2D12, #EA580C, #FFA040)", action: () => navigate("/catalog?search=mode+femme") },
    { label: t("home.slide_tech_label"), title: t("home.slide_tech_title"), subtitle: t("home.slide_tech_subtitle"), bg: "linear-gradient(135deg, #0f172a, #1e3a8a, #3B82F6)", labelBg: "#2563EB", action: () => navigate("/catalog?search=electronique") },
    { label: t("home.slide_beauty_label"), title: t("home.slide_beauty_title"), subtitle: t("home.slide_beauty_subtitle"), bg: "linear-gradient(135deg, #4c0519, #9f1239, #e11d48)", labelBg: "#e11d48", action: () => navigate("/catalog?search=beaute") },
    { label: t("home.slide_local_label"), title: t("home.slide_local_title"), subtitle: t("home.slide_local_subtitle"), bg: "linear-gradient(135deg, #064E3B, #059669, #34D399)", labelBg: "#059669", action: () => navigate("/catalog?search=artisanal") },
    { label: t("home.slide_home_label"), title: t("home.slide_home_title"), subtitle: t("home.slide_home_subtitle"), bg: "linear-gradient(135deg, #1c1917, #57534e, #a8a29e)", labelBg: "#78716c", action: () => navigate("/catalog?search=maison") },
    { label: t("home.slide_men_label"), title: t("home.slide_men_title"), subtitle: t("home.slide_men_subtitle"), bg: "linear-gradient(135deg, #1E3A5F, #1D4ED8, #60A5FA)", labelBg: "#1D4ED8", action: () => navigate("/catalog?search=homme") },
    { label: t("home.slide_shoes_label"), title: t("home.slide_shoes_title"), subtitle: t("home.slide_shoes_subtitle"), bg: "linear-gradient(135deg, #3B0764, #7C3AED, #A78BFA)", labelBg: "#7C3AED", action: () => navigate("/catalog?search=chaussures") },
  ];

  /* ── How-it-works steps ── */
  const hiwSteps = [
    { num: 1, icon: Search, title: t("home.hiw_step1_title"), desc: t("home.hiw_step1_desc"), badge: t("home.hiw_step1_badge"), color: "bg-orange-50 text-primary dark:bg-primary/10" },
    { num: 2, icon: Smartphone, title: t("home.hiw_step2_title"), desc: t("home.hiw_step2_desc"), badge: t("home.hiw_step2_badge"), color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20" },
    { num: 3, icon: Lock, title: t("home.hiw_step3_title"), desc: t("home.hiw_step3_desc"), badge: t("home.hiw_step3_badge"), color: "bg-green-50 text-green-700 dark:bg-green-900/20" },
    { num: 4, icon: Package, title: t("home.hiw_step4_title"), desc: t("home.hiw_step4_desc"), badge: t("home.hiw_step4_badge"), color: "bg-amber-50 text-amber-700 dark:bg-amber-900/20" },
  ];

  /* ── Fetch API products ── */
  useEffect(() => {
    productsApi.list({ page_size: 12 }).then((r: ProductListResponse) => setApiProducts(r.results || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  /* ── Derived data ── */
  const allProducts = useMemo(() => {
    const apiIds = new Set(apiProducts.map((p) => p.id));
    return [...apiProducts, ...mockProducts.filter((m) => !apiIds.has(m.id))];
  }, [apiProducts]);

  const premiumSlice1 = premiumProducts.slice(0, Math.ceil(premiumProducts.length / 2));
  const premiumSlice2 = premiumProducts.slice(Math.ceil(premiumProducts.length / 2));

  const categoryGroups = useMemo(() => getCategoryGroups(), []);
  const categoryEntries = Object.entries(categoryGroups);
  const catSlice1 = categoryEntries.slice(0, Math.ceil(categoryEntries.length / 2));
  const catSlice2 = categoryEntries.slice(Math.ceil(categoryEntries.length / 2));

  const filteredFlash = useMemo(() => {
    if (flashFilter === "all") return flashSaleProducts;
    return flashSaleProducts.filter((p) => p.category?.slug === flashFilter);
  }, [flashFilter]);

  const flashCategories = useMemo(() => {
    const cats = new Map<string, string>();
    for (const p of flashSaleProducts) {
      if (p.category) cats.set(p.category.slug, p.category.name);
    }
    return Array.from(cats.entries());
  }, []);

  /* ── Section header helper ── */
  const SectionHeader = ({ title, badge, link, linkLabel }: { title: string; badge?: string; link?: string; linkLabel?: string }) => (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-5 w-[3px] rounded bg-primary" />
        <h2 className="text-[15px] font-extrabold text-gray-900 dark:text-white">{title}</h2>
        {badge && (
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            {badge}
          </span>
        )}
      </div>
      {link && (
        <Link to={link} className="text-xs font-bold text-primary">
          {linkLabel || t("home.view_all")} &rarr;
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950">

      {/* ══ PROMO CAROUSEL ══ */}
      <section className="container mx-auto px-4 pt-4">
        <PromoCarousel slides={carouselSlides} autoPlayMs={5000} />
      </section>

      {/* ══ PROOF BAR ══ */}
      <section className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-gray-100 dark:sm:divide-gray-800">
          {[
            { icon: <ShoppingCart size={20} className="text-primary" />, num: "15 240", label: t("home.proof_products") },
            { icon: <ShieldCheck size={20} className="text-green-600" />, num: "3 200", label: t("home.proof_vendors") },
            { icon: <Star size={20} className="text-amber-500" />, num: "4.8 / 5", label: t("home.proof_rating") },
            { icon: <Truck size={20} className="text-blue-600" />, num: "24–72h", label: t("home.proof_delivery") },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 px-2 py-1 sm:px-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">{item.icon}</div>
              <div>
                <p className="text-sm font-extrabold leading-tight text-gray-900 dark:text-white">{item.num}</p>
                <p className="text-[10px] text-gray-400">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FLASH SALES ══ */}
      <section className="container mx-auto px-4 pb-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20">
                <Flame size={20} />
              </div>
              <div>
                <h2 className="text-[15px] font-extrabold text-gray-900 dark:text-white">{t("home.flash_title")}</h2>
                <p className="text-[11px] text-gray-400">{t("home.flash_subtitle")}</p>
              </div>
            </div>
            {/* Countdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400">{t("home.flash_ends_in")}</span>
              {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-0.5 text-sm font-black text-primary">:</span>}
                  <span className="inline-flex min-w-[28px] items-center justify-center rounded-md bg-gray-900 px-1.5 py-1 text-xs font-extrabold text-white dark:bg-gray-700">
                    {v}
                  </span>
                </span>
              ))}
            </div>
          </div>
          {/* Filters */}
          <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFlashFilter("all")}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${flashFilter === "all" ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600 hover:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
            >
              {t("home.flash_filter_all")}
            </button>
            {flashCategories.map(([slug, name]) => (
              <button
                key={slug}
                onClick={() => setFlashFilter(slug)}
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${flashFilter === slug ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600 hover:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
              >
                {name}
              </button>
            ))}
          </div>
          {/* Products slider */}
          <ProductSlider products={filteredFlash} showPromo autoPlayMs={4000} />
          <div className="mt-3 text-center">
            <Link to="/catalog?promo=1" className="text-xs font-bold text-primary">
              {t("home.flash_see_all")} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ══ PREMIUM CAROUSEL 1 ══ */}
      <section className="container mx-auto px-4 pb-6">
        <SectionHeader
          title={t("home.premium_collection")}
          link="/vendors"
          linkLabel={t("home.view_all")}
        />
        <div className="mb-2 flex items-center gap-2">
          <Crown size={14} className="text-amber-500" />
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{t("home.premium_subtitle")}</span>
        </div>
        <ProductSlider products={premiumSlice1} showPromo autoPlayMs={5000} />
      </section>

      {/* ══ PREMIUM CAROUSEL 2 ══ */}
      <section className="container mx-auto px-4 pb-6">
        <SectionHeader
          title={t("home.premium_exclusive")}
          link="/vendors"
          linkLabel={t("home.view_all")}
        />
        <ProductSlider products={premiumSlice2} showPromo autoPlayMs={6000} />
      </section>

      {/* ══ CATEGORY CAROUSEL 1 ══ */}
      {catSlice1.map(([slug, group]) => (
        <section key={slug} className="container mx-auto px-4 pb-6">
          <SectionHeader title={group.name} link={`/catalog?search=${slug}`} />
          <ProductSlider products={group.products} showPromo autoPlayMs={0} />
        </section>
      ))}

      {/* ══ HOW IT WORKS ══ */}
      <section className="container mx-auto px-4 pb-8">
        <SectionHeader title={t("home.hiw_title")} />
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {hiwSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-primary/5" />
                <div className="relative z-10">
                  <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 text-xs font-extrabold text-primary dark:bg-primary/10">{step.num}</div>
                  <Icon size={26} className="mx-auto mb-2 text-primary" />
                  <h3 className="mb-1 text-sm font-extrabold text-gray-900 dark:text-white">{step.title}</h3>
                  <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">{step.desc}</p>
                  <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-[10px] font-bold ${step.color}`}>{step.badge}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ CATEGORY CAROUSEL 2 ══ */}
      {catSlice2.map(([slug, group]) => (
        <section key={slug} className="container mx-auto px-4 pb-6">
          <SectionHeader title={group.name} link={`/catalog?search=${slug}`} />
          <ProductSlider products={group.products} showPromo autoPlayMs={0} />
        </section>
      ))}

      {/* ══ RECOMMENDED (IA) ══ */}
      <section className="container mx-auto px-4 pb-8">
        <SectionHeader title={t("home.recommended_title")} badge={t("home.recommended_badge")} link="/catalog" />
        <ProductSlider products={allProducts.slice(0, 8)} showPromo autoPlayMs={7000} />
      </section>

      {/* ══ ESCROW BLOCK ══ */}
      <section className="container mx-auto px-4 pb-8">
        <div className="grid gap-6 rounded-[1.25rem] bg-gray-900 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-white">
              <Lock size={18} className="text-primary" />
              {t("home.escrow_title")}
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-gray-400">{t("home.escrow_desc")}</p>
            <button onClick={() => navigate("/about")} className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-white/20">
              {t("home.escrow_learn_more")} &rarr;
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { step: "1", title: t("home.escrow_step1_title"), desc: t("home.escrow_step1_desc") },
              { step: "2", title: t("home.escrow_step2_title"), desc: t("home.escrow_step2_desc") },
              { step: "3", title: t("home.escrow_step3_title"), desc: t("home.escrow_step3_desc"), highlight: true },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">{item.step}</span>
                <div>
                  <p className={`text-sm font-bold ${item.highlight ? "text-primary" : "text-white"}`}>{item.title}</p>
                  <p className="text-[11px] text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ NEW PRODUCTS (from API) ══ */}
      {!loading && apiProducts.length > 0 && (
        <section className="container mx-auto px-4 pb-14">
          <SectionHeader title={t("home.new_products")} link="/catalog?recent=1" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {apiProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} showPromo />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
