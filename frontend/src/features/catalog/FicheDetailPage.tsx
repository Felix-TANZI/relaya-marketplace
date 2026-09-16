// frontend/src/features/catalog/FicheDetailPage.tsx
// Page produit acheteur = la FICHE. Colonne gauche : visuel, vendeur, description.
// Colonne droite : achat, réassurance, spécifications et avis.

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { recordProductView } from '@/lib/recentlyViewed';
import Seo from '@/components/seo/Seo';
import {
  Bell, BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, Clock, Heart, HelpCircle, Link2, Lock,
  MessageCircle, MessageSquare, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag,
  ShoppingCart, Star, Trophy, Truck, X, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { isFavoriteProduct, toggleFavoriteProduct } from '@/lib/favorites';
import {
  productsApi,
  type MasterFicheDetail, type MasterFicheCard, type MasterOffer, type ProductReview,
} from '@/services/api/products';
import { VariantSelector } from './VariantSelector';
import { attributesApi, type MasterProductAxes } from '@/services/api/attributes';
import { variantsApi, type ProductVariantLight } from '@/services/api/variants';
import RelatedProductsSection from '@/components/catalog/RelatedProductsSection';

function fmtXAF(n: number) { return n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ') + ' FCFA'; }

/** Les quatre garanties affichées en damier sous les boutons d'achat (clés i18n, résolues au rendu). */
const GUARANTEES: { icon: LucideIcon; tint: string; color: string; labelKey: string; subKey: string }[] = [
  { icon: Lock, tint: '#eef2ff', color: '#4338CA', labelKey: 'product_detail.guarantee_payment_label', subKey: 'product_detail.guarantee_payment_sub' },
  { icon: ShieldCheck, tint: '#fff1e6', color: '#C85E14', labelKey: 'product_detail.guarantee_escrow_label', subKey: 'product_detail.guarantee_escrow_sub' },
  { icon: RotateCcw, tint: '#e8f1fe', color: '#2563EB', labelKey: 'product_detail.guarantee_return_label', subKey: 'product_detail.guarantee_return_sub' },
  { icon: MessageSquare, tint: '#eef2f7', color: '#334155', labelKey: 'product_detail.guarantee_support_label', subKey: 'product_detail.guarantee_support_sub' },
];

/** Les quatre pastilles compactes, juste au-dessus des boutons (clés i18n). */
const QUICK_CHIPS: { icon: LucideIcon; color: string; labelKey: string }[] = [
  { icon: Lock, color: 'text-indigo-600', labelKey: 'product_detail.guarantee_payment_label' },
  { icon: RotateCcw, color: 'text-blue-600', labelKey: 'product_detail.guarantee_return_label' },
  { icon: Zap, color: 'text-amber-500', labelKey: 'product_detail.chip_delivery' },
  { icon: BadgeCheck, color: 'text-emerald-600', labelKey: 'product_detail.chip_certified_seller' },
];

const WHY_LINE_KEYS = [
  'product_detail.why_line_1',
  'product_detail.why_line_2',
  'product_detail.why_line_3',
  'product_detail.why_line_4',
];

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      {children}
    </section>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= full ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'} />
      ))}
    </span>
  );
}

