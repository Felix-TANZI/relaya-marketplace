// Registre des routes, PAR FICHIER : chaque groupe d'écrans déclare ses routes dans src/pages/VD-xx/routes.ts, et
// rien d'autre n'est à modifier pour brancher un écran (aucun fichier commun : les agents travaillent en parallèle).
// Un écran est chargé à la demande (un fichier par écran), la première fois que son adresse s'ouvre.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Statut } from './pages'

export interface RouteEcran {
  route: string
  // provisoire : page générée par outils/ecran.mjs (balisage du prototype) ; repris : écran repris (METHODE.md).
  statut: Exclude<Statut, 'retiré'>
  ecran: () => Promise<{ default: ComponentType }>
  // Page ajoutée après le prototype (DP-58) : titre, parent du retour (« #menu ») et onglet allumé, lus par
  // outils/inventaire.mjs (npm run inventaire) pour écrire sa fiche (pages.json) et sa coque (etats.json).
  titre?: string
  retour?: string
  onglet?: string
}
export interface RoutesGroupe {
  groupe: string
  routes: RouteEcran[]
}

const GROUPES = import.meta.glob<RoutesGroupe>('../pages/*/routes.ts', { eager: true, import: 'default' })

export const ROUTES: Record<string, RouteEcran & { groupe: string; Composant: LazyExoticComponent<ComponentType> }> = {}
for (const [fichier, g] of Object.entries(GROUPES)) {
  const dossier = /pages\/([^/]+)\/routes\.ts$/.exec(fichier)![1]
  if (dossier !== g.groupe) throw new Error(`${fichier} : le groupe déclaré (${g.groupe}) n'est pas celui du dossier`)
  for (const r of g.routes) {
    if (ROUTES[r.route]) throw new Error(`route « ${r.route} » déclarée par ${ROUTES[r.route].groupe} et ${g.groupe}`)
    ROUTES[r.route] = { ...r, groupe: g.groupe, Composant: lazy(r.ecran) }
  }
}

/** Charge d'avance l'écran d'une route (adresse ouverte au démarrage, lien touché). */
export function precharger(route: string): Promise<unknown> {
  return ROUTES[route] ? ROUTES[route].ecran().catch(() => undefined) : Promise.resolve()
}
