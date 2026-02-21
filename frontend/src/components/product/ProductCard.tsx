import { Heart, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";

interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}

interface ProductMedia {
  id: number;
  url: string;
  media_type: "image" | "video";
  sort_order: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  parent?: number | null;
}

interface Product {
  id: number;
  title: string;
  price_xaf: number;
  image?: string;
  images?: ProductImage[];
  media?: ProductMedia[];
  category?: Category | null;
  rating_average?: number | null;
  reviews_count?: number;
  stock_quantity?: number;
  discount?: number;
}

interface ProductCardProps {
  product: Product;
  showPromo?: boolean;
}

export default function ProductCard({
  product,
  showPromo = false,
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addItem } = useCart();

  const finalPrice = product.discount
    ? product.price_xaf - (product.price_xaf * product.discount) / 100
    : product.price_xaf;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.title,
      price: finalPrice,
      quantity: 1,
      image:
        product.images?.find((img) => img.is_primary)?.image_url ||
        product.images?.[0]?.image_url ||
        product.media?.find((m) => m.media_type === "image")?.url ||
        product.image,
    });
  };

  const displayImage =
    product.images?.find((img) => img.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    product.media?.find((m) => m.media_type === "image")?.url ||
    product.image;

  const inStock = product.stock_quantity ? product.stock_quantity > 0 : true;
  const hasReviews = product.reviews_count && product.reviews_count > 0;

  return (
    <Link to={`/product/${product.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group border border-gray-100 dark:border-gray-700">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            {showPromo && product.discount && (
              <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg shadow-lg">
                -{product.discount}%
              </span>
            )}
            {!inStock && (
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg">
                Épuisé
              </span>
            )}
          </div>

          {!imageError && displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
              <ShoppingCart className="text-gray-400" size={48} />
            </div>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              setIsFavorite(!isFavorite);
            }}
            className="absolute top-3 right-3 w-10 h-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
          >
            <Heart
              size={20}
              className={
                isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"
              }
            />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {product.category && (
            <p className="text-xs text-primary font-medium uppercase tracking-wide">
              {product.category.name}
            </p>
          )}

          <h3 className="font-semibold text-gray-800 dark:text-white line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
            {product.title}
          </h3>

          {/* Avis - N'afficher QUE si des avis existent */}
          {hasReviews &&
            product.rating_average &&
            product.reviews_count &&
            product.reviews_count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={
                        star <= Math.floor(product.rating_average!)
                          ? "fill-yellow-400 text-yellow-400"
                          : star - 0.5 <= product.rating_average!
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
                      }
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({product.reviews_count})
                </span>
              </div>
            )}

          <div className="flex items-center justify-between">
            <div>
              {product.discount ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      {finalPrice.toLocaleString()} FCFA
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 line-through">
                    {product.price_xaf.toLocaleString()} FCFA
                  </span>
                </div>
              ) : (
                <span className="text-lg font-bold text-gray-800 dark:text-white">
                  {product.price_xaf.toLocaleString()} FCFA
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`w-full py-2.5 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              inStock
                ? "bg-primary hover:bg-primary-dark text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            <ShoppingCart size={18} />
            {inStock ? "Ajouter au panier" : "Indisponible"}
          </button>
        </div>
      </div>
    </Link>
  );
}
