import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, 
  Minus, 
  Plus,
  ShoppingCart,
  Truck,
  Shield,
  RotateCcw,
  Package,
  ThumbsUp,
  ZoomIn
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { productsApi, type Product } from '@/services/api/products';

interface ProductReview {
  id: number;
  user: number;
  user_name: string;
  user_first_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const { showToast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [youMayLike, setYouMayLike] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'avis' | 'livraison'>('avis');
  const [sortReviews, setSortReviews] = useState('recent');

  // Charger le produit
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await productsApi.get(parseInt(id));
        setProduct(data);
        
        // Charger produits similaires et recommandés
        const similar = await productsApi.list({ category: data.category?.id, page_size: 3 });
        setSimilarProducts(similar.results || []);
        
        const recommended = await productsApi.list({ page_size: 3 });
        setYouMayLike(recommended.results || []);
      } catch (err) {
        console.error('Error loading product:', err);
        setError('Erreur lors du chargement du produit');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Charger les avis
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      
      try {
        const response = await fetch(`http://localhost:8000/api/catalog/products/${id}/reviews/`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        }
      } catch (err) {
        console.error('Error loading reviews:', err);
      }
    };

    fetchReviews();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    
    addItem({
      id: product.id,
      name: product.title,
      price: product.price_xaf,
      quantity,
      image: product.images?.find(img => img.is_primary)?.image_url || product.images?.[0]?.image_url,
    });
    
