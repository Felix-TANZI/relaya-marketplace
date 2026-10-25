// Adresses de l'espace entreprise et onglets du téléphone. Une route « paquet » est l'adresse
// « /entreprise/paquet?id=X » ; le tableau de bord est « /entreprise/ ». Le préfixe /entreprise/ est celui du routeur
// (basename) : chemin() rend l'adresse dans l'application, sans lui.
// Ce module remplace aussi site/src/config/pages pour le code du client réutilisé (vite.config.ts) : il en garde les
// noms utilisés par ce code (ONGLETS, chemin).

export const ACCUEIL = 'tableau'

// Les onglets de la barre du bas du téléphone (prototype : APP.mtabs) : Tableau, Paquets, Missions, Livreurs (la flotte :
// affecter, disponibilités, pièces ; consigne du porteur, 17 oct.). Le Menu n'est PAS
// un onglet (consigne du porteur, 12 oct.) : « ☰ » à gauche du logo (rootHeader) l'ouvre. Ordinateur et tablette :
// barre latérale et tiroir.
export interface Onglet {
  id: string
  titre: string
  icone: string
}
export const ONGLETS: Onglet[] = [
  { id: 'tableau', titre: 'Tableau', icone: 'layout-dashboard' },
  { id: 'paquets', titre: 'Paquets', icone: 'boxes' },
  { id: 'missions', titre: 'Missions', icone: 'map' },
  { id: 'flotte', titre: 'Livreurs', icone: 'users' },
]

/** Adresse d'une route dans l'application, avec ses paramètres : chemin('paquet', { id: 'PQ-2417' }). */
export function chemin(route: string, params?: Record<string, string | number | undefined | null>): string {
  const base = route === ACCUEIL ? '/' : '/' + route
  if (!params) return base
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? base + '?' + s : base
}

/** Route d'une adresse de l'application (« /paquet » → « paquet », « / » → « tableau »). */
export const routeDe = (pathname: string) => pathname.replace(/^\/+/, '').split('/')[0] || ACCUEIL
