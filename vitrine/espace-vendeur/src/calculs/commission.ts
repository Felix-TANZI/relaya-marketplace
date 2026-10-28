// Commission du vendeur et montant gardé : portage fidèle de moteurs/belivay_moteurs/commission.py (paquet « Espace
// vendeur » : VD-02 p5-6, familles M01, VD-10 PLN-01, PRX-03, PRX-09, REFVD-R54, VD12-R36 ; décisions DP-55, DP-56 ;
// DP-57 : A-2 à A-4). Mêmes formules, mêmes arrondis, mêmes exemples (commission.test.ts rejoue
// moteurs/tests/test_commission.py, ecarts-audit.test.ts rejoue moteurs/tests/test_ecarts_audit.py).
//
//   com_article = Σ tranches (taux + points) × part du prix unitaire dans la tranche            VD-BAREME-A … E
//                 points : +3 si le prix unitaire est sous 5 000 F, −2 si Made in Cameroon,    VD-COM-POINTS
//                 jamais sous 0 % ; tranche sans taux : taux de la tranche précédente (Q-06)
//   barème      = Σ lignes com_article × quantité
//   réduite     = barème × multiplicateur de palier × 0,80 si découverte                     VD-COM-PALIER, VD-DECOUV-MULT
//   plancher    = MAX(700 F ; 2 % du prix des articles ; livraison offerte : part couverte par BelivaY + MAX(200 F ;
//                 0,5 % du prix des articles))  par sous-commande (R14 v2.0, comme v20/commission.py du serveur)
//   commission  = MAX(réduite ; plancher), arrondie une seule fois, au franc, moitié vers le haut (DP-55, Q-54)
//   TVA         = τ × commission, en plus (0 % au lancement)                                  VD-TVA (Q-09)
//   gardé       = prix des articles − commission − TVA
//
// « BelivaY ne perd jamais » (DP-55) : aucune réduction ne passe sous le plancher ; la remise du plan ne dépasse ni la
// commission au-dessus des planchers, ni le prix du plan (à l'année : prix annuel ÷ 12, A-3) ; elle se recalcule sur
// la commission après remboursement et l'excédent déjà rendu est restitué (REFVD-R54) ; elle rend aussi la TVA de sa
// part (audit C5) ; une vente ou une offre où le vendeur garderait moins de 0 F est refusée (OffreRefusee), comme un
// prix unitaire au-dessus du plafond de démarrage (PRX-09, brouillon gardé).
//
// Les 3 points « sous 5 000 F » sont gardés (DP-57, A-4) : un article juste sous 5 000 F peut payer plus qu'à
// 5 000 F ; la phrase du champ prix dit donc la plage exacte où la commission minimale s'applique
// (plagesCommissionMinimale, messageCommissionMinimale), jamais « sous X F » quand ce n'est pas vrai.
// L'espace vendeur ne fait qu'AFFICHER ces montants (GEN-03 : le serveur calcule et fige au paiement) : ces fonctions
// servent la démonstration, le simulateur des plans et l'aperçu « Vous gardez » d'une nouvelle offre.
import { Dec, ecrire, max } from './argent'
import { verifierPrixDemarrage } from './demarrage'
import { OffreRefusee, VenteInvalide } from './erreurs'
import { plafondDeRemise, PLANS, prixDuMois, tvaDuPlan, type Facturation, type PlanVendeur } from './plans'
import type { Famille, Palier, ParametresCommission, ParametresPaliers } from './registre'
import { ajouterMois, type Jour } from './temps'

export type { Famille, Palier }

/** « Électronique » → 'A', lu dans le registre (VD-BAREME-A … E). */
export function familleDe(categorie: string, p: ParametresCommission): Famille {
  const f = p.familles[categorie]
  if (!f) throw new VenteInvalide(`catégorie inconnue du barème : « ${categorie} »`)
  return f
}