function StockBadge({ inStock }: { inStock: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${inStock ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`} />
      {inStock ? t('product_detail.in_stock') : t('product_detail.out_of_stock')}
    </span>
  );
}

function ReviewItem({ r }: { r: ProductReview }) {
  const { t, i18n } = useTranslation();
  const initial = (r.user_first_name || r.user_name || '?').charAt(0).toUpperCase();
  return (
    <div className="rounded-xl border border-gray-200/80 p-4 dark:border-gray-700">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initial}</div>
          <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{r.user_first_name || r.user_name}</span>
          {r.is_verified_purchase && <span className="inline-flex flex-shrink-0 items-center gap-1 text-[10px] text-green-600"><BadgeCheck size={11} /> {t('product_detail.verified_purchase')}</span>}
        </div>
        <Stars value={r.rating} size={12} />
      </div>
      {r.title && <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{r.title}</p>}
      <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>
      <p className="mt-2 text-[11px] text-gray-400">{new Date(r.created_at).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
  );
}

function ReviewsModal({ offer, reviews, onClose }: { offer: MasterOffer; reviews: ProductReview[]; onClose: () => void }) {
  const { t } = useTranslation();
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            {offer.real_image
              ? <img src={offer.real_image} alt="" className="h-10 w-10 rounded-lg object-cover" />
              : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700"><ShoppingBag size={16} className="text-gray-300" /></div>}
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t('product_detail.offer_reviews')}</p>
              <p className="text-xs text-gray-400">{fmtXAF(offer.price_final)}{offer.condition ? ` · ${offer.condition}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-5 py-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{avg.toFixed(1)}</span>
            <div><Stars value={avg} size={16} /><p className="mt-0.5 text-xs text-gray-400">{t('product_detail.reviews_verified', { count: reviews.length })}</p></div>
          </div>
          <div className="space-y-3">{reviews.map(r => <ReviewItem key={r.id} r={r} />)}</div>
        </div>
      </div>
    </div>
  );
}

function FicheMiniCard({ fiche }: { fiche: MasterFicheCard }) {
  const price = fiche.buy_box?.price_final;
  return (
    <Link to={`/product/${fiche.slug}`} className="group block">
      <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-br from-[#fff6ee] to-white dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
        {fiche.primary_image
          ? <img src={fiche.primary_image} alt={fiche.title} className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105" />
          : <ShoppingBag size={26} className="text-gray-300" />}
      </div>
      <p className="line-clamp-2 text-xs font-semibold leading-tight text-gray-800 group-hover:text-primary dark:text-gray-100">{fiche.title}</p>
      {price != null && <p className="mt-0.5 text-sm font-extrabold text-primary">{fmtXAF(price)}</p>}
    </Link>
  );
}

function FicheCarousel({ title, fiches, seeAllTo }: { title: string; fiches: MasterFicheCard[]; seeAllTo?: string }) {
  const { t } = useTranslation();
  const PER_PAGE = 7;
  const MAX_PAGES = 9;
  const [page, setPage] = useState(0);
  if (!fiches.length) return null;
  const pages = Math.min(MAX_PAGES, Math.ceil(fiches.length / PER_PAGE));
  const capped = fiches.slice(0, pages * PER_PAGE);
  const visible = capped.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <span className="h-[18px] w-[3px] rounded bg-primary" />
            {title}
          </h2>
          {seeAllTo && (
            <Link to={seeAllTo} className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline">
              {t('product_detail.see_all')} <ChevronRight size={13} />
            </Link>
          )}
        </div>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{page + 1} / {pages}</span>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary disabled:opacity-40 dark:border-gray-700">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary disabled:opacity-40 dark:border-gray-700">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        {visible.map(f => <FicheMiniCard key={f.id} fiche={f} />)}
      </div>
    </Panel>
  );
}

/** Monté seulement quand la fiche est chargée : l'état initial peut donc lire le stockage. */
function FavoriteButton({ productId }: { productId: number }) {
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(() => isFavoriteProduct(productId));

  useEffect(() => {
    const sync = () => setIsFavorite(isFavoriteProduct(productId));
    window.addEventListener('belivay-favorites-updated', sync as EventListener);
    return () => window.removeEventListener('belivay-favorites-updated', sync as EventListener);
  }, [productId]);

  return (
    <button
      type="button"
      onClick={() => setIsFavorite(toggleFavoriteProduct(productId).includes(productId))}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-[13.5px] font-bold transition-all duration-200 hover:-translate-y-0.5 ${
        isFavorite
          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10'
          : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
      }`}
    >
      <Heart size={16} className="text-red-500" fill={isFavorite ? 'currentColor' : 'none'} />
      {isFavorite ? t('product_detail.removed_from_favorites') : t('product_detail.add_to_favorites')}
    </button>
  );
}

/**
 * Compte à rebours de l'offre. Faute de date de fin sur les offres, on retient la
 * même convention que le bandeau promotions de l'accueil : la fin de la journée.
 * L'horloge n'est lue que dans l'effet, jamais pendant le rendu.
 */
function PromoCountdown() {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState('--:--:--');

  useEffect(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const target = end.getTime();

    const tick = () => {
      const total = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setRemaining([Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
        .map(u => String(u).padStart(2, '0')).join(':'));
    };

    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  return (
    <div
      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] font-bold text-white shadow-[0_8px_22px_rgba(220,38,38,.25)]"
      style={{ background: 'linear-gradient(96deg,#DC2626 0%,#EF4444 55%,#F97316 100%)' }}
    >
      <Clock size={15} />
      {t('product_detail.offer_expires_in')}
      <span className="rounded-lg bg-black/20 px-2.5 py-0.5 tabular-nums tracking-wide">{remaining}</span>
    </div>
  );
}

export default function FicheDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [master, setMaster] = useState<MasterFicheDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [condFilter, setCondFilter] = useState<string>('all');
  const [qty, setQty] = useState(1);
  const [reviewsByOffer, setReviewsByOffer] = useState<Record<number, ProductReview[]>>({});
  // Variants
  const [masterAxes, setMasterAxes] = useState<MasterProductAxes | null>(null);
  const [variants, setVariants] = useState<ProductVariantLight[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [reviewModalOffer, setReviewModalOffer] = useState<MasterOffer | null>(null);
  const [similar, setSimilar] = useState<MasterFicheCard[]>([]);
  const [recos, setRecos] = useState<MasterFicheCard[]>([]);
  // Affichage
  const [showOffers, setShowOffers] = useState(false);
  const [tab, setTab] = useState<'specs' | 'reviews'>('specs');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const m = await productsApi.getMaster(slug);
        if (!cancelled) { setMaster(m); setImgIndex(0); setQty(1); setCondFilter('all'); setImgError(false); }
      } catch {
        if (!cancelled) setMaster(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [slug]);

  /* Historique local : alimente la frame « Recemment consultes » de l'accueil. */
  useEffect(() => {
    const productId = Number(slug);
    if (Number.isFinite(productId) && productId > 0) recordProductView(productId);
  }, [slug]);

  useEffect(() => {
    if (!master) return;
    let cancelled = false;
    const run = async () => {
      const entries = await Promise.all(master.offers.map(async o => {
        try { return [o.id, await productsApi.getReviews(o.id)] as const; }
        catch { return [o.id, [] as ProductReview[]] as const; }
      }));
      if (!cancelled) setReviewsByOffer(Object.fromEntries(entries));
    };
    run();
    return () => { cancelled = true; };
  }, [master]);

  // Charger axes + variants quand master change
  useEffect(() => {
    if (!master) {
      setMasterAxes(null);
      setVariants([]);
      setSelectedVariantId(null);
      return;
    }

    let cancelled = false;
    Promise.all([
      attributesApi.getMasterAxes(master.slug).catch(() => null),
      variantsApi.listByMaster(master.slug).catch(() => []),
    ]).then(([axes, variantList]) => {
      if (cancelled) return;
      setMasterAxes(axes);
      setVariants(variantList);

      // Pré-sélectionner le premier variant avec une Buy Box disponible
      if (variantList.length > 0 && axes && axes.variant_axes_resolved.length > 0) {
        const withBuyBox = variantList.find((v) => v.buy_box_price_xaf !== null);
        setSelectedVariantId(withBuyBox?.id ?? variantList[0].id);
      }
    });

    return () => { cancelled = true; };
  }, [master]);

  useEffect(() => {
    if (!master) return;
    let cancelled = false;
    const run = async () => {
      try {
        const catId = master.category?.id;
        const sim = catId ? await productsApi.listMasters({ category: catId, page_size: 63 }) : { results: [] };
        const rec = await productsApi.listMasters({ ordering: '-created_at', page_size: 63 });
        if (cancelled) return;
        setSimilar((sim.results ?? []).filter(f => f.id !== master.id));
        setRecos((rec.results ?? []).filter(f => f.id !== master.id));
      } catch { /* ignore */ }
    };
    run();
    return () => { cancelled = true; };
  }, [master]);

  if (loading) {
    return (
      <div className="w-full px-3 py-6 sm:px-6 lg:px-10">
        <div className="grid animate-pulse grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="h-96 rounded-2xl bg-gray-100 dark:bg-gray-800 lg:col-span-5" />
          <div className="h-96 rounded-2xl bg-gray-100 dark:bg-gray-800 lg:col-span-7" />
        </div>
      </div>
    );
  }

  if (!master) {
    return (
      <div className="w-full py-20 text-center">
        <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="mb-3 text-gray-500">{t('product_detail.not_found')}</p>
        <Link to="/catalog" className="inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-white">{t('product_detail.explore_catalog')}</Link>
      </div>
    );
  }

  const heroImage = master.images[imgIndex]?.image ?? master.primary_image ?? null;

  // Filtrer les offres selon le variant sélectionné (si applicable)
  const hasVariantAxes = masterAxes && masterAxes.variant_axes_resolved.length > 0;

  const filteredMasterOffers = hasVariantAxes && selectedVariantId
    ? master.offers.filter((o) => o.variant === selectedVariantId)
    : master.offers;

  // Buy Box = offre la moins chère du variant (ou master.buy_box en fallback)
  const buyBox = hasVariantAxes && selectedVariantId
    ? (filteredMasterOffers.sort((a, b) => a.price_xaf - b.price_xaf)[0] ?? null)
    : master.buy_box;

  const otherOffers = filteredMasterOffers.filter((o) => !buyBox || o.id !== buyBox.id);
  const conditions = Array.from(new Set(otherOffers.map(o => o.condition).filter((c): c is string => !!c)));
  const filteredOffers = otherOffers.filter(o => condFilter === 'all' || o.condition === condFilter);
  const shortDesc = buyBox?.short_description?.trim();
  const bbReviews = buyBox ? (reviewsByOffer[buyBox.id] ?? []) : [];
  const avgRating = bbReviews.length ? bbReviews.reduce((s, r) => s + r.rating, 0) / bbReviews.length : 0;

  /* Le palier vendeur n'a pas de champ dédié : on le lit dans la note du vendeur
     quand elle le mentionne, sinon la pastille reste générique. */
  const SELLER_TIERS = ["Platine", "Platinum", "Or", "Gold", "Argent", "Silver", "Bronze"];
  const sellerTier =
    SELLER_TIERS.find((tier) =>
      (buyBox?.seller_note ?? "").toLowerCase().includes(tier.toLowerCase()),
    ) ?? null;

  const onPromo = Boolean(buyBox?.is_on_promotion && buyBox.discount_percent > 0);
  const saved = buyBox?.compare_at_price ? Math.max(0, buyBox.compare_at_price - buyBox.price_final) : 0;
  const inStock = Boolean(buyBox && buyBox.stock_quantity > 0);
  /* Jauge de stock : pleine à partir de 25 unités, comme les fiches de l'accueil. */
  const stockRatio = Math.min(100, Math.round(((buyBox?.stock_quantity ?? 0) / 25) * 100));

  const addOffer = (offer: MasterOffer, quantity = 1) => {
    addItem({ id: offer.id, master_id: master.id, name: master.title, price: offer.price_final, quantity, image: heroImage ?? undefined });
    showToast(t('product_detail.added_to_cart'), 'success');
  };
  const buyNow = (offer: MasterOffer) => { addOffer(offer, qty); navigate('/cart'); };

  const share = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: master.title, url }).catch(() => { /* annulé */ });
      return;
    }
    navigator.clipboard?.writeText(url).then(
      () => showToast(t('product_detail.link_copied'), 'success'),
      () => showToast(t('product_detail.link_copy_failed'), 'error'),
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // REFERENCEMENT DE LA FICHE
  //
  // Sans ce bloc, chaque fiche s'annoncait a Google sous le titre generique
  // d'index.html. Le JSON-LD Product est ce qui permet d'afficher prix,
  // disponibilite et etoiles directement dans les resultats de recherche.
  // ───────────────────────────────────────────────────────────────────────────
  const prixOffres = filteredMasterOffers
    .filter((o) => o.is_active && o.price_final > 0)
    .map((o) => o.price_final);
  const enStock = filteredMasterOffers.some((o) => o.is_active && o.stock_quantity > 0);
  const descriptionSeo = (shortDesc || master.description || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

  const ficheJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: master.title,
    sku: String(master.id),
    ...(master.brand ? { brand: { "@type": "Brand", name: master.brand } } : {}),
    ...(descriptionSeo ? { description: descriptionSeo } : {}),
    ...(master.primary_image ? { image: [master.primary_image] } : {}),
    ...(master.category?.name ? { category: master.category.name } : {}),
    ...(prixOffres.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "XAF",
            lowPrice: Math.min(...prixOffres),
            highPrice: Math.max(...prixOffres),
            offerCount: prixOffres.length,
            availability: enStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: `https://belivay.com/product/${master.slug}`,
          },
        }
      : {}),
    ...(bbReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(avgRating.toFixed(1)),
            reviewCount: bbReviews.length,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f6f8] dark:bg-gray-900">
      <Seo
        title={master.brand ? `${master.title} — ${master.brand}` : master.title}
        description={
          descriptionSeo ||
          t('product_detail.seo_fallback_desc', { title: master.title })
        }
        path={`/product/${master.slug}`}
        image={master.primary_image ?? undefined}
        type="product"
        jsonLd={ficheJsonLd}
      />
      <div className="w-full space-y-5 px-3 py-6 sm:px-6 lg:px-10">

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ═══════════════ COLONNE GAUCHE ═══════════════ */}
          <div className="space-y-4 lg:col-span-5">
            {/* Galerie : vignettes à gauche, visuel principal à droite */}
            <Panel className="p-4">
              <div className="flex gap-3">
                {master.images.length > 1 && (
                  <div className="flex w-16 flex-shrink-0 flex-col gap-2">
                    {master.images.slice(0, 5).map((im, i) => (
                      <button key={im.id} onClick={() => { setImgIndex(i); setImgError(false); }}
                        className={`aspect-square overflow-hidden rounded-xl border-2 bg-white transition-all ${i === imgIndex ? 'border-primary' : 'border-gray-200/80 opacity-70 hover:opacity-100 dark:border-gray-700'}`}>
                        <img src={im.image} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-[#fff6ee] via-white to-[#fff1e2] dark:border-gray-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                  {heroImage && !imgError
                    ? <img src={heroImage} alt={master.title} onError={() => setImgError(true)} className="h-full max-h-[420px] w-full object-contain p-4" />
                    : <div className="flex flex-col items-center gap-2 py-20 text-gray-300 dark:text-gray-600"><ShoppingBag size={52} strokeWidth={1.5} /><span className="text-xs font-medium">{t('product_detail.image_coming')}</span></div>}

                  {onPromo && (
                    <span className="absolute left-3 top-3 rounded-full bg-red-50 px-3 py-1 text-[12px] font-black text-red-600 ring-1 ring-red-100">
                      −{buyBox?.discount_percent}%
                    </span>
                  )}
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                    <BadgeCheck size={12} /> {t('product_detail.certified')}
                  </span>
                </div>
              </div>
            </Panel>

            {/* Vendeur certifié */}
            <Panel className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
                <BadgeCheck size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-extrabold text-gray-900 dark:text-white">{t('product_detail.sold_by_certified')}</p>
                <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
                  {t('product_detail.identity_verified')}
                </p>
              </div>
              <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">
                <Trophy size={11} /> {sellerTier ?? t('product_detail.certified')}
              </span>
            </Panel>

            <Link
              to="/contact"
              className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-white px-4 py-2.5 text-[12.5px] font-bold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/5 dark:bg-gray-800"
            >
              <MessageCircle size={14} /> {t('product_detail.ask_question')}
            </Link>

            {/* Description */}
            <Panel className="p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-gray-900 dark:text-white">
                <MessageSquare size={16} className="text-gray-400" />
                {t('product_detail.description_title')}
              </h2>

              <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                {master.description || shortDesc || t('product_detail.no_description')}
              </p>

              <div className="mt-4 rounded-xl border border-[#fbe3cb] bg-[#fff8f0] p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <p className="text-[12.5px] font-black text-[#C85E14]">{t('product_detail.why_choose_title')}</p>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {WHY_LINE_KEYS.map(key => (
                    <li key={key} className="flex items-center gap-2 text-[12.5px] font-semibold text-[#8a5a2b] dark:text-amber-200">
                      <BadgeCheck size={14} className="flex-shrink-0 text-emerald-500" />
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            {/* FAQ produit — compense l'absence de messagerie directe avec le vendeur */}
            {buyBox?.faq && buyBox.faq.length > 0 && (
              <Panel className="p-5">
                <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-gray-900 dark:text-white">
                  <HelpCircle size={16} className="text-gray-400" />
                  {t('product_detail.faq_title')}
                </h2>
                <div className="mt-3 flex flex-col gap-2">
                  {buyBox.faq.map((entry, index) => (
                    <details key={index} className="group rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-gray-800 dark:text-gray-100">
                        {entry.question}
                        <ChevronDown size={15} className="flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-gray-600 dark:text-gray-300">
                        {entry.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          {/* ═══════════════ COLONNE DROITE ═══════════════ */}
          <div className="space-y-3.5 lg:col-span-7">
            {/* Fil d'Ariane */}
            <nav className="flex flex-wrap items-center gap-1.5 text-[12px] text-gray-400">
              <Link to="/" className="hover:text-primary">{t('product_detail.home')}</Link>
              {master.category && (
                <>
                  <ChevronRight size={12} />
                  <Link to={`/categorie/${master.category.slug}`} className="hover:text-primary">{master.category.name}</Link>
                </>
              )}
              <ChevronRight size={12} />
              <span className="font-semibold text-gray-600 dark:text-gray-300">{master.title}</span>
            </nav>

            {/* Pastilles de confiance */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11.5px] font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20">
                <BadgeCheck size={12} /> {t('product_detail.certified_belivay')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11.5px] font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/20">
                <Lock size={12} /> {t('product_detail.escrow')}
              </span>
              {onPromo && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11.5px] font-bold text-red-600 ring-1 ring-red-100 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/20">
                  {t('product_detail.promo_percent', { percent: buyBox?.discount_percent })}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11.5px] font-bold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/20">
                <RotateCcw size={12} /> {t('product_detail.return_7d')}
              </span>
            </div>

            <h1 className="text-[22px] font-black leading-tight text-gray-900 sm:text-[26px] dark:text-white">{master.title}</h1>

            {onPromo && <PromoCountdown />}

            {/* Sélecteur de variant */}
            {masterAxes && masterAxes.variant_axes_resolved.length > 0 && variants.length > 0 && (
              <Panel className="p-4">
                <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">{t('product_detail.configuration')}</h3>
                <VariantSelector
                  axes={masterAxes.variant_axes_resolved}
                  variants={variants}
                  selectedVariantId={selectedVariantId}
                  onChange={(id) => setSelectedVariantId(id)}
                />
              </Panel>
            )}

            {hasVariantAxes && selectedVariantId && !buyBox && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                {t('product_detail.no_offer_for_config')}
              </div>
            )}

            {buyBox ? (
              <>
                {/* Prix */}
                <div className="rounded-2xl border border-[#fbe3cb] bg-[#fff8f0] px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-[30px] font-black leading-none text-primary sm:text-[34px]">{fmtXAF(buyBox.price_final)}</span>
                    {buyBox.compare_at_price && buyBox.compare_at_price > buyBox.price_final && (
                      <span className="text-[15px] font-semibold text-gray-400 line-through">{fmtXAF(buyBox.compare_at_price)}</span>
                    )}
                    {saved > 0 && (
                      <span className="rounded-full bg-primary px-2.5 py-1 text-[11.5px] font-black text-white">− {fmtXAF(saved)}</span>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div className="flex items-center gap-2">
                  <Stars value={avgRating || 5} />
                  <span className="text-[12.5px] text-gray-500 dark:text-gray-400">
                    {bbReviews.length ? t('product_detail.reviews_verified', { count: bbReviews.length }) : t('product_detail.new_on_belivay')}
                  </span>
                </div>

                {/* Livraison */}
                <p className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-2.5 text-[12.5px] text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Truck size={14} className="flex-shrink-0" />
                  {t('product_detail.delivery_today')}
                </p>

                {/* Stock */}
                <div className="flex flex-wrap items-center gap-3">
                  <StockBadge inStock={inStock} />
                  <span className="text-[12px] text-gray-400">· {t('product_detail.available_count', { count: buyBox.stock_quantity })}</span>
                  <span className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${stockRatio}%` }} />
                  </span>
                </div>

                {/* Quantité */}
                <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-gray-700 dark:text-gray-200">{t('product_detail.quantity_label')}</span>
                    <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-2.5 text-gray-500 hover:text-primary"><Minus size={15} /></button>
                      <span className="w-10 text-center text-sm font-bold">{qty}</span>
                      <button onClick={() => setQty(q => q + 1)} className="p-2.5 text-gray-500 hover:text-primary"><Plus size={15} /></button>
                    </div>
                  </div>
                  <span className="text-[14px] font-black text-primary">{fmtXAF(buyBox.price_final * qty)}</span>
                </Panel>

                {/* Pastilles rapides */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_CHIPS.map(chip => {
                    const Icon = chip.icon;
                    return (
                      <span key={chip.labelKey} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11.5px] font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        <Icon size={12} className={chip.color} />
                        {t(chip.labelKey)}
                      </span>
                    );
                  })}
                </div>

                {/* Boutons */}
                <button onClick={() => addOffer(buyBox, qty)} disabled={!inStock}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[14px] font-black text-white shadow-[0_10px_26px_rgba(244,121,32,.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-dark disabled:translate-y-0 disabled:opacity-50">
                  <ShoppingCart size={17} /> {t('product_detail.add_to_cart')}
                </button>

                <button onClick={() => buyNow(buyBox)} disabled={!inStock}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b1220] py-3.5 text-[14px] font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1a2438] disabled:translate-y-0 disabled:opacity-50">
                  <Zap size={16} className="text-amber-300" /> {t('product_detail.buy_now')}
                </button>

                <FavoriteButton productId={master.id} />

                <button onClick={share}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-[12.5px] font-bold text-gray-600 transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                  <Link2 size={14} /> {t('product_detail.share')}
                </button>

                <button
                  onClick={() => showToast(t('product_detail.price_alert_saved'), { description: t('product_detail.price_alert_desc'), type: 'success' })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-black text-amber-900 transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(96deg,#FDE68A,#FCD34D)' }}
                >
                  <Bell size={15} /> {t('product_detail.alert_price_drop')}
                </button>
              </>
            ) : (
              <Panel className="p-5 text-center text-sm text-gray-500">{t('product_detail.no_offer_available')}</Panel>
            )}

            {/* Autres vendeurs */}
            {otherOffers.length > 0 && (
              <Panel className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowOffers(v => !v)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingCart size={16} className="text-gray-400" />
                    <span>
                      <span className="block text-[13.5px] font-extrabold text-gray-900 dark:text-white">
                        {t('product_detail.other_sellers')} <span className="text-primary">({otherOffers.length})</span>
                      </span>
                      <span className="block text-[11.5px] text-gray-400">{t('product_detail.other_offers_for_product')}</span>
                    </span>
                  </span>
                  <ChevronDown size={18} className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${showOffers ? 'rotate-180' : ''}`} />
                </button>

                {showOffers && (
                  <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-700">
                    {conditions.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button onClick={() => setCondFilter('all')} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${condFilter === 'all' ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-500 hover:border-primary/40 dark:border-gray-700'}`}>{t('product_detail.all_conditions')}</button>
                        {conditions.map(c => (
                          <button key={c} onClick={() => setCondFilter(c)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${condFilter === c ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-500 hover:border-primary/40 dark:border-gray-700'}`}>{c}</button>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {filteredOffers.map(o => {
                        const oReviews = reviewsByOffer[o.id] ?? [];
                        return (
                          <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-900/40">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-800">
                              {o.real_image ? <img src={o.real_image} alt="" className="h-full w-full object-cover" /> : <ShoppingBag size={16} className="text-gray-300" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] font-extrabold text-gray-900 dark:text-white">{fmtXAF(o.price_final)}</p>
                              <p className="truncate text-[11.5px] text-gray-400">
                                {o.condition ? `${o.condition} · ` : ''}{o.seller_note || t('product_detail.default_seller_note')}
                              </p>
                              {oReviews.length > 0 && (
                                <button onClick={() => setReviewModalOffer(o)} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                                  <MessageSquare size={11} /> {t('product_detail.reviews_verified', { count: oReviews.length })}
                                </button>
                              )}
                            </div>

                            <StockBadge inStock={o.stock_quantity > 0} />

                            <button onClick={() => addOffer(o, 1)} disabled={o.stock_quantity <= 0}
                              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-primary px-3.5 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white disabled:opacity-50">
                              <ShoppingCart size={13} /> {t('product_detail.add_short')}
                            </button>
                          </div>
                        );
                      })}
                      {filteredOffers.length === 0 && (
                        <p className="py-3 text-sm text-gray-400">{t('product_detail.no_offer_for_condition')}</p>
                      )}
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* Garanties */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {GUARANTEES.map(g => {
                const Icon = g.icon;
                return (
                  <article key={g.labelKey} className="flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white p-3 transition-transform duration-200 hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: g.tint, color: g.color }}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-extrabold leading-tight text-gray-900 dark:text-white">{t(g.labelKey)}</p>
                      <p className="truncate text-[11.5px] text-gray-400">{t(g.subKey)}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Spécifications / Avis */}
            <Panel className="p-4 sm:p-5">
              <div className="flex gap-5 border-b border-gray-100 dark:border-gray-700">
                {([['specs', t('product_detail.specs_tab')], ['reviews', t('product_detail.reviews_tab_count', { count: bbReviews.length })]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`-mb-px border-b-2 pb-2.5 text-[13px] font-bold transition-colors ${
                      tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'specs' ? (
                <div className="mt-1 divide-y divide-gray-100 dark:divide-gray-700">
                  {([
                    [
                      t('product_detail.spec_seller'),
                      <span className="text-[#2563EB]">
                        {t('product_detail.sold_by_certified')}{sellerTier ? ` · ${sellerTier}` : ''}
                      </span>,
                    ],
                    [t('product_detail.spec_category'), master.category?.name || '—'],
                    [
                      t('product_detail.spec_rating'),
                      bbReviews.length ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Stars value={avgRating} size={13} />
                          ({avgRating.toFixed(1)}/5)
                        </span>
                      ) : (
                        t('product_detail.not_rated_yet')
                      ),
                    ],
                    [t('product_detail.spec_stock'), inStock ? t('product_detail.available_count', { count: buyBox?.stock_quantity }) : t('product_detail.unavailable')],
                    [t('product_detail.spec_condition'), buyBox?.condition || '—'],
                    [t('product_detail.spec_delivery'), t('product_detail.delivery_value')],
                    [t('product_detail.spec_return'), t('product_detail.return_value')],
                    [t('product_detail.spec_escrow'), <span className="inline-flex items-center gap-1.5 text-emerald-600"><BadgeCheck size={13} />{t('product_detail.included')}</span>],
                  ] as [string, ReactNode][]).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[130px_1fr] gap-3 py-3">
                      <span className="text-[12.5px] font-bold text-gray-700 dark:text-gray-300">{k}</span>
                      <span className="text-[12.5px] text-gray-500 dark:text-gray-400">{v}</span>
                    </div>
                  ))}
                </div>
              ) : bbReviews.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
                  <Star size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('product_detail.no_reviews_yet')}</p>
                  <p className="mt-1 text-xs text-gray-400">{t('product_detail.be_first_review')}</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 mt-4 flex items-center gap-4 border-b border-gray-100 pb-4 dark:border-gray-700">
                    <span className="text-4xl font-black text-gray-900 dark:text-white">{avgRating.toFixed(1)}</span>
                    <div><Stars value={avgRating} size={18} /><p className="mt-1 text-xs text-gray-400">{t('product_detail.reviews_verified', { count: bbReviews.length })}</p></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{bbReviews.map(r => <ReviewItem key={r.id} r={r} />)}</div>
                </>
              )}
            </Panel>
          </div>
        </div>

        {/* SIMILAIRES + RECOMMANDATIONS */}
        <FicheCarousel
          title={t('product_detail.similar_products')}
          fiches={similar}
          seeAllTo={master.category ? `/categorie/${master.category.slug}` : '/catalog'}
        />
        <FicheCarousel title={t('product_detail.you_may_like')} fiches={recos} />

        {/* ════ Related Products Section ════ */}
        {master && (
          // MasterOffer (buyBox) ne porte pas d'info vendeur dans son
          // typage actuel — pas d'exclusion de vendeur ici plutot que
          // d'etendre serializer + type pour cet a-cote cosmetique.
          <RelatedProductsSection
            masterId={master.id}
            limit={5}
          />
        )}
      </div>

      {reviewModalOffer && (
        <ReviewsModal offer={reviewModalOffer} reviews={reviewsByOffer[reviewModalOffer.id] ?? []} onClose={() => setReviewModalOffer(null)} />
      )}
    </div>
  );
}
