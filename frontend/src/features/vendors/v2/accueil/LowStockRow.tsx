// frontend/src/features/vendors/v2/accueil/LowStockRow.tsx
// Carte "stock bas", tout en bas de l'accueil (ACC-06). Calcul réel
// stock_quantity vs stock_threshold (voir useAccueilData.ts), avec vraie photo
// produit et lien "Réapprovisionner" — jamais affichée tant qu'aucun produit
// n'est sous son seuil (lowStockItem === null).

import { ChevronRight, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import type { LowStockItem } from './types';

export default function LowStockRow({ item }: { item: LowStockItem | null }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  if (!item) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/seller/v2/produits/${item.productId}`)}
      className="w-full flex items-center gap-3 rounded-2xl p-3 mt-2 mb-2 text-left"
      style={{ background: p.card, border: `1px solid ${p.border}`, minHeight: 44 }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: p.cardAlt }}
      >
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package size={18} color={p.textMuted} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold truncate" style={{ fontSize: 13, color: p.text }}>
          {t('sl6_accueil.low_stock_title', { title: item.title })}
        </p>
        <p style={{ fontSize: 11.5, color: p.textMuted }}>
          {t('sl6_accueil.low_stock_detail', { count: item.quantityLeft, threshold: item.threshold })}
        </p>
        <p className="font-bold" style={{ fontSize: 12, color: p.orange }}>
          {t('sl6_accueil.low_stock_action')}
        </p>
      </div>
      <ChevronRight size={16} color={p.textMuted} className="flex-shrink-0" />
    </button>
  );
}