/** Un article d'une sous-commande : le barème s'applique au prix unitaire, puis à la quantité. */
export interface LigneVendue {
  famille: Famille
  prixUnitaire: number
  quantite?: number
  madeInCameroon?: boolean
}
function verifier(l: LigneVendue): Required<LigneVendue> {
  if (!['A', 'B', 'C', 'D', 'E'].includes(l.famille)) throw new VenteInvalide(`famille inconnue « ${l.famille} »`)
  const q = l.quantite ?? 1
  for (const [nom, v] of [['prix', l.prixUnitaire], ['quantité', q]] as const)
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new VenteInvalide(`${nom} invalide ${String(v)}`)
  return { famille: l.famille, prixUnitaire: l.prixUnitaire, quantite: q, madeInCameroon: !!l.madeInCameroon }
}

function points(prixUnitaire: number, mic: boolean, p: ParametresCommission): Dec {
  let pts = Dec.de(0)
  if (prixUnitaire < p.seuilPetitPrix) pts = pts.plus(p.pointsPetitPrix) // « sous 5 000 F » : 5 000 F n'a pas les 3 points
  if (mic) pts = pts.moins(p.pointsMadeInCameroon)
  return pts
}

/** Emplacement de M06 (rééquilibrage des produits chers, Q-02) : « en attente » au registre, le barème passe tel quel. */
const reequilibrageM06 = (bareme: Dec) => bareme
/** R14 (v2.0) : livraison offerte, au moins la part de la livraison couverte par BelivaY plus MAX(200 F ; 0,5 % du
 *  sous-total) ; sans couverture, 0 F (sans effet sur le MAX). Même plancher que le serveur (v20/commission.py). */
// Valeurs de R14 (BV-DEV-07 : marge_min_f, marge_min_part ; ecarts-ts.test.ts vérifie qu'elles n'ont pas bougé). Écrites
// ici et non lues par @client/calculs : ce module est aussi chargé par les tests Playwright (Node, sans import JSON).
export const MARGE_MIN_F = 200
export const MARGE_MIN_PART = '0.005'
const plancherLivraisonOfferte = (couverture: number, prix: number) =>
  couverture > 0 ? Dec.de(couverture).plus(max(Dec.de(MARGE_MIN_F), Dec.de(prix).fois(Dec.de(MARGE_MIN_PART)))) : Dec.de(0)

/** Barème d'une unité, non arrondi. ITEL à 21 000 F, famille A : 20 000 × 13,5 % + 1 000 × 5 % = 2 750 F. */
export function commissionArticle(ligne: LigneVendue, p: ParametresCommission): Dec {
  const l = verifier(ligne)
  const pts = points(l.prixUnitaire, l.madeInCameroon, p)
  let total = Dec.de(0)
  let bas = 0
  for (const t of p.bareme[l.famille]) {
    const haut = t.borne === null ? l.prixUnitaire : Math.min(l.prixUnitaire, t.borne)
    if (haut > bas) total = total.plus(Dec.de(haut - bas).fois(max(t.tauxPourCent.plus(pts), Dec.de(0))).sur(100))
    bas = haut
  }
  return reequilibrageM06(total)
}

const reduction = (palier: Palier, decouverte: boolean, p: ParametresCommission) => p.multiplicateurs[palier].fois(decouverte ? p.decouverteMult : Dec.de(1))

export interface ResultatCommission {
  prixArticles: number
  bareme: Dec
  reduite: Dec
  plancher: Dec
  plancherApplique: boolean
  commission: number // le seul montant arrondi (DP-55)
  tva: number
  garde: number // « Vous gardez X F » (GEN-02)
  margeSurPlancher: number // ce qu'une remise de plan peut rendre (DP-55)
  trace: string[]
}

