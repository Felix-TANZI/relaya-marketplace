// Registre des routes, PAR FICHIER : chaque groupe d'écrans déclare ses routes dans src/pages/<groupe>/routes.ts (ADM-00,
// ADM-03 à ADM-13, AJ-A pour les pages ajoutées) ; rien d'autre n'est à modifier pour brancher un écran.
// Un écran est chargé à la demande (un fichier par écran). Les DROITS ne sont pas dans la fiche : ils viennent de la
// matrice unique (config/droits.ts, par page et par rôle). La fiche porte ce que la coque en lit : titre, parent logique,
// onglet du téléphone, entrée de navigation, interrupteur qui cache la page (fonction d'après lancement), largeur.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type Statut = 'provisoire' | 'repris'

export interface RouteEcran {
  route: string // « litige » : adresse /admin/litige
  ecran: string // « ADM-P03 » (page du prototype, src/genere/ecrans.json) ; « socle » ; « AJ-A » (page ajoutée)
  titre: string // titre français de la page (traduit par t())
  statut: Statut // provisoire : page générique (src/pages/Provisoire.tsx) ; repris : écran repris (METHODE.md)
  composant: () => Promise<{ default: ComponentType }>
  parent?: string // parent logique (flèche « Revenir » quand la page est ouverte directement) ; absent : page racine
  onglet?: string // onglet du téléphone allumé (absent : celui du parent ; « menu » : le Menu)
  nav?: string // entrée de la barre latérale allumée (absent : la route, sinon le parent)
  sansSession?: boolean // ouverte sans être connecté (connexion)
  etroit?: boolean // ordinateur : colonne de lecture (formulaires) au lieu de la pleine largeur des tableaux
  interrupteur?: string // fonction cachée tant que l'interrupteur est fermé (assistant : FF-IA) : la route renvoie à l'accueil
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

/** Onglet du téléphone allumé pour une route : le sien, sinon celui de ses parents. */
export function ongletDe(route: string): string | null {
  for (let r: RouteChargee | undefined = ROUTES[route], n = 0; r && n < 8; r = r.parent ? ROUTES[r.parent] : undefined, n++) if (r.onglet) return r.onglet
  return null
}
