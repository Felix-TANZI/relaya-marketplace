// Capacité du relais (PR-02 CAL-20 à CAL-23 ; DP-20) : places par classe (RELAIS-PLACES), taux d'occupation, seuil au-delà
// duquel BelivaY n'envoie plus de colis (PR-SATURATION), emplacement attribué à la réception.
// - Un relais ne refuse jamais un colis S, M ou L (DP-20) ; XL et hors gabarit ne vont jamais en relais (LIV-XL-RELAIS).
// - Les retours déposés ne comptent pas dans l'occupation (CAL-21).
// - Emplacement : petit en étagère A, moyen en B, encombrant au sol C ; un petit peut prendre une case B ou C si A est
//   pleine (CAL-22). Le serveur l'attribue ; le gérant peut le déplacer.
import type { ClasseColis } from '../donnees/communs'
import type { ParametresRelais } from './registre'

export type Etagere = 'A' | 'B' | 'C'
/** Une case du plan (« A-01 ») : sa capacité en places et les colis qui l'occupent. */
export interface Case {
  code: string
  etagere: Etagere
  capacite: number
  occupee: number
}

export const placesDe = (classe: ClasseColis, p: Pick<ParametresRelais, 'places'>) => p.places[classe]
export const placesDuLot = (classes: readonly ClasseColis[], p: Pick<ParametresRelais, 'places'>) => classes.reduce((n, c) => n + placesDe(c, p), 0)

export interface Occupation {
  occupees: number
  declarees: number
  libres: number
  taux: number // 0 à 100, arrondi à l'unité
  seuilAtteint: boolean // BelivaY n'envoie plus de nouveaux colis, clients orientés ailleurs
}
/** Occupation : places des colis présents (retours déposés exclus) sur les places déclarées. */
export function occupation(colis: readonly { classe: ClasseColis; retour: boolean }[], declarees: number, p: Pick<ParametresRelais, 'places' | 'capaciteSeuilPct'>): Occupation {
  const occupees = colis.filter((c) => !c.retour).reduce((n, c) => n + placesDe(c.classe, p), 0)
  const taux = declarees > 0 ? Math.round((occupees / declarees) * 100) : 100
  return { occupees, declarees, libres: Math.max(declarees - occupees, 0), taux, seuilAtteint: declarees <= 0 || occupees * 100 >= p.capaciteSeuilPct * declarees }
}

/** Étagères dans l'ordre où une classe peut être rangée. */
export const ETAGERES_PERMISES: Record<ClasseColis, readonly Etagere[]> = { S: ['A', 'B', 'C'], M: ['B'], L: ['C'] }

/** Emplacement attribué à la réception : première case de l'étagère de la classe qui a la place ; null si aucune
 * (le colis est reçu quand même, DP-20 : rangement provisoire au comptoir, signalé). */
export function attribuerEmplacement(classe: ClasseColis, cases: readonly Case[], p: Pick<ParametresRelais, 'places'>): string | null {
  const besoin = placesDe(classe, p)
  for (const e of ETAGERES_PERMISES[classe]) {
    const c = cases.find((x) => x.etagere === e && x.capacite - x.occupee >= besoin)
    if (c) return c.code
  }
  return null
}
