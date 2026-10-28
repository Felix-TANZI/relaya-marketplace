// Photos du carrousel (public/images/carrousel/<nom>.webp, 2000 px de large) : srcset avec leur variante « téléphone »
// (public/images/carrousel/petites/, outils/variantes-carrousel.mjs), seulement pour les photos qui en ont une.
import petites from '../genere/carrousel-petites.json'

const AVEC_VARIANTE = new Set<string>(petites.noms)

export function srcsetCarrousel(nom: string): string | undefined {
  return AVEC_VARIANTE.has(nom) ? `/images/carrousel/petites/${nom}.webp ${petites.largeur}w, /images/carrousel/${nom}.webp 2000w` : undefined
}
