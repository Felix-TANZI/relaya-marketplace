// frontend/src/features/vendors/v2/accueil/ShopStatusBar.tsx
// Carte d'une ligne "Boutique ouverte" (ACC-06). Pas d'endpoint
// POST /shop/closed-today ni d'horaires exposés aujourd'hui (VD-11) : le
// bouton "Fermer aujourd'hui" affiche une note au lieu d'appeler une API
// qui n'existe pas encore.

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';

export default function ShopStatusBar() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [showNotYet, setShowNotYet] = useState(false);

  return (
    <div
      className="rounded-2xl px-3.5 py-3 mb-4 flex items-center justify-between gap-2"
      style={{ background: p.card, border: `1px solid ${p.border}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: p.green }} />
        <span className="font-semibold truncate" style={{ fontSize: 13, color: p.text }}>
          {t('sl6_accueil.shop_open')}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setShowNotYet(true)}
        className="font-semibold flex-shrink-0"
        style={{ fontSize: 12, color: p.textMuted, minHeight: 44, padding: '0 4px' }}
      >
        {showNotYet ? t('sl6_accueil.shop_close_not_yet') : t('sl6_accueil.shop_close_today')}
      </button>
    </div>
  );
}
