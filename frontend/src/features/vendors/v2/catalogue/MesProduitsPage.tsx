// frontend/src/features/vendors/v2/catalogue/MesProduitsPage.tsx
// Écran "Mes produits" — VD-08 §3.1/3.3 (PRD-01 à PRD-07).
// GET /offers (VD-D09.A01, compteurs + attention[] serveur) n'existe pas :
// on charge vendorsApi.getProducts() et on calcule tout côté client — voir
// helpers.ts pour chaque pont documenté (bandes d'attention, tri, "vous gardez").

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Inbox, Package, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorProfile, type VendorProduct } from '@/services/api/vendors';
import { palette } from '../theme';
import { AttentionBand, Card, CenterState, Pill } from './ui';
import {
  buildListItems, fmtXAF, sortByUrgency, tierToCommissionTier, useDisputedProductIds,
} from './helpers';
import type { ProductListItem } from './types';

export default function MesProduitsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const disputedIds = useDisputedProductIds();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, prof] = await Promise.all([vendorsApi.getProducts(), vendorsApi.getProfile().catch(() => null)]);
      setProducts(prods);
      setProfile(prof);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tier = tierToCommissionTier(profile?.certification_tier);

  const items = useMemo(() => {
    const labels = {
      lowStock: (stock: number) => t('sl10_catalogue.attention_low_stock', { count: stock }),
      lowStockAction: t('sl10_catalogue.attention_low_stock_action'),
      dispute: t('sl10_catalogue.attention_dispute'),
      disputeAction: t('sl10_catalogue.attention_dispute_action'),
    };
    return sortByUrgency(buildListItems(products, disputedIds, tier, labels));
  }, [products, disputedIds, tier, t]);

  const counts = useMemo(() => ({
    total: products.length,
    selling: products.filter((prod) => prod.is_active).length,
    paused: products.filter((prod) => !prod.is_active).length,
  }), [products]);

  return (
    <div className="pb-24 pt-2">
      <div className="flex items-start justify-between mb-1 gap-3">
        <h1 className="font-black" style={{ fontSize: 19, color: p.text }}>{t('sl10_catalogue.list_title')}</h1>
        <button
          type="button"
          onClick={() => navigate('/seller/v2/produits/nouveau')}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full font-bold text-white"
          style={{ background: p.orange, padding: '9px 14px', fontSize: 12.5, minHeight: 38 }}
        >
          <Plus size={14} /> {t('sl10_catalogue.cta_new_offer')}
        </button>
      </div>

      {/* Ligne de synthèse (PRD-01) */}
      <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>
        {t('sl10_catalogue.list_summary', { total: counts.total, selling: counts.selling, paused: counts.paused })}
      </p>

      {loading ? (
        <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl10_catalogue.loading')} p={p} />
      ) : error ? (
        <CenterState icon={<Inbox size={22} color={p.red} />} title={error} p={p} />
      ) : items.length === 0 ? (
        <CenterState
          icon={<Package size={22} color={p.textMuted} />}
          title={t('sl10_catalogue.empty_title')}
          detail={t('sl10_catalogue.empty_detail')}
          p={p}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ProductListCard
              key={item.product.id}
              item={item}
              p={p}
              onOpen={() => navigate(`/seller/v2/produits/${item.product.id}`)}
              onDuplicate={() => navigate(`/seller/v2/produits/dupliquer/${item.product.id}`)}
              onLowStock={() => navigate(`/seller/v2/produits/${item.product.id}`)}
              onDispute={() => navigate('/seller/disputes')}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductListCard({
  item, p, onOpen, onDuplicate, onLowStock, onDispute, t,
}: {
  item: ProductListItem;
  p: ReturnType<typeof palette>;
  onOpen: () => void;
  onDuplicate: () => void;
  onLowStock: () => void;
  onDispute: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { product } = item;
  const accent = item.state === 'paused' ? undefined : item.attentions.length > 0 ? p.amber : p.green;

  return (
    <Card p={p} accent={accent}>
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: p.cardAlt }}>
            {item.primaryImageUrl ? (
              <img src={item.primaryImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package size={20} color={p.textMuted} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate" style={{ fontSize: 14, color: p.text }}>{product.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Pill
                label={item.state === 'selling' ? t('sl10_catalogue.state_selling') : t('sl10_catalogue.state_paused')}
                tone={item.state === 'selling' ? 'green' : 'muted'}
                p={p}
              />
              <span style={{ fontSize: 11.5, color: p.textMuted }}>
                {t('sl10_catalogue.stock_label', { count: product.stock_quantity })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 600 }}>{t('sl10_catalogue.you_keep_per_sale')}</span>
          <span className="font-black" style={{ fontSize: 15, color: p.green }}>{fmtXAF(item.keptPerSaleXaf)}</span>
        </div>
      </button>

      {item.attentions.map((attention) => (
        <AttentionBand
          key={attention.type}
          label={attention.label}
          actionLabel={attention.actionLabel}
          tone={attention.type === 'dispute' ? 'red' : 'amber'}
          onAction={attention.type === 'dispute' ? onDispute : onLowStock}
          p={p}
        />
      ))}

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="mt-3 flex items-center gap-1.5 font-semibold"
        style={{ fontSize: 12, color: p.orange }}
      >
        <Copy size={13} /> {t('sl10_catalogue.duplicate')}
      </button>
    </Card>
  );
}
