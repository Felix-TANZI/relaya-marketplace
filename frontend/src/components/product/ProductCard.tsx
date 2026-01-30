import { Heart, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Badge } from "@/components/ui";

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  category?: string;
  rating?: number;
  inStock?: boolean;
  isNew?: boolean;
  discount?: number;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);

  const finalPrice = product.discount 
    ? product.price - (product.price * product.discount / 100)
    : product.price;

  return (
    <Link to={`/product/${product.id}`}> 
       <Card variant="default" hover className="group overflow-hidden p-0">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-dark-bg-tertiary">
        {!imageError && product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="text-dark-text-tertiary" size={48} />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.isNew && <Badge variant="cyan">Nouveau</Badge>}
          {product.discount && (
            <Badge variant="pink">-{product.discount}%</Badge>
          )}
          {!product.inStock && <Badge variant="error">Épuisé</Badge>}
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-3 right-3 p-2 rounded-full glass border border-white/10 hover:border-holo-pink hover-glow-pink transition-all opacity-0 group-hover:opacity-100"
        >
          <Heart
            className={isFavorite ? "text-holo-pink fill-holo-pink" : "text-white"}
            size={18}
          />
        </button>

        {/* Quick Add to Cart */}
        <button className="absolute bottom-3 left-3 right-3 px-4 py-2 rounded-lg bg-gradient-holographic animate-gradient-bg text-white font-medium opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 hover:shadow-xl">
          <ShoppingCart size={16} className="inline mr-2" />
          Ajouter au panier
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category */}
        {product.category && (
          <p className="text-xs text-dark-text-tertiary uppercase tracking-wider">
            {product.category}
          </p>
        )}

        {/* Name */}
        <h3 className="font-semibold text-dark-text line-clamp-2 group-hover:text-holo-cyan transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={
                  i < Math.floor(product.rating!)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-dark-text-tertiary"
                }
              />
            ))}
            <span className="text-xs text-dark-text-secondary ml-1">
              ({product.rating})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-gradient animate-gradient-bg">
              {finalPrice.toLocaleString()} FCFA
            </span>
            {product.discount && (
              <span className="text-sm text-dark-text-tertiary line-through">
                {product.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
      </Card>
    </Link>  
  );
}