import { useEffect, useMemo, useState } from "react";
import { Flame, Sparkles, TrendingUp, ShieldCheck, Truck, Store } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Product = {
  id: number;
  name: string;
  price: number;
  image?: string;
  category?: string;
};

type Pill = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

const pills: Pill[] = [
  { key: "trending", label: "Tendance", icon: <TrendingUp size={16} /> },
  { key: "flash", label: "Flash Deals", icon: <Flame size={16} /> },
  { key: "new", label: "Nouveautes", icon: <Sparkles size={16} /> },
];

const fallbackProducts: Product[] = [
  { id: 1, name: "Casque audio Pro", price: 59000, category: "Tech" },
  { id: 2, name: "Sac a dos urbain", price: 25000, category: "Mode" },
  { id: 3, name: "Lampe minimaliste", price: 18000, category: "Maison" },
  { id: 4, name: "Montre classique", price: 42000, category: "Accessoires" },
  { id: 5, name: "Enceinte compacte", price: 36000, category: "Audio" },
  { id: 6, name: "Chaussures lifestyle", price: 31000, category: "Mode" },
  { id: 7, name: "Mug ceramique", price: 6000, category: "Maison" },
  { id: 8, name: "Kit voyage premium", price: 27000, category: "Voyage" },
];

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePill, setActivePill] = useState<string>("trending");

  useEffect(() => {
    let active = true;
    fetch("http://localhost:8000/api/products/")
      .then((res) => {
        if (!res.ok) {
          throw new Error("request failed");
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : fallbackProducts;
        setProducts(list);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setProducts(fallbackProducts);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const topProducts = useMemo(() => {
    // Pour l'instant: simple slice (on branchera un scoring plus tard)
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
            <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 glass border border-[rgba(var(--border-rgb),0.45)] text-xs tracking-wide text-[rgb(var(--subtext-rgb))]">
              <ShieldCheck size={16} />
              Vendeurs verifies - Paiement securise - Support reactif
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-5xl">
              Relaya,
              <span className="block text-[rgba(var(--text-rgb),0.85)]">
                le marketplace premium du Cameroun.
              </span>
            </h1>

            <p className="mt-4 text-[rgb(var(--subtext-rgb))]">
              Une experience d'achat fluide, une selection large, et une logistique pensee
              pour Yaounde & Douala (puis extension nationale).
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" className="rounded-2xl">
                Explorer maintenant
              </Button>
              <Button variant="secondary" className="rounded-2xl">
                Devenir vendeur
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="glass rounded-2xl border border-[rgba(var(--border-rgb),0.45)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Truck size={16} />
                  Livraison
                </div>
                <div className="mt-1 text-xs text-[rgb(var(--subtext-rgb))]">
                  Suivi en temps reel
                </div>
              </div>

              <div className="glass rounded-2xl border border-[rgba(var(--border-rgb),0.45)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Store size={16} />
                  Boutiques
                </div>
                <div className="mt-1 text-xs text-[rgb(var(--subtext-rgb))]">
                  Vendeurs verifies
                </div>
              </div>

              <div className="glass rounded-2xl border border-[rgba(var(--border-rgb),0.45)] p-4">
                <div className="text-sm font-semibold">FCFA</div>
                <div className="mt-1 text-xs text-[rgb(var(--subtext-rgb))]">
                  MoMo / OM
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT VISUAL BLOCK */}
          <div className="relative">
            <div className="grid gap-4">
              <div className="glass rounded-[26px] border border-[rgba(var(--border-rgb),0.45)] p-6 shadow-soft">
                <div className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--subtext-rgb))]">
                  Selection
                </div>
                <div className="mt-2 text-lg font-bold">
                  Produits choisis pour la qualite
                </div>
                <div className="mt-3 text-sm text-[rgb(var(--subtext-rgb))]">
                  Design, tech, maison, mode - une vitrine propre et premium.
                </div>
              </div>

              <div className="glass rounded-[26px] border border-[rgba(var(--border-rgb),0.45)] p-6 shadow-soft">
                <div className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--subtext-rgb))]">
                  Experience
                </div>
                <div className="mt-2 text-lg font-bold">
                  Rapide, clair, sans friction
                </div>
                <div className="mt-3 text-sm text-[rgb(var(--subtext-rgb))]">
                  Recherche intelligente, filtres fluides, commandes simples.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLS */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Decouvrir</h2>
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
                  "border border-[rgba(var(--border-rgb),0.45)]",
                  active
                    ? "bg-[rgba(var(--primary),0.18)] text-[rgb(var(--text-rgb))]"
                    : "glass hover:bg-[rgba(var(--glass),0.75)] text-[rgb(var(--subtext-rgb))]"
                )}
              >
                {p.icon}
                {p.label}
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
              ? "Offres Flash"
              : activePill === "new"
              ? "Nouveautes"
              : "Tendance"}
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


