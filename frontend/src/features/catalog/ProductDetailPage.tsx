import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  ZoomIn,
  ChevronDown,
  ChevronUp,
  X,
  Smartphone,
  Monitor,
  Shirt,
  Home as HomeIcon,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { productsApi, type Product, type Category } from '@/services/api/products';
import { useAuth } from '@/context/AuthContext';
import { http } from '@/services/api/http';

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
  const { user } = useAuth();
  const { t } = useTranslation();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [youMayLike, setYouMayLike] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'avis' | 'livraison'>('description');
  const [sortReviews, setSortReviews] = useState('recent');
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const categoryIcons: Record<string, React.ComponentType<{ size?: number }>> = {
    'Telephones & Tablettes': Smartphone,
    'Telephones': Smartphone,
    'Electronique': Monitor,
    'Audio': Sparkles,
    'Gaming': Monitor,
    'Montres': Sparkles,
    'Mode Femme': Shirt,
    'Mode Homme': Shirt,
    'Beaute & Sante': Sparkles,
    'Maison & Cuisine': HomeIcon,
    'Supermarche': ShoppingBag,
  };

  const organizeCategories = (cats: Category[]) => {
    const parentCategories = cats.filter(c => !c.parent);
    return parentCategories.map(parent => ({
      ...parent,
      children: cats.filter(c => c.parent === parent.id)
    }));
  };

  const hierarchicalCategories = organizeCategories(categories);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await productsApi.get(parseInt(id));
        setProduct(data);

        if (data.category) {
          const similar = await productsApi.list({ category: data.category.id, page_size: 4 });
          setSimilarProducts(similar.results?.filter(p => p.id !== data.id) || []);
        }

        const recommended = await productsApi.list({ page_size: 3 });
        setYouMayLike(recommended.results?.filter(p => p.id !== data.id) || []);
      } catch (err) {
        console.error('Error loading product:', err);
        showToast(t('product_detail.loading_error'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, showToast]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;

      try {
        const data = await http<ProductReview[]>(`/api/catalog/products/${id}/reviews/`);
        setReviews(data);
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
      price: product.price_final,
      quantity,
      image: product.images?.find(img => img.is_primary)?.image_url || product.images?.[0]?.image_url,
    });

    showToast(t('product_detail.added_to_cart'), 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    window.location.href = '/checkout';
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) {
      showToast(t('product_detail.login_required_review'), 'error');
      return;
    }

    try {
      setSubmittingReview(true);
      await http<ProductReview>(`/api/catalog/products/${product.id}/add_review/`, {
        method: 'POST',
        body: JSON.stringify({
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
        })
      });

      showToast(t('product_detail.review_success'), 'success');
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewTitle('');
      setReviewComment('');

      const data = await http<ProductReview[]>(`/api/catalog/products/${product.id}/reviews/`);
      setReviews(data);
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast(t('product_detail.review_error'), 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">{t('product_detail.not_found')}</p>
          <Link to="/catalog" className="text-primary hover:underline">
            {t('product_detail.back_to_catalog')}
          </Link>
        </div>
      </div>
    );
  }

  const displayImages = product.images?.length
    ? product.images.map(img => img.image_url)
    : product.media?.filter(m => m.media_type === 'image').map(m => m.url) || [];

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, percentage };
  });

  const hasDiscount = product.discount && product.discount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* SIDEBAR GAUCHE - Categories uniquement */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white">{t('product_detail.categories')}</h3>

                <Link to="/catalog">
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left mb-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <ShoppingBag size={18} />
                    <span className="text-sm font-semibold">{t('product_detail.all_products')}</span>
                  </button>
                </Link>

                <div className="space-y-1">
                  {hierarchicalCategories.map((category) => {
                    const Icon = categoryIcons[category.name] || ShoppingBag;
                    const hasChildren = category.children && category.children.length > 0;
                    const isExpanded = expandedCategories.includes(category.id);

                    return (
                      <div key={category.id}>
                        <button
                          onClick={() => hasChildren && toggleCategory(category.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          <Icon size={18} />
                          <span className="text-sm font-medium flex-1">{category.name}</span>
                          {hasChildren && (
                            isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                          )}
                        </button>

                        {hasChildren && isExpanded && (
                          <div className="ml-6 mt-1 space-y-1">
                            {category.children?.map((subCat) => (
                              <Link key={subCat.id} to={`/catalog?category=${subCat.id}`}>
                                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                  {subCat.name}
                                </button>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* CONTENU PRINCIPAL */}
          <div className="flex-1 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Link to="/" className="hover:text-primary">{t('product_detail.home')}</Link>
              <span>/</span>
              <Link to="/catalog" className="hover:text-primary">{t('product_detail.catalog')}</Link>
              {product.category && (
                <>
                  <span>/</span>
                  <span className="text-gray-800 dark:text-white">{product.category.name}</span>
                </>
              )}
            </div>

            {/* Section Produit - TOUTE LA LARGEUR */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Images */}
                <div>
                  <div className="relative bg-gray-100 dark:bg-gray-900 rounded-xl mb-4 aspect-square overflow-hidden group">
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

                    <button className="absolute top-4 left-4 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={20} />
                    </button>
                  </div>

                  {displayImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {displayImages.slice(0, 4).map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImageIndex === index
                              ? 'border-primary scale-105'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Infos produit */}
                <div className="space-y-4">
                  {product.category && (
                    <p className="text-xs text-primary font-bold uppercase tracking-wider">
                      {product.category.name}
                    </p>
                  )}

                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {product.title}
                  </h1>

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
                      <button
                        onClick={() => setActiveTab('avis')}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary"
                      >
                        ({product.reviews_count})
                      </button>
                    </div>
                  )}

                  {product.short_description && (
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {product.short_description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Truck className="text-green-600" size={20} />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {t('product_detail.fast_delivery')}
                    </span>
                  </div>

                  {/* Prix */}
                  <div>
                    {hasDiscount && (
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-primary text-white text-sm font-bold rounded-md">
                          {t('product_detail.promo')}
                        </span>
                        <span className="text-lg text-gray-400 line-through">
                          {product.price_xaf.toLocaleString()} FCFA
                        </span>
                      </div>
                    )}
                    <div className="text-3xl font-bold text-primary">
                      {product.price_final.toLocaleString()} FCFA
                    </div>
                  </div>

                  {/* Quantite */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-16 text-center text-lg font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Boutons d'action */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleAddToCart}
                      className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                    >
                      <ShoppingCart size={20} />
                      {t('product_detail.add_to_cart')}
                    </button>
                    <button
                      onClick={handleBuyNow}
                      className="px-6 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-lg transition-all"
                    >
                      {t('product_detail.buy_now')}
                    </button>
                  </div>

                  {/* Badge securite */}
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Shield className="text-blue-600" size={24} />
                    <div>
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        {t('product_detail.secure_payment')}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-500">
                        {t('product_detail.encrypted_transaction')}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-[#fff7ef] p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {t('product_detail.customer_summary')}
                      </p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-primary dark:bg-gray-800">
                        {t('product_detail.quick_buy')}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-between">
                        <span>{t('product_detail.unit_price')}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {product.price_final.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('product_detail.quantity')}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{quantity}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('product_detail.subtotal')}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {(product.price_final * quantity).toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('product_detail.delivery')}</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {product.price_final * quantity >= 30000 ? t('product_detail.free') : t('product_detail.to_calculate')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION TABS - 2 COLONNES */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Tabs horizontaux */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`px-6 py-4 font-semibold transition-colors ${
                    activeTab === 'description'
                      ? 'text-primary border-b-2 border-primary -mb-px'
                      : 'text-gray-600 dark:text-gray-400 hover:text-primary'
                  }`}
                >
                  {t('product_detail.description')}
                </button>
                <button
                  onClick={() => setActiveTab('avis')}
                  className={`px-6 py-4 font-semibold transition-colors ${
                    activeTab === 'avis'
                      ? 'text-primary border-b-2 border-primary -mb-px'
                      : 'text-gray-600 dark:text-gray-400 hover:text-primary'
                  }`}
                >
                  {t('product_detail.reviews_tab')} ({reviews.length})
                </button>
                <button
                  onClick={() => setActiveTab('livraison')}
                  className={`px-6 py-4 font-semibold transition-colors ${
                    activeTab === 'livraison'
                      ? 'text-primary border-b-2 border-primary -mb-px'
                      : 'text-gray-600 dark:text-gray-400 hover:text-primary'
                  }`}
                >
                  {t('product_detail.fast_delivery_tab')}
                </button>
              </div>

              {/* Contenu en 2 colonnes */}
              <div className="grid lg:grid-cols-3 gap-6 p-6">
                {/* COLONNE GAUCHE - Contenu du tab (2/3) */}
                <div className="lg:col-span-2">
                  {activeTab === 'description' && (
                    <div className="prose max-w-none dark:prose-invert">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {activeTab === 'avis' && (
                    <div>
                      {user && !showReviewForm && (
                        <div className="mb-6">
                          <button
                            onClick={() => setShowReviewForm(true)}
                            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark shadow-md transition-all"
                          >
                            {t('product_detail.give_review')}
                          </button>
                        </div>
                      )}

                      {showReviewForm && (
                        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{t('product_detail.give_review')}</h3>
                            <button
                              onClick={() => setShowReviewForm(false)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <form onSubmit={handleSubmitReview} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">{t('product_detail.your_rating')}</label>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewRating(star)}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                  >
                                    <Star
                                      size={32}
                                      className={
                                        star <= reviewRating
                                          ? "fill-yellow-400 text-yellow-400 cursor-pointer"
                                          : "text-gray-300 cursor-pointer hover:text-yellow-300"
                                      }
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">{t('product_detail.title_optional')}</label>
                              <input
                                type="text"
                                value={reviewTitle}
                                onChange={(e) => setReviewTitle(e.target.value)}
                                placeholder={t('product_detail.summarize_experience')}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-800"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">{t('product_detail.your_review')}</label>
                              <textarea
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                required
                                rows={4}
                                placeholder={t('product_detail.share_experience')}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-800"
                              />
                            </div>

                            <div className="flex gap-3">
                              <button
                                type="submit"
                                disabled={submittingReview || !reviewComment}
                                className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                              >
                                {submittingReview ? t('product_detail.sending') : t('product_detail.publish_review')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowReviewForm(false)}
                                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {product.rating_average && reviews.length > 0 && (
                        <div className="grid md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl mb-6">
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
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('product_detail.based_on_reviews', { count: reviews.length })}</p>
                          </div>

                          <div className="space-y-2">
                            {ratingDistribution.map(({ rating, percentage }) => (
                              <div key={rating} className="flex items-center gap-3">
                                <span className="flex items-center gap-1 w-16 text-sm">
                                  {rating}
                                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                </span>
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm w-12 text-right">{Math.round(percentage)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t('product_detail.customer_reviews')}</h3>
                        <select
                          value={sortReviews}
                          onChange={(e) => setSortReviews(e.target.value)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800"
                        >
                          <option value="recent">{t('product_detail.sort_recent')}</option>
                          <option value="rating">{t('product_detail.sort_rating')}</option>
                          <option value="useful">{t('product_detail.sort_useful')}</option>
                        </select>
                      </div>

                      <div className="space-y-6">
                        {reviews.length > 0 ? (
                          reviews.map((review) => (
                            <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                              <div className="flex gap-4">
                                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                  {review.user_first_name?.[0] || review.user_name[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
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
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {new Date(review.created_at).toLocaleDateString('fr-FR')}
                                        </span>
                                        {review.is_verified_purchase && (
                                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                            ✓ {t('product_detail.verified_purchase')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 text-sm">
                                      <button className="text-gray-600 dark:text-gray-400 hover:text-primary">{t('product_detail.useful')}</button>
                                      <button className="text-gray-600 dark:text-gray-400 hover:text-red-500">{t('product_detail.report')}</button>
                                    </div>
                                  </div>
                                  {review.title && <p className="font-semibold mb-2">{review.title}</p>}
                                  <p className="text-gray-700 dark:text-gray-300 mb-2">{review.comment}</p>
                                  <button className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                                    <ThumbsUp size={14} />
                                    26
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            {t('product_detail.no_reviews')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'livraison' && (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">{t('product_detail.delivery_options')}</h3>

                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Truck className="text-green-600" size={24} />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">{t('product_detail.standard_delivery')}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                {t('product_detail.standard_delay')}
                              </p>
                              <p className="text-sm text-primary font-semibold">{t('product_detail.free_from')}</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package className="text-blue-600" size={24} />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">{t('product_detail.express_delivery')}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                {t('product_detail.express_delay')}
                              </p>
                              <p className="text-sm text-primary font-semibold">2,500 FCFA</p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <ShoppingBag className="text-purple-600" size={24} />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">{t('product_detail.pickup_point')}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                {t('product_detail.pickup_availability')}
                              </p>
                              <p className="text-sm text-primary font-semibold">{t('common.free')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">{t('product_detail.return_policy')}</h3>

                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <RotateCcw className="text-orange-600" size={24} />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">{t('product_detail.return_10_days')}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('product_detail.return_desc')}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Shield className="text-teal-600" size={24} />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">{t('product_detail.product_warranty')}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('product_detail.warranty_desc')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          {t('product_detail.tip')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* COLONNE DROITE - Features + Vous Aimerez Aussi (1/3) */}
                <div className="space-y-6">
                  {/* Features */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-3">
                    <div className="flex gap-3">
                      <Truck className="text-green-600 flex-shrink-0" size={20} />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">{t('product_detail.fast_delivery_feature')}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t('product_detail.fast_delivery_desc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Package className="text-blue-600 flex-shrink-0" size={20} />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">{t('product_detail.order_tracking')}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t('product_detail.tracking_desc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <RotateCcw className="text-purple-600 flex-shrink-0" size={20} />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">{t('product_detail.easy_return')}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t('product_detail.satisfaction_guaranteed')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Vous Aimerez Aussi */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <h4 className="font-semibold mb-4">{t('product_detail.you_may_like')}</h4>
                    <div className="space-y-4">
                      {youMayLike.slice(0, 3).map((p) => (
                        <Link key={p.id} to={`/product/${p.id}`} className="flex gap-3 group">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={p.images?.[0]?.image_url || '/placeholder.png'}
                              alt={p.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-xs mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                              {p.title}
                            </p>
                            <p className="text-primary font-bold text-sm">
                              {p.price_final.toLocaleString()} FCFA
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PRODUITS SIMILAIRES EN BAS */}
            {similarProducts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('product_detail.similar_products')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {similarProducts.map((p) => (
                    <Link key={p.id} to={`/product/${p.id}`} className="group">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                          <img
                            src={p.images?.[0]?.image_url || '/placeholder.png'}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-4">
                          <p className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary">
                            {p.title}
                          </p>
                          <p className="text-primary font-bold">{p.price_final.toLocaleString()} FCFA</p>
                          {p.rating_average && p.reviews_count && p.reviews_count > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={12}
                                  className={
                                    i < Math.floor(p.rating_average!)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "fill-gray-200 text-gray-200"
                                  }
                                />
                              ))}
                              <span className="text-xs text-gray-600 dark:text-gray-400">({p.reviews_count})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
