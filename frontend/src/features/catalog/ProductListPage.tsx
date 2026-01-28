import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame, Sparkles, TrendingUp, ShieldCheck, Truck, Store } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { listProducts } from "./api";
import type { Product } from "./types";

type Pill = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

const pills: Pill[] = [
  { key: "trending", label: "catalog.pills.trending", icon: <TrendingUp size={16} /> },
  { key: "flash", label: "catalog.pills.flash", icon: <Flame size={16} /> },
  { key: "new", label: "catalog.pills.new", icon: <Sparkles size={16} /> },
];

export default function ProductListPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePill, setActivePill] = useState<string>("trending");

  useEffect(() => {
    listProducts()
      .then((data) => {
        setProducts(data);
        setError(null);
      })
      .catch((err) => {
        setError(String(err?.message || err));
      })
      .finally(() => setLoading(false));
  }, []);

  const topProducts = useMemo(() => {
    // Pour l’instant: simple slice (on branchera un scoring plus tard)
    return products.slice(0, 12);
  }, [products]);

  return (
    <div className="flex flex-col gap-10">
      {/* HERO PREMIUM */}
      <section className="relative overflow-hidden rounded-[28px] glass shadow-soft p-8 md:p-12">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[rgba(var(--primary),0.18)] blur-3xl" />
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[rgba(var(--accent),0.14)] blur-3xl" />
        </div>

        <div className="relative z-10 grid gap-10 md:grid-cols-2 md:items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 glass border border-[rgba(var(--border),0.45)] text-xs tracking-wide text-[rgb(var(--subtext))]">
              <ShieldCheck size={16} />
              {t(
                "catalog.hero.badge",
                "Vendeurs vérifiés · Paiement sécurisé · Support réactif"
              )}
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-5xl">
              {t("catalog.hero.title", "Relaya,")}
              <span className="block text-[rgba(var(--text),0.85)]">
                {t("catalog.hero.subtitle", "le marketplace premium du Cameroun.")}
              </span>
            </h1>

            <p className="mt-4 text-[rgb(var(--subtext))]">
              {t(
                "catalog.hero.description",
                "Une expérience d’achat fluide, une sélection large, et une logistique pensée pour Yaoundé & Douala (puis extension nationale)."
              )}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" className="rounded-2xl">
                {t("catalog.hero.ctaExplore", "Explorer maintenant")}
              </Button>
              <Button variant="secondary" className="rounded-2xl">
                {t("catalog.hero.ctaSell", "Devenir vendeur")}
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="glass rounded-2xl border border-[rgba(var(--border),0.45)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Truck size={16} />
                  {t("catalog.hero.delivery.title", "Livraison")}
                </div>
                <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                  {t("catalog.hero.delivery.subtitle", "Suivi en temps réel")}
                </div>
              </div>

              <div className="glass rounded-2xl border border-[rgba(var(--border),0.45)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Store size={16} />
                  {t("catalog.hero.shops.title", "Boutiques")}
                </div>
                <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                  {t("catalog.hero.shops.subtitle", "Vendeurs vérifiés")}
                </div>
              </div>

              <div className="glass rounded-2xl border border-[rgba(var(--border),0.45)] p-4">
                <div className="text-sm font-semibold">
                  {t("catalog.hero.payments.title", "FCFA")}
                </div>
                <div className="mt-1 text-xs text-[rgb(var(--subtext))]">
                  {t("catalog.hero.payments.subtitle", "MoMo / OM")}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT VISUAL BLOCK */}
          <div className="relative">
            <div className="grid gap-4">
              <div className="glass rounded-[26px] border border-[rgba(var(--border),0.45)] p-6 shadow-soft">
                <div className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--subtext))]">
                  {t("catalog.hero.blockSelection.label", "Sélection")}
                </div>
                <div className="mt-2 text-lg font-bold">
                  {t(
                    "catalog.hero.blockSelection.title",
                    "Produits choisis pour la qualité"
                  )}
                </div>
                <div className="mt-3 text-sm text-[rgb(var(--subtext))]">
                  {t(
                    "catalog.hero.blockSelection.description",
                    "Design, tech, maison, mode — une vitrine propre et premium."
                  )}
                </div>
              </div>

              <div className="glass rounded-[26px] border border-[rgba(var(--border),0.45)] p-6 shadow-soft">
                <div className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--subtext))]">
                  {t("catalog.hero.blockExperience.label", "Expérience")}
                </div>
                <div className="mt-2 text-lg font-bold">
                  {t(
                    "catalog.hero.blockExperience.title",
                    "Rapide, clair, sans friction"
                  )}
                </div>
                <div className="mt-3 text-sm text-[rgb(var(--subtext))]">
                  {t(
                    "catalog.hero.blockExperience.description",
                    "Recherche intelligente, filtres fluides, commandes simples."
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLS */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("catalog.discovery", "Découvrir")}</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {pills.map((p) => {
            const active = p.key === activePill;
            return (
              <button
                key={p.key}
                onClick={() => setActivePill(p.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
                  "border border-[rgba(var(--border),0.45)]",
                  active
                    ? "bg-[rgba(var(--primary),0.18)] text-[rgb(var(--text))]"
                    : "glass hover:bg-[rgba(var(--glass),0.75)] text-[rgb(var(--subtext))]"
                )}
              >
                {p.icon}
                {t(p.label)}
              </button>
            );
          })}
        </div>
      </section>

      {/* PRODUCTS GRID */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {activePill === "flash"
              ? t("catalog.sections.flash", "Offres Flash")
              : activePill === "new"
              ? t("catalog.sections.new", "Nouveautés")
              : t("catalog.sections.trending", "Tendance")}
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl bg-[rgba(var(--bg2),0.6)] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[rgba(var(--border),0.4)] bg-[rgba(var(--glass),0.5)] p-6 text-sm text-[rgb(var(--muted))]">
            {t("catalog.error", "Impossible de charger les produits.")} {error}
          </div>
        ) : topProducts.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(var(--border),0.4)] bg-[rgba(var(--glass),0.5)] p-6 text-sm text-[rgb(var(--muted))]">
            {t("catalog.empty", "Aucun produit disponible pour le moment.")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {topProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
