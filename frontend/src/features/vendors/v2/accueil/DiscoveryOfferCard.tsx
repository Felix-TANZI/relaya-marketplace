// frontend/src/features/vendors/v2/accueil/DiscoveryOfferCard.tsx
// Carte "Offre de découverte" — écran "Premier jour" (KYC-05). Contenu
// statique : les chiffres (3 mois ou 50 commandes) viennent de §2.3 du
// dossier de synthèse et ne dépendent d'aucun endpoint côté serveur
// aujourd'hui (pas de champ d'éligibilité/consommation exposé).

import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';

export default function DiscoveryOfferCard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles size={18} color={p.amber} />
        <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t('sl6_accueil.discovery_title')}</p>
      </div>
      <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl6_accueil.discovery_body')}</p>
    </div>
  );
}
