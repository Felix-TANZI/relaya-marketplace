// Adresses de l'espace point relais. Une route « stock » est l'adresse « /relais/stock » ; l'accueil (Aujourd'hui)
// est « /relais/ ». Le préfixe /relais/ est celui du routeur (basename) : chemin() rend l'adresse dans l'application.
// Ce module remplace aussi site/src/config/pages pour le code du client réutilisé (vite.config.ts) : il en garde les
// noms utilisés par ce code (ONGLETS, chemin).
import coque from '../genere/coque.json'

/** Route d'accueil : Aujourd'hui (PR-04). */
export const ACCUEIL = 'accueil'

// Les quatre onglets de la barre du bas, relevés dans le prototype (src/genere/coque.json) : Aujourd'hui, Réception,
// Retrait, Stock. Pas d'onglet Menu en bas : le Menu est une page, ouverte par « ☰ » de l'en-tête.
export interface Onglet {
  id: string
  titre: string
  icone: string
}
export const ONGLETS: Onglet[] = coque.onglets.map((o) => ({ id: o.route, titre: o.titre, icone: o.icone }))

/** Adresse d'une route dans l'application, avec ses paramètres : chemin('colis', { ref: 'BLV-00008-1' }). */
export function chemin(route: string, params?: Record<string, string | number | undefined | null>): string {
  const base = route === ACCUEIL ? '/' : '/' + route
  if (!params) return base
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? base + '?' + s : base
}

/** Route d'une adresse de l'application (« /stock » → « stock », « / » → « accueil »). */
export const routeDe = (pathname: string) => pathname.replace(/^\/+/, '').split('/')[0] || ACCUEIL
