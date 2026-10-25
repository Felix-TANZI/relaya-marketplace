// Fonctions d'abord sur les pages de l'exploitation (ADM-08 à ADM-13, pages ajoutées) : chaque page déclare ses gestes
// avec leur nombre lu des données ; on ne garde que ce que le rôle peut faire (droits.ts) : une page qu'il n'ouvre pas
// disparaît, un geste (« geste: true ») disparaît en lecture seule. Même forme que config/fonctions.ts (accueil).
import type { Fonction } from '../../composants/Fonctions'
import { droitDe } from '../../config/droits'
import { chemin } from '../../config/pages'
import { useSession } from '../../session'

export interface DefFonction extends Omit<Fonction, 'vers'> {
  /** Page où l'on agit (filtre ou fiche) ; sans route, le geste est sur la page (onClick). */
  route?: string
  params?: Record<string, string | number | undefined | null>
  /** Geste qui décide : retiré pour un rôle en lecture seule sur la route (ou sur `droitDe`). */
  geste?: boolean
  /** Route dont le droit décide (par défaut `route`). */
  droit?: string
}

/** Fonctions de la page pour le rôle connecté : pages fermées et gestes en lecture seule retirés. */
export function useFonctions(defs: (DefFonction | false | null | undefined)[]): Fonction[] {
  const { role } = useSession()
  return defs
    .filter((d): d is DefFonction => !!d)
    .filter((d) => {
      const r = d.droit ?? d.route
      if (!r) return true
      const a = droitDe(r, role).acces
      return a !== 'aucun' && (!d.geste || a !== 'lecture')
    })
    .map(({ route, params, geste: _g, droit: _d, ...f }) => ({ ...f, vers: route ? chemin(route, params) : undefined }))
}
