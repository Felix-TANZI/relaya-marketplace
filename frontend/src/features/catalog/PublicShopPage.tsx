// frontend/src/features/catalog/PublicShopPage.tsx
// Page publique d'une boutique vendeur.
// Route : /boutique/:slug — accessible sans authentification.

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Store, MapPin, Clock, Phone, Star,
  Package, ShieldCheck, ArrowLeft,
} from 'lucide-react';
import type { Product } from '@/services/api/products';
import { http } from '@/services/api/http';

interface PublicShopData {
  slug:                 string;
  business_name:        string;
  business_description: string;
  city:                 string;
  whatsapp_phone:       string;
  preparation_delay:    string;
  return_policy:        string;
  banner_url:           string | null;
  photo_url:            string | null;
  certification_tier:   string;
  is_online:            boolean;
  member_since:         string;
  stats: { total_products: number; avg_rating: number | null; reviews_count: number };
  products:             Product[];
}

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32', SILVER: '#7C8490', GOLD: '#C8A000', DIAMOND: '#2563EB',
};
const TIER_LABELS: Record<string, string> = {
  BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', DIAMOND: 'Diamant',
};
const PREP_LABELS: Record<string, string> = {
  '24H': '24h ouvrables', '48H': '48h ouvrables', '72H': '72h ouvrables', 'CUSTOM': 'Sur commande',
};

function fmtXAF(n: number) { return Math.round(n).toLocaleString('fr-FR') + ' FCFA'; }

