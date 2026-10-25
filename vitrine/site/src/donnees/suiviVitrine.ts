// Suivi « vitrine » (VAGUE-AMELIORATIONS.md n° 9) : le livreur sur la carte du suivi, sur le trajet de la boutique au
// relais (ou chez le client), à une place APPROCHÉE — jamais sa position exacte (v6 D10 : suivi simple, numéro masqué).
// Règle commune à l'écran et au serveur (qui servira « depart » et « arriveeEstimee » de la course) :
//   étape 0  pas encore ramassé : le livreur (s'il est affecté) attend à la boutique ;
//   étape 1  ramassé, en route : la part du trajet faite est le temps écoulé sur le temps prévu, entre 5 et 95 % ;
//   étape 2  arrivé au relais (ou livré) ; étape 3 retiré.
// Heure d'arrivée : l'heure estimée publiée par le livreur (« home.departed »), sinon l'heure de retrait prévue, sinon
// le départ + TRAJET_MIN.
import type { CommandeClient } from './source'

export const TRAJET_MIN = 40
export type EtapeVitrine = 0 | 1 | 2 | 3

export interface Vitrine {
  etape: EtapeVitrine
  part: number // 0 à 1 : part du trajet faite
  depart: number | null // ramassage
  arrivee: number | null // estimée (étape 1), ou faite
}

const FIL_DEPART = ['Ramassé', 'En route vers toi']
const FIL_ARRIVEE = ['Arrivé au relais', 'Livré']

export function vitrineDe(c: Pick<CommandeClient, 'etat' | 'colis' | 'fil' | 'pretLe' | 'arriveeLe'>, maintenant: number): Vitrine {
  const colis = c.colis.filter((x) => !x.annule)
  const depart = [...(c.fil ?? [])].filter((f) => FIL_DEPART.includes(f.titre)).map((f) => f.le)[0] ?? null
  if (c.etat === 'retiree') return { etape: 3, part: 1, depart, arrivee: c.arriveeLe }
  if (colis.length && colis.every((x) => x.arrive)) return { etape: 2, part: 1, depart, arrivee: c.arriveeLe ?? [...(c.fil ?? [])].reverse().find((f) => FIL_ARRIVEE.includes(f.titre))?.le ?? null }
  if (!colis.some((x) => x.statut === 'recupere')) return { etape: 0, part: 0, depart: null, arrivee: null }
  const d = depart ?? maintenant
  const a = c.pretLe && c.pretLe > d ? c.pretLe : d + TRAJET_MIN * 60_000
  return { etape: 1, part: Math.min(0.95, Math.max(0.05, (maintenant - d) / (a - d))), depart: d, arrivee: a }
}

/** Point d'une courbe de Bézier quadratique (le trajet dessiné) à la part t. */
export function surLeTrajet(t: number, p0: [number, number], p1: [number, number], p2: [number, number]): [number, number] {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]
}
