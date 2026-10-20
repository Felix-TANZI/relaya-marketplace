// frontend/src/components/home/FeaturedProductsRotation.tsx
/**
 * Carrousel de rotation des produits d'accueil.
 * Affiche une rotation quotidienne déterministe pour éviter la monotonie.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { productsApi, type ProductListResponse } from '@/services/api/products';
import ProductCard from '@/components/product/ProductCard';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface FeaturedProductsRotationProps {
  page?: number;
  pageSize?: number;
}

export default function FeaturedProductsRotation({
  page = 1,
  pageSize = 20
}: FeaturedProductsRotationProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page);

  useEffect(() => {
    let cancelled = false;

    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const response = await productsApi.getFeaturedRotation(currentPage, pageSize);
        if (!cancelled) {
          setData(response);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch featured products:', err);
        if (!cancelled) {
          setError(t('home.featured_error'));
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchFeatured();
    return () => { cancelled = true; };
  }, [currentPage, pageSize]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200/50 bg-red-50 p-6 text-center dark:border-red-900/30 dark:bg-red-950/20">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (loading || !data?.results.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
            <Sparkles size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('home.featured_title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('home.featured_subtitle')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (data?.next) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <section className="mb-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
            <Sparkles size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('home.featured_title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('home.featured_subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="rounded-lg bg-gray-100 p-2 disabled:opacity-50 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label={t('home.prev_page')}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('home.page_number', { page: currentPage })}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!data?.next}
            className="rounded-lg bg-gray-100 p-2 disabled:opacity-50 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label={t('home.next_page')}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {data.results.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {data.count && (
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('home.products_available', { count: data.count })}
        </div>
      )}
    </section>
  );
}
