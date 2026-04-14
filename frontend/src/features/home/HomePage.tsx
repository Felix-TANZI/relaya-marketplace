import { lazy, Suspense, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Flame,
  Gift,
  Home,
  Lock,
  MapPinned,
  Package,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  User,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PromoCarousel from "@/components/PromoCarousel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TrackingMap = lazy(() =>
  import("@/components/TrackingMap").catch(() => ({
    default: () => <div className="flex h-[220px] items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-400 dark:bg-gray-800">Carte indisponible</div>,
  })) as any
);
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Product, type ProductListResponse } from "@/services/api/products";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryTiles = [
    { name: t('home.cat_all'), link: "/categories", icon: ShoppingBag, color: "bg-orange-50 text-primary dark:bg-primary/10" },
    { name: t('home.cat_women'), link: "/catalog?search=mode", icon: Shirt, color: "bg-pink-50 text-pink-600 dark:bg-pink-900/20" },
    { name: t('home.cat_men'), link: "/catalog?search=homme", icon: Shirt, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20" },
    { name: t('home.cat_phones'), link: "/catalog?search=telephone", icon: Smartphone, color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20" },
    { name: t('home.cat_home'), link: "/catalog?search=maison", icon: Home, color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20" },
    { name: t('home.cat_beauty'), link: "/catalog?search=beaute", icon: Sparkles, color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20" },
    { name: t('home.cat_grocery'), link: "/catalog?search=supermarche", icon: ShoppingCart, color: "bg-green-50 text-green-600 dark:bg-green-900/20" },
  ];

  const quickLinks = [
    { label: t('home.quick_account'), to: "/profile", icon: User, color: "bg-orange-50 text-primary dark:bg-gray-800" },
    { label: t('home.quick_orders'), to: "/orders", icon: Package, color: "bg-orange-50 text-primary dark:bg-gray-800" },
    { label: "Vendeurs certifiés", to: "/vendors", icon: Users, color: "bg-orange-50 text-primary dark:bg-gray-800" },
    { label: t('home.quick_notifications'), to: "/notifications", icon: Bell, color: "bg-orange-50 text-primary dark:bg-gray-800" },
  ];

  const carouselSlides = [
    {
      label: t('home.slide_hero_label'),
      title: t('home.slide_hero_title'),
      subtitle: t('home.slide_hero_subtitle'),
      bg: "linear-gradient(108deg, #E86010 0%, #F47920 40%, #FF8C35 70%, #FFA040 100%)",
      labelBg: "rgba(255,255,255,0.2)",
      action: () => navigate("/catalog"),
    },
    {
      label: t('home.slide_women_label'),
      title: t('home.slide_women_title'),
      subtitle: t('home.slide_women_subtitle'),
      bg: "linear-gradient(135deg, #7C2D12, #EA580C, #FFA040)",
      action: () => navigate("/catalog?search=mode+femme"),
    },
    {
      label: t('home.slide_tech_label'),
      title: t('home.slide_tech_title'),
      subtitle: t('home.slide_tech_subtitle'),
      bg: "linear-gradient(135deg, #0f172a, #1e3a8a, #3B82F6)",
      labelBg: "#2563EB",
      action: () => navigate("/catalog?search=electronique"),
    },
    {
      label: t('home.slide_beauty_label'),
      title: t('home.slide_beauty_title'),
      subtitle: t('home.slide_beauty_subtitle'),
      bg: "linear-gradient(135deg, #4c0519, #9f1239, #e11d48)",
      labelBg: "#e11d48",
      action: () => navigate("/catalog?search=beaute"),
    },
    {
      label: t('home.slide_local_label'),
      title: t('home.slide_local_title'),
      subtitle: t('home.slide_local_subtitle'),
      bg: "linear-gradient(135deg, #064E3B, #059669, #34D399)",
      labelBg: "#059669",
      action: () => navigate("/catalog?search=artisanal"),
    },
    {
      label: t('home.slide_home_label'),
      title: t('home.slide_home_title'),
      subtitle: t('home.slide_home_subtitle'),
      bg: "linear-gradient(135deg, #1c1917, #57534e, #a8a29e)",
      labelBg: "#78716c",
      action: () => navigate("/catalog?search=maison"),
    },
    {
      label: t('home.slide_men_label'),
      title: t('home.slide_men_title'),
      subtitle: t('home.slide_men_subtitle'),
      bg: "linear-gradient(135deg, #1E3A5F, #1D4ED8, #60A5FA)",
      labelBg: "#1D4ED8",
      action: () => navigate("/catalog?search=homme"),
    },
    {
      label: t('home.slide_shoes_label'),
      title: t('home.slide_shoes_title'),
      subtitle: t('home.slide_shoes_subtitle'),
      bg: "linear-gradient(135deg, #3B0764, #7C3AED, #A78BFA)",
      labelBg: "#7C3AED",
      action: () => navigate("/catalog?search=chaussures"),
    },
  ];

  const hiwSteps = [
    { num: 1, icon: Search, title: t('home.hiw_step1_title'), desc: t('home.hiw_step1_desc'), badge: t('home.hiw_step1_badge'), badgeColor: "bg-orange-50 text-primary dark:bg-primary/10" },
    { num: 2, icon: Smartphone, title: t('home.hiw_step2_title'), desc: t('home.hiw_step2_desc'), badge: t('home.hiw_step2_badge'), badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-900/20" },
    { num: 3, icon: Lock, title: t('home.hiw_step3_title'), desc: t('home.hiw_step3_desc'), badge: t('home.hiw_step3_badge'), badgeColor: "bg-green-50 text-green-700 dark:bg-green-900/20" },
    { num: 4, icon: Package, title: t('home.hiw_step4_title'), desc: t('home.hiw_step4_desc'), badge: t('home.hiw_step4_badge'), badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-900/20" },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response: ProductListResponse = await productsApi.list({ page_size: 12 });
        setProducts(response.results || []);
      } catch (error) {
        console.error("Error loading home products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const promoProducts = useMemo(
    () => products.filter((product) => (product.discount ?? 0) > 0).slice(0, 4),
    [products],
  );
  const spotlightProducts = promoProducts.length > 0 ? promoProducts : products.slice(0, 4);
  const popularProducts = products.slice(0, 4);
  const newestProducts = [...products]
    .sort(
      (leftProduct, rightProduct) =>
        new Date(rightProduct.created_at).getTime() -
        new Date(leftProduct.created_at).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f5f1] dark:bg-gray-950">

      {/* Quick links (logged in) */}
      {isAuthenticated && (
        <section className="border-b border-orange-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              {quickLinks.map(({ label, to, icon: Icon, color }) => (
                <Link
                  key={label}
                  to={to}
                  className={`flex flex-shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-80 ${color}`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promo Carousel (V8 hero) */}
      <section className="container mx-auto px-4 pt-5">
        <PromoCarousel slides={carouselSlides} autoPlayMs={5000} />
      </section>

      {/* Proof Bar */}
      <section className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-gray-100 sm:dark:divide-gray-800">
          {[
            { emoji: <ShoppingCart size={22} className="text-primary" />, num: "15 240", label: t('home.proof_products') },
            { emoji: <ShieldCheck size={22} className="text-green-600" />, num: "3 200", label: t('home.proof_vendors') },
            { emoji: <Sparkles size={22} className="text-amber-500" />, num: "4.8 / 5", label: t('home.proof_rating') },
            { emoji: <Truck size={22} className="text-blue-600" />, num: "24–72h", label: t('home.proof_delivery') },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-2 py-1 sm:px-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
                {item.emoji}
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-900 dark:text-white">{item.num}</p>
                <p className="text-[10px] text-gray-400">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 pb-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('home.categories_label')}</h2>
            <Link to="/categories" className="text-sm font-semibold text-primary">
              {t('home.see_all')}
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-7">
            {categoryTiles.map((category) => (
              <Link
                key={category.name}
                to={category.link}
                className="flex min-w-[90px] flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-[#fcfbf8] p-3 text-center transition-all hover:border-orange-200 hover:bg-orange-50 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${category.color}`}>
                  <category.icon size={20} />
                </div>
                <p className="text-[11px] font-semibold leading-tight text-gray-800 dark:text-white">
                  {category.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Spotlight / Mega Promos */}
      <section className="container mx-auto px-4 pb-10">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t('home.for_you')}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {t('home.mega_promos')}
            </h2>
          </div>
          <Link to="/catalog?promo=1" className="text-sm font-semibold text-primary">
            {t('common.see_more')}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[0.85] rounded-[1.75rem]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {spotlightProducts.map((product) => (
              <ProductCard key={product.id} product={product} showPromo />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 pb-10">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-5 w-[3px] rounded bg-primary" />
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{t('home.hiw_title')}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {hiwSteps.map((step) => {
            const StepIcon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-primary/5" />
                <div className="relative z-10">
                  <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-50 text-xs font-extrabold text-primary dark:bg-primary/10">
                    {step.num}
                  </div>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center">
                    <StepIcon size={28} className="text-primary" />
                  </div>
                  <h3 className="mb-2 text-sm font-extrabold text-gray-900 dark:text-white">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{step.desc}</p>
                  <span className={`mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-bold ${step.badgeColor}`}>
                    {step.badge}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular + Tracking map */}
      <section className="container mx-auto px-4 pb-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('home.most_popular')}</h2>
              <Link to="/catalog" className="text-sm font-semibold text-primary">
                {t('home.explore')}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
              {popularProducts.map((product) => (
                <ProductCard key={product.id} product={product} showPromo />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPinned size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {t('home.customer_journey')}
                </p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('home.track_orders_title')}
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-[#fff7ef] p-4 dark:bg-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('home.order_example')}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('home.order_eta')}
                </p>
              </div>
              <Suspense fallback={<div className="h-[220px] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
                <TrackingMap />
              </Suspense>
              <div className="grid gap-3 min-[480px]:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-400">10:15</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {t('home.timeline_received')}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-400">14:30</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {t('home.timeline_preparing')}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                  <p className="text-xs font-medium text-gray-400">14:45</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {t('home.timeline_shipped')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
                >
                  <Truck size={18} />
                  {t('home.track_my_orders')}
                </Link>
                <Link
                  to="/notifications"
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Sparkles size={18} />
                  {t('home.see_notifications')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Escrow block */}
      <section className="container mx-auto px-4 pb-10">
        <div className="grid gap-6 rounded-[1.25rem] bg-gray-900 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h2 className="mb-3 text-lg font-extrabold text-white flex items-center gap-2">
              <Lock size={18} className="text-primary" />
              {t('home.escrow_title')}
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-gray-400">
              {t('home.escrow_desc')}
            </p>
            <button
              onClick={() => navigate("/about")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-white/20"
            >
              {t('home.escrow_learn_more')} &rarr;
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { step: "1", title: t('home.escrow_step1_title'), desc: t('home.escrow_step1_desc') },
              { step: "2", title: t('home.escrow_step2_title'), desc: t('home.escrow_step2_desc') },
              { step: "3", title: t('home.escrow_step3_title'), desc: t('home.escrow_step3_desc'), highlight: true },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
                  {item.step}
                </span>
                <div>
                  <p className={`text-sm font-bold ${item.highlight ? 'text-primary' : 'text-white'}`}>{item.title}</p>
                  <p className="text-[11px] text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container mx-auto px-4 pb-14">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t('home.new_arrivals')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {t('home.latest')}
            </h2>
          </div>
          <Link to="/catalog?recent=1" className="text-sm font-semibold text-primary">
            {t('home.see_all')}
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {newestProducts.map((product) => (
            <ProductCard key={product.id} product={product} showPromo />
          ))}
        </div>
      </section>
    </div>
  );
}
