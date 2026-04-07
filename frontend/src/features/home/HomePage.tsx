import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Flame,
  Gift,
  Home,
  MapPinned,
  Package,
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
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Product, type ProductListResponse } from "@/services/api/products";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { t } = useTranslation();
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

  const trustCards = [
    {
      icon: ShieldCheck,
      title: t('home.trust_payment_title'),
      text: t('home.trust_payment_text'),
    },
    {
      icon: Flame,
      title: t('home.trust_promo_title'),
      text: t('home.trust_promo_text'),
    },
  ];

  const quickLinks = [
    { label: t('home.quick_account'), to: "/profile", icon: User, color: "bg-orange-50 text-primary dark:bg-gray-800" },
    { label: t('home.quick_orders'), to: "/orders", icon: Package, color: "bg-orange-50 text-primary dark:bg-gray-800" },
    { label: "Vendeurs certifiés", to: "/vendors", icon: Users, color: "bg-orange-50 text-primary dark:bg-gray-800" },
    { label: t('home.quick_notifications'), to: "/notifications", icon: Bell, color: "bg-orange-50 text-primary dark:bg-gray-800" },
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
    <div className="min-h-screen bg-[#f8f5f1] dark:bg-gray-950">
      <section className="border-b border-orange-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="container mx-auto grid gap-3 px-4 py-4 md:grid-cols-3">
          {trustCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex items-center gap-3 rounded-2xl bg-[#fff7ef] px-4 py-3 dark:bg-gray-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {card.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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

      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-orange-100 dark:bg-gray-900 dark:ring-gray-800 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm dark:bg-gray-800">
              <Flame size={14} />
              {t('home.promo_badge')}
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-gray-900 dark:text-white lg:text-6xl">
              {t('home.hero_title')}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
              {t('home.hero_desc')}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/catalog?promo=1"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
              >
                <Gift size={18} />
                {t('home.see_promos')}
              </Link>
              <Link
                to="/categories"
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-orange-50 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Store size={18} />
                {t('home.explore_categories')}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {t('home.info_tracking')}
                </p>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {t('home.info_tracking_value')}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {t('home.info_payment')}
                </p>
                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {t('home.info_payment_value')}
                </p>
              </div>
            </div>
          </div>

          <div
            id="categories"
            className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('home.categories_label')}</h2>
              <Link to="/categories" className="text-sm font-semibold text-primary">
                {t('home.see_all')}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
              {categoryTiles.map((category) => (
                <Link
                  key={category.name}
                  to={category.link}
                  className="rounded-2xl border border-gray-100 bg-[#fcfbf8] p-4 transition-all hover:border-orange-200 hover:bg-orange-50 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${category.color}`}>
                    <category.icon size={24} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {category.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

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
