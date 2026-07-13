// frontend/src/features/catalog/FicheDetailPage.tsx
// Page produit acheteur = la FICHE. Panneaux distincts, pleine largeur.

import { useEffect, useState, createElement, type ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Minus, Plus, ShoppingBag, ShieldCheck, Tag, ChevronLeft, ChevronRight,
  Truck, RotateCcw, BadgeCheck, Star, Zap, X, MessageSquare,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import {
  productsApi,
  type MasterFicheDetail, type MasterFicheCard, type MasterOffer, type ProductReview,
} from '@/services/api/products';
import { VariantSelector } from "./VariantSelector";
import { attributesApi, type MasterProductAxes } from "@/services/api/attributes";
import { variantsApi, type ProductVariantLight } from "@/services/api/variants";

function fmtXAF(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }

const REASSURANCE = [
  { icon: ShieldCheck, label: 'Paiement protégé', sub: "via l'Escrow BelivaY" },
  { icon: Truck,       label: 'Livraison rapide', sub: '24 – 72h' },
  { icon: RotateCcw,   label: 'Retour facilité',  sub: 'sous conditions' },
  { icon: BadgeCheck,  label: 'Qualité vérifiée', sub: 'offres modérées' },
];

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm ${className}`}>
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
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${inStock ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`} />
      {inStock ? 'En stock' : 'Rupture de stock'}
    </span>
  );
}

function ReviewItem({ r }: { r: ProductReview }) {
  const initial = (r.user_first_name || r.user_name || '?').charAt(0).toUpperCase();
  return (
    <div className="rounded-xl border border-gray-200/80 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{initial}</div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.user_first_name || r.user_name}</span>
          {r.is_verified_purchase && <span className="inline-flex items-center gap-1 text-[10px] text-green-600 flex-shrink-0"><BadgeCheck size={11} /> Achat vérifié</span>}
        </div>
        <Stars value={r.rating} size={12} />
      </div>
      {r.title && <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{r.title}</p>}
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{r.comment}</p>
      <p className="text-[11px] text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
  );
}

