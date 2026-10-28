// Registre des routes, PAR FICHIER : chaque groupe d'écrans déclare ses routes dans src/pages/ENT-xx/routes.ts, et rien
// d'autre n'est à modifier pour brancher un écran (aucun fichier commun : les agents travaillent en parallèle).
// Un écran est chargé à la demande (un fichier par écran), la première fois que son adresse s'ouvre.
// La fiche d'une route porte tout ce que la coque en lit : titre, parent logique (retour quand la page est ouverte
// directement), onglet du téléphone allumé, entrée de navigation allumée, rôles qui l'ouvrent, largeur à l'ordinateur.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { Role } from '../donnees/communs'

export type Statut = 'provisoire' | 'repris'

export interface RouteEcran {
  route: string // « paquet » : adresse /entreprise/paquet
  ecran: string // « ENT-P11 » (écran de l'extraction, src/genere/ecrans.json) ; « socle » pour la coque
  titre: string // titre français de la page (traduit par t())
  // provisoire : page générique du socle (src/pages/Provisoire.tsx) ; repris : écran repris (METHODE.md).
  statut: Statut
  composant: () => Promise<{ default: ComponentType }>
  // Parent logique : la flèche « Revenir » y mène quand la page est ouverte directement (sinon la page précédente
  // de la visite). Absent : page racine (onglet du téléphone).
  parent?: string
  onglet?: string // onglet du téléphone allumé (absent : celui du parent, sinon aucun ; « menu » : aucun, « ☰ » s'allume)
  nav?: string // entrée de la barre latérale allumée (un détail allume sa liste ; absent : la route, sinon le parent)
  roles?: Role[] // rôles qui l'ouvrent (absent : tous ; ENT-RG-R25)
  sansSession?: boolean // ouverte sans être connecté (connexion)
  etroit?: boolean // ordinateur : colonne de lecture (formulaires) au lieu de la pleine largeur des tableaux
}
export interface RoutesGroupe {
  groupe: string
  routes: RouteEcran[]
}

const GROUPES = import.meta.glob<RoutesGroupe>('../pages/*/routes.ts', { eager: true, import: 'default' })

export type RouteChargee = RouteEcran & { groupe: string; Composant: LazyExoticComponent<ComponentType> }
export const ROUTES: Record<string, RouteChargee> = {}
for (const [fichier, g] of Object.entries(GROUPES)) {
  const dossier = /pages\/([^/]+)\/routes\.ts$/.exec(fichier)![1]
  if (dossier !== g.groupe) throw new Error(`${fichier} : le groupe déclaré (${g.groupe}) n'est pas celui du dossier`)
  for (const r of g.routes) {
    if (ROUTES[r.route]) throw new Error(`route « ${r.route} » déclarée par ${ROUTES[r.route].groupe} et ${g.groupe}`)
    ROUTES[r.route] = { ...r, groupe: g.groupe, Composant: lazy(r.composant) }
  }
}

/** Charge d'avance l'écran d'une route (adresse ouverte au démarrage, lien touché). */
export function precharger(route: string): Promise<unknown> {
  return ROUTES[route] ? ROUTES[route].composant().catch(() => undefined) : Promise.resolve()
}

/** Onglet du téléphone allumé pour une route : le sien, sinon celui de ses parents ; aucun pour le Menu et ce qui en
 * dépend (le Menu n'est pas un onglet : « ☰ » l'ouvre). */
export function ongletDe(route: string): string | null {
  for (let r: RouteChargee | undefined = ROUTES[route], n = 0; r && n < 8; r = r.parent ? ROUTES[r.parent] : undefined, n++) if (r.onglet) return r.onglet === 'menu' ? null : r.onglet
  return null
}
