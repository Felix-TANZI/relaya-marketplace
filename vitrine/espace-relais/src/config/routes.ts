// Registre des routes, PAR FICHIER : chaque groupe d'écrans déclare ses routes dans src/pages/PR-xx/routes.ts, et rien
// d'autre n'est à modifier pour brancher un écran (aucun fichier commun : les agents travaillent en parallèle).
// Chaque route porte sa COQUE, relevée dans le prototype par outils/transcription.mjs (en-tête racine, secondaire ou
// aucun ; parent du retour ; barre du bas ; onglet allumé) et son écran du prototype. Un écran est chargé à la demande.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type Statut = 'provisoire' | 'repris'
export type EnTete = 'racine' | 'enfant' | 'aucun'

export interface RouteEcran {
  route: string
  ecran: string // écran du prototype (« Reception ») : src/genere/pages.json, fiches.json
  titre: string // texte français exact (t())
  entete: EnTete
  retour?: string // route parente (en-tête secondaire), quand la visite n'a pas de page précédente
  barre: boolean // barre du bas (Aujourd'hui, Réception, Retrait, Stock)
  onglet?: string // onglet allumé ; absent : aucun onglet actif (NAV-01)
  sansSession?: boolean // s'ouvre sans être connecté (connexion, invitation, inscription, installer)
  statut: Statut // provisoire : page générée (outils/transcription.mjs) ; repris : écran fini (METHODE.md)
  charger: () => Promise<{ default: ComponentType }>
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
    ROUTES[r.route] = { ...r, groupe: g.groupe, Composant: lazy(r.charger) }
  }
}

/** Charge d'avance l'écran d'une route (adresse ouverte au démarrage, lien touché). */
export function precharger(route: string): Promise<unknown> {
  return ROUTES[route] ? ROUTES[route].charger().catch(() => undefined) : Promise.resolve()
}
