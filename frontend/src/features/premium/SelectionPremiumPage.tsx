import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Baby, Dumbbell, Flame, Footprints, Gift, House, Laptop, PackageSearch,
  RefreshCw, ShieldCheck, Shirt, ShoppingBasket, Smartphone, Sparkles, Star, Tag, Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { V29_PRODUCTS } from "@/data/v29Products";
import { productsApi, type Product } from "@/services/api/products";
import { PfShellStyles } from "@/styles/pfShell";

/* ─────────────────────────── Règles de sélection ─────────────────────────── */

const MIN_RATING = 4;
const MIN_DISCOUNT = 20;
const HEART_RATING = 4.5;

type SortKey = "rating" | "pertinence" | "discount" | "price-asc" | "price-desc";

const SORT_OPTIONS: { value: SortKey; labelKey: string }[] = [
  { value: "rating", labelKey: "cl7_selection_premium.sort_top_rated" },
  { value: "pertinence", labelKey: "cl7_selection_premium.sort_relevance" },
  { value: "discount", labelKey: "cl7_selection_premium.sort_discount" },
  { value: "price-asc", labelKey: "cl7_selection_premium.sort_price_asc" },
  { value: "price-desc", labelKey: "cl7_selection_premium.sort_price_desc" },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  femme: Shirt, homme: Shirt, tech: Laptop, phone: Smartphone, beaute: Sparkles,
  maison: House, sport: Dumbbell, shoes: Footprints, chaussures: Footprints,
  bebe: Baby, supermarche: ShoppingBasket,
};

interface SectionDef {
  key: "hearts" | "deals" | "month";
  titleKey: string;
  icon: LucideIcon;
  iconClass: string;
  subtitleKey: string;
  subtitleParams?: Record<string, number>;
  chipKey: string;
  chipClass: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: "hearts",
    titleKey: "cl7_selection_premium.section_hearts_title",
    icon: Star,
    iconClass: "text-amber-500",
    subtitleKey: "cl7_selection_premium.section_hearts_subtitle",
    subtitleParams: { rating: HEART_RATING },
    chipKey: "cl7_selection_premium.chip_top_rated",
    chipClass: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    key: "deals",
    titleKey: "cl7_selection_premium.section_deals_title",
    icon: Flame,
    iconClass: "animate-flame-flicker text-[#F47920]",
    subtitleKey: "cl7_selection_premium.section_deals_subtitle",
    subtitleParams: { discount: MIN_DISCOUNT },
    chipKey: "cl7_selection_premium.chip_best_price",
    chipClass: "bg-orange-50 text-[#C85E14] ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300",
  },
  {
    key: "month",
    titleKey: "cl7_selection_premium.section_month_title",
    icon: Gift,
    iconClass: "text-violet-500",
    subtitleKey: "cl7_selection_premium.section_month_subtitle",
    chipKey: "cl7_selection_premium.chip_recommended",
    chipClass: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300",
  },
];

/* ─────────────────────────────── Utilitaires ────────────────────────────── */

function discountOf(product: Product): number {
  return product.discount_percent ?? product.discount ?? 0;
}
function ratingOf(product: Product): number {
  return product.rating_average ?? 0;
}
function priceOf(product: Product): number {
  return product.price_final ?? product.price_xaf ?? 0;
}

/* ────────────────────────────────── Page ────────────────────────────────── */

