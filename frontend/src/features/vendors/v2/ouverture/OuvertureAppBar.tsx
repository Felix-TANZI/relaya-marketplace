// frontend/src/features/vendors/v2/ouverture/OuvertureAppBar.tsx
// En-tête « ‹ Devenir vendeur 🛒 » vu sur Ouvrir.jpg / Ouvrir_code.jpg /
// Publier.jpg / Publier_attente.jpg / Publier_contrat.jpg. Ces écrans vivent
// sous le AppLayout générique du site (pas sous un shell vendeur v2 avec
// barre déjà fournie) : cet en-tête minimal comble cet écart sans toucher au
// layout partagé.

import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ShoppingCart } from 'lucide-react';
import type { VendorPalette } from '../theme';

export default function OuvertureAppBar({ p, onBack }: { p: VendorPalette; onBack?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-5" style={{ minHeight: 36 }}>
      <button
        type="button"
        onClick={onBack ?? (() => navigate(-1))}
        className="flex items-center gap-1"
        style={{ fontSize: 15.5, fontWeight: 800, color: p.text }}
        aria-label={t('sl9_ouverture.back_to_login')}
      >
        <ChevronLeft size={20} />
        {t('sl9_ouverture.become_seller_title')}
      </button>
      <Link to="/cart" aria-label={t('sl9_ouverture.go_to_cart')} className="flex-shrink-0">
        <ShoppingCart size={20} color={p.orange} />
      </Link>
    </div>
  );
}
