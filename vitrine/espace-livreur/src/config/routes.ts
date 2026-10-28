// Registre des routes, PAR FICHIER : chaque groupe d'écrans déclare ses routes dans src/pages/LIV-xx/routes.ts, et rien
// d'autre n'est à modifier pour brancher un écran (aucun fichier commun : les agents travaillent en parallèle).
// Chaque route porte aussi sa COQUE (titre, en-tête, parent du retour, onglet allumé) : le prototype n'est qu'un
// squelette (DP-60), la coque est décidée ici, une fois, de façon logique. Un écran est chargé à la demande.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type Statut = 'provisoire' | 'repris'
export type EnTete = 'racine' | 'enfant' | 'aucun'

export interface RouteEcran {
  route: string
  page: string // « LIV-P04 » (paquet livreur, logique-metier/livreur/extraction)
  titre: string // texte français exact (t())
  entete: EnTete
  retour?: string // route parente (en-tête enfant), quand la visite n'a pas de page précédente
  onglet?: string // onglet allumé dans la barre du bas ; absent : pas de barre du bas
  sansSession?: boolean // s'ouvre sans être connecté (connexion)
  statut: Statut // provisoire : page générée (outils/inventaire.mjs) ; repris : écran fini (METHODE.md)
  ecran: () => Promise<{ default: ComponentType }>
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

// ── Anciennes adresses (DP-66 : une page par besoin) ────────────────────────────────────────────────────────
// Une page fusionnée ou retirée garde son adresse : un lien ancien (notification, favori, message) mène à la page qui
// reprend le besoin, avec ses paramètres utiles, jamais à « Ce lien ne mène à aucune page ».
export interface Redirection {
  vers: string
  /** Paramètres posés sur la page d'arrivée (un paramètre de l'ancienne adresse est repris par `garder`). */
  params?: Record<string, string>
  /** Paramètres de l'ancienne adresse repris : { ancien: nouveau }. */
  garder?: Record<string, string>
}
export const REDIRECTIONS: Record<string, Redirection> = {
  recherche: { vers: 'historique' }, // l'historique garde sa propre recherche
  profil: { vers: 'moi' }, // « Mon profil » est la fiche de « Moi »
  securite: { vers: 'reglages', params: { voir: 'securite' } },
  confort: { vers: 'reglages', params: { voir: 'confort' } },
  limites: { vers: 'aide', params: { sujet: 'interdits' } }, // la règle s'affiche là où elle bloque (« Pourquoi ? »)
  apprendre: { vers: 'aide', params: { sujet: 'gestes' }, garder: { fiche: 'geste' } },
  gains: { vers: 'activite', params: { vue: 'releves' }, garder: { semaine: 'semaine' } },
  'kit-suivi': { vers: 'kit', params: { vue: 'suivi' } },
}

/** Adresse d'arrivée d'une ancienne adresse (route et paramètres de recherche de l'ancienne). */
export function redirection(route: string, recherche: URLSearchParams): { route: string; params: Record<string, string> } | null {
  const r = REDIRECTIONS[route]
  if (!r) return null
  const params: Record<string, string> = { ...(r.params ?? {}) }
  for (const [ancien, nouveau] of Object.entries(r.garder ?? {})) {
    const v = recherche.get(ancien)
    if (v) {
      params[nouveau] = v
      if (nouveau === 'geste') delete params.sujet // une fiche précise s'ouvre directement
    }
  }
  return { route: r.vers, params }
}
