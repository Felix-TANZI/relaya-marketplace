// DONNÉES DE DÉMONSTRATION — les ventes flash, UNE SEULE NOTION côté vendeur (DP-58, AJ-A et VD-10) : celles que le
// vendeur programme (page Promotions) et celle offerte au mérite (Se faire voir, P-3) vivent dans la même liste, avec
// les mêmes règles (OFR-05 : remise réelle sur le prix pratiqué ; F9 : commission sur le prix payé ; relue au-delà de
// VD-VISIBILITE). La vente flash sur sélection BelivaY (Publicité, DP-59), une fois acceptée, y entre aussi (origine
// « selection », commission majorée pendant la vente : src/demo/publicite.ts). Une vente flash EN COURS change le prix de l'offre : prix payé = prix remisé, prix barré = prix de
// référence, fin = fin de la vente (src/demo/produits.ts, vue()). Côté serveur : un seul domaine (INTEGRATION-API.md).
import { HEURE, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { magasin } from './stockage'

export type OriginePromo = 'vendeur' | 'merite' | 'selection'
export interface PromoEtat {
  id: string
  offreId: string
  origine: OriginePromo
  type: 'pourcent' | 'montant'
  valeur: number
  prixReference: number
  prixPromo: number
  debut: number
  fin: number
  creeeA: number
  relue: boolean
  arreteeA: number | null
}
export type EtatPromo = 'en_verification' | 'programmee' | 'en_cours' | 'terminee' | 'arretee'

/** P-3 : une remise au-delà du seuil est relue par la console sous 24 h. */
export const RELECTURE_H = 24

export const etatPromos = magasin<{ promos: PromoEtat[]; n: number }>('aja_promotions', () => ({
  // Une vente flash passée (5 et 6 sept.) sur l'ITEL noir, à 10 % ; la référence est le prix pratiqué alors.
  // Démonstration : une en cours (chargeur, −10 %), une programmée (coque, −300 F), une arrêtée avant la fin (pagne).
  promos: [
    { id: 'pr-1', offreId: 'itel-noir', origine: 'vendeur', type: 'pourcent', valeur: 10, prixReference: 20000, prixPromo: 18000, debut: yaounde(2026, 9, 5, 8), fin: yaounde(2026, 9, 6, 20), creeeA: yaounde(2026, 9, 3, 18, 12), relue: false, arreteeA: null },
    { id: 'pr-2', offreId: 'chargeur', origine: 'vendeur', type: 'pourcent', valeur: 10, prixReference: 4000, prixPromo: 3600, debut: yaounde(2026, 9, 20, 8), fin: yaounde(2026, 9, 22, 8), creeeA: yaounde(2026, 9, 19, 17, 5), relue: false, arreteeA: null },
    { id: 'pr-3', offreId: 'coque', origine: 'vendeur', type: 'montant', valeur: 300, prixReference: 2000, prixPromo: 1700, debut: yaounde(2026, 9, 25, 8), fin: yaounde(2026, 9, 26, 20), creeeA: yaounde(2026, 9, 21, 9, 10), relue: false, arreteeA: null },
    { id: 'pr-4', offreId: 'pagne-bleu', origine: 'merite', type: 'pourcent', valeur: 15, prixReference: 14000, prixPromo: 11900, debut: yaounde(2026, 8, 29, 8), fin: yaounde(2026, 8, 30, 20), creeeA: yaounde(2026, 8, 28, 10), relue: false, arreteeA: yaounde(2026, 8, 30, 12, 40) },
    // Ventes flash sur sélection acceptées par BelivaY (Publicité, cp-11 et cp-12), réponse 24 h avant le créneau.
    { id: 'pr-5', offreId: 'itel-noir', origine: 'selection', type: 'pourcent', valeur: 12, prixReference: 20000, prixPromo: 17600, debut: yaounde(2026, 9, 19, 8), fin: yaounde(2026, 9, 20, 8), creeeA: yaounde(2026, 9, 18, 8), relue: false, arreteeA: null },
    { id: 'pr-6', offreId: 'iphone', origine: 'selection', type: 'pourcent', valeur: 10, prixReference: 345000, prixPromo: 310500, debut: yaounde(2026, 9, 12, 8), fin: yaounde(2026, 9, 13, 8), creeeA: yaounde(2026, 9, 11, 8), relue: false, arreteeA: null },
  ],
  n: 6,
}))

export function etatPromo(x: PromoEtat): EtatPromo {
  const t = maintenant()
  if (x.arreteeA) return 'arretee'
  if (x.fin <= t) return 'terminee'
  if (x.relue && t < x.creeeA + RELECTURE_H * HEURE) return 'en_verification'
  return x.debut <= t ? 'en_cours' : 'programmee'
}
export const promoActive = (x: PromoEtat) => ['en_verification', 'programmee', 'en_cours'].includes(etatPromo(x))

/** La vente flash en cours d'une offre (au plus une : deux ventes ne se chevauchent pas). */
export const promoEnCours = (offreId: string): PromoEtat | null => etatPromos.lire().promos.find((x) => x.offreId === offreId && etatPromo(x) === 'en_cours') ?? null

/** Ajoute une vente flash (déjà vérifiée par l'appelant) ; rend son identifiant. */
export function ajouterPromo(p: Omit<PromoEtat, 'id' | 'creeeA' | 'arreteeA'>): string {
  let id = ''
  etatPromos.ecrire((e) => {
    e.n++
    id = 'pr-' + e.n + '-' + maintenant().toString(36)
    e.promos.push({ ...p, id, creeeA: maintenant(), arreteeA: null })
  })
  return id
}
