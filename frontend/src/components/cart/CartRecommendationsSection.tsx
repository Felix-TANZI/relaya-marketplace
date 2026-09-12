// frontend/src/components/cart/CartRecommendationsSection.tsx
/**
 * Section affichant les recommandations pour le panier (upselling intelligent).
 * Produits complémentaires suggérés basés sur les produits du panier.
 */

import { useEffect, useState } from 'react';
import { productsApi, type Product, type MasterFicheCard } from '@/services/api/products';
import ProductCard from '@/components/product/ProductCard';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { getCachedGeo } from '@/services/geolocation';

interface CartRecommendationsSectionProps {
  cartMasterIds: number[];
  limit?: number;
}

export default function CartRecommendationsSection({
  cartMasterIds,
  limit = 5
}: CartRecommendationsSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    if (!cartMasterIds.length) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRecommendations = async () => {
      try {
        // Essayer d'obtenir la localisation si disponible
        const geo = getCachedGeo();
        
        const results = await productsApi.getCartRecommendations(
          cartMasterIds,
          geo?.lat,
          geo?.lng,
          limit
        );
        
        if (!cancelled) {
          setProducts(results);
        }
      } catch (error) {
        console.error('Failed to fetch cart recommendations:', error);
        if (!cancelled) {
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRecommendations();
    return () => { cancelled = true; };
  }, [cartMasterIds, limit]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-200/50 bg-amber-50 p-6 dark:border-amber-900/30 dark:bg-amber-950/20">
        <div className="flex justify-center">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-amber-200 dark:bg-amber-900/30" />
        </div>
      </div>
    );
  }

  if (!products.length) {
    return null;
  }

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('cart-recommendations-scroll');
    if (!container) return;
    
    const scrollAmount = 320;
    const newPos = direction === 'left' 
      ? Math.max(0, scrollPos - scrollAmount)
      : scrollPos + scrollAmount;
    
    container.scrollLeft = newPos;
    setScrollPos(newPos);
  };

  return (
    <section className="rounded-2xl border border-amber-200/50 bg-amber-50 p-6 dark:border-amber-900/30 dark:bg-amber-950/20">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
            <Zap size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Produits recommandés
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complétez vos achats, livraison optimisée
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scrollContainer('left')}
            className="rounded-lg bg-white p-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scrollContainer('right')}
            className="rounded-lg bg-white p-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        id="cart-recommendations-scroll"
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4 [-webkit-overflow-scrolling:touch]"
      >
        {products.map(product => (
          <div key={product.id} className="flex-shrink-0 w-80">
            <ProductCard product={product} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
