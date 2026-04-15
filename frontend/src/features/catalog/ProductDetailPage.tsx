import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  ThumbsUp,
  Truck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { productsApi, type Category, type Product } from "@/services/api/products";
import { useAuth } from "@/context/AuthContext";
import { http } from "@/services/api/http";

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

type CategoryWithChildren = Category & {
  children: Category[];
};

const CATEGORY_ICONS: Record<string, string> = {
  "Téléphones & Tablettes": "📱",
  "Téléphones": "📱",
  "Électronique": "💻",
  "Mode Femme": "👗",
  "Mode Homme": "👔",
  "Beauté & Santé": "✨",
  "Maison & Cuisine": "🏠",
  "Maison & Bureau": "🏠",
  "Supermarché": "🛒",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState<"description" | "avis" | "livraison">(
    "description",
  );
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const hierarchicalCategories = useMemo<CategoryWithChildren[]>(
    () =>
      categories
        .filter((category) => !category.parent)
        .map((parent) => ({
          ...parent,
          children: categories.filter((category) => category.parent === parent.id),
        })),
    [categories],
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsApi.listCategories();
        setCategories(response.results || []);
      } catch (error) {
        // silenced;
      }
    };

    void fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await productsApi.get(Number(id));
        setProduct(data);

        if (data.category) {
          const similar = await productsApi.list({
            category: data.category.id,
            page_size: 4,
          });
          setSimilarProducts(similar.results?.filter((item) => item.id !== data.id) || []);
        }

        const recommended = await productsApi.list({ page_size: 3 });
        setYouMayLike(recommended.results?.filter((item) => item.id !== data.id) || []);
      } catch (error) {
        // silenced;
        showToast(t("product_detail.loading_error"), "error");
      } finally {
        setLoading(false);
      }
    };

    void fetchProduct();
  }, [id, showToast, t]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      try {
        const data = await http<ProductReview[]>(`/api/catalog/products/${id}/reviews/`);
        setReviews(data);
      } catch (error) {
        // silenced;
      }
    };

    void fetchReviews();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      id: product.id,
      name: product.title,
      price: product.price_final,
      quantity,
      image:
        product.images?.find((image) => image.is_primary)?.image_url ||
        product.images?.[0]?.image_url,
    });

    showToast(t("product_detail.added_to_cart"), "success");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/cart");
  };

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !product) {
      showToast(t("product_detail.login_required_review"), "error");
      return;
    }

    try {
      setSubmittingReview(true);
      await http<ProductReview>(`/api/catalog/products/${product.id}/add_review/`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
        }),
      });

      showToast(t("product_detail.review_success"), "success");
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewTitle("");
      setReviewComment("");

      const data = await http<ProductReview[]>(
        `/api/catalog/products/${product.id}/reviews/`,
      );
      setReviews(data);
    } catch (error) {
      // silenced;
      showToast(t("product_detail.review_error"), "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
            <div className="hidden h-[600px] rounded-[1.75rem] bg-white dark:bg-gray-900 xl:block" />
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="skeleton aspect-square rounded-[1.75rem]" />
              <div className="skeleton h-[520px] rounded-[1.75rem]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
        <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-orange-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t("product_detail.not_found")}
          </p>
          <Link to="/catalog" className="mt-4 inline-flex text-primary hover:underline">
            {t("product_detail.back_to_catalog")}
          </Link>
        </div>
      </div>
    );
  }

  const displayImages = product.images?.length
    ? product.images.map((image) => image.image_url)
    : product.media?.filter((media) => media.media_type === "image").map((media) => media.url) || [];
  const currentImage = displayImages[selectedImageIndex];
  const hasDiscount = (product.discount ?? 0) > 0;
  const sidebarSuggestions = (youMayLike.length ? youMayLike : similarProducts).slice(0, 3);
  const averageRating = product.rating_average ?? 4.6;

  return (
    <div className="min-h-screen bg-[#f8f5f1] px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl">
        <div className="flex gap-6">
          <aside className="hidden w-72 shrink-0 xl:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <Link
                  to="/catalog"
                  className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  <ShoppingBag size={16} />
                  {t("product_detail.all_products")}
                </Link>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("product_detail.categories")}
                </h3>
                <div className="mt-4 space-y-2">
                  {hierarchicalCategories.map((category) => {
                    const hasChildren = category.children.length > 0;
                    const isExpanded = expandedCategories.includes(category.id);
                    const icon = CATEGORY_ICONS[category.name] || "🛍️";

                    return (
                      <div key={category.id}>
                        <button
                          onClick={() =>
                            hasChildren &&
                            setExpandedCategories((current) =>
                              isExpanded
                                ? current.filter((item) => item !== category.id)
                                : [...current, category.id],
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-gray-700 transition hover:bg-orange-50 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <span>{icon}</span>
                          <span className="flex-1 font-medium">{category.name}</span>
                          {hasChildren ? (
                            isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )
                          ) : null}
                        </button>
                        {hasChildren && isExpanded ? (
                          <div className="ml-5 mt-1 space-y-1">
                            {category.children.map((child) => (
                              <Link
                                key={child.id}
                                to={`/catalog?category=${child.id}`}
                                className="block rounded-xl px-3 py-2 text-sm text-gray-500 transition hover:bg-orange-50 hover:text-primary dark:text-gray-400 dark:hover:bg-gray-800"
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Vous aimerez aussi
                </h3>
                <div className="mt-4 space-y-4">
                  {sidebarSuggestions.map((item) => (
                    <Link
                      key={item.id}
                      to={`/product/${item.id}`}
                      className="flex gap-3 rounded-2xl p-2 transition hover:bg-orange-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#fff7ef] dark:bg-gray-800">
                        {item.images?.[0]?.image_url ? (
                          <img
                            src={item.images[0].image_url}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package size={28} className="text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="mt-2 text-lg font-bold text-primary">
                          {item.price_final.toLocaleString("fr-FR")} FCFA
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          {item.rating_average?.toFixed(1) || "4.7"} ({item.reviews_count || 0})
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Link to="/" className="hover:text-primary">
                {t("product_detail.home")}
              </Link>
              <span>/</span>
              <Link to="/catalog" className="hover:text-primary">
                {t("product_detail.catalog")}
              </Link>
              {product.category ? (
                <>
                  <span>/</span>
                  <span className="text-gray-800 dark:text-white">{product.category.name}</span>
                </>
              ) : null}
            </nav>

            <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.02fr]">
                <section className="space-y-4">
                  <div className="overflow-hidden rounded-[1.5rem] border border-gray-100 bg-[#fffaf5] p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="aspect-square overflow-hidden rounded-[1.25rem] bg-white dark:bg-gray-900">
                      {currentImage ? (
                        <img
                          src={currentImage}
                          alt={product.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package size={68} className="text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {displayImages.length > 1 ? (
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                      {displayImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`overflow-hidden rounded-2xl border p-2 transition ${
                            selectedImageIndex === index
                              ? "border-primary bg-orange-50 dark:bg-gray-800"
                              : "border-gray-200 bg-white hover:border-primary/40 dark:border-gray-700 dark:bg-gray-900"
                          }`}
                        >
                          <img src={image} alt="" className="aspect-square w-full object-contain" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="space-y-5">
                  <div>
                    {product.category ? (
                      <div className="mb-3 inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary dark:bg-primary/10">
                        {product.category.name}
                      </div>
                    ) : null}
                    <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-white sm:text-4xl">
                      {product.title}
                    </h1>
                  </div>

                  <div className="space-y-3 rounded-[1.5rem] border border-orange-100 bg-[#fffaf5] p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex flex-wrap items-center gap-3">
                      {hasDiscount ? (
                        <span className="rounded-xl bg-primary px-3 py-1 text-sm font-semibold text-white">
                          Promo
                        </span>
                      ) : null}
                      {hasDiscount ? (
                        <span className="text-lg text-gray-400 line-through">
                          {product.price_xaf.toLocaleString("fr-FR")} FCFA
                        </span>
                      ) : null}
                      <span className="text-3xl font-bold text-primary">
                        {product.price_final.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <div className="flex items-center gap-1 text-yellow-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={15}
                            className={
                              index < Math.round(averageRating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-200 dark:text-gray-600"
                            }
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setActiveTab("avis")}
                        className="font-medium text-gray-500 hover:text-primary dark:text-gray-400"
                      >
                        ({reviews.length || product.reviews_count || 0} avis)
                      </button>
                    </div>

                    <div className="text-base leading-8 text-gray-600 dark:text-gray-300">
                      {product.short_description || product.description.slice(0, 170)}
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-300">
                      <Truck size={20} />
                      <span className="text-base font-medium">
                        Livraison rapide partout au Cameroun.
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="inline-flex w-fit items-center overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                          className="flex h-12 w-12 items-center justify-center text-gray-600 transition hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="min-w-[56px] text-center text-lg font-semibold text-gray-900 dark:text-white">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity((current) => current + 1)}
                          className="flex h-12 w-12 items-center justify-center text-gray-600 transition hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <button
                          onClick={handleAddToCart}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition hover:bg-primary-dark"
                        >
                          <ShoppingCart size={18} />
                          {t("product_detail.add_to_cart")}
                        </button>
                        <button
                          onClick={handleBuyNow}
                          className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-base font-semibold text-gray-800 transition hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200"
                        >
                          {t("product_detail.buy_now")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-start gap-3">
                        <Shield size={22} className="mt-1 text-primary" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            Paiement sécurisé
                          </div>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Transaction chiffrée et protégée avec Escrow BelivaY.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-start gap-3">
                        <RotateCcw size={22} className="mt-1 text-primary" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            Retour facile
                          </div>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Produit remboursé selon la politique de retour en vigueur.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <section className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-5 flex flex-wrap gap-5 border-b border-gray-100 pb-4 dark:border-gray-800">
                  {[
                    { key: "description", label: t("product_detail.description") },
                    { key: "avis", label: `${t("product_detail.reviews_tab")} (${reviews.length})` },
                    { key: "livraison", label: t("product_detail.fast_delivery_tab") },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={`text-base font-semibold transition ${
                        activeTab === tab.key
                          ? "text-primary"
                          : "text-gray-500 hover:text-primary dark:text-gray-400"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "description" ? (
                  <div className="space-y-5 text-gray-700 dark:text-gray-300">
                    <p className="text-base leading-8 whitespace-pre-line">{product.description}</p>
                  </div>
                ) : null}

                {activeTab === "avis" ? (
                  <div className="space-y-5">
                    {user && !showReviewForm ? (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
                      >
                        Donner un avis
                      </button>
                    ) : null}

                    {showReviewForm ? (
                      <form
                        onSubmit={handleSubmitReview}
                        className="rounded-[1.5rem] border border-gray-200 bg-[#fffaf5] p-4 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="mb-4 flex gap-2">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setReviewRating(index + 1)}
                              className="text-yellow-500"
                            >
                              <Star
                                size={22}
                                className={
                                  index < reviewRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300 dark:text-gray-600"
                                }
                              />
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={reviewTitle}
                          onChange={(event) => setReviewTitle(event.target.value)}
                          placeholder="Titre de votre avis"
                          className="mb-3 w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          required
                        />
                        <textarea
                          rows={4}
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="Décrivez votre expérience"
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          required
                        />
                        <div className="mt-4 flex gap-3">
                          <button
                            type="submit"
                            disabled={submittingReview}
                            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
                          >
                            {submittingReview ? "Publication..." : "Publier"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowReviewForm(false)}
                            className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"
                          >
                            Annuler
                          </button>
                        </div>
                      </form>
                    ) : null}

                    <div className="space-y-4">
                      {reviews.length > 0 ? (
                        reviews.map((review) => (
                          <article
                            key={review.id}
                            className="rounded-[1.5rem] border border-gray-100 bg-[#fffaf5] p-4 dark:border-gray-700 dark:bg-gray-800"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {review.user_first_name || review.user_name}
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-yellow-500">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <Star
                                      key={index}
                                      size={14}
                                      className={
                                        index < review.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300 dark:text-gray-600"
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(review.created_at)}
                              </div>
                            </div>
                            <div className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                              {review.title}
                            </div>
                            <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
                              {review.comment}
                            </p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              {review.is_verified_purchase ? (
                                <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                  Achat vérifié
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1">
                                <ThumbsUp size={12} />
                                Avis utile
                              </span>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                          Aucun avis pour le moment.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === "livraison" ? (
                  <div className="space-y-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                    <div className="rounded-[1.5rem] border border-green-100 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/10">
                      <div className="font-semibold text-green-800 dark:text-green-300">
                        Livraison rapide
                      </div>
                      <p className="mt-2">
                        Livraison rapide à domicile ou dans un point relais selon votre zone.
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-gray-100 bg-[#fffaf5] p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Retour facile
                      </div>
                      <p className="mt-2">
                        En cas de problème confirmé, la politique de retour BelivaY s’applique.
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>

              <aside className="space-y-4">
                <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Résumé rapide
                  </h3>
                  <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span>Prix unitaire</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {product.price_final.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Quantité</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{quantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Sous-total</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {(product.price_final * quantity).toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Livraison</span>
                      <span className="font-semibold text-green-700 dark:text-green-300">
                        {product.price_final * quantity >= 30000 ? "Offerte" : "À calculer"}
                      </span>
                    </div>
                  </div>
                </div>

                {similarProducts.length > 0 ? (
                  <div className="rounded-[1.75rem] border border-orange-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Produits similaires
                    </h3>
                    <div className="mt-4 space-y-4">
                      {similarProducts.slice(0, 3).map((item) => (
                        <Link
                          key={item.id}
                          to={`/product/${item.id}`}
                          className="flex gap-3 rounded-2xl p-2 transition hover:bg-orange-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#fff7ef] dark:bg-gray-800">
                            {item.images?.[0]?.image_url ? (
                              <img
                                src={item.images[0].image_url}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package size={24} className="text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                              {item.title}
                            </div>
                            <div className="mt-1 text-sm font-bold text-primary">
                              {item.price_final.toLocaleString("fr-FR")} FCFA
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
