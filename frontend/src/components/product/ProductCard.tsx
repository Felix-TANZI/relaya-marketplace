import { Heart, ShoppingCart } from "lucide-react";
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
  media_type: 'image' | 'video';
  sort_order: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

interface Product {
  id: number;
  title: string;
  price_xaf: number;
  image?: string;
  images?: ProductImage[];
  media?: ProductMedia[];
  category?: Category | null;
  rating?: number;
  inStock?: boolean;
  discount?: number;
}

interface ProductCardProps {
  product: Product;
  showPromo?: boolean;
}

export default function ProductCard({ product, showPromo = false }: ProductCardProps) {
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
        product.media?.find((m) => m.media_type === 'image')?.url ||
        product.image,
    });
  };

  const displayImage =
    product.images?.find((img) => img.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    product.media?.find((m) => m.media_type === 'image')?.url ||
    product.image;

  return (
    <Link to={`/product/${product.id}`}>
      <div className="bg-white dark:bg-bg-dark-alt rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all group">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
          {showPromo && product.discount && (
            <div className="absolute top-3 left-3 z-10">
              <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg shadow-lg">
                Promo
              </span>
            </div>
          )}
          
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
            className="absolute top-3 right-3 w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
          >
            <Heart
              size={20}
              className={isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"}
            />
          </button>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-text-light dark:text-text-dark mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>

          {product.category && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {product.category.name}
            </p>
          )}

          <div className="flex items-center justify-between mb-3">
            <div>
              {product.discount ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">
                    {finalPrice.toLocaleString()} FCFA
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {product.price_xaf.toLocaleString()} FCFA
                  </span>
                </div>
              ) : (
                <span className="text-lg font-bold text-text-light dark:text-text-dark">
                  {product.price_xaf.toLocaleString()} FCFA
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart size={18} />
            Ajouter au panier
          </button>
        </div>
      </div>
    </Link>
  );
}