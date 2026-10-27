// Inventaire des écrans (src/genere/pages.json, outils/inventaire.mjs) et adresses de l'espace vendeur.
// Une route du prototype « #commande?ref=X » est l'adresse « /vendeur/commande?ref=X » ; l'accueil est « /vendeur/ ».
// Le préfixe /vendeur/ est celui du routeur (basename) : chemin() rend l'adresse dans l'application, sans lui.
// Ce module remplace aussi site/src/config/pages pour le code du client réutilisé (vite.config.ts) : il en garde
// les noms utilisés par ce code (ONGLETS, chemin).
import pages from '../genere/pages.json'

export type Statut = 'provisoire' | 'repris' | 'retiré'
export interface Page {
  route: string
  titre: string
  groupe: string
  onglet: string | null
  statut: Statut
  raison?: string
  ajoutee?: boolean // page ajoutée après le prototype (DP-58 : AJ-A, AJ-B), sans état relevé dans le prototype
  etats: { adresse: string; libelle: string; source: string }[]
}
export const PAGES = pages as Page[]
export const PAGE_DE: Record<string, Page> = Object.fromEntries(PAGES.map((p) => [p.route, p]))

// Les quatre onglets de la barre du bas (prototype : TABS).
export interface Onglet {
  id: string
  titre: string
  icone: string
}
export const ONGLETS: Onglet[] = [
  { id: 'accueil', titre: 'Accueil', icone: 'layout-grid' },
  { id: 'commandes', titre: 'Commandes', icone: 'shopping-bag' },
  { id: 'produits', titre: 'Produits', icone: 'package' },
  { id: 'argent', titre: 'Argent', icone: 'wallet' },
]

/** Adresse d'une route dans l'application, avec ses paramètres : chemin('commande', { ref: 'BLV-00008' }). */
export function chemin(route: string, params?: Record<string, string | number | undefined | null>): string {
  const base = route === 'accueil' ? '/' : '/' + route
  if (!params) return base
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? base + '?' + s : base
}

/** Adresse du prototype (« #route?a=b ») → adresse de l'application (« /route?a=b »). */
export function adresseDuSite(a: string): string {
  const [r, q] = a.replace(/^#/, '').split('?')
  return chemin(r) + (q ? '?' + q : '')
}

/** Route d'une adresse de l'application (« /commande » → « commande », « / » → « accueil »). */
export const routeDe = (pathname: string) => pathname.replace(/^\/+/, '').split('/')[0] || 'accueil'
