// frontend/src/features/vendors/v2/accueil/ScoreApproachingCard.tsx
// Carte "Votre score approche d'un seuil" — état "Accueil_alerte" (variante de
// l'écran "à faire", pas un variant AccueilState séparé). Insérée entre la
// file "à faire" et le stock bas quand le vendeur est à ~15 points ou moins
// du seuil suivant (Argent ≥ 65, Or ≥ 80, Platine ≥ 90 — compte/shared/format.ts).
//
// Source de données : vendorsApi.getCertifications() — le même pont que
// compte/trust-score/MonPalierPage.tsx (ancien moteur à points, en attendant
// le vrai moteur Trust Score à 6 critères/V5.5). On réutilise ici exactement
// le même calcul "distance au palier suivant" que MonPalierPage plutôt que
// d'en inventer un second : palier courant → mapLegacyTier(cert.current_tier),
// palier suivant → le seuil canonique TIER_THRESHOLD (pas cert.next_threshold,
// qui reste sur l'échelle de l'ancien moteur à points).
//
// Composant autonome (récupère son propre cert, comme ShopIdentityBar.tsx
// récupère son propre profil) : aucun changement nécessaire à
// useAccueilData.ts pour ce chiffre.
//
// Le mockup Accueil_alerte.html liste 3 conditions chiffrées précises
// ("2 commandes du jour", "2 litiges", "3 commandes livrées pour arriver à
// 10") et un gain en francs par produit ("324 F de plus par ITEL"). Aucune de
// ces données n'existe côté API aujourd'hui :
//  - le nombre de commandes "livrées" restantes pour un palier de points n'a
//    pas d'endpoint (pas de champ "objectif de commandes livrées") → omis,
//    jamais fabriqué (règle V16, déjà appliquée dans MonPalierPage.tsx).
//  - "préparer à l'heure" / "répondre aux litiges" RESTENT affichés, mais
//    avec les vrais compteurs du jour (prepareCount/disputeCount, déjà
//    calculés par AccueilPage à partir des files réelles), pas un nombre
//    inventé.
//  - le gain en francs ("324 F par ITEL") est remplacé par le multiplicateur
//    canonique de palier (TIER_KEEP_BONUS_PCT, VD-10) — même choix que la
//    carte verte de MonPalierPage, qui évite déjà tout chiffre en francs non
//    vérifiable.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { vendorsApi, type CertificationData } from '@/services/api/vendors';
import { mapLegacyTier, TIER_THRESHOLD, TIER_KEEP_BONUS_PCT, type SellerTier } from '../compte/shared/format';

/** Distance maximale (en points) au seuil suivant pour afficher la carte. */
const APPROACHING_WINDOW = 15;

const NEXT_TIER_OF: Partial<Record<SellerTier, SellerTier>> = {
  BRONZE: 'SILVER',
  SILVER: 'GOLD',
  GOLD: 'PLATINUM',
};

const TIER_LABEL_KEYS: Record<SellerTier, string> = {
  BRONZE: 'sl6_accueil.tier_bronze',
  SILVER: 'sl6_accueil.tier_silver',
  GOLD: 'sl6_accueil.tier_gold',
  PLATINUM: 'sl6_accueil.tier_platinum',
};

interface Props {
  /** Pour la clé de persistance du "Masquer" — null tant que le profil n'est pas chargé. */
  vendorId: number | null;
  /** Commandes du jour à préparer — déjà calculé par AccueilPage à partir de state.todos. */
  prepareCount: number;
  /** Litiges ouverts — déjà calculé par AccueilPage à partir de state.todos. */
  disputeCount: number;
  onSeeTier: () => void;
}

export default function ScoreApproachingCard({ vendorId, prepareCount, disputeCount, onSeeTier }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [cert, setCert] = useState<CertificationData | null>(null);

  useEffect(() => {
    vendorsApi.getCertifications().then(setCert).catch(() => {});
  }, []);

  // "Masquer" persisté par vendeur ET par palier visé : si le vendeur masque
  // "plus que 2 points pour Argent" puis progresse encore (ou redescend et
  // vise un autre palier plus tard), la carte redevient visible pour la
  // nouvelle cible au lieu de rester cachée pour toujours.
  const storageKey = vendorId ? `belivay-score-approaching-dismissed-${vendorId}` : null;
  const [dismissedFor, setDismissedFor] = useState<string | null>(
    () => (storageKey ? window.localStorage.getItem(storageKey) : null),
  );

  if (!cert) return null;

  const currentTier = mapLegacyTier(cert.current_tier);
  const nextTier = NEXT_TIER_OF[currentTier] ?? null;
  if (!nextTier) return null; // déjà Platine (ou au-delà) : pas de seuil suivant à approcher.

  const score = cert.total_points;
  const nextThreshold = TIER_THRESHOLD[nextTier];
  const pointsToNext = nextThreshold - score;
  if (pointsToNext <= 0 || pointsToNext > APPROACHING_WINDOW) return null;

  if (dismissedFor === nextTier) return null;

  const bonusPct = TIER_KEEP_BONUS_PCT[nextTier];
  const nextTierLabel = t(TIER_LABEL_KEYS[nextTier]);

  const handleDismiss = () => {
    if (storageKey) window.localStorage.setItem(storageKey, nextTier);
    setDismissedFor(nextTier);
  };

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: `${p.orange}14`, border: `1px solid ${p.orange}55` }}>
      <p className="font-bold mb-1" style={{ fontSize: 13.5, color: p.text }}>
        {t('sl6_accueil.score_approaching_title', { tier: nextTierLabel })}
      </p>
      <p className="mb-2.5" style={{ fontSize: 12.5, color: p.textMuted }}>
        {t('sl6_accueil.score_approaching_points', { count: pointsToNext, tier: nextTierLabel })}
        {' '}
        {t('sl6_accueil.score_approaching_bonus', { pct: bonusPct })}
      </p>

      {(prepareCount > 0 || disputeCount > 0) ? (
        <ul className="mb-3 space-y-1 list-none" style={{ fontSize: 12, color: p.text }}>
          {prepareCount > 0 ? (
            <li>• {t('sl6_accueil.score_approaching_action_prepare', { count: prepareCount })}</li>
          ) : null}
          {disputeCount > 0 ? (
            <li>• {t('sl6_accueil.score_approaching_action_dispute', { count: disputeCount })}</li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSeeTier}
          className="flex-1 rounded-xl font-bold text-white"
          style={{ minHeight: 44, background: p.orange, fontSize: 13 }}
        >
          {t('sl6_accueil.score_approaching_cta_tier')}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="font-semibold flex-shrink-0"
          style={{ minHeight: 44, padding: '0 14px', fontSize: 13, color: p.textMuted }}
        >
          {t('sl6_accueil.score_approaching_dismiss')}
        </button>
      </div>
    </div>
  );
}