function calculer(lignes: LigneVendue[], palier: Palier, decouverte: boolean, p: ParametresCommission, couverture = 0): ResultatCommission {
  if (!lignes.length) throw new VenteInvalide('sous-commande sans article')
  const ls = lignes.map(verifier)
  const trace: string[] = []
  const prix = ls.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0)
  let bareme = Dec.de(0)
  for (const l of ls) {
    const unitaire = commissionArticle(l, p)
    bareme = bareme.plus(unitaire.fois(l.quantite))
    const pts = points(l.prixUnitaire, l.madeInCameroon, p)
    trace.push(`${ecrire(l.prixUnitaire)} × ${l.quantite}, famille ${l.famille}` + (pts.eq(0) ? '' : `, ${pts.cmp(0) > 0 ? '+' : ''}${pts.texte()} points`) + ` : barème ${unitaire.texte()} F par unité (VD-BAREME-${l.famille}, VD-COM-POINTS)`)
  }
  const reduite = bareme.fois(reduction(palier, decouverte, p))
  trace.push(`Réduite = ${bareme.texte()} × ${p.multiplicateurs[palier].texte()} (${palier})` + (decouverte ? ` × ${p.decouverteMult.texte()} (découverte)` : '') + ` = ${reduite.texte()} F (VD-COM-PALIER, VD-DECOUV-MULT)`)
  const plancher = max(Dec.de(p.plancherCommande), Dec.de(prix).fois(p.plancherTauxPourCent).sur(100), plancherLivraisonOfferte(couverture, prix))
  trace.push(`Plancher = MAX(${ecrire(p.plancherCommande)} ; ${p.plancherTauxPourCent.texte()} % × ${ecrire(prix)}) = ${plancher.texte()} F par sous-commande (VD-COM-MIN, VD-COM-MIN-TAUX` + (couverture > 0 ? ` ; livraison offerte ${ecrire(couverture)} + marge minimale, R14` : '') + ')')
  const commission = max(reduite, plancher).francs()
  const plancherApplique = commission > reduite.francs()
  const tva = Dec.de(commission).fois(p.tvaPourCent).sur(100).francs()
  const garde = prix - commission - tva
  trace.push(`Commission = ${ecrire(commission)}` + (plancherApplique ? ' (plancher)' : '') + `, arrondie une fois (DP-55) ; TVA ${p.tvaPourCent.texte()} % = ${ecrire(tva)} ; gardé = ${ecrire(garde)}`)
  return { prixArticles: prix, bareme, reduite, plancher, plancherApplique, commission, tva, garde, margeSurPlancher: Math.max(commission - plancher.plafond(), 0), trace }
}

/** Commission, TVA et montant gardé d'une sous-commande. ITEL à 20 000 F, Bronze, découverte : 2 160 F pris, 17 840 F gardés. */
export function calculerCommission(lignes: LigneVendue[], palier: Palier, decouverte: boolean, p: ParametresCommission, couverture = 0): ResultatCommission {
  const r = calculer(lignes, palier, decouverte, p, couverture)
  if (r.garde < 0) throw new OffreRefusee(`le vendeur garderait ${ecrire(r.garde)} sur ${ecrire(r.prixArticles)} : vente refusée (DP-55, Q-08)`)
  return r
}

/** Commission annulée si remboursement total ; au prorata s'il est partiel, sans plancher de 700 F (VD-COM-MIN-REMB). */
export function apresRemboursement(r: ResultatCommission, rembourse: number, p: ParametresCommission) {
  if (rembourse < 0 || rembourse > r.prixArticles) throw new VenteInvalide(`remboursement ${ecrire(rembourse)} hors de 0 F … ${ecrire(r.prixArticles)}`)
  const reste = r.prixArticles - rembourse
  const commission = Dec.de(r.commission).fois(reste).sur(r.prixArticles).francs()
  const tva = Dec.de(commission).fois(p.tvaPourCent).sur(100).francs()
  return { commission, tva, garde: reste - commission - tva }
}

/** Plus petit prix publiable (Q-08, Q-55) : au moins VD-PRIX-MIN et le vendeur garde au moins 0 F (Bronze, sans découverte). */
export function prixMinimumPubliable(famille: Famille, madeInCameroon: boolean, p: ParametresCommission): number {
  let prix = p.prixMin
  while (calculer([{ famille, prixUnitaire: prix, quantite: 1, madeInCameroon }], 'Bronze', false, p).garde < 0) prix++
  return prix
}

/** Refuse la publication d'une offre sous le prix minimum publiable (Q-08, Q-55) ; et, avec le compteur du vendeur
 * (`sansIncident`, `pp`), un prix unitaire au-dessus du plafond de démarrage avant 10 commandes livrées sans incident
 * (PRX-09 : le brouillon est gardé). */
