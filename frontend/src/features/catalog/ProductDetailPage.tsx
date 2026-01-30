import { useState } from "react";
import {  Link } from "react-router-dom";
//import { useParams} from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  Star,
  Truck,
  Shield,
  RotateCcw,
  ChevronLeft,
  Share2,
  Check,
} from "lucide-react";
import { Button, Badge, Card } from "@/components/ui";
import ProductCard from "@/components/product/ProductCard";

// Mock data (en attendant le backend)
const MOCK_PRODUCT = {
  id: 1,
  name: "iPhone 15 Pro Max 256GB",
  price: 850000,
  oldPrice: 950000,
  category: "Téléphones",
  brand: "Apple",
  rating: 4.8,
  reviewCount: 342,
  inStock: true,
  isNew: true,
  images: [
    "https://via.placeholder.com/600x600/1a1a2e/00f5ff?text=iPhone+15+Pro",
    "https://via.placeholder.com/600x600/1a1a2e/b64cff?text=Back+View",
    "https://via.placeholder.com/600x600/1a1a2e/ff006e?text=Side+View",
  ],
  colors: [
    { name: "Titane Naturel", value: "#E5E5E5", available: true },
    { name: "Titane Bleu", value: "#4A90E2", available: true },
    { name: "Titane Blanc", value: "#FFFFFF", available: false },
    { name: "Titane Noir", value: "#2C2C2C", available: true },
  ],
  storage: ["128GB", "256GB", "512GB", "1TB"],
  description:
    "Le iPhone 15 Pro Max redéfinit ce qu'un smartphone peut faire. Doté de la puce A17 Pro révolutionnaire, d'un système de caméra avancé et d'un design en titane ultra-résistant.",
  features: [
    "Puce A17 Pro avec GPU 6 cœurs",
    "Écran Super Retina XDR 6.7 pouces",
    "Système de caméra Pro avancé",
    "Bouton Action personnalisable",
    "Titane de qualité aérospatiale",
    "USB-C avec USB 3 pour des transferts ultra-rapides",
  ],
  specifications: {
    Écran: "6.7 pouces, 2796 x 1290 pixels",
    Processeur: "Apple A17 Pro",
    RAM: "8 GB",
    Stockage: "256 GB",
    "Caméra arrière": "Triple 48MP + 12MP + 12MP",
    "Caméra frontale": "12 MP",
    Batterie: "4422 mAh",
    Système: "iOS 17",
  },
  seller: {
    name: "TechStore Cameroun",
    rating: 4.9,
    verified: true,
  },
};

const RELATED_PRODUCTS = [
  {
    id: 2,
    name: "Samsung Galaxy S24 Ultra",
    price: 750000,
    category: "Téléphones",
    rating: 4.7,
    inStock: true,
  },
  {
    id: 3,
    name: "AirPods Pro 2ème génération",
    price: 150000,
    category: "Audio",
    rating: 4.8,
    inStock: true,
  },
  {
    id: 4,
    name: "Apple Watch Series 9",
    price: 280000,
    category: "Montres",
    rating: 4.7,
    inStock: true,
    isNew: true,
  },
  {
    id: 5,
    name: "MagSafe Battery Pack",
    price: 45000,
    category: "Accessoires",
    rating: 4.5,
    inStock: true,
  },
];

const REVIEWS = [
  {
    id: 1,
    author: "Jean K.",
    rating: 5,
    date: "2024-01-15",
    comment: "Excellent produit ! La qualité est au rendez-vous. Livraison rapide à Yaoundé.",
    verified: true,
  },
  {
    id: 2,
    author: "Marie D.",
    rating: 4,
    date: "2024-01-10",
    comment: "Très bon téléphone, performance excellente. Juste un peu cher mais ça vaut le coup.",
    verified: true,
  },
  {
    id: 3,
    author: "Paul N.",
    rating: 5,
    date: "2024-01-05",
    comment: "Meilleur iPhone que j'ai eu. La caméra est incroyable !",
    verified: false,
  },
];

