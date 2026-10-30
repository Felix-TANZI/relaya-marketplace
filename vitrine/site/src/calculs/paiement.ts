// Paiement v2.0 (BV-DEV-01 § 7 ; R01, R02, R03, R42, R79), même calcul que moteurs/belivay_moteurs/v20/paiement.py.
// - jamais d'espèces pour une commande (R01) ; à domicile tout est payé d'avance (R79) ;
// - Mobile Money : total = ⌈base ÷ (1 − frais − taxes)⌉, en entiers (sans taxes : ⌈base × 100 ÷ 98⌉) ; le client voit
//   « frais de paiement », jamais le nom du prestataire ;
// - comptoir (R42) : avance = livraison payée + 900 F quand elle est offerte ; le reste au retrait, en Mobile Money.
import { reglage, walletOuvert } from './reglages'
import type { Frais } from './livraison'

/** Total Mobile Money d'une base (R02), sans virgule flottante : taux lus en dix-millièmes. */
export function totalMobileMoney(base: number): number {
  // Comme le serveur : un montant négatif est une erreur, pas un total nul.
  if (base < 0) throw new RangeError('montant négatif')
  if (base === 0) return 0
  const reste = 10000 - Math.round(reglage('campay') * 10000) - Math.round(reglage('campay_taxes') * 10000)
  return Math.ceil((base * 10000) / reste - 1e-9)
}
export const fraisMobileMoney = (base: number) => totalMobileMoney(base) - base

export interface Paiement { base_paiement: number; campay: number; total_momo: number; total_wallet: number }
export function paiement(f: Frais): Paiement {
  const base = f.sous_total + f.client
  const total = totalMobileMoney(base)
  return { base_paiement: base, campay: total - base, total_momo: total, total_wallet: base }
}

/** Moyens proposés au client au Cameroun : MTN et Orange ; le Wallet seulement quand il ouvre (R03). */
export const moyensProposes = (): ('mtn' | 'orange' | 'wallet')[] => (walletOuvert() ? ['mtn', 'orange', 'wallet'] : ['mtn', 'orange'])

export interface CompteComptoir { commandesLivrees: number; sansIncident: number; refus: number }
export function plafondComptoir(c: CompteComptoir): number {
  if (c.commandesLivrees === 0) return reglage('cpt_nouveau')
  return c.sansIncident >= reglage('cpt_confirme_cmd') ? reglage('cpt_confirme') : reglage('cpt_panier')
}

export interface Comptoir {
  propose: boolean
  motif: 'domicile' | 'carte-diaspora' | 'avance-obligatoire' | 'plafond' | null
  plafond: number
  avance: number // payée maintenant, en Mobile Money
  fraisAvance: number
  auComptoir: number // payé au retrait, en Mobile Money sur place
  fraisComptoir: number
}
/** R42 : jamais pour un colis XL, un paiement par carte ni une commande de la diaspora (`carte`, `diaspora`). */
export function comptoir(f: Frais, plafond: number, refus = 0, { carte = false, diaspora = false }: { carte?: boolean; diaspora?: boolean } = {}): Comptoir {
  const avance = f.client + (f.couverture > 0 ? reglage('relais') : 0)
  const auComptoir = f.sous_total + f.client - avance
  const motif = f.mode !== 'relais' || f.xl ? 'domicile' : carte || diaspora ? 'carte-diaspora' : refus >= reglage('cpt_refus_max') ? 'avance-obligatoire' : f.sous_total > plafond ? 'plafond' : null
  return { propose: motif === null, motif, plafond, avance, fraisAvance: fraisMobileMoney(avance), auComptoir, fraisComptoir: fraisMobileMoney(auComptoir) }
}
