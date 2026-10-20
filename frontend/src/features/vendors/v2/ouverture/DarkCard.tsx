// frontend/src/features/vendors/v2/ouverture/DarkCard.tsx
// Carte "nuit" dégradée — reprend le traitement visuel vu sur toutes les
// maquettes fond clair pour les blocs à forte valeur (promesse vendeur en
// haut de Connexion.jpg, contrat en cinq lignes de Publier_contrat.jpg,
// compte à rebours de Publier_attente.jpg, tuile d'app d'Installer.jpg).
// Volontairement fixe (jamais dérivée de palette(theme)) : sur les
// maquettes, ce traitement reste sombre que le reste de l'écran soit en
// thème clair ou sombre — c'est un accent de marque, pas un mode d'affichage.

import type { CSSProperties, ReactNode } from 'react';

export const DARK_HERO_GRADIENT = 'linear-gradient(160deg, #3A2211 0%, #1C0F06 55%, #100905 100%)';

export const DARK_HERO_TEXT = '#FFFFFF';
export const DARK_HERO_TEXT_MUTED = 'rgba(255,255,255,0.68)';
export const DARK_HERO_TILE_BG = 'rgba(255,255,255,0.08)';

export function DarkCard({
  children, className, style,
}: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className ?? ''}`}
      style={{ background: DARK_HERO_GRADIENT, boxShadow: '0 18px 42px rgba(0,0,0,0.32)', ...style }}
    >
      {children}
    </div>
  );
}