export function verifierPublication(
  prix: number,
  famille: Famille,
  madeInCameroon: boolean,
  p: ParametresCommission,
  demarrage: { sansIncident?: number; pp?: ParametresPaliers } = {},
): void {
  const minimum = prixMinimumPubliable(famille, madeInCameroon, p)
  if (prix < minimum) throw new OffreRefusee(`prix ${ecrire(prix)} : publiable dès ${ecrire(minimum)} (VD-PRIX-MIN, DP-55)`)
  const { sansIncident, pp } = demarrage
  if ((sansIncident === undefined) !== (pp === undefined)) throw new RangeError('plafond de démarrage : il faut le compteur sans incident et les paramètres des paliers')
  if (pp !== undefined) verifierPrixDemarrage(prix, sansIncident!, pp)
}

/** [premier prix sous 5 000 F dont le barème réduit atteint 700 F, ou null ; premier prix dès 5 000 F]. */
function seuils700(famille: Famille, palier: Palier, decouverte: boolean, madeInCameroon: boolean, p: ParametresCommission): [number | null, number] {
  const red = reduction(palier, decouverte, p)
  const atteint = (prix: number) => commissionArticle({ famille, prixUnitaire: prix, madeInCameroon }, p).fois(red).francs() >= p.plancherCommande
  // Le barème croît avec le prix de part et d'autre de 5 000 F (les 3 points s'arrêtent à 5 000 F).
  const premier = (bas: number, haut: number) => {
    while (bas < haut) {
      const milieu = Math.floor((bas + haut) / 2)
      if (atteint(milieu)) haut = milieu
      else bas = milieu + 1
    }
    return bas
  }
  const avant = atteint(p.seuilPetitPrix - 1) ? premier(1, p.seuilPetitPrix - 1) : null
  return [avant, premier(p.seuilPetitPrix, 10 ** 12)]
}

/** « Sous X F, la commission minimale de 700 F s'applique » : calculé, jamais écrit en dur (Q-55). X = plus petit prix
 * unitaire dès lequel le barème réduit, arrondi au franc, atteint 700 F. Électronique, Bronze : 5 182 F. Quand le minimum
 * s'arrête avant 5 000 F puis reprend (3 points, A-4), la phrase juste vient de messageCommissionMinimale. */
export function seuilCommissionMinimale(famille: Famille, palier: Palier, decouverte: boolean, madeInCameroon: boolean, p: ParametresCommission): number {
  const [avant, apres] = seuils700(famille, palier, decouverte, madeInCameroon, p)
  // Juste sous 5 000 F, le taux a 3 points de plus : le seuil est alors sous 5 000 F.
  if (avant !== null && apres === p.seuilPetitPrix) return avant
  return apres
}

/** Prix unitaires publiables (bornes comprises) où la commission minimale de 700 F s'applique à un article vendu seul
 * (DP-57, A-4). Électronique, Bronze : [700, 4 239] et [5 000, 5 181] ; Mode, Bronze : [700, 2 639] seulement. Le
 * plancher de 2 % (gros prix, Q-07) se lit sur calculerCommission (plancherApplique). */
export function plagesCommissionMinimale(famille: Famille, palier: Palier, decouverte: boolean, madeInCameroon: boolean, p: ParametresCommission): [number, number][] {
  const [avant, apres] = seuils700(famille, palier, decouverte, madeInCameroon, p)
  const bas = prixMinimumPubliable(famille, madeInCameroon, p)
  const morceaux: [number, number][] = [
    [bas, (avant === null ? p.seuilPetitPrix : avant) - 1],
    [Math.max(bas, p.seuilPetitPrix), apres - 1],
  ]
  const plages: [number, number][] = []
  for (const [debut, fin] of morceaux) {
    if (debut > fin) continue
    if (plages.length && plages[plages.length - 1][1] + 1 === debut) plages[plages.length - 1] = [plages[plages.length - 1][0], fin] // contiguës : une seule plage
    else plages.push([debut, fin])
  }
  return plages
}

/** La phrase du champ prix (Q-55, A-4), toujours vraie : « Sous 2 640 F, la commission minimale de 700 F s’applique. » ;
 * « De 700 F à 4 239 F et de 5 000 F à 5 181 F, la commission minimale de 700 F s’applique. » ; null si elle ne
 * s'applique à aucun prix publiable. */
