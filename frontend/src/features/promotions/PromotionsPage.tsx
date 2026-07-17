import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Baby,
  Copy,
  Dumbbell,
  Footprints,
  Gift,
  Home,
  Laptop,
  LayoutGrid,
  type LucideIcon,
  Percent,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
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

/** Icône équivalente pour un filtre catégorie (à partir du slug + libellé). */
function catIcon(source: string): LucideIcon {
  const k = source.toLowerCase();
  if (k.includes("phone") || k.includes("tablet") || k.includes("téléphone") || k.includes("telephone")) return Smartphone;
  if (k.includes("tech") || k.includes("electro") || k.includes("électro") || k.includes("informatique")) return Laptop;
  if (k.includes("beaut") || k.includes("cosmet") || k.includes("soin")) return Sparkles;
  if (k.includes("maison") || k.includes("bureau") || k.includes("deco") || k.includes("déco")) return Home;
  if (k.includes("chauss") || k.includes("shoe")) return Footprints;
  if (k.includes("sport") || k.includes("fitness")) return Dumbbell;
  if (k.includes("bebe") || k.includes("bébé") || k.includes("enfant") || k.includes("baby")) return Baby;
  if (k.includes("super") || k.includes("march") || k.includes("epicerie") || k.includes("épicerie") || k.includes("aliment")) return ShoppingCart;
  if (k.includes("femme") || k.includes("homme") || k.includes("mode") || k.includes("vetement") || k.includes("vêtement")) return Shirt;
  return Tag;
}

