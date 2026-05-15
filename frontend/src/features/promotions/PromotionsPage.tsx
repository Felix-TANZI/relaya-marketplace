import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Copy,
  Gift,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { productsApi, type Category, type Product } from "@/services/api/products";
import { getPromoProducts } from "@/data/v29Products";

type PromoProduct = Product & {
  score: number;
  isPremium: boolean;
};

const CATEGORY_BANNERS = [
  { slug: "all", eyebrow: "Top sélection", title: "Offres transversales", discount: "Jusqu'à -45%", bg: "from-[#111827] via-[#1f2937] to-[#0f172a]" },
  { slug: "femme", eyebrow: "Flash mode", title: "Mode Femme", discount: "Jusqu'à -40%", bg: "from-[#c85e14] via-[#f47920] to-[#ffb36d]" },
  { slug: "electronique", eyebrow: "Tech Week", title: "Électronique", discount: "Jusqu'à -25%", bg: "from-[#0f172a] via-[#1d4ed8] to-[#60a5fa]" },
  { slug: "beaute", eyebrow: "Glow deals", title: "Beauté", discount: "Jusqu'à -30%", bg: "from-[#14532d] via-[#16a34a] to-[#86efac]" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(n);
}

function useCountdown(endTime: number) {
  const [remaining, setRemaining] = useState(Math.max(0, endTime - Date.now()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, endTime - Date.now()));
    }, 1000);

    return () => window.clearInterval(id);
  }, [endTime]);

  return {
    hours: String(Math.floor(remaining / 3600000)).padStart(2, "0"),
    minutes: String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0"),
    seconds: String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0"),
  };
}

function getProductImage(product: Product) {
  return product.media?.[0]?.url || product.images?.[0]?.image_url || "";
}

function buildScoredList(list: Product[]) {
  const scored: PromoProduct[] = [...list]
    .map((product) => ({
      ...product,
      score: (product.discount_percent ?? product.discount ?? 0) * 2 + (product.rating_average ?? 0) * 10 + (product.reviews_count ?? 0),
      isPremium: false,
    }))
    .sort((a, b) => b.score - a.score);

  const premiumCount = Math.max(3, Math.ceil(scored.length * 0.25));
  scored.forEach((product, index) => {
    product.isPremium = index < premiumCount;
  });

  return scored;
}

