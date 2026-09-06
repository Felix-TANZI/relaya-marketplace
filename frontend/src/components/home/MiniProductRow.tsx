import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Product } from "@/services/api/products";

interface MiniProductRowProps {
  title: string;
  icon: LucideIcon;
  /** Pastille à droite du titre — « Nouveau », « Tendance »… */
  badge?: string;
  badgeClassName?: string;
  /** Fait respirer la pastille, pour les nouveautés. */
  animateBadge?: boolean;
  products: Product[];
  /** 1 ou 2 rangées défilant ensemble horizontalement. */
  rows?: 1 | 2;
  /** Destination du bouton de tête de frame. */
  to: string;
  seeAllLabel?: string;
  isMockProducts?: boolean;
}

function productImage(product: Product) {
  return product.media?.[0]?.url || product.images?.[0]?.image_url || "";
}

/**
 * Rangée compacte de l'accueil mobile : chaque produit se résume à sa photo, son
 * nom et son prix. Les cartes complètes (vendeur, note, bouton panier) restent
 * réservées aux frames qui en ont besoin — ici on privilégie la densité.
 */
export default function MiniProductRow({
  title,
  icon: Icon,
  badge,
  badgeClassName = "bg-[#fff1e5] text-primary",
  animateBadge = false,
  products,
  rows = 1,
  to,
  seeAllLabel = "Voir tout",
  isMockProducts = false,
}: MiniProductRowProps) {
  if (!products.length) return null;

  return (
    <section className="rounded-[22px] border border-[#f1e3d8] bg-white p-2.5 shadow-[0_10px_26px_rgba(15,23,42,.05)] dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="h-[16px] w-[3px] rounded bg-primary" />
        <Icon size={15} className="text-primary" fill="currentColor" />
        <h3 className="text-[14px] font-extrabold tracking-tight text-gray-900 dark:text-white">{title}</h3>

        {badge ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClassName} ${
              animateBadge ? "animate-badge-breathe" : ""
            }`}
          >
            {badge}
          </span>
        ) : null}

        <Link
          to={to}
          className="ml-auto inline-flex min-h-[30px] flex-shrink-0 items-center gap-1 rounded-full border border-[#f0d8c5] px-3 py-1.5 text-[11px] font-bold text-[#c85e14] transition hover:border-primary hover:bg-[#fff4eb] hover:text-primary dark:border-gray-700 dark:text-primary"
        >
          {seeAllLabel}
          <ArrowRight size={11} />
        </Link>
      </div>

      <div
        className={`grid grid-flow-col gap-2.5 overflow-x-auto scrollbar-hide pb-1 ${
          rows === 2 ? "grid-rows-2" : "grid-rows-1"
        }`}
        style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}
      >
        {products.map((product) => {
          const price = product.price_final ?? product.price_xaf;
          const href = isMockProducts ? `/product/${product.id}?mock=1` : `/product/${product.id}`;

          return (
            <Link
              key={product.id}
              to={href}
              className="flex w-[112px] flex-col gap-1.5"
              style={{ scrollSnapAlign: "start" }}
            >
              <span className="block aspect-square w-full overflow-hidden rounded-2xl bg-[#f4f6f8] dark:bg-gray-800">
                <img
                  src={productImage(product)}
                  alt={product.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </span>

              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-gray-700 dark:text-gray-200">
                {product.title}
              </span>

              <span className="text-[12.5px] font-black text-primary">
                {price.toLocaleString("fr-FR")} FCFA
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