function ReviewsModal({ offer, reviews, onClose }: { offer: MasterOffer; reviews: ProductReview[]; onClose: () => void }) {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {offer.real_image
              ? <img src={offer.real_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
              : <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><ShoppingBag size={16} className="text-gray-300" /></div>}
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Avis de l'offre</p>
              <p className="text-xs text-gray-400">{fmtXAF(offer.price_final)}{offer.condition ? ` · ${offer.condition}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{avg.toFixed(1)}</span>
            <div><Stars value={avg} size={16} /><p className="text-xs text-gray-400 mt-0.5">{reviews.length} avis</p></div>
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
      <div className="aspect-square rounded-xl overflow-hidden border border-gray-200/80 dark:border-gray-700 bg-gradient-to-br from-[#fff6ee] to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center mb-2">
        {fiche.primary_image
          ? <img src={fiche.primary_image} alt={fiche.title} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" />
          : <ShoppingBag size={26} className="text-gray-300" />}
      </div>
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight group-hover:text-primary">{fiche.title}</p>
      {price != null && <p className="text-sm font-extrabold text-primary mt-0.5">{fmtXAF(price)}</p>}
    </Link>
  );
}

function FicheCarousel({ title, fiches }: { title: string; fiches: MasterFicheCard[] }) {
  const PER_PAGE = 7;
  const MAX_PAGES = 9;
  const [page, setPage] = useState(0);
  if (!fiches.length) return null;
  const pages = Math.min(MAX_PAGES, Math.ceil(fiches.length / PER_PAGE));
  const capped = fiches.slice(0, pages * PER_PAGE);
  const visible = capped.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{page + 1} / {pages}</span>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/40 disabled:opacity-40">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/40 disabled:opacity-40">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:gap-4">
        {visible.map(f => <FicheMiniCard key={f.id} fiche={f} />)}
      </div>
    </Panel>
  );
}

export default function FicheDetailPage() {
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
        const withBuyBox = variantList.find(
          (v) => v.buy_box_price_xaf !== null,
        );
        setSelectedVariantId(withBuyBox?.id ?? variantList[0].id);
      }
    });

    return () => {
      cancelled = true;
    };
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
      <div className="w-full px-3 sm:px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-pulse">
          <div className="lg:col-span-8 h-96 rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="lg:col-span-4 h-96 rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  if (!master) {
    return (
      <div className="w-full py-20 text-center">
        <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 mb-3">Produit introuvable.</p>
        <Link to="/catalog" className="inline-block bg-primary text-white font-semibold px-5 py-2.5 rounded-xl">Explorer le catalogue</Link>
      </div>
    );
  }

  const heroImage = master.images[imgIndex]?.image ?? master.primary_image ?? null;

  // Filtrer les offres selon le variant sélectionné (si applicable)
  const hasVariantAxes =
    masterAxes && masterAxes.variant_axes_resolved.length > 0;

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

  const addOffer = (offer: MasterOffer, quantity = 1) => {
    addItem({ id: offer.id, name: master.title, price: offer.price_final, quantity, image: heroImage ?? undefined });
    showToast('Ajouté au panier', 'success');
  };
  const buyNow = (offer: MasterOffer) => { addOffer(offer, qty); navigate('/cart'); };

  return (
    <div className="w-full bg-[#f7f5f1] dark:bg-gray-900 min-h-screen">
      <div className="w-full px-3 sm:px-6 lg:px-10 py-6 space-y-5">

        <Link to="/catalog" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
          <ChevronLeft size={16} /> Retour au catalogue
        </Link>

        {/* HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Panel className="lg:col-span-8 p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700 bg-gradient-to-br from-[#fff6ee] via-white to-[#fff1e2] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
                  {heroImage && !imgError
                    ? <img src={heroImage} alt={master.title} onError={() => setImgError(true)} className="w-full h-full object-contain p-6" />
                    : <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600"><ShoppingBag size={52} strokeWidth={1.5} /><span className="text-xs font-medium">Image à venir</span></div>}
                  {buyBox?.is_on_promotion && buyBox.discount_percent > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-lg shadow-primary/25">-{buyBox.discount_percent}%</span>
                  )}
                </div>
                {master.images.length > 1 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {master.images.map((im, i) => (
                      <button key={im.id} onClick={() => { setImgIndex(i); setImgError(false); }}
                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                        <img src={im.image} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2">{master.title}</h1>
                <div className="flex items-center gap-2 mb-4">
                  <Stars value={avgRating} />
                  <span className="text-xs text-gray-400">{bbReviews.length ? `${avgRating.toFixed(1)} · ${bbReviews.length} avis` : 'Nouveau sur BelivaY'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {master.category && (
                    <Link to={`/catalog?category=${master.category.id}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                      <Tag size={12} /> {master.category.name}
                    </Link>
                  )}
                  {buyBox?.condition && (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">{buyBox.condition}</span>
                  )}
                </div>
                {shortDesc && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">{shortDesc}</p>
                )}
              </div>
            </div>
          </Panel>

          <div className="lg:col-span-4 space-y-4">
            {/* Sélecteur de Variant — au-dessus de la Buy Box */}
            {masterAxes && masterAxes.variant_axes_resolved.length > 0 && variants.length > 0 && (
              <div className="rounded-2xl border border-orange-100 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">
                  Configuration
                </h3>
                <VariantSelector
                  axes={masterAxes.variant_axes_resolved}
                  variants={variants}
                  selectedVariantId={selectedVariantId}
                  onChange={(id) => setSelectedVariantId(id)}
                />
              </div>
            )}

            {/* Feedback quand aucune offre pour ce variant */}
            {hasVariantAxes && selectedVariantId && !buyBox && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                Aucune offre disponible pour cette configuration.
                Choisis une autre combinaison ou reviens plus tard.
              </div>
            )}

            {buyBox ? (
              <div className="lg:sticky lg:top-24 rounded-2xl border border-primary/25 bg-orange-50/60 dark:bg-orange-900/10 shadow-sm p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">Meilleure offre</p>
                <div className="flex items-end gap-2 mb-2 flex-wrap">
                  <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">{fmtXAF(buyBox.price_final)}</span>
                  {buyBox.is_on_promotion && buyBox.compare_at_price && (
                    <span className="text-sm text-gray-400 line-through mb-0.5">{fmtXAF(buyBox.compare_at_price)}</span>
                  )}
                </div>
                <div className="mb-4"><StockBadge inStock={buyBox.stock_quantity > 0} /></div>
                {buyBox.seller_note && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 bg-white/70 dark:bg-gray-800/60 rounded-xl px-3 py-2 mb-4 border border-gray-200/80 dark:border-gray-700">{buyBox.seller_note}</p>
                )}
                <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 w-fit mb-3">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-2.5 text-gray-500 hover:text-primary"><Minus size={16} /></button>
                  <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="p-2.5 text-gray-500 hover:text-primary"><Plus size={16} /></button>
                </div>
                <button onClick={() => addOffer(buyBox, qty)} disabled={buyBox.stock_quantity <= 0}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0">
                  <ShoppingCart size={18} /> Ajouter au panier
                </button>
                <button onClick={() => buyNow(buyBox)} disabled={buyBox.stock_quantity <= 0}
                  className="w-full mt-2 flex items-center justify-center gap-2 border border-primary text-primary font-semibold py-2.5 rounded-xl transition-all hover:bg-primary hover:text-white disabled:opacity-50">
                  <Zap size={16} /> Acheter maintenant
                </button>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-3"><ShieldCheck size={13} /> Paiement protégé · Escrow BelivaY</p>
              </div>
            ) : (
              <Panel className="p-5 text-sm text-gray-500 text-center">Aucune offre disponible pour le moment.</Panel>
            )}
          </div>
        </div>

        {/* RÉASSURANCE */}
        <Panel className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {REASSURANCE.map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">{createElement(r.icon, { size: 18 })}</div>
                <div className="min-w-0"><p className="text-xs font-bold text-gray-800 dark:text-gray-100 leading-tight">{r.label}</p><p className="text-[11px] text-gray-400 truncate">{r.sub}</p></div>
              </div>
            ))}
          </div>
        </Panel>

        {/* AUTRES OFFRES (tableau avec photo + avis) */}
        {otherOffers.length > 0 && (
          <Panel className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Autres offres</h2>
            <p className="text-sm text-gray-400 mb-4">{otherOffers.length} autre(s) vendeur(s) proposent ce produit.</p>
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setCondFilter('all')} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${condFilter === 'all' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-500 hover:border-primary/40 dark:border-gray-700'}`}>Tous les états</button>
                {conditions.map(c => (
                  <button key={c} onClick={() => setCondFilter(c)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${condFilter === c ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-500 hover:border-primary/40 dark:border-gray-700'}`}>{c}</button>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-2 min-w-[780px]">
                <thead>
                  <tr className="text-left text-xs text-gray-400">
                    <th className="px-3 font-medium">Photo</th>
                    <th className="px-4 font-medium">Prix</th>
                    <th className="px-4 font-medium">État</th>
                    <th className="px-4 font-medium">Disponibilité</th>
                    <th className="px-4 font-medium">Note du vendeur</th>
                    <th className="px-4 font-medium">Avis</th>
                    <th className="px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOffers.map(o => {
                    const oReviews = reviewsByOffer[o.id] ?? [];
                    return (
                      <tr key={o.id} className="bg-gray-50 dark:bg-gray-900/40">
                        <td className="px-3 py-2 rounded-l-xl">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                            {o.real_image ? <img src={o.real_image} alt="" className="w-full h-full object-cover" /> : <ShoppingBag size={16} className="text-gray-300" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-extrabold text-gray-900 dark:text-white whitespace-nowrap">{fmtXAF(o.price_final)}</td>
                        <td className="px-4 py-3">{o.condition ? <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">{o.condition}</span> : <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-3"><StockBadge inStock={o.stock_quantity > 0} /></td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[220px] truncate">{o.seller_note || '—'}</td>
                        <td className="px-4 py-3">
                          {oReviews.length > 0
                            ? <button onClick={() => setReviewModalOffer(o)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><MessageSquare size={12} /> {oReviews.length} avis</button>
                            : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 rounded-r-xl text-right">
                          <button onClick={() => addOffer(o, 1)} disabled={o.stock_quantity <= 0}
                            className="inline-flex items-center gap-1.5 border border-primary text-primary font-semibold text-xs px-3.5 py-2 rounded-lg transition-all hover:bg-primary hover:text-white disabled:opacity-50">
                            <ShoppingCart size={13} /> Ajouter
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOffers.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-4 text-sm text-gray-400">Aucune offre pour cet état.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* DESCRIPTION + CARACTÉRISTIQUES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Panel className="lg:col-span-2 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Description</h2>
            {master.description
              ? <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{master.description}</p>
              : <p className="text-sm text-gray-400 italic">Aucune description fournie pour ce produit.</p>}
          </Panel>
          <Panel className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Caractéristiques</h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                ['Catégorie', master.category?.name || '—'],
                ['État', buyBox?.condition || '—'],
                ['Offres', String(master.offers.length)],
                ['Disponibilité', buyBox && buyBox.stock_quantity > 0 ? 'En stock' : 'Indisponible'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-gray-400">{k}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 text-right">{v}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* AVIS — meilleure offre */}
        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Avis clients</h2>
          <p className="text-sm text-gray-400 mb-4">Avis sur la meilleure offre.</p>
          {bbReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
              <Star size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Aucun avis pour le moment</p>
              <p className="text-xs text-gray-400 mt-1">Soyez le premier à donner votre avis après votre achat.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100 dark:border-gray-700">
                <span className="text-4xl font-black text-gray-900 dark:text-white">{avgRating.toFixed(1)}</span>
                <div><Stars value={avgRating} size={18} /><p className="text-xs text-gray-400 mt-1">{bbReviews.length} avis vérifiés</p></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{bbReviews.map(r => <ReviewItem key={r.id} r={r} />)}</div>
            </>
          )}
        </Panel>

        {/* SIMILAIRES + RECOMMANDATIONS */}
        <FicheCarousel title="Produits similaires" fiches={similar} />
        <FicheCarousel title="Vous aimeriez aussi" fiches={recos} />
      </div>

      {reviewModalOffer && (
        <ReviewsModal offer={reviewModalOffer} reviews={reviewsByOffer[reviewModalOffer.id] ?? []} onClose={() => setReviewModalOffer(null)} />
      )}
    </div>
  );
}