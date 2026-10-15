// Annonces sponsorisées (DP-59) : règles de placement, reprises à l'identique du moteur de référence
// (moteurs/belivay_moteurs/publicite.py : placer_annonces, score_classement, classer). Paramètres renvoyés par le
// serveur avec les annonces (ReglesAnnonces) : VD-PUB-DENSITE, VD-PUB-BOOST.
import type { ReglesAnnonces } from './source'

// Une offre affichée : `cle` l'identifie (produit d'une boutique), `produit` la fiche commune.
export interface OffreClassee {
  cle: string
  produit: string
  prix: number
  note: number
}
export interface PositionAnnonce<T extends OffreClassee> {
  resultat: T
  sponsorise: boolean
}

const CENT = 100
const plafond = (a: number, b: number) => Math.ceil(a / b)

// Une offre du même produit, moins chère ET mieux notée : l'annonce ne passe jamais au-dessus.
const ecrase = (annonce: OffreClassee, r: OffreClassee) => r.produit === annonce.produit && r.cle !== annonce.cle && r.prix < annonce.prix && r.note > annonce.note

/**
 * Mêle les annonces (rangées par l'enchère) aux résultats : une place toutes les fenetre ÷ max positions (0, 5,
 * 10… : 2 sur 10), partMaxPourCent des positions au plus, jamais au-dessus d'une offre moins chère et mieux notée
 * du même produit. Une annonce déjà affichée au-dessus de sa place est inutile (rien n'est facturé) ; plus bas, sa
 * copie est retirée (une offre n'apparaît qu'une fois).
 */
export function placerAnnonces<T extends OffreClassee>(resultats: readonly T[], annonces: readonly T[], r: ReglesAnnonces): PositionAnnonce<T>[] {
  const pas = plafond(r.fenetre, r.maxParFenetre)
  const liste: PositionAnnonce<T>[] = resultats.map((x) => ({ resultat: x, sponsorise: false }))
  let prochaine = 0
  let placees = 0
  for (const a of annonces) {
    let dernierBloquant = -1
    liste.forEach((x, i) => {
      if (ecrase(a, x.resultat)) dernierBloquant = i
    })
    const debut = Math.max(prochaine, dernierBloquant + 1)
    const place = plafond(debut, pas) * pas
    if (place > liste.length) continue
    const i = liste.findIndex((x) => x.resultat.cle === a.cle)
    const copie = i < 0 ? null : i
    if (copie !== null && copie <= place) continue
    const total = liste.length + (copie !== null ? 0 : 1)
    if ((placees + 1) * CENT > r.partMaxPourCent * total) continue
    if (copie !== null) liste.splice(copie, 1)
    liste.splice(place, 0, { resultat: a, sponsorise: true })
    placees += 1
    prochaine = place + pas
  }
  return liste
}

// Score de pertinence × le multiplicateur plafonné pendant un Boost : il remonte, sans écraser le mérite.
export const scoreClassement = (score: number, booste: boolean, r: Pick<ReglesAnnonces, 'boostMultiplicateur'>) => score * (booste ? r.boostMultiplicateur : 1)

/**
 * Tri « pertinence » avec le Boost : le score de pertinence est le rang d'origine inversé (n pour le premier, 1 pour
 * le dernier), multiplié pendant un Boost ; rangé par score décroissant, ordre d'origine à égalité (classer).
 */
export function classerAvecBoost<T>(liste: readonly T[], cle: (x: T) => string, boosts: readonly string[], r: Pick<ReglesAnnonces, 'boostMultiplicateur'>): T[] {
  if (!boosts.length) return [...liste]
  const n = liste.length
  return liste
    .map((x, i) => ({ x, s: scoreClassement(n - i, boosts.includes(cle(x)), r) }))
    .sort((a, b) => b.s - a.s)
    .map((e) => e.x)
}

// Téléphone : une carte « Sponsorisé » toutes les 6 cartes au plus (consigne du porteur, DP-59) ; jamais plus dense que
// la règle du serveur (VD-PUB-DENSITE), qui s'applique seule dès la tablette.
export const PAS_TELEPHONE = 6
export function reglesEcran(r: ReglesAnnonces, telephone: boolean): ReglesAnnonces {
  if (!telephone || plafond(r.fenetre, r.maxParFenetre) >= PAS_TELEPHONE) return r
  return { ...r, fenetre: PAS_TELEPHONE, maxParFenetre: 1 }
}

// Plafond de répétition : une même annonce au clic est montrée au plus REPETITION_MAX fois par visite (toutes listes
// confondues) ; au-delà, elle laisse sa place. Les emplacements achetés à la semaine (À la une, carrousel) et la
// sélection flash n'y sont pas soumis : leur place est payée pour être vue.
export const REPETITION_MAX = 5

// Pages sans publicité : paiement, panier, commande, code de retrait, comptoir, garde, litiges et retours.
const SANS_PUB = /^\/(panier|paiement|premiere-commande|confirmee|commandes?|code|comptoir|garde|litiges?|retour|annuler|moyens-paiement|rentree-panier|wa-confirmer|assistant-confirmer)(-|\/|$)/
export const pubPermise = (chemin: string) => !SANS_PUB.test(chemin)
