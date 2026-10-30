// Réglages BV-DEV v2.0 (DP-69) : lus dans BV-DEV-07_Donnees.json, la source unique (aucun montant dans le code) ; en
// production, les mêmes clés viennent de la console. Les lieux sont dans zones.ts.
// Même calcul que moteurs/belivay_moteurs/v20/reglages.py.
import DONNEES from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'

export type Niveau = 'centre' | 'peripherie' | 'periurbain'
export const NIVEAUX: Niveau[] = ['centre', 'peripherie', 'periurbain']

export interface Quartier { quartier: string; zone: string; niveau: Niveau; alias: string[] }
export const D = DONNEES as unknown as { reglages: Record<string, { valeur: number }>; quartiers: Quartier[]; livraison: { quartiers_periurbains: string[]; zones_peripherie: string[] } }

export const REGLAGES: Record<string, number> = Object.fromEntries(Object.entries(D.reglages).map(([k, v]) => [k, v.valeur]))

export function reglage(cle: string): number {
  const v = REGLAGES[cle]
  if (v === undefined) throw new Error(`réglage absent : ${cle}`)
  return v
}

const CLE_NIVEAU: Record<Niveau, string> = { centre: 'niv_centre', peripherie: 'niv_periph', periurbain: 'niv_periurbain' }
export const prixNiveau = (n: Niveau) => reglage(CLE_NIVEAU[n])

/** Wallet fermé au lancement (R03) : invisible tant que « wallet_ouvert » vaut 0. */
export const walletOuvert = () => reglage('wallet_ouvert') === 1
