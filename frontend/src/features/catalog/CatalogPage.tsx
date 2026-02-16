import { useState, useEffect } from "react";
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
  Shirt,
  Home as HomeIcon,
  ShoppingBag,
  Sparkles,
  X,
  Star,
  Package
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
  const [priceRange, setPriceRange] = useState<[number, number]>([5000, 1000000]);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [sortBy, setSortBy] = useState('pertinence');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);

  const pageSize = 12;

  // Catégories avec icônes
  const categoryIcons: Record<string, React.ComponentType<{ size?: number }>> = {
    'Téléphones & Tablettes': Smartphone,
    'Téléphones': Smartphone,
    'Électronique': Monitor,
    'Mode Femme': Shirt,
    'Mode Homme': Shirt,
    'Beauté & Santé': Sparkles,
    'Maison & Cuisine': HomeIcon,
    'Supermarché': ShoppingBag,
    'Audio': Sparkles,
    'Gaming': Monitor,
    'Montres': Sparkles,
    'Ordinateurs': Monitor,
    'Tablettes': Smartphone,
  };

  // Organiser catégories en hiérarchie
  const organizeCategories = (cats: Category[]) => {
    const parentCategories = cats.filter(c => !c.parent);
    return parentCategories.map(parent => ({
      ...parent,
      children: cats.filter(c => c.parent === parent.id)
    }));
  };

  const hierarchicalCategories = organizeCategories(categories);

  // Toggle expansion catégorie
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
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
        if (priceRange[0] > 5000) params.price_min = priceRange[0];
        if (priceRange[1] < 100000) params.price_max = priceRange[1];
        if (inStockOnly) params.in_stock = true;
        
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
  }, [searchQuery, selectedCategory, showPromoOnly, priceRange, sortBy, currentPage, inStockOnly]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setShowPromoOnly(false);
    setPriceRange([5000, 100000]);
    setMinRating(0);
    setInStockOnly(false);
    setShowNewOnly(false);
    setSortBy('pertinence');
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    searchQuery,
    selectedCategory,
    showPromoOnly,
    priceRange[0] > 5000,
    priceRange[1] < 100000,
    minRating > 0,
    inStockOnly,
    showNewOnly,
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sticky top-24 space-y-6 shadow-lg">
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

              {/* Catégories avec sous-catégories */}
              <div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left mb-2 ${
                    selectedCategory === null
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <ShoppingBag size={18} />
                  <span className="text-sm font-semibold">Tous les produits</span>
                </button>

                <div className="space-y-1">
                  {hierarchicalCategories.map((category) => {
                    const Icon = categoryIcons[category.name] || ShoppingBag;
                    const hasChildren = category.children && category.children.length > 0;
                    const isExpanded = expandedCategories.includes(category.id);
                    
                    return (
                      <div key={category.id}>
                        <button
                          onClick={() => {
                            setSelectedCategory(category.id === selectedCategory ? null : category.id);
                            if (hasChildren) toggleCategory(category.id);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                            selectedCategory === category.id
                              ? 'bg-primary text-white'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-sm font-medium flex-1">{category.name}</span>
                          {hasChildren && (
                            isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          )}
                        </button>

                        {/* Sous-catégories */}
                        {hasChildren && isExpanded && (
                          <div className="ml-6 mt-1 space-y-1">
                            {category.children?.map((subCat) => (
                              <button
                                key={subCat.id}
                                onClick={() => setSelectedCategory(subCat.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left text-sm ${
                                  selectedCategory === subCat.id
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                {subCat.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filtres */}
              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white">
                  Filtres
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </h3>

                <div className="space-y-4">
                  {/* Promotion */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPromoOnly}
                      onChange={(e) => setShowPromoOnly(e.target.checked)}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Promotion uniquement</span>
                  </label>

                  {/* En stock */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Package size={14} />
                      En stock seulement
                    </span>
                  </label>

                  {/* Nouveautés */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNewOnly}
                      onChange={(e) => setShowNewOnly(e.target.checked)}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Sparkles size={14} />
                      Nouveautés
                    </span>
                  </label>

                  {/* Note minimale */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Note minimale
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setMinRating(rating === minRating ? 0 : rating)}
                          className={`p-1 rounded transition-colors ${
                            rating <= minRating
                              ? 'text-yellow-500'
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                        >
                          <Star size={20} fill={rating <= minRating ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slider Prix */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fourchette de prix
                    </label>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{priceRange[0].toLocaleString()} FCFA</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-600 dark:text-gray-400">{priceRange[1].toLocaleString()} FCFA</span>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="5000"
                        max="100000"
                        step="1000"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
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
                </div>

                {/* Boutons */}
                <div className="space-y-2 mt-6">
                  <button
                    onClick={handleApplyFilters}
                    className="w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all"
                  >
                    Appliquer les filtres
                  </button>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="w-full px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-primary text-sm font-medium"
                    >
                      Réinitialiser tout
                    </button>
                  )}
                </div>
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
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">{totalCount}</span> offre{totalCount > 1 ? 's' : ''} affichée{totalCount > 1 ? 's' : ''}
                </span>
                
                {/* Bouton Filtres Mobile */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <SlidersHorizontal size={18} />
                  <span className="text-sm font-medium">Filtres</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Tri */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
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
                <p className="text-gray-600 dark:text-gray-400 mt-4">Chargement des produits...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl">
                <ShoppingBag className="mx-auto text-gray-400 mb-4" size={64} />
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Aucun produit trouvé</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">Essayez de modifier vos filtres</p>
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
                    {currentPage > 1 && (
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
                      >
                        Précédent
                      </button>
                    )}
                    
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all shadow-sm ${
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
                          className="w-10 h-10 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                    
                    {currentPage < totalPages && (
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
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
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 p-6 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Filtres</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Même contenu que sidebar */}
            <div className="space-y-6">
              {/* Copier tout le contenu de la sidebar ici */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}