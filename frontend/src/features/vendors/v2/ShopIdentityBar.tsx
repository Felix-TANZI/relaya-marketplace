// frontend/src/features/vendors/v2/ShopIdentityBar.tsx
// Bande d'identité boutique affichée sous l'en-tête des écrans racine
// (Accueil, Commandes, Produits) — VD-04/VD-05/VD-08, visible sur toutes les
// captures de référence du paquet (03_Captures) mais absente de la première
// version de ces écrans. Uniquement des données réelles de VendorProfile —
// pas de pastille "plan" tant qu'aucun champ API ne porte le plan réel du
// vendeur (voir compte/plans/LesPlansPage.tsx, encore sur l'ancien système).
// Composant autonome (récupère son propre profil) pour s'intégrer d'un seul
// import dans les trois écrans racine sans toucher à leurs hooks de données.

import { useEffect, useState } from 'react';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import { useTheme } from '@/context/ThemeContext';
import { palette } from './theme';
import { mapLegacyTier } from './compte/shared/format';

const TIER_LABEL: Record<string, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Argent',
  GOLD: 'Or',
  PLATINUM: 'Platine',
};

export default function ShopIdentityBar() {
  const { theme } = useTheme();
  const p = palette(theme);
  const [profile, setProfile] = useState<VendorProfile | null>(null);

  useEffect(() => {
    vendorsApi.getProfile().then(setProfile).catch(() => {});
  }, []);

  if (!profile) return null;

  const tier = mapLegacyTier(profile.certification_tier);
  const statusLabel = profile.status === 'APPROVED' ? 'Ouverte'
    : profile.status === 'SUSPENDED' ? 'Suspendue'
    : profile.status === 'REJECTED' ? 'Refusée'
    : 'En attente';
  const statusColor = profile.status === 'APPROVED' ? p.green
    : profile.status === 'SUSPENDED' || profile.status === 'REJECTED' ? p.red
    : p.amber;

  const pill = (children: React.ReactNode, color: string) => (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-bold flex-shrink-0"
      style={{ fontSize: 11, padding: '5px 10px', background: `${color}1F`, color }}
    >
      {children}
    </span>
  );

  return (
    <div className="mb-3">
      <p className="flex items-center gap-1.5 mb-2" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: p.textMuted }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.orange }} />
        ESPACE VENDEUR · {profile.business_name.toUpperCase()}
      </p>
      <div className="flex flex-wrap gap-2">
        {pill(<><span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />{statusLabel}</>, statusColor)}
        {pill(`${TIER_LABEL[tier]} · ${profile.total_points}`, p.orange)}
      </div>
    </div>
  );
}
