// Icônes Lucide au trait, comme ic() du prototype (CDS-09) : 24 × 24, trait 1,9 par défaut,
// currentColor, masquées aux lecteurs d'écran. Une icône absente ne retombe jamais sur un cercle :
// erreur visible en console, que les tests relèvent.
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
