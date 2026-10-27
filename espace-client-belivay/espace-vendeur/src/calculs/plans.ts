// Plans du vendeur : portage fidèle de moteurs/belivay_moteurs/plans.py (PLN-01, PLN-02, PLN-05, VD02-P04, VD02-P22,
// VD10-R32, REFVD-R271 ; DP-55 : Q-04 ; DP-57 : A-2, A-3 ; audit C5).
//
// - Prix : Boost 2 500 F, Pro 7 500 F par mois (VD-PLAN-BOOST, VD-PLAN-PRO) ; à l'année, 10 mois payés pour 12
//   (25 000 F, 75 000 F, VD-PLAN-ANNUEL).
// - Plafond de la remise du mois (VD-PLAN-REMISE-PLAFOND, A-3) : le prix du mois payé ; à l'année, prix annuel ÷ 12,
//   arrondi à l'inférieur (2 083 F Boost, 6 250 F Pro). Pendant l'essai, le prix mensuel du plan (A-2).
// - Essai (A-2, VD-PLAN-ESSAI) : un mois offert ; rappel 3 jours avant la fin, par notification ; sans premier
//   paiement confirmé à la fin, retour à Free sans rien perdre.
// - Paiement échoué (PLN-02, VD-PLAN-GRACE) : 7 jours de grâce, puis Free sans rien perdre.
// - TVA (VD-PLAN-TVA, audit C5) : au taux de VD-TVA, en plus du prix du plan ; 0 % au lancement.
// - La remise elle-même (5 % / 10 % de la commission du mois, restituée si une commande est remboursée) est dans
//   commission.ts (remiseDePlan, restitutionDeRemise).
import { Dec } from './argent'
import type { ParametresCommission } from './registre'
import { ajouterJours, ajouterMois, type Jour } from './temps'

export type PlanVendeur = 'Free' | 'Boost' | 'Pro'
export const PLANS: PlanVendeur[] = ['Free', 'Boost', 'Pro']

/** « mensuelle » ; « annuelle » : 10 mois payés pour 12 ; « essai » : un mois offert. */
export type Facturation = 'mensuelle' | 'annuelle' | 'essai'

const DOUZE_MOIS = 12

export const prixMensuel = (plan: PlanVendeur, p: ParametresCommission): number => (plan === 'Free' ? 0 : p.plans[plan].prixMensuel)

/** « À l'année, 10 mois payés pour 12 » : Boost 25 000 F, Pro 75 000 F (VD10-R32, REFVD-R271). */
export const prixAnnuel = (plan: PlanVendeur, p: ParametresCommission): number => prixMensuel(plan, p) * p.annuelMoisPayes

/** Ce que le plan coûte ce mois-ci : le prix mensuel ; à l'année, prix annuel ÷ 12 (2 083 F, 6 250 F) ; 0 F pendant l'essai. */
export function prixDuMois(plan: PlanVendeur, facturation: Facturation, p: ParametresCommission): number {
  if (facturation === 'essai') return 0
  if (facturation === 'annuelle') return Dec.de(prixAnnuel(plan, p)).sur(DOUZE_MOIS).francs()
  return prixMensuel(plan, p)
}

/** Plafond de la remise du mois (A-2, A-3) : prix mensuel (aussi pendant l'essai) ; à l'année, prix annuel ÷ 12 arrondi à l'inférieur. */
export function plafondDeRemise(plan: PlanVendeur, facturation: Facturation, p: ParametresCommission): number {
  if (facturation === 'annuelle') return Math.floor(prixAnnuel(plan, p) / DOUZE_MOIS)
  return prixMensuel(plan, p)
}

/** TVA en plus du prix du plan, au taux de VD-TVA (VD-PLAN-TVA, audit C5) ; 0 F au lancement. */
export const tvaDuPlan = (prix: number, p: ParametresCommission): number => Dec.de(prix).fois(p.tvaPourCent).sur(100).francs()

// ── Essai et paiement échoué ────────────────────────────────────────────────────────────────────────────

/** Essai d'un mois offert (A-2) : commencé le 6 oct., fini le 6 nov. ; le 31 janv., fini le 28 févr. */
export const finEssai = (debut: Jour, p: ParametresCommission): Jour => ajouterMois(debut, p.essaiMois)

/** Rappel par notification 3 jours avant la fin de l'essai (PLN-05, Q-48 : pas de SMS). */
export const rappelEssai = (debut: Jour, p: ParametresCommission): Jour => ajouterJours(finEssai(debut, p), -p.essaiRappelJours)

/** Pendant l'essai : le plan essayé. Après : le plan si le premier paiement est confirmé, sinon Free, sans rien perdre (PLN-05). */
export function planApresEssai(plan: PlanVendeur, debut: Jour, jour: Jour, premierPaiementConfirme: boolean, p: ParametresCommission): PlanVendeur {
  if (jour < finEssai(debut, p) || premierPaiementConfirme) return plan
  return 'Free'
}

/** Paiement échoué le 6 oct. : grâce jusqu'au 13 oct. (PLN-02). */
export const finDeGrace = (echec: Jour, p: ParametresCommission): Jour => ajouterJours(echec, p.graceJours)

/** 7 jours de grâce, puis Free sans rien perdre, sauf si le paiement a été réglé entre-temps (PLN-02). */
export function planApresEchec(plan: PlanVendeur, echec: Jour, jour: Jour, regleDepuis: boolean, p: ParametresCommission): PlanVendeur {
  if (regleDepuis || jour <= finDeGrace(echec, p)) return plan
  return 'Free'
}
