import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Product } from "@/features/catalog/types";

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "glass shadow-soft transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square bg-[rgba(var(--bg2),0.6)]">
        {image ? (
          <img
            src={image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[rgb(var(--subtext))]">
            {t("catalog.imageUnavailable", "Image indisponible")}
          </div>
        )}

        {/* Wishlist */}
        <button
          className={cn(
            "absolute right-3 top-3 rounded-xl p-2",
            "glass border border-[rgba(var(--border),0.4)]",
            "opacity-0 group-hover:opacity-100 transition"
          )}
          aria-label={t("catalog.addToWishlist", "Ajouter aux favoris")}
        >
          <Heart size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        {product.category && (
          <span className="text-xs uppercase tracking-wide text-[rgb(var(--subtext))]">
            {product.category.name}
          </span>
        )}

        <Link
          to={`/product/${product.id}`}
          className="line-clamp-2 font-medium leading-snug hover:underline"
        >
          {product.title}
        </Link>

        <div className="mt-1 flex items-center justify-between">
          <div className="text-lg font-bold text-[rgb(var(--primary-strong))]">
            {product.price_xaf.toLocaleString()} FCFA
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="rounded-xl"
            aria-label={t("catalog.addToCart", "Ajouter au panier")}
          >
            <ShoppingCart size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