function useCountdown(endTime: number) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, endTime - Date.now()));
    // First tick on the next frame (not synchronously in the effect body).
    const raf = requestAnimationFrame(tick);
    const id = window.setInterval(tick, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
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
      score:
        (product.active_campaign?.discount_percent ?? product.discount_percent ?? product.discount ?? 0) * 2
        + (product.active_campaign?.campaign_type === "FLASH" ? 35 : 0)
        + (product.rating_average ?? 0) * 10
        + (product.reviews_count ?? 0),
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

        const promos = prodRes.results.filter((product) =>
          Boolean(product.active_campaign)
          || product.is_on_promotion
          || (product.discount_percent ?? product.discount ?? 0) > 0
        );
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
      <div className="mx-auto flex max-w-[1480px] flex-col gap-4 sm:gap-6">
        {/* ══════════ HERO ══════════ */}
        <section
          className="overflow-hidden rounded-[20px] border border-[#f2d1bc] px-4 py-3.5 text-white shadow-[0_24px_60px_rgba(244,121,32,.22)] dark:border-orange-900/40 sm:rounded-[32px] sm:px-6 sm:py-7"
          style={{ background: "linear-gradient(135deg,#0a0500,#2d0e00,#4a1800)" }}
        >
          <div className="relative">
            <div className="pointer-events-none absolute -left-10 bottom-[-72px] h-52 w-52 rounded-full bg-[#ff9d4d]/20 blur-3xl" />
            <div className="pointer-events-none absolute right-[-70px] top-[-90px] h-72 w-72 rounded-full bg-[#f47920]/30 blur-3xl" />

            <div className="relative z-[1] text-[9.5px] font-black uppercase tracking-[0.1em] text-white/65 sm:text-[10.5px]">
              Offres limitées
            </div>
            <h1 className="relative z-[1] mt-1.5 font-display text-[17px] font-extrabold tracking-tight sm:mt-2 sm:text-[30px]">
              Promotions du Moment
            </h1>
            <p className="relative z-[1] mt-2 hidden max-w-[760px] text-[13px] leading-7 text-white/75 sm:block">
              {displayed.length} offres actives · Mise à jour en temps réel · Escrow garanti sur tous les achats
            </p>

            <div className="relative z-[1] mt-3 flex flex-wrap items-center gap-1.5 sm:mt-5 sm:gap-2">
              {[countdown.hours, countdown.minutes, countdown.seconds].map((value, index) => (
                <div key={`${value}-${index}`} className="contents">
                  {index > 0 ? <div className="pb-1.5 text-[14px] font-black text-[#f47920] sm:pb-3 sm:text-[20px]">:</div> : null}
                  <div className="min-w-[40px] rounded-[10px] border border-white/20 bg-white/10 px-1.5 py-1 text-center backdrop-blur-[4px] sm:min-w-[64px] sm:rounded-[12px] sm:px-3 sm:py-2">
                    <div className="font-display text-[15px] font-extrabold leading-none text-white sm:text-[24px]">{value}</div>
                    <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.05em] text-white/55 sm:mt-1 sm:text-[9.5px]">
                      {index === 0 ? "Heures" : index === 1 ? "Min" : "Sec"}
                    </div>
                  </div>
                </div>
              ))}
              <div className="ml-1.5 text-[9.5px] leading-[1.3] text-white/65 sm:ml-2 sm:text-[12px] sm:leading-[1.4]">
                Fin du
                <br />
                Flash Sale
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ CODE PROMO ══════════ */}
        <section
          className="rounded-[14px] border border-[#86efac] px-3 py-2 shadow-[0_10px_22px_rgba(22,163,74,.08)] dark:border-emerald-900/40 sm:rounded-[18px] sm:px-4 sm:py-3"
          style={{ background: "linear-gradient(110deg,#f0fdf4,#dcfce7)" }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#16a34a]/15 text-[#15803d] dark:bg-emerald-400/15 dark:text-emerald-300 sm:h-10 sm:w-10">
              <Gift size={16} className="sm:hidden" />
              <Gift size={18} className="hidden sm:block" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-extrabold text-[#15803d] dark:text-emerald-200 sm:text-[13.5px]">
                <span className="sm:hidden">-10% avec le code BIENVENUE10</span>
                <span className="hidden sm:inline">Code Bienvenue actif — BIENVENUE10</span>
              </div>
              <div className="truncate text-[10.5px] text-[#15803d]/85 dark:text-emerald-100/80 sm:text-[12px]">
                <span className="sm:hidden">Sur votre 1ère commande · Encore 48h</span>
                <span className="hidden sm:inline">-10% sur votre 1ère commande · Valable encore 48h · Applicable au checkout</span>
              </div>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-[10px] bg-[#16a34a] px-2.5 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-[#15803d] sm:gap-2 sm:px-4 sm:py-2 sm:text-[12px]"
            >
              {codeCopied ? <Gift size={13} /> : <Copy size={13} />}
              {codeCopied ? "Copié !" : "Copier"}
            </button>
          </div>
        </section>

        {/* ══════════ BANNIÈRES CATÉGORIES — desktop uniquement (doublon des filtres sur mobile) ══════════ */}
        <section className="hidden gap-3 sm:grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
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

        {/* ══════════ FILTRES CATÉGORIES — barre scrollable, hors de la grille ══════════ */}
        <div className="-mx-4 flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
          {filterTabs.map((tab) => {
            const Icon = tab.key === "all" ? LayoutGrid : catIcon(`${tab.key} ${tab.label}`);
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveCat(tab.key)}
                className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold transition sm:px-4 ${
                  activeCat === tab.key
                    ? "bg-[#f47920] text-white shadow-sm"
                    : "border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#fff4eb] hover:text-[#c85e14] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ══════════ GRILLE PRODUITS ══════════ */}
        <section
          id="promo-grid"
          className="rounded-[22px] border border-[#f0dfd2] bg-[linear-gradient(180deg,#ffffff,#fff8f3)] p-3 shadow-[0_18px_44px_rgba(15,23,42,.06)] dark:border-gray-800 dark:bg-[linear-gradient(180deg,#111827,#0b1220)] sm:rounded-[30px] sm:p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-display text-[14px] font-extrabold text-[#111827] dark:text-white sm:text-[16px]">
              <div className="h-[18px] w-[3px] rounded-full bg-[#f47920]" />
              Produits en promotion
            </div>
            <div className="flex-shrink-0 text-[12px] font-semibold text-[#9ca3af] dark:text-gray-400">
              {displayed.length} produits
            </div>
          </div>

          {loading ? (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-[180px] animate-pulse rounded-2xl bg-[#f3f4f6] dark:bg-gray-800 sm:h-[360px] sm:rounded-[26px]" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-[#e5e7eb] bg-[#f9fafb] px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900/60 sm:px-6 sm:py-14">
              <ShoppingBag size={40} className="mx-auto text-[#f47920]" />
              <div className="mt-4 text-[16px] font-extrabold text-[#111827] dark:text-white sm:text-[20px]">Aucune promotion active</div>
              <p className="mt-2 text-[13px] text-[#6b7280] dark:text-gray-400">
                Reviens bientôt, ou change de catégorie pour voir d’autres offres.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
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
      className="group overflow-hidden rounded-2xl border border-[#f0dfd2] bg-white shadow-[0_14px_32px_rgba(15,23,42,.05)] transition hover:translate-y-[-3px] hover:border-[#f47920] dark:border-gray-800 dark:bg-gray-900 sm:rounded-[26px]"
    >
      <div className="relative aspect-square overflow-hidden bg-[linear-gradient(135deg,#fff7f0,#f9fafb)] dark:bg-[linear-gradient(135deg,#1f2937,#111827)] sm:aspect-auto sm:h-[220px]">
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#f0c9ab] dark:text-gray-700">
            <ShoppingBag size={40} strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute left-3 top-3 hidden rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold text-[#c85e14] dark:bg-gray-900/85 dark:text-primary sm:block">
          {product.category?.name ?? "Produit"}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-[#ef4444] px-2 py-0.5 text-[9px] font-extrabold text-white sm:right-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[10px]">
          -{product.active_campaign?.discount_percent ?? product.discount_percent ?? product.discount ?? 0}%
        </div>
      </div>

      <div className="p-2 sm:p-4">
        <div className="mb-1 hidden items-center gap-2 text-[10px] font-bold text-[#f47920] dark:text-primary sm:inline-flex">
          <ShieldCheck size={12} />
          {product.category?.name ?? "Produit"}
        </div>
        <h3 className="line-clamp-2 text-[11.5px] font-extrabold leading-tight text-[#111827] dark:text-white sm:min-h-[44px] sm:text-[15px] sm:leading-6">
          {product.title}
        </h3>
        <div className="mt-1.5 flex flex-col leading-tight sm:mt-3 sm:flex-row sm:items-end sm:gap-2 sm:leading-normal">
          <span className="text-[13px] font-black text-[#f47920] sm:text-[20px]">{fmt(product.price_final)}</span>
          <span className="text-[10px] font-semibold text-[#9ca3af] line-through sm:pb-1 sm:text-[11px]">{fmt(product.compare_at_price ?? product.price_xaf)}</span>
        </div>
        <div className="mt-2 hidden items-center justify-between text-[11px] sm:flex">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2.5 py-1 font-bold text-[#166534] dark:bg-emerald-900/30 dark:text-emerald-300">
            <Percent size={12} />
            {product.active_campaign?.discount_percent ?? product.discount_percent ?? product.discount ?? 0}% off
          </span>
          <span className="inline-flex items-center gap-1 text-[#6b7280] dark:text-gray-400">
            <Truck size={12} className="text-[#16a34a]" />
            24-72h
          </span>
        </div>
        <div className="mt-3 hidden items-center gap-2 text-[11px] text-[#6b7280] dark:text-gray-400 sm:flex">
          <span className="text-[#fbbf24]">{`${"★".repeat(stars)}${"☆".repeat(5 - stars)}`}</span>
          <span>({product.reviews_count ?? 0})</span>
        </div>
        <div className="mt-2 flex gap-2 sm:mt-4">
          <button
            type="button"
            onClick={(event) => onAddToCart(event, product)}
            className="flex-1 rounded-full bg-[#f47920] px-2 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-[#c85e14] sm:px-4 sm:py-2.5 sm:text-[12px]"
          >
            Ajouter
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            className="hidden rounded-full border border-[#f0dfd2] px-3 py-2.5 text-[#111827] transition hover:border-[#f47920] hover:text-[#c85e14] dark:border-gray-700 dark:text-white sm:block"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}