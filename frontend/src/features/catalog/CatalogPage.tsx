// frontend/src/features/catalog/CatalogPage.tsx
// Page du catalogue de produits

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, Grid3x3, List } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { Button, Badge } from "@/components/ui";

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

// Mock data (en attendant la connexion au backend)
const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "iPhone 15 Pro Max 256GB",
    price: 850000,
    category: "Téléphones",
    rating: 4.8,
    inStock: true,
    isNew: true,
    discount: 10,
  },
  {
    id: 2,
    name: "Samsung Galaxy S24 Ultra",
    price: 750000,
    category: "Téléphones",
    rating: 4.7,
    inStock: true,
    isNew: true,
  },
  {
    id: 3,
    name: "MacBook Pro M3 14 pouces",
    price: 1500000,
    category: "Ordinateurs",
    rating: 4.9,
    inStock: true,
    discount: 5,
  },
  {
    id: 4,
    name: "Sony WH-1000XM5 Noir",
    price: 180000,
    category: "Audio",
    rating: 4.6,
    inStock: true,
  },
  {
    id: 5,
    name: "iPad Air M2 128GB",
    price: 450000,
    category: "Tablettes",
    rating: 4.5,
    inStock: false,
  },
  {
    id: 6,
    name: "Apple Watch Series 9",
    price: 280000,
    category: "Montres",
    rating: 4.7,
    inStock: true,
    isNew: true,
  },
  {
    id: 7,
    name: "AirPods Pro 2ème génération",
    price: 150000,
    category: "Audio",
    rating: 4.8,
    inStock: true,
  },
  {
    id: 8,
    name: "PlayStation 5 Slim",
    price: 380000,
    category: "Gaming",
    rating: 4.9,
    inStock: true,
    discount: 15,
  },
];

const CATEGORIES = [
  "Tous",
  "Téléphones",
  "Ordinateurs",
  "Tablettes",
  "Audio",
  "Montres",
  "Gaming",
];

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Simuler le chargement depuis le backend
    setTimeout(() => {
      setProducts(MOCK_PRODUCTS);
      setLoading(false);
    }, 800);

    // Pour la vraie API :
    // fetch("http://localhost:8000/api/products/")
    //   .then(res => res.json())
    //   .then(data => {
    //     setProducts(data);
    //     setLoading(false);
    //   });
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Tous" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-4xl lg:text-5xl mb-4">
            <span className="text-gradient animate-gradient-bg">Catalogue</span>
          </h1>
          <p className="text-dark-text-secondary text-lg">
            Découvrez notre sélection premium de produits
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="glass border border-white/10 rounded-2xl p-4 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary" size={20} />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={18} />
                Filtres
              </Button>
              
              <div className="flex gap-1 glass border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-holo-cyan text-white"
                      : "text-dark-text-secondary hover:text-dark-text"
                  }`}
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-holo-cyan text-white"
                      : "text-dark-text-secondary hover:text-dark-text"
                  }`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedCategory === category
                  ? "bg-gradient-holographic animate-gradient-bg text-white shadow-md"
                  : "glass border border-white/10 text-dark-text-secondary hover:border-holo-cyan hover:text-dark-text"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-dark-text-secondary">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} trouvé{filteredProducts.length > 1 ? "s" : ""}
          </p>
          {searchQuery && (
            <Badge variant="cyan">Recherche: {searchQuery}</Badge>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl glass border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "flex flex-col gap-4"
          }>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Search className="text-dark-text-tertiary" size={32} />
            </div>
            <h3 className="font-display font-semibold text-xl mb-2 text-dark-text">
              Aucun produit trouvé
            </h3>
            <p className="text-dark-text-secondary mb-6">
              Essayez avec d'autres mots-clés ou catégories
            </p>
            <Button variant="gradient" onClick={() => {
              setSearchQuery("");
              setSelectedCategory("Tous");
            }}>
              Réinitialiser les filtres
            </Button>
          </div>
        )}

        {/* Load More */}
        {filteredProducts.length > 0 && !loading && (
          <div className="text-center mt-12">
            <Button variant="secondary" size="lg">
              Charger plus de produits
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}