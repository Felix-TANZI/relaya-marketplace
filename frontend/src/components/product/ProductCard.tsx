import { Link } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Product = {
  id: number;
  name: string;
  price: number;
  image?: string;
  category?: string;
};

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
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
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[rgb(var(--subtext))]">
            Image indisponible
          </div>
        )}

        {/* Wishlist */}
        <button
          className={cn(
            "absolute right-3 top-3 rounded-xl p-2",
            "glass border border-[rgba(var(--border),0.4)]",
            "opacity-0 group-hover:opacity-100 transition"
          )}
          aria-label="Ajouter aux favoris"
        >
          <Heart size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        {product.category && (
          <span className="text-xs uppercase tracking-wide text-[rgb(var(--subtext))]">
            {product.category}
          </span>
        )}

        <Link
          to={`/product/${product.id}`}
          className="line-clamp-2 font-medium leading-snug hover:underline"
        >
          {product.name}
        </Link>

        <div className="mt-1 flex items-center justify-between">
          <div className="text-lg font-bold text-[rgb(var(--primary-strong))]">
            {product.price.toLocaleString()} FCFA
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="rounded-xl"
            aria-label="Ajouter au panier"
          >
            <ShoppingCart size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
