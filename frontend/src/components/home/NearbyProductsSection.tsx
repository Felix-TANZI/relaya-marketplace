// frontend/src/components/home/NearbyProductsSection.tsx
/**
 * Section affichant les produits proches de l'utilisateur (par GPS).
 * Utilise la géolocalisation pour filtrer les produits par proximité.
 */

import { useEffect, useState } from 'react';
import { productsApi, type Product } from '@/services/api/products';
import ProductCard from '@/components/product/ProductCard';
import { getCachedGeo, requestGeolocation } from '@/services/geolocation';
import { ChevronLeft, ChevronRight, MapPin, Loader } from 'lucide-react';

interface NearbyProductsSectionProps {
  limit?: number;
  maxDistanceKm?: number;
}

export default function NearbyProductsSection({
  limit = 10,
  maxDistanceKm = 50
}: NearbyProductsSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoAvailable, setGeoAvailable] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchNearby = async () => {
      try {
        // Demander la géolocalisation si non disponible
        const geo = getCachedGeo() || (await new Promise<any>(resolve => {
          requestGeolocation();
          // Attendre 2 secondes que la géoloc se mette à jour
          setTimeout(() => resolve(getCachedGeo()), 2000);
        }));

        if (!geo) {
          if (!cancelled) {
            setLoading(false);
            setGeoAvailable(false);
          }
          return;
        }

        if (!cancelled) {
          setGeoAvailable(true);
        }

        const results = await productsApi.getNearbyProducts(
          geo.lat,
          geo.lng,
          maxDistanceKm,
          limit
        );

        if (!cancelled) {
          setProducts(results);
        }
      } catch (error) {
        console.error('Failed to fetch nearby products:', error);
        if (!cancelled) {
          setProducts([]);
          setGeoAvailable(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchNearby();
    return () => { cancelled = true; };
  }, [limit, maxDistanceKm]);

  if (!geoAvailable) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-green-200/50 bg-green-50 p-6 dark:border-green-900/30 dark:bg-green-950/20">
        <div className="flex items-center justify-center gap-2">
          <Loader size={20} className="animate-spin text-green-600" />
          <span className="text-green-700 dark:text-green-300">
            Chargement des produits proches...
          </span>
        </div>
      </div>
    );
  }

  if (!products.length) {
    return null;
  }

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('nearby-products-scroll');
    if (!container) return;
    
    const scrollAmount = 320;
    const newPos = direction === 'left' 
      ? Math.max(0, scrollPos - scrollAmount)
      : scrollPos + scrollAmount;
    
    container.scrollLeft = newPos;
    setScrollPos(newPos);
  };

  return (
    <section className="mb-8 rounded-2xl border border-green-200/50 bg-green-50 p-6 dark:border-green-900/30 dark:bg-green-950/20">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
            <MapPin size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Disponible près de vous
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vendeurs à proximité pour livraison plus rapide
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
        id="nearby-products-scroll"
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
