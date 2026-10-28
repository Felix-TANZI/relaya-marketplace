// Prime et ses paliers (CL-14 ; FF-ABONNEMENT ; DP-54) : les règles écrites une fois, lues par les écrans et le
// paiement. L'abonnement offre la livraison de base (premier ramassage et remise au tarif d'un colis S) ; jamais
// les ramassages supplémentaires, les autres remises ni le supplément XL ; le prix des produits est le même pour
// tous. « Illimité » : en usage normal, 30 commandes par mois (70 pour Business).
import { PARAMETRES } from './frais'

export type Palier = 'plus' | 'prime' | 'duo' | 'business'
export interface DefPalier {
  id: Palier
  nom: string
  mois: number
  an: number // 10 mois payés pour 12
  relais: { des: number; offerts: number | null; reduction?: number } // offerts : par mois (null : illimité en usage normal)
  domicile: { offerts: number; des: number; ensuite: number } // ensuite : réduction après les offerts (0,5 = −50 %)
  cagnotte: number
  gardeBonus: number
  comptes: number
  support: string
  parrainage: number // mois offerts par proche
  plafond: number // commandes par mois en usage normal
}
export const PALIERS: DefPalier[] = [
  { id: 'plus', nom: 'Plus', mois: 2500, an: 25000, relais: { des: 10000, offerts: 3 }, domicile: { offerts: 0, des: 0, ensuite: 0.3 }, cagnotte: 0, gardeBonus: 2, comptes: 1, support: 'standard', parrainage: 1, plafond: 30 },
  { id: 'prime', nom: 'Prime', mois: 4000, an: 40000, relais: { des: 10000, offerts: null }, domicile: { offerts: 3, des: 15000, ensuite: 0.5 }, cagnotte: 0.02, gardeBonus: 4, comptes: 1, support: 'prioritaire', parrainage: 1, plafond: 30 },
  { id: 'duo', nom: 'Prime Duo', mois: 7000, an: 70000, relais: { des: 10000, offerts: null }, domicile: { offerts: 5, des: 15000, ensuite: 0.5 }, cagnotte: 0.02, gardeBonus: 4, comptes: 2, support: 'prioritaire', parrainage: 2, plafond: 30 },
  { id: 'business', nom: 'Business', mois: 15000, an: 150000, relais: { des: 10000, offerts: null, reduction: 0.5 }, domicile: { offerts: 6, des: 15000, ensuite: 0.5 }, cagnotte: 0.02, gardeBonus: 4, comptes: 3, support: 'ligne dédiée', parrainage: 3, plafond: 70 },
]
export const PASS = { prix: 1500, jours: 7, relaisDes: 10000, commandes: 4 }
export const ESSAI = 1500 // premier mois de Prime, une fois par compte et par numéro
export const palier = (id: string) => PALIERS.find((p) => p.id === id) ?? null

// Prélèvement refusé (CAB-43, CAB-44 ; ABO-GRACE) : l'abonnement reste actif 7 jours, puis le palier Gratuit, sans
// rien perdre (historique, cagnotte créditée). Le client paie quand il veut pendant la grâce, sur le même numéro ou
// un autre ; après, payer le reprend au même tarif, à partir du jour du paiement.
export const GRACE = 7 // jours
export const finGrace = (echecLe: number) => echecLe + GRACE * 864e5

// Abonnement offert (page belivay.com/offrir) : 1 mois, 3 mois ou 1 an d'un palier, payé en une fois, sans
// prélèvement ensuite. 1 et 3 mois au tarif mensuel, 1 an au tarif annuel (10 mois payés pour 12).
export const DUREES_CADEAU = [1, 3, 12] as const
export type DureeCadeau = (typeof DUREES_CADEAU)[number]
export const prixCadeau = (p: DefPalier, mois: DureeCadeau) => (mois === 12 ? p.an : p.mois * mois)

