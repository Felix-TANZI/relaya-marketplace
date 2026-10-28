// Plafond d'achat d'une prestation (BV-DEV-05 ; R54, R48, R55) : même calcul que moteurs/belivay_moteurs/v20/entreprises.py.
// plafond = ⌊(prix payé par le client pour la prestation − part du relais − jour 1 de garde payé par BelivaY) ÷ 11⌋ × 10 :
// au relais, par colis, la livraison du format (900 F + supplément) moins la part du relais du format (R40) et le jour 1
// (100 F) : 540 F pour une pochette ; à domicile, course par course, sur les frais avant couverture (1 500 F au moins
// faute de distance servie avec le paquet : 1 360 F). Remise après l'heure limite : 20 % de moins (R48).
import DONNEES from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'
import { estRefus, fraisLivraison, reglage, type Format } from '../../../site/src/calculs'
import type { ClasseColis } from '../donnees/communs'

const FORMATS = (DONNEES as unknown as { livraison: { formats: { code: string; part_relais: number | null }[] } }).livraison.formats
export const FORMAT_DE_CLASSE: Record<ClasseColis, Format> = { S: 'P', M: 'C1', L: 'C2', XL: 'XL', HG: 'HG' }

export const plafondAchat = (prix: number, part = 0, jour1 = 0) => Math.max(0, Math.floor((prix - part - jour1) / 11) * 10)

/** Plafond d'un colis livré au relais, selon son format. */
export function plafondRelais(format: Format): number {
  const part = FORMATS.find((f) => f.code === format)?.part_relais
  if (part == null) throw new Error(`format jamais au relais : ${format}`)
  const f = fraisLivraison('relais', { zone: 'Z', niveau: 'centre' }, [{ zone: 'Z', colis: [format], km: 0, detour: 0, niveau: 'centre' }], [1], { apresPaiement: true })
  if (estRefus(f)) throw new Error(`format refusé au relais : ${format}`)
  return plafondAchat(f.brut, part, reglage('garde_relais_jour'))
}
/** Plafond d'une course à domicile valant `frais` au client (avant couverture). */
export const plafondDomicile = (frais: number) => plafondAchat(frais)
/** R48 : 20 % de moins après l'heure limite (au franc le plus proche), sauf incident d'un tiers validé. */
export const paiementPrestation = (tarif: number, enRetard: boolean, incidentTiers = false) => (!enRetard || incidentTiers ? tarif : tarif - Math.round(tarif * 0.2))