export default function PublicShopPage() {
  const { slug }                  = useParams<{ slug: string }>();
  const [shop,    setShop]        = useState<PublicShopData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  useEffect(() => {
    if (!slug) return;
    http<PublicShopData>(`/api/boutique/${slug}/`)
      .then(setShop)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
      <div className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{ borderColor: 'rgba(244,121,32,0.2)', borderTopColor: '#F47920' }}/>
    </div>
  );

  if (notFound || !shop) return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="text-center px-4">
        <Store size={56} className="mx-auto mb-4" style={{ color: '#B8A898' }}/>
        <h1 className="text-2xl font-black mb-2" style={{ color: '#1A1209', fontFamily: 'Poppins,sans-serif' }}>
          Boutique introuvable
        </h1>
        <p className="text-[14px] mb-6" style={{ color: '#7C6E5A' }}>
          Cette boutique n'existe pas ou n'est plus disponible.
        </p>
        <Link to="/catalog" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white"
          style={{ background: '#F47920' }}>
          <ArrowLeft size={14}/> Voir le catalogue
        </Link>
      </div>
    </div>
  );

  const tier = shop.certification_tier || 'BRONZE';

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>

      {/* BANNIÈRE */}
      <div className="relative w-full" style={{ height: 200 }}>
        {shop.banner_url
          ? <img src={shop.banner_url} alt="bannière boutique" className="w-full h-full object-cover"/>
          : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#1C1209,#2A1C0E)' }}/>
        }
        {/* Overlay gradient bas */}
        <div className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(to bottom, transparent, #F5F0E8)' }}/>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        {/* PROFIL */}
        <div className="flex items-end gap-4 -mt-10 mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 relative z-10"
            style={{ border: '3px solid #F47920', background: '#EDE7DC' }}>
            {shop.photo_url
              ? <img src={shop.photo_url} alt={shop.business_name} className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center">
                  <Store size={28} style={{ color: '#B8A898' }}/>
                </div>
            }
          </div>
          <div className="pb-1">
            <h1 className="font-black text-[22px]" style={{ color: '#1A1209', fontFamily: 'Poppins,sans-serif' }}>
              {shop.business_name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${TIER_COLORS[tier]}20`, color: TIER_COLORS[tier] }}>
                {TIER_LABELS[tier]}
              </span>
              <span className="flex items-center gap-1 text-[12px]" style={{ color: '#7C6E5A' }}>
                <MapPin size={11}/>{shop.city}
              </span>
              {shop.stats.avg_rating && (
                <span className="flex items-center gap-1 text-[12px]" style={{ color: '#D97706' }}>
                  <Star size={11} className="fill-current"/>{shop.stats.avg_rating} ({shop.stats.reviews_count} avis)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* COLONNE GAUCHE — Infos */}
          <div className="space-y-4">
            {/* Description */}
            {shop.business_description && (
              <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E8E2D9' }}>
                <p className="text-[13px] leading-relaxed" style={{ color: '#7C6E5A' }}>
                  {shop.business_description}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Package size={14}/>,     label: 'Produits',   value: String(shop.stats.total_products) },
                { icon: <ShieldCheck size={14}/>,  label: 'Certification', value: TIER_LABELS[tier] },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 text-center"
                  style={{ background: '#FFFFFF', border: '1px solid #E8E2D9' }}>
                  <div className="flex justify-center mb-1" style={{ color: '#F47920' }}>{s.icon}</div>
                  <p className="font-black text-[15px]" style={{ color: '#1A1209', fontFamily: 'Poppins,sans-serif' }}>{s.value}</p>
                  <p className="text-[11px]" style={{ color: '#B8A898' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Infos pratiques */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: '#FFFFFF', border: '1px solid #E8E2D9' }}>
              <p className="font-bold text-[13px]" style={{ color: '#1A1209' }}>Infos pratiques</p>
              {shop.preparation_delay && (
                <div className="flex items-center gap-2 text-[12.5px]" style={{ color: '#7C6E5A' }}>
                  <Clock size={13} style={{ color: '#F47920' }}/>
                  Délai : {PREP_LABELS[shop.preparation_delay] || shop.preparation_delay}
                </div>
              )}
              {shop.whatsapp_phone && (
                <a href={`https://wa.me/${shop.whatsapp_phone.replace(/\D/g,'')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12.5px] font-semibold"
                  style={{ color: '#16A34A' }}>
                  <Phone size={13}/>WhatsApp : {shop.whatsapp_phone}
                </a>
              )}
              {shop.return_policy && (
                <div className="pt-2" style={{ borderTop: '1px solid #E8E2D9' }}>
                  <p className="text-[11.5px] font-semibold mb-1" style={{ color: '#7C6E5A' }}>Politique de retour</p>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#7C6E5A' }}>{shop.return_policy}</p>
                </div>
              )}
            </div>
          </div>

          {/* COLONNE DROITE — Produits */}
          <div className="lg:col-span-2 space-y-4">
            <p className="font-bold text-[15px]" style={{ color: '#1A1209', fontFamily: 'Poppins,sans-serif' }}>
              {shop.stats.total_products} produit{shop.stats.total_products > 1 ? 's' : ''}
            </p>
            {shop.products.length === 0 ? (
              <div className="rounded-2xl py-12 text-center" style={{ background: '#FFFFFF', border: '1px solid #E8E2D9' }}>
                <Package size={36} className="mx-auto mb-3" style={{ color: '#B8A898' }}/>
                <p style={{ color: '#7C6E5A' }}>Aucun produit disponible.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {shop.products.map(p => {
                  const img = p.images?.find(i => i.is_primary) || p.images?.[0];
                  return (
                    <Link key={p.id} to={`/product/${p.id}`}
                      className="rounded-2xl overflow-hidden group transition-all hover:-translate-y-0.5"
                      style={{ background: '#FFFFFF', border: '1px solid #E8E2D9', boxShadow: '0 1px 4px rgba(28,18,9,0.05)' }}>
                      <div className="aspect-square overflow-hidden" style={{ background: '#EDE7DC' }}>
                        {img?.image_url
                          ? <img src={img.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                          : <div className="w-full h-full flex items-center justify-center">
                              <Package size={24} style={{ color: '#B8A898' }}/>
                            </div>
                        }
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-[12.5px] line-clamp-2 mb-1" style={{ color: '#1A1209' }}>{p.title}</p>
                        <p className="font-black text-[14px]" style={{ color: '#F47920', fontFamily: 'Poppins,sans-serif' }}>
                          {fmtXAF(p.price_xaf)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