export default function PromotionsPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [allPromo, setAllPromo] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [usingFallbackPromos, setUsingFallbackPromos] = useState(false);
  const endTimeRef = useRef(Date.now() + 8 * 3600 * 1000);
  const countdown = useCountdown(endTimeRef.current);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          productsApi.list({ page_size: 100, is_active: true }),
          productsApi.listCategories({ page_size: 50, is_active: true }),
        ]);

        if (!mounted) return;

        const promos = prodRes.results.filter((product) => product.is_on_promotion || (product.discount_percent ?? product.discount ?? 0) > 0);
        const fallbackPromos = getPromoProducts();

        if (promos.length) {
          setAllPromo(promos);
          setCategories(catRes.results);
          setUsingFallbackPromos(false);
        } else {
          const fallbackCategories = Array.from(
            new Map(
              fallbackPromos.map((product) => [
                product.category?.slug ?? String(product.id),
                product.category,
              ]),
            ).values(),
          ).filter(Boolean) as Category[];

          setAllPromo(fallbackPromos);
          setCategories(fallbackCategories);
          setUsingFallbackPromos(true);
        }
      } catch {
        if (!mounted) return;

        const fallbackPromos = getPromoProducts();
        const fallbackCategories = Array.from(
          new Map(
            fallbackPromos.map((product) => [
              product.category?.slug ?? String(product.id),
              product.category,
            ]),
          ).values(),
        ).filter(Boolean) as Category[];

        setAllPromo(fallbackPromos);
        setCategories(fallbackCategories);
        setUsingFallbackPromos(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const displayed = useMemo(() => {
    const filtered =
      activeCat === "all"
        ? allPromo
        : allPromo.filter((product) => {
            const name = product.category?.name?.toLowerCase() ?? "";
            const slug = product.category?.slug?.toLowerCase() ?? "";
            return name.includes(activeCat.toLowerCase()) || slug.includes(activeCat.toLowerCase());
          });

    return buildScoredList(filtered);
  }, [activeCat, allPromo]);

  const filterTabs = [
    { key: "all", label: "Tout voir" },
    ...categories.slice(0, 6).map((category) => ({ key: category.slug, label: category.name })),
  ];

  const handleAddToCart = (event: React.MouseEvent, product: Product) => {
    event.stopPropagation();
    addItem({
      id: product.id,
      name: product.title,
      price: product.price_final,
      quantity: 1,
      image: getProductImage(product),
      isDemo: usingFallbackPromos,
    });
  };

  const openProduct = (product: Product) => {
    const mockSuffix = usingFallbackPromos ? "?mock=1" : "";
    navigate(`/product/${product.id}${mockSuffix}`);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText("BIENVENUE10");
    setCodeCopied(true);
    window.setTimeout(() => setCodeCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fff_16%,#f8fafc_100%)] px-4 pb-24 pt-6 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_22%,#020617_100%)]">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section
          className="overflow-hidden rounded-[32px] border border-[#f2d1bc] px-6 py-7 text-white shadow-[0_24px_60px_rgba(244,121,32,.22)] dark:border-orange-900/40"
          style={{ background: "linear-gradient(135deg,#0a0500,#2d0e00,#4a1800)" }}
        >
          <div className="relative">
            <div className="pointer-events-none absolute -left-10 bottom-[-72px] h-52 w-52 rounded-full bg-[#ff9d4d]/20 blur-3xl" />
            <div className="pointer-events-none absolute right-[-70px] top-[-90px] h-72 w-72 rounded-full bg-[#f47920]/30 blur-3xl" />

            <div className="relative z-[1] text-[10.5px] font-black uppercase tracking-[0.1em] text-white/65">
              Offres limitées
            </div>
            <h1 className="relative z-[1] mt-2 font-display text-[24px] font-extrabold tracking-tight sm:text-[30px]">
              Promotions du Moment
            </h1>
            <p className="relative z-[1] mt-2 max-w-[760px] text-[13px] leading-7 text-white/75">
              {displayed.length} offres actives · Mise à jour en temps réel · Escrow garanti sur tous les achats
            </p>

            <div className="relative z-[1] mt-5 flex flex-wrap items-center gap-2">
              {[countdown.hours, countdown.minutes, countdown.seconds].map((value, index) => (
                <div key={`${value}-${index}`} className="contents">
                  {index > 0 ? <div className="pb-3 text-[20px] font-black text-[#f47920]">:</div> : null}
                  <div className="min-w-[64px] rounded-[12px] border border-white/20 bg-white/10 px-3 py-2 text-center backdrop-blur-[4px]">
                    <div className="font-display text-[24px] font-extrabold leading-none text-white">{value}</div>
                    <div className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.05em] text-white/55">
                      {index === 0 ? "Heures" : index === 1 ? "Min" : "Sec"}
                    </div>
                  </div>
                </div>
              ))}
              <div className="ml-2 text-[12px] leading-[1.4] text-white/65">
                Fin du
                <br />
                Flash Sale
              </div>
            </div>
          </div>
        </section>

        <section
          className="rounded-[18px] border border-[#86efac] px-4 py-3 shadow-[0_10px_22px_rgba(22,163,74,.08)] dark:border-emerald-900/40"
          style={{ background: "linear-gradient(110deg,#f0fdf4,#dcfce7)" }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[24px]">🎁</div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-extrabold text-[#15803d] dark:text-emerald-200">
                Code Bienvenue actif — BIENVENUE10
              </div>
              <div className="text-[12px] text-[#15803d]/85 dark:text-emerald-100/80">
                -10% sur votre 1ère commande · Valable encore 48h · Applicable au checkout
              </div>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#16a34a] px-4 py-2 text-[12px] font-extrabold text-white transition hover:bg-[#15803d]"
            >
              {codeCopied ? <Gift size={14} /> : <Copy size={14} />}
              {codeCopied ? "Copié !" : "Copier"}
            </button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORY_BANNERS.map((banner) => (
            <button
              key={banner.slug}
              type="button"
              onClick={() => setActiveCat(banner.slug)}
              className={`group relative min-h-[110px] overflow-hidden rounded-[18px] p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,.12)] transition hover:translate-y-[-5px] hover:scale-[1.01] ${
                activeCat === banner.slug ? "ring-2 ring-[#f47920]" : ""
              }`}
              style={{
                background:
                  banner.slug === "all"
                    ? "linear-gradient(140deg,#111827,#1f2937,#0f172a)"
                    : banner.slug === "femme"
                      ? "linear-gradient(140deg,#C84B11,#F47920)"
                      : banner.slug === "electronique"
                        ? "linear-gradient(140deg,#1E3A5F,#1D4ED8)"
                        : "linear-gradient(140deg,#14532D,#16A34A)",
              }}
            >
              <div className="absolute -right-7 -top-7 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/35 to-transparent" />
              <div className="relative z-[1]">
                <div className="text-[10px] font-black uppercase tracking-[0.08em] text-white/80">
                  {banner.eyebrow}
                </div>
                <div className="mt-6 text-[16px] font-extrabold text-white">{banner.title}</div>
                <div className="mt-1 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-extrabold text-white">
                  {banner.discount}
                </div>
              </div>
            </button>
          ))}
        </section>

        <section
          id="promo-grid"
          className="rounded-[30px] border border-[#f0dfd2] bg-[linear-gradient(180deg,#ffffff,#fff8f3)] p-5 shadow-[0_18px_44px_rgba(15,23,42,.06)] dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0b1220)]"
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveCat(tab.key)}
                  className={`rounded-full px-4 py-2 text-[12px] font-bold transition ${
                    activeCat === tab.key
                      ? "bg-[#f47920] text-white"
                      : "border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#fff4eb] hover:text-[#c85e14] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-[12px] font-semibold text-[#9ca3af] dark:text-gray-400">
              {displayed.length} produits en promo
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-display text-[16px] font-extrabold text-[#111827] dark:text-white">
              <div className="h-[18px] w-[3px] rounded-full bg-[#f47920]" />
              Produits en promotion
            </div>
            <button
              type="button"
              onClick={() => setActiveCat("all")}
              className="text-[12px] font-bold text-[#f47920]"
            >
              Tout voir
            </button>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-[360px] animate-pulse rounded-[26px] bg-[#f3f4f6] dark:bg-gray-800" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-[#e5e7eb] bg-[#f9fafb] px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900/60">
              <ShoppingBag size={40} className="mx-auto text-[#f47920]" />
              <div className="mt-4 text-[20px] font-extrabold text-[#111827] dark:text-white">Aucune promotion active</div>
              <p className="mt-2 text-[13px] text-[#6b7280] dark:text-gray-400">
                Reviens bientôt, ou change de catégorie pour voir d’autres offres.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {displayed.map((product) => (
                <PromoProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onOpen={() => openProduct(product)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PromoProductCard({
  product,
  onAddToCart,
  onOpen,
}: {
  product: PromoProduct;
  onAddToCart: (event: React.MouseEvent, product: Product) => void;
  onOpen: () => void;
}) {
  const image = getProductImage(product);
  const stars = Math.round(product.rating_average ?? 0);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group overflow-hidden rounded-[26px] border border-[#f0dfd2] bg-white shadow-[0_14px_32px_rgba(15,23,42,.05)] transition hover:translate-y-[-3px] hover:border-[#f47920] dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="relative h-[220px] overflow-hidden bg-[linear-gradient(135deg,#fff7f0,#f9fafb)] dark:bg-[linear-gradient(135deg,#1f2937,#111827)]">
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[48px]">🛍️</div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold text-[#c85e14] dark:bg-gray-900/85 dark:text-primary">
          {product.category?.name ?? "Produit"}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-[#ef4444] px-3 py-1 text-[10px] font-extrabold text-white">
          -{product.discount_percent ?? product.discount ?? 0}%
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1 inline-flex items-center gap-2 text-[10px] font-bold text-[#f47920] dark:text-primary">
          <ShieldCheck size={12} />
          {product.category?.name ?? "Produit"}
        </div>
        <h3 className="line-clamp-2 min-h-[44px] text-[15px] font-extrabold leading-6 text-[#111827] dark:text-white">
          {product.title}
        </h3>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-[20px] font-black text-[#f47920]">{fmt(product.price_final)}</span>
          <span className="pb-1 text-[11px] font-semibold text-[#9ca3af] line-through">{fmt(product.compare_at_price ?? product.price_xaf)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2.5 py-1 font-bold text-[#166534] dark:bg-emerald-900/30 dark:text-emerald-300">
            <Percent size={12} />
            {product.discount_percent ?? product.discount ?? 0}% off
          </span>
          <span className="inline-flex items-center gap-1 text-[#6b7280] dark:text-gray-400">
            <Truck size={12} className="text-[#16a34a]" />
            24-72h
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[#6b7280] dark:text-gray-400">
          <span className="text-[#fbbf24]">{`${"★".repeat(stars)}${"☆".repeat(5 - stars)}`}</span>
          <span>({product.reviews_count ?? 0})</span>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={(event) => onAddToCart(event, product)}
            className="flex-1 rounded-full bg-[#f47920] px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-[#c85e14]"
          >
            Ajouter
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            className="rounded-full border border-[#f0dfd2] px-3 py-2.5 text-[#111827] transition hover:border-[#f47920] hover:text-[#c85e14] dark:border-gray-700 dark:text-white"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