    showToast('Produit ajouté au panier', 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    window.location.href = '/checkout';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">{error || 'Produit introuvable'}</p>
          <Link to="/catalog" className="text-primary hover:underline">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  const displayImages = product.images?.length 
    ? product.images.map(img => img.image_url)
    : product.media?.filter(m => m.media_type === 'image').map(m => m.url) || [];


  // Stats avis
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, percentage };
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/" className="text-gray-600 hover:text-primary">Accueil</Link>
          <span className="text-gray-400">/</span>
          <Link to="/catalog" className="text-gray-600 hover:text-primary">Catalogue</Link>
          <span className="text-gray-400">/</span>
          {product.category && (
            <>
              <span className="text-gray-600">{product.category.name}</span>
              <span className="text-gray-400">/</span>
            </>
          )}
          <span className="text-gray-800 dark:text-white font-medium truncate">{product.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* COLONNE PRINCIPALE */}
          <div className="lg:col-span-2 space-y-6">
            {/* SECTION PRODUIT */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* GAUCHE - Images */}
                <div>
                  {/* Image principale */}
                  <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg mb-4 aspect-square overflow-hidden group">
                    {displayImages.length > 0 ? (
                      <img
                        src={displayImages[selectedImageIndex]}
                        alt={product.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={64} className="text-gray-400" />
                      </div>
                    )}
                    
                    {/* Bouton Zoom */}
                    <button className="absolute top-4 left-4 w-10 h-10 bg-white/90 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={20} />
                    </button>
                  </div>

                  {/* Miniatures */}
                  {displayImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {displayImages.slice(0, 4).map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 ${
                            selectedImageIndex === index
                              ? 'border-primary'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* DROITE - Infos */}
                <div className="space-y-4">
                  {/* Catégorie */}
                  {product.category && (
                    <p className="text-xs text-primary font-bold uppercase tracking-wider">
                      {product.category.name}
                    </p>
                  )}

                  {/* Titre */}
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {product.title}
                  </h1>

                  {/* Prix avec badge Promo */}
                  <div className="flex items-baseline gap-3">
                    <span className="px-3 py-1 bg-primary text-white text-sm font-bold rounded-md">
                      Promo
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      116,500 FCFA
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {product.price_xaf.toLocaleString()} FCFA
                  </div>

                  {/* Note et avis */}
                  {product.rating_average && product.reviews_count && product.reviews_count > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={
                              star <= Math.floor(product.rating_average!)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-200 text-gray-200"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">({product.reviews_count})</span>
                    </div>
                  )}

                  {/* Description courte */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {product.description?.substring(0, 200)}...
                  </p>

                  {/* Badge livraison */}
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Truck className="text-green-600" size={20} />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Livraison rapide partout au Cameroun.
                    </span>
                  </div>

                  {/* Quantité */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="text"
                      value={quantity}
                      readOnly
                      className="w-16 h-10 text-center border border-gray-300 rounded-lg font-semibold"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-100"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Boutons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleAddToCart}
                      className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={20} />
                      Ajouter au panier
                    </button>
                    <button
                      onClick={handleBuyNow}
                      className="px-6 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-lg transition-colors"
                    >
                      Acheter maintenant
                    </button>
                  </div>

                  {/* Badge sécurité */}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Shield className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-blue-700">Paiement sécurisé</p>
                      <p className="text-xs text-blue-600">Transaction encryptée et protégée</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TABS */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
              {/* Headers */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'description'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('avis')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'avis'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600'
                  }`}
                >
                  Avis ({reviews.length})
                </button>
                <button
                  onClick={() => setActiveTab('livraison')}
                  className={`px-6 py-3 font-medium ${
                    activeTab === 'livraison'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-600'
                  }`}
                >
                  Livraison Rapide
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === 'description' && (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 dark:text-gray-300">{product.description}</p>
                  </div>
                )}

                {activeTab === 'avis' && (
                  <div>
                    {/* Header avis */}
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold">
                        Avis des clients pour {product.title}
                      </h2>
                      <select
                        value={sortReviews}
                        onChange={(e) => setSortReviews(e.target.value)}
                        className="px-4 py-2 border rounded-lg text-sm"
                      >
                        <option value="recent">Les plus récents</option>
                        <option value="rating">Meilleure note</option>
                        <option value="useful">Plus utiles</option>
                      </select>
                    </div>

                    {/* Stats globales */}
                    {product.rating_average && reviews.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg mb-6">
                        <div className="text-center">
                          <div className="text-5xl font-bold mb-2">{product.rating_average.toFixed(1)}</div>
                          <div className="flex justify-center mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={20}
                                className={
                                  star <= Math.floor(product.rating_average!)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "fill-gray-200 text-gray-200"
                                }
                              />
                            ))}
                          </div>
                          <p className="text-sm text-gray-600">
                            basé sur {reviews.length} avis
                          </p>
                        </div>

                        <div className="space-y-2">
                          {ratingDistribution.map(({ rating, percentage }) => (
                            <div key={rating} className="flex items-center gap-3">
                              <span className="flex items-center gap-1 w-16">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={
                                      i < rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "fill-gray-200 text-gray-200"
                                    }
                                  />
                                ))}
                              </span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm w-12 text-right">{Math.round(percentage)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Liste avis */}
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b pb-6 last:border-0">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-semibold">
                              {review.user_first_name?.[0] || review.user_name[0]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-semibold">{review.user_first_name || review.user_name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          size={14}
                                          className={
                                            star <= review.rating
                                              ? "fill-yellow-400 text-yellow-400"
                                              : "fill-gray-200 text-gray-200"
                                          }
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(review.created_at).toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button className="text-sm text-gray-600 hover:text-primary">Utile</button>
                                  <button className="text-sm text-gray-600 hover:text-red-500">Signaler</button>
                                </div>
                              </div>
                              {review.title && <p className="font-semibold mb-2">{review.title}</p>}
                              <p className="text-gray-700 mb-2">{review.comment}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <button className="flex items-center gap-1 text-gray-600">
                                  <ThumbsUp size={14} />
                                  26
                                </button>
                                {review.is_verified_purchase && (
                                  <span className="text-green-600">✓ Achat vérifié</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {reviews.length > 5 && (
                      <div className="flex justify-center gap-2 mt-6">
                        <button className="w-8 h-8 bg-primary text-white rounded">1</button>
                        <button className="w-8 h-8 border rounded">2</button>
                        <button className="w-8 h-8 border rounded">...</button>
                        <button className="px-4 py-2 border rounded">Suivant &gt;</button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'livraison' && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Truck className="text-green-600" size={24} />
                      <div>
                        <h3 className="font-semibold mb-1">Livraison Rapide</h3>
                        <p className="text-sm text-gray-600">
                          Livraison rapide à votre domicile, point relais ou bureau.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Package className="text-blue-600" size={24} />
                      <div>
                        <h3 className="font-semibold mb-1">Suivi des Commandes</h3>
                        <p className="text-sm text-gray-600">
                          Suivez l'état de votre commande facilement.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <RotateCcw className="text-purple-600" size={24} />
                      <div>
                        <h3 className="font-semibold mb-1">Retour Facile</h3>
                        <p className="text-sm text-gray-600">
                          Satisfait ou remboursé sous 10 jours ouvrés.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SIDEBAR DROITE */}
          <div className="space-y-6">
            {/* Features */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex gap-3">
                <Truck className="text-primary" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">Livraison Rapide</h3>
                  <p className="text-xs text-gray-600">Livraison rapide à votre domicile, point relais au bureau.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Package className="text-primary" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">Suivi des Commandes</h3>
                  <p className="text-xs text-gray-600">Suivez l'état de votre commande facilement.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <RotateCcw className="text-primary" size={24} />
                <div>
                  <h3 className="font-semibold mb-1">Retour Facile</h3>
                  <p className="text-xs text-gray-600">Satisfait ou remboursé sous 10 jours ouvrés.</p>
                </div>
              </div>
            </div>

            {/* Vous Aimerez Aussi */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4">Vous Aimerez Aussi</h3>
              <div className="space-y-4">
                {youMayLike.slice(0, 2).map((p) => (
                  <div key={p.id} className="flex gap-3">
                    <img
                      src={p.images?.[0]?.image_url || '/placeholder.png'}
                      alt={p.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div>
                      <Link to={`/product/${p.id}`} className="font-medium text-sm hover:text-primary">
                        {p.title}
                      </Link>
                      <p className="text-primary font-bold">{p.price_xaf.toLocaleString()} FCFA</p>
                      {p.rating_average && (
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
                          ))}
                          <span className="text-xs">({p.reviews_count})</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Produits Similaires */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4">Produits Similaires</h3>
              <div className="space-y-4">
                {similarProducts.slice(0, 2).map((p) => (
                  <div key={p.id} className="flex gap-3">
                    <img
                      src={p.images?.[0]?.image_url || '/placeholder.png'}
                      alt={p.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div>
                      <Link to={`/product/${p.id}`} className="font-medium text-sm hover:text-primary">
                        {p.title}
                      </Link>
                      <p className="text-primary font-bold">{p.price_xaf.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}