// Règles BV-DEV v2.0 du relais (DP-69 ; BV-DEV-01 § 9, BV-DEV-05 § 7) lues dans BV-DEV-07_Donnees.json, la source unique
// (aucun montant dans le code), comme moteurs/belivay_moteurs/v20/garde.py : bonus d'un colis payé au comptoir (R41),
// 1 % CamPay retenu sur chaque versement, au franc supérieur (R43), plafond de la valeur d'un colis gardé selon le
// palier (R41), course de retour et transfert entre relais (R69), part de l'agence qui sert de relais (R40).
import type { PalierRelais } from './trust'
import DONNEES from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'

const R = Object.fromEntries(Object.entries((DONNEES as unknown as { reglages: Record<string, { valeur: number }> }).reglages).map(([k, v]) => [k, v.valeur]))
function reglage(cle: string): number {
  const v = R[cle]
  if (v === undefined) throw new Error(`réglage absent : ${cle}`)
  return v
}

/** R41 : + 50 F par colis payé au comptoir. */
export const bonusComptoir = () => reglage('relais_comptoir_bonus')
/** R43 : 1 % CamPay retenu sur le versement, arrondi au franc supérieur, payé par le relais. */
export const fraisVersement = (montant: number) => (montant > 0 ? Math.ceil(montant * reglage('versement') - 1e-9) : 0)
/** R41 : un relais rempli à 90 % de ses places ne reçoit plus de nouveaux paquets. */
export const saturation = () => reglage('relais_saturation')
/** R69 : course de retour (500 F) et transfert entre relais (400 F, quel que soit le colis). */
export const courseRetour = () => reglage('retour')
export const transfertRelais = () => reglage('transfert')
/** R40 : l'agence d'une entreprise de livraison qui sert de relais touche 150 F par colis remis. */
export const agenceRelais = () => reglage('agence_relais')
/** R41 : valeur maximale d'un colis gardé selon le palier (texte de la règle, comme PLAFOND_RELAIS de v20/garde.py). */
export const PLAFOND_PALIER: Record<PalierRelais, number> = { Starter: 150_000, Confirmé: 400_000, Premium: 1_000_000 }
/** Un relais n'est proposé au client que si son plafond couvre chaque colis et s'il est sous 90 % de ses places. */
export const relaisPropose = (palier: PalierRelais, valeursColis: readonly number[], placesPrises: number, places: number) =>
  valeursColis.every((v) => v <= PLAFOND_PALIER[palier]) && placesPrises < places * saturation()
