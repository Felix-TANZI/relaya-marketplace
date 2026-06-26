// frontend/src/features/catalog/FicheDetailPage.tsx
// Page produit acheteur = la FICHE (Buy Box + offres anonymes + filtre par état).

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Package, ShieldCheck, Tag, ChevronLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { productsApi, type MasterFicheDetail, type MasterOffer } from '@/services/api/products';

function fmtXAF(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }

export default function FicheDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [master, setMaster] = useState<MasterFicheDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [condFilter, setCondFilter] = useState<string>('all');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const m = await productsApi.getMaster(slug);
        if (!cancelled) { setMaster(m); setImgIndex(0); setQty(1); setCondFilter('all'); }
      } catch {
        if (!cancelled) setMaster(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement…</div>;
  if (!master) return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <p className="text-gray-500 mb-2">Produit introuvable.</p>
      <Link to="/search" className="text-primary font-semibold">Retour à la recherche</Link>
    </div>
  );

  const heroImage = master.images[imgIndex]?.image ?? master.primary_image ?? null;
  const conditions = Array.from(new Set(master.offers.map(o => o.condition).filter((c): c is string => !!c)));
  const filteredOffers = master.offers.filter(o => condFilter === 'all' || o.condition === condFilter);
  const buyBox = master.buy_box;

  const addOffer = (offer: MasterOffer, quantity = 1) => {
    addItem({ id: offer.id, name: master.title, price: offer.price_final, quantity, image: heroImage ?? undefined });
    showToast('Ajouté au panier', 'success');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link to="/search" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
        <ChevronLeft size={16} /> Retour
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GALERIE */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {heroImage
              ? <img src={heroImage} alt={master.title} className="w-full h-full object-contain" />
              : <Package size={48} className="text-gray-300" />}
          </div>
          {master.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {master.images.map((im, i) => (
                <button key={im.id} onClick={() => setImgIndex(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === imgIndex ? 'border-primary' : 'border-transparent'}`}>
                  <img src={im.image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFOS + BUY BOX */}
        <div>
          {master.brand && <p className="text-sm text-gray-400 mb-1">{master.brand}</p>}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{master.title}</h1>
          {master.category && (
            <Link to={`/search?category=${master.category.id}`} className="inline-flex items-center gap-1 text-xs text-gray-400 mb-4">
              <Tag size={12} /> {master.category.name}
            </Link>
          )}

          {buyBox ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mt-2">
              <p className="text-xs font-semibold text-primary mb-1">Meilleure offre</p>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{fmtXAF(buyBox.price_final)}</span>
                {buyBox.is_on_promotion && buyBox.compare_at_price && (
                  <span className="text-sm text-gray-400 line-through mb-1">{fmtXAF(buyBox.compare_at_price)}</span>
                )}
                {buyBox.discount_percent > 0 && (
                  <span className="text-xs font-bold text-green-600 mb-1">-{buyBox.discount_percent}%</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
                {buyBox.condition && <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{buyBox.condition}</span>}
                <span className={buyBox.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}>
                  {buyBox.stock_quantity > 0 ? `En stock (${buyBox.stock_quantity})` : 'Rupture'}
                </span>
              </div>
              {buyBox.seller_note && <p className="text-xs text-gray-500 mb-3">« {buyBox.seller_note} »</p>}

              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-xl dark:border-gray-700">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="p-2"><Minus size={14} /></button>
                  <span className="w-8 text-center text-sm">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="p-2"><Plus size={14} /></button>
                </div>
                <button onClick={() => addOffer(buyBox, qty)} disabled={buyBox.stock_quantity <= 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl disabled:opacity-50">
                  <ShoppingCart size={16} /> Ajouter au panier
                </button>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-3">
                <ShieldCheck size={13} /> Paiement sécurisé via l'Escrow BelivaY
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-sm text-gray-500">
              Aucune offre disponible pour ce produit pour le moment.
            </div>
          )}
        </div>
      </div>

      {/* AUTRES OFFRES + FILTRE PAR ÉTAT */}
      {master.offers.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Offres disponibles ({master.offers.length})
          </h2>

          {conditions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setCondFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${condFilter === 'all' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-500 dark:border-gray-700'}`}>
                Tous les états
              </button>
              {conditions.map(c => (
                <button key={c} onClick={() => setCondFilter(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${condFilter === c ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-500 dark:border-gray-700'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {filteredOffers.map(o => (
              <div key={o.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{fmtXAF(o.price_final)}</span>
                    {o.condition && <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{o.condition}</span>}
                    <span className={`text-[11px] ${o.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {o.stock_quantity > 0 ? 'En stock' : 'Rupture'}
                    </span>
                  </div>
                  {o.seller_note && <p className="text-xs text-gray-500 mt-1 truncate">« {o.seller_note} »</p>}
                </div>
                <button onClick={() => addOffer(o, 1)} disabled={o.stock_quantity <= 0}
                  className="flex-shrink-0 flex items-center gap-1.5 border border-primary text-primary font-semibold text-sm px-4 py-2 rounded-xl disabled:opacity-50">
                  <ShoppingCart size={14} /> Ajouter
                </button>
              </div>
            ))}
            {filteredOffers.length === 0 && <p className="text-sm text-gray-400">Aucune offre pour cet état.</p>}
          </div>
        </div>
      )}

      {/* DESCRIPTION */}
      {master.description && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Description</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{master.description}</p>
        </div>
      )}
    </div>
  );
}