export function messageCommissionMinimale(famille: Famille, palier: Palier, decouverte: boolean, madeInCameroon: boolean, p: ParametresCommission): string | null {
  const plages = plagesCommissionMinimale(famille, palier, decouverte, madeInCameroon, p)
  const fin = `la commission minimale de ${ecrire(p.plancherCommande)} s’applique.`
  if (!plages.length) return null
  if (plages.length === 1 && plages[0][0] === prixMinimumPubliable(famille, madeInCameroon, p)) return `Sous ${ecrire(plages[0][1] + 1)}, ${fin}`
  const texte = plages.map(([a, b]) => `de ${ecrire(a)} à ${ecrire(b)}`).join(' et ')
  return `${texte[0].toUpperCase()}${texte.slice(1)}, ${fin}`
}

// ── Offre de découverte ─────────────────────────────────────────────────────────────────────────────────

/** Commandes comptées : encaissées, moins celles remboursées en totalité (Q-62). */
export function compteurDecouverte(encaissees: number, rembourseesEnTotalite: number): number {
  if (rembourseesEnTotalite < 0 || rembourseesEnTotalite > encaissees) throw new VenteInvalide('remboursées en totalité : entre 0 et le nombre de commandes encaissées')
  return encaissees - rembourseesEnTotalite
}
/** Dernier jour de l'offre : 3 mois après la première commande payée (27 août → 27 nov.). */
export const finDecouverte = (premiereCommandePayee: Jour, p: ParametresCommission): Jour => ajouterMois(premiereCommandePayee, p.decouverteMois)
/** Active ⇔ commandes < 50 ∧ jour ≤ fin ; avant la première commande payée, la première commande en profite. */
export function decouverteActive(premiereCommandePayee: Jour | null, jour: Jour, commandesComptees: number, p: ParametresCommission): boolean {
  if (commandesComptees >= p.decouverteCommandes) return false
  return premiereCommandePayee === null || jour <= finDecouverte(premiereCommandePayee, p)
}

// ── Plans : remise du mois et simulateur ────────────────────────────────────────────────────────────────

/** Une sous-commande payée du mois et ce qui en a été remboursé depuis (REFVD-R54, VD12-R36). */
export interface VenteDuMois {
  resultat: ResultatCommission
  rembourse?: number
}

const venteDe = (v: ResultatCommission | VenteDuMois): Required<VenteDuMois> =>
  'resultat' in v ? { resultat: v.resultat, rembourse: v.rembourse ?? 0 } : { resultat: v, rembourse: 0 }

/** [commission, gardé, part au-dessus des planchers] après remboursement. Partiel : commission au prorata sans plancher
 * (VD-COM-MIN-REMB) ; la part au-dessus des planchers suit le même prorata, arrondie à l'inférieur et jamais au-delà de
 * la commission restante (BelivaY ne perd jamais) ; total : rien. */
function apres(v: Required<VenteDuMois>, p: ParametresCommission): [number, number, number] {
  const r = v.resultat
  if (v.rembourse === 0) return [r.commission, r.garde, r.margeSurPlancher]
  const a = apresRemboursement(r, v.rembourse, p)
  const reste = r.prixArticles - v.rembourse
  return [a.commission, a.garde, Math.min(Math.floor((r.margeSurPlancher * reste) / r.prixArticles), a.commission)]
}

export interface RemisePlan {
  plan: PlanVendeur
  commissionDuMois: number // après les remboursements connus
  remise: number // rendue au vendeur
  prixDuPlan: number // payé ce mois-ci (0 F pendant l'essai ; prix annuel ÷ 12 à l'année)
  tvaRendue: number // TVA de la part de commission rendue (audit C5)
  tvaDuPlan: number // TVA en plus du prix du plan (VD-PLAN-TVA)
  plafond: number // prix du plan, ou prix annuel ÷ 12 (A-3)
  facturation: Facturation
  trace: string[]
}

/** Remise du mois (VD-12 arbitrage 14, D8, Q-04, DP-55) : Boost 5 %, Pro 10 % de la commission des commandes payées du
 * mois, après remboursements (REFVD-R54), arrondie une fois ; jamais plus que le plafond du plan (prix mensuel, aussi
 * pendant l'essai ; prix annuel ÷ 12 à l'année, A-3), ni que la commission au-dessus des planchers. 3 ITEL en
 * découverte (6 480 F) : Boost 324 F, Pro 648 F. */
