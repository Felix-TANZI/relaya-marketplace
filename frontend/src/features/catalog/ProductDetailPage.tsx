// frontend/src/features/catalog/ProductDetailPage.tsx
// Page de détail d'un produit avec support images uploadées

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, ChevronLeft, Star, Package, AlertCircle } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import ProductCard from "@/components/product/ProductCard";
import { useCart } from '@/context/CartContext';
import { productsApi, type Product, type ProductImage } from '@/services/api/products';


export default function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);

  // Charger le produit depuis l'API
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await productsApi.get(parseInt(id));
        setProduct(data);
        // Charger les produits similaires
        const similar = await productsApi.getSimilar(parseInt(id), 8);
        setSimilarProducts(similar);
      } catch (err) {
        console.error('Erreur chargement produit:', err);
        setError(t('product.error_message'));
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, t]);

  const handleAddToCart = () => {
    if (!product) return;

    const productImages = product.images;
    const displayImage = productImages?.find(img => img.is_primary)?.image_url 
      || productImages?.[0]?.image_url
      || product.media?.[0]?.url;

    addItem({
      id: product.id,
      name: product.title,
      price: product.price_xaf,
      quantity: quantity,
      image: displayImage,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-holo-cyan/30 border-t-holo-cyan rounded-full animate-spin mb-4" />
          <p className="text-dark-text-secondary">{t('product.loading')}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="text-red-400" size={40} />
          </div>
          <h1 className="font-display font-bold text-2xl text-dark-text mb-4">
            {error ? t('product.error') : t('product.not_found')}
          </h1>
          <p className="text-dark-text-secondary mb-8">
            {error || t('product.error_message')}
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/catalog">
              <Button variant="gradient">
                <ChevronLeft size={20} />
                {t('product.back_to_catalog')}
              </Button>
            </Link>
            {error && (
              <Button variant="secondary" onClick={() => window.location.reload()}>
                {t('product.retry')}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const inStock = product.stock_quantity > 0;
  const productImages = product.images;
  const images = productImages || [];
  const legacyImages = product.media || [];
  const allImages = images.length > 0 ? images : legacyImages;

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-dark-text-secondary mb-8">
          <Link to="/" className="hover:text-holo-cyan transition-colors">
            {t('header.home')}
          </Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-holo-cyan transition-colors">
            {t('header.catalog')}
          </Link>
          {product.category && (
            <>
              <span>/</span>
              <span className="text-dark-text">{product.category.name}</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Images Gallery */}
          <div>
            {/* Main Image */}
            <div className="aspect-square rounded-2xl overflow-hidden glass border border-white/10 mb-4">
              {allImages.length > 0 ? (
                <img
                  src={'image_url' in allImages[selectedImageIndex] 
                    ? (allImages[selectedImageIndex] as ProductImage).image_url 
                    : allImages[selectedImageIndex].url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-dark-bg-tertiary">
                  <Package className="text-dark-text-tertiary" size={80} />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {allImages.slice(0, 4).map((image, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-xl overflow-hidden glass border transition-all ${
                      selectedImageIndex === idx
                        ? 'border-holo-cyan shadow-glow-cyan'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img 
                      src={'image_url' in image ? image.image_url : image.url}
                      alt={`${product.title} ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Category Badge */}
            {product.category && (
              <Badge variant="cyan" className="mb-4">
                {product.category.name}
              </Badge>
            )}

            {/* Title */}
            <h1 className="font-display font-bold text-4xl lg:text-5xl text-dark-text mb-4">
              {product.title}
            </h1>

            {/* Rating (Mock - à implémenter plus tard) */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="text-holo-cyan" size={18} fill="currentColor" />
                ))}
              </div>
              <span className="text-dark-text-secondary text-sm">(4.5)</span>
            </div>

            {/* Price */}
            <div className="mb-8">
              <div className="text-4xl font-display font-bold text-gradient animate-gradient-bg mb-2">
                {product.price_xaf.toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
              </div>
              {/* Stock */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${inStock ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={inStock ? 'text-green-400' : 'text-red-400'}>
                  {inStock ? t('product.in_stock') : t('product.out_of_stock')}
                </span>
                {inStock && (
                  <span className="text-dark-text-tertiary text-sm">
                    ({product.stock_quantity} {product.stock_quantity > 1 ? t('product.stock_available_plural') : t('product.stock_available')})
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            {inStock && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-text-secondary mb-3">
                  {t('product.quantity')}
                </label>
                <div className="flex items-center glass border border-white/10 rounded-xl w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3 hover:bg-white/5 transition-colors text-dark-text"
                  >
                    -
                  </button>
                  <span className="px-6 py-3 font-semibold text-dark-text min-w-[4rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="px-4 py-3 hover:bg-white/5 transition-colors text-dark-text"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              <Button
                variant="gradient"
                size="lg"
                onClick={handleAddToCart}
                disabled={!inStock}
                className="flex-1"
              >
                <ShoppingCart size={20} />
                {t('product.add_to_cart')}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleBuyNow}
                disabled={!inStock}
                className="flex-1"
              >
                {t('product.buy_now')}
              </Button>
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <button className="flex-1 glass border border-white/10 rounded-xl px-4 py-3 hover:border-holo-pink hover-glow-pink transition-all flex items-center justify-center gap-2 text-dark-text">
                <Heart size={20} />
              </button>
              <button className="flex-1 glass border border-white/10 rounded-xl px-4 py-3 hover:border-holo-cyan hover-glow-cyan transition-all flex items-center justify-center gap-2 text-dark-text">
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-display font-bold text-2xl text-dark-text mb-6">
            {t('product.description')}
          </h2>
          <div className="glass border border-white/10 rounded-2xl p-8">
            <p className="text-dark-text-secondary leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>

        {/* Related Products */}
        {similarProducts.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-3xl text-dark-text mb-8 text-center">
              {t('product.related')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProducts.map((similarProduct) => (
                <ProductCard
                  key={similarProduct.id}
                  product={{
                    id: similarProduct.id,
                    name: similarProduct.title,
                    price: similarProduct.price_xaf,
                    images: similarProduct.images,
                    image: similarProduct.media?.find((m) => m.sort_order === 0)?.url,
                    category: similarProduct.category?.name,
                    rating: 4.5,
                    inStock: similarProduct.stock_quantity > 0,
                    isNew: false,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}