// Livraison de base que l'abonnement peut offrir (v1.4, D10) : une expédition au relais, ou le minimum à domicile.
export const BASE_RELAIS = PARAMETRES.relaisPrix
export const BASE_DOMICILE = PARAMETRES.domicileMin

// Remise de l'abonnement sur une commande : ce qui est retiré de la livraison calculée par le moteur.
// usage : commandes de ce mois déjà servies par l'abonnement (relais, domicile).
export function remisePrime(
  ab: { palier: Palier | 'pass'; actif: boolean } | null,
  mode: 'relais' | 'domicile',
  sousTotal: number,
  livraison: number,
  usage: { relais: number; domicile: number; total: number },
): number {
  if (!ab || !ab.actif || livraison <= 0) return 0
  // Au-dessus du seuil, la livraison de base est déjà offerte à tous : rien de plus.
  if (sousTotal >= (mode === 'relais' ? PARAMETRES.seuilRelais : PARAMETRES.seuilDomicile)) return 0
  if (ab.palier === 'pass') return mode === 'relais' && sousTotal >= PASS.relaisDes && usage.relais < PASS.commandes ? Math.min(BASE_RELAIS, livraison) : 0
  const p = palier(ab.palier)!
  if (usage.total >= p.plafond) return 0
  if (mode === 'relais') {
    if (sousTotal < p.relais.des) return 0
    if (p.relais.offerts !== null && usage.relais >= p.relais.offerts) return 0
    return Math.min(Math.round(BASE_RELAIS * (p.relais.reduction ?? 1)), livraison)
  }
  if (p.domicile.offerts && sousTotal >= p.domicile.des && usage.domicile < p.domicile.offerts) return Math.min(BASE_DOMICILE, livraison)
  return Math.min(Math.round(BASE_DOMICILE * p.domicile.ensuite), livraison)
}

// ── Ce mois-ci et palier conseillé (VAGUE n° 14) ─────────────────────────────────────────────────────────────────
/** Une commande du mois, vue par l'abonnement : sa livraison SANS abonnement (moteur D10) et son sous-total. */
export interface CommandeDuMois {
  mode: 'relais' | 'domicile'
  sousTotal: number
  livraison: number
}
export interface GainsDuMois {
  livraison: number // livraisons offertes ou réduites
  cagnotte: number // 2 % du sous-total (créditée au retrait)
  total: number
  commandes: number
}
/** Ce qu'un palier aurait rapporté sur les commandes du mois, rejouées dans l'ordre (quotas compris). */
export function gainsDuMois(id: Palier, commandes: CommandeDuMois[]): GainsDuMois {
  const p = palier(id)!
  const usage = { relais: 0, domicile: 0, total: 0 }
  let livraison = 0
  let cagnotte = 0
  for (const c of commandes) {
    const r = remisePrime({ palier: id, actif: true }, c.mode, c.sousTotal, c.livraison, usage)
    if (r > 0) usage[c.mode] += 1
    usage.total += 1
    livraison += r
    cagnotte += Math.round(c.sousTotal * p.cagnotte)
  }
  return { livraison, cagnotte, total: livraison + cagnotte, commandes: commandes.length }
}
/**
 * Le palier conseillé : celui qui laisse le plus après son prix mensuel, sur les commandes réelles du mois (Business :
 * réservé aux revendeurs vérifiés, jamais conseillé d'office) ; à égalité, le moins cher. null : aucune commande.
 */
export function palierConseille(commandes: CommandeDuMois[]): { id: Palier; gains: GainsDuMois; net: number } | null {
  if (!commandes.length) return null
  return (['plus', 'prime', 'duo'] as Palier[])
    .map((id) => {
      const gains = gainsDuMois(id, commandes)
      return { id, gains, net: gains.total - palier(id)!.mois }
    })
    .sort((a, b) => b.net - a.net || palier(a.id)!.mois - palier(b.id)!.mois)[0]
}
