// Icônes Lucide au trait du prototype livreur (24 × 24, trait 1,9 par défaut, currentColor, masquées aux lecteurs
// d'écran), lues dans src/genere/icones.json (outils/prototype.mjs). Remplace aussi site/src/composants/Icone pour le
// code du client réutilisé (vite.config.ts) : mêmes propriétés. Une icône absente : erreur en console (tests).
import type { CSSProperties } from 'react'
import icones from '../genere/icones.json'

const ICONES = icones as Record<string, string>

export function Icone({ nom, taille = 20, trait, style }: { nom: string; taille?: number; trait?: number; style?: CSSProperties }) {
  const corps = ICONES[nom]
  if (corps === undefined) console.error('[icône absente]', nom)
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={trait ?? 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      dangerouslySetInnerHTML={{ __html: corps ?? '' }}
    />
  )
}