export function remiseDePlan(plan: PlanVendeur, ventesDuMois: (ResultatCommission | VenteDuMois)[], p: ParametresCommission, facturation: Facturation = 'mensuelle'): RemisePlan {
  const ventes = ventesDuMois.map((v) => apres(venteDe(v), p))
  const commission = ventes.reduce((s, [c]) => s + c, 0)
  if (plan === 'Free') return { plan, commissionDuMois: commission, remise: 0, prixDuPlan: 0, tvaRendue: 0, tvaDuPlan: 0, plafond: 0, facturation: 'mensuelle', trace: ['Free : aucune remise'] }
  const regle = p.plans[plan]
  const brute = Dec.de(commission).fois(regle.remisePourCent).sur(100).francs()
  const marge = ventes.reduce((s, [, , m]) => s + m, 0)
  const plafond = plafondDeRemise(plan, facturation, p)
  const remise = Math.min(brute, plafond, marge)
  const prix = prixDuMois(plan, facturation, p)
  const tvaRendue = Dec.de(remise).fois(p.tvaPourCent).sur(100).francs()
  return {
    plan,
    commissionDuMois: commission,
    remise,
    prixDuPlan: prix,
    tvaRendue,
    tvaDuPlan: tvaDuPlan(prix, p),
    plafond,
    facturation,
    trace: [
      `${plan} (${facturation}) : ${regle.remisePourCent.texte()} % × ${ecrire(commission)} = ${ecrire(brute)} ; plafonds : plan ${ecrire(plafond)}, au-dessus des planchers ${ecrire(marge)} ⇒ remise ${ecrire(remise)}, TVA rendue ${ecrire(tvaRendue)} (VD-PLAN-REMISE-PLAFOND, VD-PLAN-ANNUEL, VD-PLAN-TVA)`,
    ],
  }
}

/** Remise à restituer quand une commande payée du mois est remboursée après le calcul (PLN-01, REFVD-R54, VD12-R36) : ce
 * qui a été rendu moins la remise recalculée sur la commission finalement perçue, jamais négatif. Pro, 3 ITEL en
 * découverte, 648 F rendus, une ITEL remboursée en totalité : 648 − 432 = 216 F repris. */
export function restitutionDeRemise(remiseDejaRendue: number, plan: PlanVendeur, ventesDuMois: (ResultatCommission | VenteDuMois)[], p: ParametresCommission, facturation: Facturation = 'mensuelle'): number {
  if (remiseDejaRendue < 0) throw new VenteInvalide('remise déjà rendue négative')
  return Math.max(remiseDejaRendue - remiseDePlan(plan, ventesDuMois, p, facturation).remise, 0)
}

export interface Simulation {
  gardes: Record<PlanVendeur, number> // gardé du mois avec chaque plan, prix du plan payé
  meilleur: PlanVendeur // à égalité, le moins cher (SIM-01 : le simulateur dit la vérité)
}

/** gardé(plan) = ventes − (commission − remise) − TVA nette − prix du plan − sa TVA, sur les ventes réelles du mois (VD-10
 * p28 ; audit C5). 3 ITEL en découverte : Free 53 520 F, Boost 51 344 F, Pro 46 668 F ; à l'année : 51 761 F, 47 918 F. */
export function simulerPlans(ventesDuMois: (ResultatCommission | VenteDuMois)[], p: ParametresCommission, facturation: Facturation = 'mensuelle'): Simulation {
  const gardeFree = ventesDuMois.reduce((s, v) => s + apres(venteDe(v), p)[1], 0)
  const gardes = {} as Record<PlanVendeur, number>
  for (const plan of PLANS) {
    const r = remiseDePlan(plan, ventesDuMois, p, facturation)
    gardes[plan] = gardeFree + r.remise + r.tvaRendue - r.prixDuPlan - r.tvaDuPlan
  }
  const meilleur = PLANS.reduce((a, b) => (gardes[b] > gardes[a] ? b : a))
  return { gardes, meilleur }
}
