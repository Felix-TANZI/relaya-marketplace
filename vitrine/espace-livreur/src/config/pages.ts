// Adresses de l'espace livreur. Une route « tournee » est l'adresse « /livreur/tournee » ; l'accueil (Aujourd'hui) est
// « /livreur/ ». Le préfixe /livreur/ est celui du routeur (basename) : chemin() rend l'adresse dans l'application.
// Ce module remplace aussi site/src/config/pages pour le code du client réutilisé (vite.config.ts) : il en garde les
// noms utilisés par ce code (ONGLETS, chemin).

/** Route d'accueil : Aujourd'hui (LIV-P04). */
export const ACCUEIL = 'aujourdhui'

// Les quatre onglets de la barre du bas (paquet livreur, APP.tabs) : le livreur a le pouce sur la route.
export interface Onglet {
  id: string
  titre: string
  icone: string
}
export const ONGLETS: Onglet[] = [
  { id: 'aujourdhui', titre: 'Aujourd’hui', icone: 'house' },
  { id: 'tournee', titre: 'Tournée', icone: 'route' },
  { id: 'messages', titre: 'Messages', icone: 'message-circle' },
  { id: 'moi', titre: 'Moi', icone: 'circle-user-round' },
]

/** Adresse d'une route dans l'application, avec ses paramètres : chemin('paquet', { id: 'PQ-Z1-261013-003' }). */
export function chemin(route: string, params?: Record<string, string | number | undefined | null>): string {
  const base = route === ACCUEIL ? '/' : '/' + route
  if (!params) return base
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? base + '?' + s : base
}

/** Route d'une adresse de l'application (« /tournee » → « tournee », « / » → « aujourdhui »). */
export const routeDe = (pathname: string) => pathname.replace(/^\/+/, '').split('/')[0] || ACCUEIL