export default function ProductDetailPage() {
  //const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  const product = MOCK_PRODUCT; // En production: fetch depuis API avec l'id

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-dark-text-secondary mb-8">
          <Link to="/" className="hover:text-holo-cyan transition-colors">
            Accueil
          </Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-holo-cyan transition-colors">
            Catalogue
          </Link>
          <span>/</span>
          <span className="text-dark-text">{product.category}</span>
        </div>

        {/* Back Button */}
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-dark-text-secondary hover:text-holo-cyan transition-colors mb-6"
        >
          <ChevronLeft size={20} />
          Retour au catalogue
        </Link>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Images Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <Card variant="default" padding="none" className="aspect-square overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.isNew && (
                <div className="absolute top-4 left-4">
                  <Badge variant="cyan">Nouveau</Badge>
                </div>
              )}
            </Card>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === index
                      ? "border-holo-cyan shadow-glow-cyan"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <img src={image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm text-dark-text-tertiary uppercase tracking-wider mb-1">
                    {product.brand}
                  </p>
                  <h1 className="font-display font-bold text-3xl lg:text-4xl text-dark-text">
                    {product.name}
                  </h1>
                </div>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="p-3 rounded-xl glass border border-white/10 hover:border-holo-pink hover-glow-pink transition-all"
                >
                  <Heart
                    className={isFavorite ? "text-holo-pink fill-holo-pink" : "text-dark-text"}
                    size={24}
                  />
                </button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={
                        i < Math.floor(product.rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-dark-text-tertiary"
                      }
                    />
                  ))}
                </div>
                <span className="text-dark-text-secondary">
                  {product.rating} ({product.reviewCount} avis)
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="py-6 border-y border-white/10">
              <div className="flex items-center gap-4">
                <span className="font-display font-bold text-4xl text-gradient animate-gradient-bg">
                  {product.price.toLocaleString()} FCFA
                </span>
                {product.oldPrice && (
                  <span className="text-xl text-dark-text-tertiary line-through">
                    {product.oldPrice.toLocaleString()} FCFA
                  </span>
                )}
              </div>
              {product.oldPrice && (
                <Badge variant="pink" className="mt-2">
                  Économisez {((1 - product.price / product.oldPrice) * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            {/* Color Selection */}
            <div>
              <h3 className="font-semibold text-dark-text mb-3">
                Couleur: <span className="text-dark-text-secondary">{product.colors[selectedColor].name}</span>
              </h3>
              <div className="flex gap-3">
                {product.colors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(index)}
                    disabled={!color.available}
                    className={`w-12 h-12 rounded-xl border-2 transition-all relative ${
                      selectedColor === index
                        ? "border-holo-cyan shadow-glow-cyan scale-110"
                        : "border-white/20 hover:border-white/40"
                    } ${!color.available ? "opacity-30 cursor-not-allowed" : ""}`}
                    style={{ backgroundColor: color.value }}
                  >
                    {selectedColor === index && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="text-white drop-shadow-lg" size={20} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Storage Selection */}
            <div>
              <h3 className="font-semibold text-dark-text mb-3">Stockage</h3>
              <div className="grid grid-cols-4 gap-3">
                {product.storage.map((storage, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedStorage(index)}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      selectedStorage === index
                        ? "bg-gradient-holographic animate-gradient-bg text-white"
                        : "glass border border-white/10 text-dark-text hover:border-holo-cyan"
                    }`}
                  >
                    {storage}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="font-semibold text-dark-text mb-3">Quantité</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center glass border border-white/10 rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-6 py-3 font-semibold text-dark-text">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    +
                  </button>
                </div>
                {product.inStock ? (
                  <Badge variant="success">En stock</Badge>
                ) : (
                  <Badge variant="error">Rupture de stock</Badge>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="gradient" size="lg" className="flex-1" disabled={!product.inStock}>
                <ShoppingCart size={20} />
                Ajouter au panier
              </Button>
              <Button variant="secondary" size="lg">
                <Share2 size={20} />
              </Button>
            </div>

            {/* Features */}
            <Card>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-holo-cyan/10 flex items-center justify-center mx-auto mb-2">
                    <Truck className="text-holo-cyan" size={24} />
                  </div>
                  <p className="text-sm font-medium text-dark-text">Livraison rapide</p>
                  <p className="text-xs text-dark-text-tertiary mt-1">2-3 jours</p>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-holo-purple/10 flex items-center justify-center mx-auto mb-2">
                    <Shield className="text-holo-purple" size={24} />
                  </div>
                  <p className="text-sm font-medium text-dark-text">Garantie</p>
                  <p className="text-xs text-dark-text-tertiary mt-1">1 an</p>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-holo-pink/10 flex items-center justify-center mx-auto mb-2">
                    <RotateCcw className="text-holo-pink" size={24} />
                  </div>
                  <p className="text-sm font-medium text-dark-text">Retours</p>
                  <p className="text-xs text-dark-text-tertiary mt-1">14 jours</p>
                </div>
              </div>
            </Card>

            {/* Seller Info */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-text-tertiary mb-1">Vendu par</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-dark-text">{product.seller.name}</p>
                    {product.seller.verified && <Badge variant="cyan">Vérifié</Badge>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="text-yellow-400 fill-yellow-400" size={14} />
                    <span className="text-sm text-dark-text-secondary">{product.seller.rating}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Voir la boutique
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Description */}
            <Card className="lg:col-span-2">
              <h2 className="font-display font-bold text-2xl text-dark-text mb-4">Description</h2>
              <p className="text-dark-text-secondary leading-relaxed mb-6">{product.description}</p>
              
              <h3 className="font-semibold text-lg text-dark-text mb-3">Caractéristiques principales</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="text-holo-cyan mt-1 flex-shrink-0" size={18} />
                    <span className="text-dark-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Specifications */}
            <Card>
              <h2 className="font-display font-bold text-2xl text-dark-text mb-4">Spécifications</h2>
              <div className="space-y-3">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-white/10 last:border-0">
                    <span className="text-dark-text-tertiary text-sm">{key}</span>
                    <span className="text-dark-text text-sm font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-bold text-3xl text-dark-text">
              Avis clients ({product.reviewCount})
            </h2>
            <Button variant="secondary">Écrire un avis</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {REVIEWS.map((review) => (
              <Card key={review.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-dark-text">{review.author}</p>
                    <p className="text-sm text-dark-text-tertiary">{review.date}</p>
                  </div>
                  {review.verified && <Badge variant="cyan">Achat vérifié</Badge>}
                </div>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-dark-text-tertiary"
                      }
                    />
                  ))}
                </div>
                <p className="text-dark-text-secondary text-sm">{review.comment}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Related Products */}
        <div>
          <h2 className="font-display font-bold text-3xl text-dark-text mb-8">Produits similaires</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {RELATED_PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}