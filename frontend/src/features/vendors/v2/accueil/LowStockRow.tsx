// frontend/src/features/vendors/v2/accueil/LowStockRow.tsx
// Ligne discrète "stock bas", tout en bas de l'accueil (ACC-06). Aucune
// source fiable de seuil de stock bas agrégé n'est exposée par l'API
// aujourd'hui (attend GET /seller/today.low_stock, VD-D05.A05) : composant
// prêt, mais jamais affiché tant que count === 0.

import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';

export default function LowStockRow({ count }: { count: number }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-2 justify-center mt-2 mb-2" style={{ minHeight: 44 }}>
      <AlertCircle size={14} color={p.amber} />
      <span style={{ fontSize: 12, color: p.textMuted }}>
        {t('sl6_accueil.low_stock', { count })}
      </span>
    </div>
  );
}
