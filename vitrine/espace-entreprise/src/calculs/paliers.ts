// Palier de l'entreprise et son plafond de valeur transportée (ENT-PLAFOND-*, ENT-SEUIL-* ; premier moteur du
// squelette, à compléter par le portage de moteurs/belivay_moteurs pour l'hystérésis et la baisse plafonnée).
import type { PalierEntreprise } from '../donnees/communs'
import { PARAMETRES, type ParametresPaliers } from './registre'

/** Plafond de valeur transportée d'un palier (null : sans plafond). */
export const plafondDe = (palier: PalierEntreprise, p: ParametresPaliers = PARAMETRES.paliers): number | null => p.plafonds[palier]

/** Palier suivant (null au sommet). */
export function palierSuivant(palier: PalierEntreprise): PalierEntreprise | null {
  return palier === 'Nouveau' ? 'Confirme' : palier === 'Confirme' ? 'Or' : null
}

/** Un colis de cette valeur peut-il être transporté sous ce palier ? (422 ABOVE_VALUE_CAP sinon) */
export function sousPlafond(valeur: number, palier: PalierEntreprise, p: ParametresPaliers = PARAMETRES.paliers): boolean {
  const plafond = plafondDe(palier, p)
  return plafond === null || valeur <= plafond
}
