// frontend/src/components/catalog/RelatedProductsSection.tsx
/**
 * Section affichant les produits liés (autres offres du même MasterProduct).
 * Utilisé sur la fiche produit.
 */

import { useEffect, useState } from 'react';
import { productsApi, type Product } from '@/services/api/products';
import ProductCard from '@/components/product/ProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RelatedProductsSectionProps {
  masterId: number;
  excludeVendorId?: number;
  limit?: number;
}

export default function RelatedProductsSection({
  masterId,
  excludeVendorId,
  limit = 5
}: RelatedProductsSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchRelated = async () => {
      try {
        const results = await productsApi.getRelatedProducts(
          masterId,
          excludeVendorId,
          limit
        );
        if (!cancelled) {
          setProducts(results);
        }
      } catch (error) {
        console.error('Failed to fetch related products:', error);
        if (!cancelled) {
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRelated();
    return () => { cancelled = true; };
  }, [masterId, excludeVendorId, limit]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex justify-center">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (!products.length) {
    return null;
  }

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('related-products-scroll');
    if (!container) return;
    
    const scrollAmount = 320;
    const newPos = direction === 'left' 
      ? Math.max(0, scrollPos - scrollAmount)
      : scrollPos + scrollAmount;
    
    container.scrollLeft = newPos;
    setScrollPos(newPos);
  };

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Autres offres du même produit
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => scrollContainer('left')}
            className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => scrollContainer('right')}
            className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        id="related-products-scroll"
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