export default function SelectionPremiumPage() {
  const { t } = useTranslation();
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [usingMockProducts, setUsingMockProducts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("rating");
  const [categorySlug, setCategorySlug] = useState<string>("all");

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
        if (cancelled) return;
        setApiProducts([]);
        setUsingMockProducts(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const sourceProducts = usingMockProducts ? V29_PRODUCTS : apiProducts;

  const pool = useMemo(
    () => sourceProducts.filter(
      (product) => ratingOf(product) >= MIN_RATING || discountOf(product) >= MIN_DISCOUNT
    ),
    [sourceProducts]
  );

  const stats = useMemo(() => {
    const rated = pool.filter((product) => ratingOf(product) > 0);
    return {
      count: pool.length,
      rating: rated.length
        ? rated.reduce((total, product) => total + ratingOf(product), 0) / rated.length
        : 0,
    };
  }, [pool]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    pool.forEach((product) => {
      if (product.category?.slug && !seen.has(product.category.slug)) {
        seen.set(product.category.slug, product.category.name);
      }
    });
    return Array.from(seen, ([slug, name]) => ({ slug, name }));
  }, [pool]);

  const filtered = useMemo(() => {
    const list =
      categorySlug === "all"
        ? [...pool]
        : pool.filter((product) => product.category?.slug === categorySlug);
    switch (sort) {
      case "discount":
        return list.sort((a, b) => discountOf(b) - discountOf(a));
      case "price-asc":
        return list.sort((a, b) => priceOf(a) - priceOf(b));
      case "price-desc":
        return list.sort((a, b) => priceOf(b) - priceOf(a));
      case "pertinence":
        return list.sort(
          (a, b) =>
            ratingOf(b) - ratingOf(a) ||
            (b.reviews_count ?? 0) - (a.reviews_count ?? 0) ||
            discountOf(b) - discountOf(a)
        );
      default:
        return list.sort(
          (a, b) => ratingOf(b) - ratingOf(a) || (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
        );
    }
  }, [pool, categorySlug, sort]);

  const grouped = useMemo(() => {
    const hearts: Product[] = [];
    const deals: Product[] = [];
    const month: Product[] = [];
    filtered.forEach((product) => {
      if (ratingOf(product) >= HEART_RATING) hearts.push(product);
      else if (discountOf(product) >= MIN_DISCOUNT) deals.push(product);
      else month.push(product);
    });
    return { hearts, deals, month };
  }, [filtered]);

  const isEmpty = !loading && filtered.length === 0;

  /* Tuiles : deux chiffres du catalogue, deux garanties — tons pf-stat o/a/b/p. */
  const heroTiles: { value: string; label: string; tone: string; icon: LucideIcon }[] = [
    { value: `${stats.count}`, label: t("cl7_selection_premium.stat_products"), tone: "o", icon: Tag },
    { value: stats.rating ? `${stats.rating.toFixed(1)}+` : "—", label: t("cl7_selection_premium.stat_rating"), tone: "a", icon: Star },
    { value: "100%", label: t("cl7_selection_premium.stat_escrow"), tone: "b", icon: ShieldCheck },
    { value: "24–72h", label: t("cl7_selection_premium.stat_delivery"), tone: "p", icon: Truck },
  ];

  const pillStyle = (active: boolean): CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    borderRadius: 999, padding: "7px 15px", fontSize: "11.5px", fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", transition: "all .18s", whiteSpace: "nowrap",
    ...(active
      ? { background: "linear-gradient(135deg,var(--pf-accent2),var(--pf-accent))", color: "#fff", border: "none", boxShadow: "0 6px 16px rgba(244,97,15,.3)" }
      : { background: "var(--pf-glass)", border: "1px solid var(--pf-glass-border)", color: "var(--pf-text2)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }),
  });

  return (
    <div className="pf-root" style={{ minHeight: "100vh" }}>
      <PfShellStyles />
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "18px 16px 64px" }}>

        {/* ═══ En-tête (style pf-ident) ═══ */}
        <section className="pf-ident pf-anim">
          <div className="pf-avatar"><Sparkles size={26} /></div>
          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <div className="pf-name">{t("cl7_selection_premium.header_title")}</div>
            <div className="pf-meta">
              <span><ShieldCheck size={13} /> {t("cl7_selection_premium.header_meta_certified")}</span>
              <span><RefreshCw size={13} /> {t("cl7_selection_premium.header_meta_updated")}</span>
            </div>
          </div>
          <span className="pf-chip"><ShieldCheck size={14} /> {t("cl7_selection_premium.header_chip_escrow")}</span>
        </section>

        {/* ═══ Tuiles stats (pf-stat o/a/b/p) ═══ */}
        <div className="pf-stats" style={{ marginTop: 16 }}>
          {heroTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.label} className="pf-stat pf-anim">
                <div className={`pf-stat-ic ${tile.tone}`}><Icon size={18} /></div>
                <div className="pf-stat-body">
                  <div className="pf-stat-n">{tile.value}</div>
                  <div className="pf-stat-l">{tile.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Catégories + tri ═══ */}
        <section style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 20 }}>
          <div style={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => setCategorySlug("all")} style={pillStyle(categorySlug === "all")}>
              <Sparkles size={11} /> {t("cl7_selection_premium.filter_all")}
            </button>
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.slug] ?? Tag;
              const active = categorySlug === category.slug;
              return (
                <button key={category.slug} type="button" onClick={() => setCategorySlug(category.slug)} style={pillStyle(active)}>
                  <Icon size={11} style={{ color: active ? "#fff" : "var(--pf-accent)" }} /> {category.name}
                </button>
              );
            })}
          </div>
          <label style={{ ...pillStyle(false), paddingRight: 6, cursor: "default" }}>
            <Star size={11} style={{ color: "var(--pf-accent)" }} fill="currentColor" />
            <span className="sr-only">{t("cl7_selection_premium.sort_aria_label")}</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              style={{ background: "transparent", border: "none", outline: "none", color: "var(--pf-text2)", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
              ))}
            </select>
          </label>
        </section>

        {/* ═══ Les 3 rayons ═══ */}
        {loading ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[0.72] rounded-[14px]" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="pf-card pf-anim" style={{ marginTop: 20 }}>
            <div className="pf-empty">
              <span className="pf-empty-ic"><PackageSearch size={26} /></span>
              <p className="pf-empty-t">{t("cl7_selection_premium.empty_title")}</p>
              <p className="pf-sub" style={{ maxWidth: 460, margin: "6px auto 0" }}>
                {t("cl7_selection_premium.empty_description", { minRating: MIN_RATING, minDiscount: MIN_DISCOUNT })}
              </p>
              <Link to="/catalog" className="pf-btn-ghost" style={{ marginTop: 14, display: "inline-flex" }}>
                {t("cl7_selection_premium.browse_catalog")}
              </Link>
            </div>
          </div>
        ) : (
          SECTIONS.map((section) => {
            const products = grouped[section.key];
            if (products.length === 0) return null;
            const Icon = section.icon;
            return (
              <section key={section.key} style={{ marginTop: 26 }}>
                <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Icon size={17} className={section.iconClass} />
                  <h2 style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-.01em", color: "var(--pf-text)" }}>
                    {t(section.titleKey)}
                  </h2>
                  <span style={{ fontSize: 11.5, color: "var(--pf-muted)" }}>
                    · {t(section.subtitleKey, section.subtitleParams)} · {t(products.length > 1 ? "cl7_selection_premium.article_count_plural" : "cl7_selection_premium.article_count", { count: products.length })}
                  </span>
                </header>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
                  {products.map((product) => (
                    <div key={product.id} className="flex flex-col gap-1.5">
                      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-[0.1em] ring-1 ${section.chipClass}`}>
                        <Icon size={9} />
                        {t(section.chipKey)}
                      </span>
                      <ProductCard product={product} showPromo compact isMock={usingMockProducts} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}