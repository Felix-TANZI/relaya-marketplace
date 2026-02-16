import { useState, useEffect } from "react";
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronDown,
  Smartphone,
  Monitor,
  Shirt,
  Home as HomeIcon,
  ShoppingBag,
  Sparkles,
  X
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { productsApi, type Product, type ProductListResponse, type Category } from "@/services/api/products";

export default function CatalogPage() {
  const [searchParams] = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    searchParams.get('category') ? parseInt(searchParams.get('category')!) : null
  );
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([5000, 100000]);
  const [sortBy, setSortBy] = useState('pertinence');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const pageSize = 8;

  // Catégories avec icônes
  const categoryIcons: Record<string, React.ComponentType<{ size?: number }>> = {
    'Téléphones & Tablettes': Smartphone,
    'Électronique': Monitor,
    'Mode Femme': Shirt,
    'Mode Homme': Shirt,
    'Beauté & Santé': Sparkles,
    'Maison & Cuisine': HomeIcon,
    'Supermarché': ShoppingBag,
  };

  // Charger les catégories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsApi.listCategories();
        setCategories(response.results || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Charger les produits
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number | boolean> = {
          page: currentPage,
          page_size: pageSize,
        };

        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (priceRange[0]) params.price_min = priceRange[0];
        if (priceRange[1]) params.price_max = priceRange[1];
        
        // Tri
        if (sortBy === 'price_asc') params.ordering = 'price_xaf';
        else if (sortBy === 'price_desc') params.ordering = '-price_xaf';
        else if (sortBy === 'recent') params.ordering = '-created_at';

        const response: ProductListResponse = await productsApi.list(params);
        setProducts(response.results || []);
        setTotalCount(response.count || 0);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, selectedCategory, showPromoOnly, priceRange, sortBy, currentPage]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setShowPromoOnly(false);
    setPriceRange([5000, 100000]);
    setSortBy('pertinence');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sticky top-24 space-y-6">
              {/* Recherche Sidebar */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Catégories */}
              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                  <span>Catégories</span>
                  <ChevronDown size={18} />
                </h3>
                <div className="space-y-2">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category.name] || ShoppingBag;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                          selectedCategory === category.id
                            ? 'bg-primary text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-sm font-medium">{category.name}</span>
                        <ChevronDown size={16} className="ml-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtres */}
              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                  <span>Filtres</span>
                  <ChevronDown size={18} />
                </h3>

                {/* Checkbox Promotion */}
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPromoOnly}
                    onChange={(e) => setShowPromoOnly(e.target.checked)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Promotion</span>
                </label>

                {/* Slider Prix */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{priceRange[0].toLocaleString()}</span>
                    <span className="text-gray-400">-</span>
                    <span className="text-gray-600 dark:text-gray-400">{priceRange[1].toLocaleString()}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="5000"
                      max="100000"
                      step="1000"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="5000"
                      max="100000"
                      step="1000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {/* Bouton Appliquer */}
                <button
                  onClick={handleApplyFilters}
                  className="w-full mt-6 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all"
                >
                  Appliquer les filtres
                </button>

                {/* Reset */}
                {(searchQuery || selectedCategory || showPromoOnly) && (
                  <button
                    onClick={handleResetFilters}
                    className="w-full mt-2 px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-primary text-sm font-medium"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl lg:text-4xl font-display font-bold mb-2 text-gray-800 dark:text-white">
                Découvrez nos Offres
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Des milliers de produits à prix réduit et livrés partout au Cameroun.
              </p>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {totalCount} offres affichées
                </span>
                
                {/* Bouton Filtres Mobile */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <SlidersHorizontal size={18} />
                  <span className="text-sm font-medium">Filtres</span>
                </button>
              </div>

              {/* Tri */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="pertinence">Pertinence</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="recent">Nouveautés</option>
              </select>
            </div>

            {/* Grille Produits */}
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Aucun produit trouvé</p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} showPromo />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? 'bg-primary text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    {totalPages > 5 && (
                      <>
                        <span className="text-gray-400">...</span>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-10 h-10 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                    {currentPage < totalPages && (
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Suivant
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modal Filtres Mobile */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Filtres</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Copie du contenu sidebar */}
            <div className="space-y-6">
              {/* Même contenu que la sidebar */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}