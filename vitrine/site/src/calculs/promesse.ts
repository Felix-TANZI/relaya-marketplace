// Heure montrée avant le paiement (BV-DEV-01 § 8.1 ; R44 à R47, R49), même calcul que
// moteurs/belivay_moteurs/v20/promesse.py. Les créneaux du relais (9 h, 17 h 30) sont ceux du § 8.1.
import { reglage } from './reglages'
import type { Mode } from './livraison'

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const RELAIS_MATIN = 9
const RELAIS_SOIR = 17.5
const service = (j: number) => j % 7 !== 6
const suivant = (j: number) => {
  j++
  while (!service(j)) j++
  return j
}
const heure = (h: number) => `${Math.floor(h)} h` + (h % 1 ? ` ${String(Math.round((h % 1) * 60)).padStart(2, '0')}` : '')
const jour = (depart: number, j: number) => (j - depart === 0 ? 'aujourd’hui' : j - depart === 1 ? 'demain' : JOURS[j % 7])

/** (jour, heure) du « C'est prêt » estimé, jour compté depuis le lundi (0) de la semaine du paiement. */
export function pretEstime(j: number, h: number, delai: number): [number, number] {
  const ouv = reglage('ouverture')
  const ferm = reglage('fermeture')
  if (!service(j) || h >= ferm) [j, h] = [suivant(j), ouv]
  h = Math.max(h, ouv)
  let reste = delai
  while (reste > ferm - h) {
    reste -= ferm - h
    ;[j, h] = [suivant(j), ouv]
  }
  return [j, h + reste]
}

/** « Livré demain avant 13 h », « Disponible au relais aujourd’hui avant 17 h 30 ». jourPaiement : 0 = lundi. */
export function promesse(jourPaiement: number, h: number, mode: Mode, delai: number): string {
  const [j, p] = pretEstime(jourPaiement, h, delai)
  const limite = reglage('heure_limite')
  if (mode === 'domicile') {
    if (p <= limite) return `Livré ${jour(jourPaiement, j)} avant ${heure(Math.min(Math.ceil(p + reglage('promesse_h') - 1e-9), reglage('fermeture')))}`
    return `Livré ${jour(jourPaiement, suivant(j))} avant ${heure(limite)}`
  }
  if (p < RELAIS_MATIN) return `Disponible au relais ${jour(jourPaiement, j)} avant ${heure(RELAIS_SOIR)}`
  return `Disponible au relais ${jour(jourPaiement, suivant(j))} avant ${heure(p <= limite ? limite : RELAIS_SOIR)}`
}

/** Promesse depuis une date (heure de Yaoundé, UTC+1, sans heure d'été). */
export function promesseDepuis(t: number, mode: Mode, delai: number): string {
  const d = new Date(t + 3600_000)
  return promesse((d.getUTCDay() + 6) % 7, d.getUTCHours() + d.getUTCMinutes() / 60, mode, delai)
}
