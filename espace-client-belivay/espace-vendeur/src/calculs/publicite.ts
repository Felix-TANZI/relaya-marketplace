// Revenus publicitaires du vendeur : portage fidèle de moteurs/belivay_moteurs/publicite.py et de lire_publicite
// (registre.py) — décision DP-59, qui remplace DP-14 et Q-32 pour quatre produits payants. Mêmes formules, mêmes
// arrondis, mêmes exemples (publicite.test.ts rejoue moteurs/tests/test_publicite.py).
//
//   éligibilité  = stock > 0 ∧ Trust Score ≥ seuil ∧ aucun litige en cours                      VD-PUB-ELIGIBILITE
//   clic         = enchère ≥ prix plancher ; coût = MIN(enchère ; MAX(plancher ; enchère suivante + 1 F))  VD-PUB-CLIC
//                  un clic facturé une seule fois par client, par annonce et par jour (anti-fraude)
//   diffusion    = tant que dépense du jour + coût ≤ budget quotidien et coût ≤ solde        VD-PUB-BUDGET
//   densité      = 20 % des positions au plus, 2 annonces au plus sur 10 résultats ; jamais au-dessus d'une offre
//                  moins chère ET mieux notée du même produit                                 VD-PUB-DENSITE
//   À la une, carrousel = places par semaine : tarif fixe (premiers arrivés) ou enchère hebdomadaire (second prix
//                  + 1 F, jamais au-dessus de l'enchère)                                       VD-PUB-A-LA-UNE, -CARROUSEL
//   vente flash  = remise ≥ FLASH-REMISE-MIN ; commission = MAX(réduite ; plancher) + majoration × prix, un seul
//                  arrondi ; refusée si le vendeur garderait moins de 0 F (DP-55)             VD-PUB-FLASH-MAJORATION
//   Boost        = forfait 24 h ou 7 jours ; score de classement × multiplicateur plafonné    VD-PUB-BOOST
//   solde        = prépayé par Mobile Money (recharge minimale), débité par les annonces, crédité des heures non
//                  diffusées (au franc inférieur) ; jamais retenu sur les versements          VD-PUB-SOLDE
//
// Les codes VD-PUB-* arrivent au registre avec la branche du moteur : tant qu'ils manquent, PARAMETRES_PUBLICITE
// prend les mêmes valeurs (PROPOSES, recopiées du registre) ; la lecture, elle, est stricte (ParametreIllisible).
import { Dec, ecrire } from './argent'
import { calculerCommission, type LigneVendue } from './commission'
import { ErreurMoteur, OffreRefusee, ParametreAbsent, ParametreIllisible, VenteInvalide } from './erreurs'
import { REGISTRE, type Palier, type ParametresCommission, type Registre } from './registre'

/** Annonce refusée (enchère, budget, éligibilité, solde, remise) : AnnonceRefusee de erreurs.py. */
export class AnnonceRefusee extends ErreurMoteur {}

const CENT = 100

export interface Emplacements {
  places: number
  tarifSemaine: number // tarif fixe
  enchereMin: number // plancher de l'enchère hebdomadaire
}
export interface ParametresPublicite {
  trustMin: number // VD-PUB-ELIGIBILITE
  clicPlancher: number // VD-PUB-CLIC
  pasEnchere: number // second prix + 1 F
  budgetMin: number // VD-PUB-BUDGET
  partMaxPourCent: Dec // VD-PUB-DENSITE
  maxParFenetre: number
  fenetre: number
  aLaUne: Emplacements
  carrousel: Emplacements
  flashPoints: Dec // VD-PUB-FLASH-MAJORATION
  flashRemiseMinPourCent: Dec // FLASH-REMISE-MIN
  boost24h: number // VD-PUB-BOOST
  boost7j: number
  boostPlafond: Dec
  rechargeMin: number // VD-PUB-SOLDE
}

// ── Lecture du registre (registre.py : lire_publicite) ─────────────────────────────────────────────────────

const NOMBRE = '(\\d{1,3}(?:[\\s\\u00a0\\u202f]\\d{3})*|\\d+)'
const entier = (t: string) => Number(t.replace(/[\s  ]/g, ''))
const taux = (t: string) => Dec.de(t.replace(',', '.'))
function lire(r: Registre, code: string, motif: string): RegExpExecArray {
  if (!(code in r)) throw new ParametreAbsent(code)
  const v = r[code].trim()
  const m = new RegExp('^(?:' + motif + ')$').exec(v)
  if (!m) throw new ParametreIllisible(`${code} : « ${v} » ne suit pas la forme attendue`)
  return m
}
function emplacements(r: Registre, code: string): Emplacements {
  const m = lire(r, code, `(\\d+) places par semaine ; ${NOMBRE} F la semaine, ou enchère hebdomadaire dès ${NOMBRE} F`)
  return { places: Number(m[1]), tarifSemaine: entier(m[2]), enchereMin: entier(m[3]) }
}

export function lirePublicite(r: Registre): ParametresPublicite {
  const el = lire(r, 'VD-PUB-ELIGIBILITE', 'stock supérieur à 0 ; Trust Score de (\\d+) au moins ; aucun litige en cours')
  const clic = lire(r, 'VD-PUB-CLIC', `prix plancher ${NOMBRE} F le clic ; coût = second prix \\+ (\\d+) F, jamais au-dessus de l'enchère ; un clic facturé une fois par client et par jour`)
  const bud = lire(r, 'VD-PUB-BUDGET', `${NOMBRE} F par jour au moins ; diffusion arrêtée quand le budget du jour ou le solde est atteint`)
  const den = lire(r, 'VD-PUB-DENSITE', "(\\d+(?:,\\d+)?) % des positions au plus ; (\\d+) annonces au plus sur (\\d+) résultats ; jamais au-dessus d'une offre moins chère et mieux notée du même produit")
  const fl = lire(r, 'VD-PUB-FLASH-MAJORATION', '(\\d+(?:,\\d+)?) points de commission pendant la vente flash')
  const rem = lire(r, 'FLASH-REMISE-MIN', '(\\d+(?:,\\d+)?) %')
  const bo = lire(r, 'VD-PUB-BOOST', `24 h : ${NOMBRE} F · 7 jours : ${NOMBRE} F ; classement × (\\d+(?:,\\d+)?) au plus`)
  const so = lire(r, 'VD-PUB-SOLDE', `recharge Mobile Money de ${NOMBRE} F au moins ; heures non diffusées remboursées au solde ; jamais retenu sur les versements sans accord`)
  const plafond = taux(bo[3])
  if (plafond.cmp(1) < 0) throw new ParametreIllisible('VD-PUB-BOOST : le multiplicateur doit valoir 1 au moins')
  const maxFen = Number(den[2])
  const fen = Number(den[3])
  if (!(maxFen > 0 && maxFen <= fen)) throw new ParametreIllisible('VD-PUB-DENSITE : annonces au plus entre 1 et la taille de la fenêtre')
  return {
    trustMin: Number(el[1]),
    clicPlancher: entier(clic[1]),
    pasEnchere: Number(clic[2]),
    budgetMin: entier(bud[1]),
    partMaxPourCent: taux(den[1]),
    maxParFenetre: maxFen,
    fenetre: fen,
    aLaUne: emplacements(r, 'VD-PUB-A-LA-UNE'),
    carrousel: emplacements(r, 'VD-PUB-CARROUSEL'),
    flashPoints: taux(fl[1]),
    flashRemiseMinPourCent: taux(rem[1]),
    boost24h: entier(bo[1]),
    boost7j: entier(bo[2]),
    boostPlafond: plafond,
    rechargeMin: entier(so[1]),
  }
}

/** Paramètres en vigueur : codes VD-PUB-* du registre (logique-metier/parametres-en-vigueur.json). */
export const PARAMETRES_PUBLICITE: ParametresPublicite = lirePublicite(REGISTRE)

function montant(nom: string, v: unknown, mini = 0): asserts v is number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < mini) throw new AnnonceRefusee(`${nom} invalide ${String(v)}`)
}
/** Au franc inférieur (ROUND_DOWN), pour un montant positif. */
const inferieur = (x: Dec) => Number(x.n / x.d)

// ── Éligibilité ───────────────────────────────────────────────────────────────────────────────────────────

export type MotifIneligibilite = 'rupture' | 'score' | 'litige'
/** Seuil de qualité : les raisons (dans l'ordre du moteur) ; vide = l'offre peut être annoncée. */
export function motifsIneligibilite(stock: number, trustScore: number | Dec, litigesEnCours: number, p: ParametresPublicite): MotifIneligibilite[] {
  const m: MotifIneligibilite[] = []
  if (stock <= 0) m.push('rupture')
  if (Dec.de(typeof trustScore === 'number' && !Number.isInteger(trustScore) ? String(trustScore) : trustScore).cmp(p.trustMin) < 0) m.push('score')
  if (litigesEnCours > 0) m.push('litige')
  return m
}
const MOTS: Record<MotifIneligibilite, (p: ParametresPublicite) => string> = { rupture: () => 'stock épuisé', score: (p) => `Trust Score sous ${p.trustMin}`, litige: () => 'litige en cours' }
export function verifierEligibilite(stock: number, trustScore: number | Dec, litigesEnCours: number, p: ParametresPublicite): void {
  const m = motifsIneligibilite(stock, trustScore, litigesEnCours, p)
  if (m.length) throw new AnnonceRefusee('annonce refusée : ' + m.map((x) => MOTS[x](p)).join(', ') + ' (VD-PUB-ELIGIBILITE)')
}

// ── Enchères (clic et semaine) ────────────────────────────────────────────────────────────────────────────

export interface Enchere {
  campagne: string
  montant: number // F par clic, ou F la semaine
  ordre?: number // départage à montant égal : la plus ancienne d'abord
}
export interface Gagnant {
  campagne: string
  enchere: number
  cout: number // ce que paie le vendeur (par clic, ou pour la semaine)
}

function secondPrix(encheres: Enchere[], places: number, plancher: number, pas: number): Gagnant[] {
  for (const e of encheres) montant('enchère', e.montant)
  const valides = encheres.filter((e) => e.montant >= plancher).sort((a, b) => b.montant - a.montant || (a.ordre ?? 0) - (b.ordre ?? 0))
  return valides.slice(0, Math.max(places, 0)).map((e, i) => {
    const suivante = i + 1 < valides.length ? valides[i + 1].montant : null
    const cout = suivante === null ? plancher : Math.max(plancher, suivante + pas)
    return { campagne: e.campagne, enchere: e.montant, cout: Math.min(cout, e.montant) }
  })
}

/** Annonces retenues pour `places` positions ; coût du clic = second prix + 1 F, au moins le plancher, jamais
 *  au-dessus de l'enchère. 60, 40 et 30 F pour 2 places : 41 F et 31 F. */
export const encheresAuClic = (encheres: Enchere[], places: number, p: ParametresPublicite) => secondPrix(encheres, places, p.clicPlancher, p.pasEnchere)

export function verifierEnchereClic(enchere: number, budgetQuotidien: number, p: ParametresPublicite): void {
  montant('enchère', enchere)
  montant('budget', budgetQuotidien)
  if (enchere < p.clicPlancher) throw new AnnonceRefusee(`enchère ${ecrire(enchere)} : au moins ${ecrire(p.clicPlancher)} le clic (VD-PUB-CLIC)`)
  const min = Math.max(p.budgetMin, enchere)
  if (budgetQuotidien < min) throw new AnnonceRefusee(`budget ${ecrire(budgetQuotidien)} : au moins ${ecrire(min)} par jour (VD-PUB-BUDGET)`)
}

/** L'annonce n'est montrée que si le prochain clic peut être payé par le budget du jour et par le solde. */
export const diffusable = (cout: number, depenseDuJour: number, budgetQuotidien: number, solde: number) => depenseDuJour + cout <= budgetQuotidien && cout <= solde

/** Montant facturé pour un clic : 0 F si ce client a déjà cliqué cette annonce aujourd'hui (anti-fraude) ou si le
 *  budget du jour ou le solde ne le couvrent pas (le vendeur ne paie jamais au-delà). */
export function clicFacture(cout: number, dejaFactureAujourdhui: boolean, depenseDuJour: number, budgetQuotidien: number, solde: number): number {
  montant('coût', cout)
  if (dejaFactureAujourdhui || !diffusable(cout, depenseDuJour, budgetQuotidien, solde)) return 0
  return cout
}

// ── Densité ───────────────────────────────────────────────────────────────────────────────────────────────

/** Une offre affichée : `cle` l'identifie (produit d'une boutique), `produit` la fiche commune. */
export interface ResultatAffiche {
  cle: string
  produit: string
  prix: number
  note: Dec
}
export interface Position {
  resultat: ResultatAffiche
  sponsorise: boolean
}

/** Une offre du même produit, moins chère ET mieux notée : l'annonce ne passe jamais au-dessus. */
const ecrase = (a: ResultatAffiche, r: ResultatAffiche) => r.produit === a.produit && r.cle !== a.cle && r.prix < a.prix && r.note.cmp(a.note) > 0

/** Mêle les annonces (rangées par l'enchère) aux résultats : une place toutes les fenêtre ÷ max positions (0, 5,
 *  10… : 2 sur 10), 20 % des positions au plus, jamais au-dessus d'une offre moins chère et mieux notée du même
 *  produit. Une annonce déjà affichée au-dessus de sa place est inutile ; plus bas, sa copie est retirée. */
export function placerAnnonces(resultats: ResultatAffiche[], annonces: ResultatAffiche[], p: ParametresPublicite): Position[] {
  const pas = Math.ceil(p.fenetre / p.maxParFenetre)
  const liste: Position[] = resultats.map((r) => ({ resultat: r, sponsorise: false }))
  let prochaine = 0
  let placees = 0
  for (const a of annonces) {
    const bloquants = liste.map((x, i) => (ecrase(a, x.resultat) ? i : -1)).filter((i) => i >= 0)
    const debut = Math.max(prochaine, bloquants.length ? bloquants[bloquants.length - 1] + 1 : 0)
    const place = Math.ceil(debut / pas) * pas
    if (place > liste.length) continue
    const i = liste.findIndex((x) => x.resultat.cle === a.cle)
    const copie = i >= 0 ? i : null
    if (copie !== null && copie <= place) continue
    const total = liste.length + (copie !== null ? 0 : 1)
    if (p.partMaxPourCent.fois(total).cmp((placees + 1) * CENT) < 0) continue
    if (copie !== null) liste.splice(copie, 1)
    liste.splice(place, 0, { resultat: a, sponsorise: true })
    placees++
    prochaine = place + pas
  }
  return liste
}

// ── À la une et carrousel ─────────────────────────────────────────────────────────────────────────────────

export type EmplacementAccueil = 'a_la_une' | 'carrousel'
export type Mode = 'fixe' | 'enchere'
export const regleEmplacement = (e: EmplacementAccueil, p: ParametresPublicite) => (e === 'a_la_une' ? p.aLaUne : p.carrousel)

/** Places d'une semaine (`places` : celles qui restent, au plus le nombre du registre). Tarif fixe : les premières
 *  demandes, au tarif ; enchère : les plus hautes dès le plancher, chacune paie la meilleure perdante + 1 F. */
export function attribuerEmplacements(e: EmplacementAccueil, mode: Mode, demandes: Enchere[], p: ParametresPublicite, places?: number): Gagnant[] {
  const r = regleEmplacement(e, p)
  const n = places === undefined ? r.places : Math.max(Math.min(places, r.places), 0)
  if (mode === 'fixe')
    return [...demandes]
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      .slice(0, n)
      .map((d) => ({ campagne: d.campagne, enchere: r.tarifSemaine, cout: r.tarifSemaine }))
  return secondPrix(demandes, n, r.enchereMin, p.pasEnchere)
}

// ── Vente flash sur sélection ─────────────────────────────────────────────────────────────────────────────

/** Remise réelle, au moins FLASH-REMISE-MIN (OFR-05) ; rend le pourcentage affiché, à l'unité inférieure. */
export function verifierRemiseFlash(prixNormal: number, prixFlash: number, p: ParametresPublicite): number {
  montant('prix normal', prixNormal, 1)
  montant('prix flash', prixFlash, 1)
  const remise = Dec.de(prixNormal - prixFlash).fois(CENT).sur(prixNormal)
  if (remise.cmp(p.flashRemiseMinPourCent) < 0) throw new AnnonceRefusee(`remise flash de ${remise.texte()} % : au moins ${p.flashRemiseMinPourCent.texte()} % (FLASH-REMISE-MIN)`)
  return Number(remise.n / remise.d)
}

export interface ResultatFlash {
  prixArticles: number
  commissionNormale: number // commission.ts, sans majoration
  majoration: Dec // points × prix des articles, non arrondie
  commission: number // un seul arrondi (DP-55)
  tva: number
  garde: number
  trace: string[]
}

/** Commission d'une sous-commande vendue pendant la vente flash : celle de commission.ts (barème, palier, découverte,
 *  plancher) plus la majoration, non réduite par le palier. ITEL à 18 000 F, Bronze : 2 430 + 540 = 2 970 F.
 *  `baseFlash` : part vendue au prix flash (défaut : tout). Refusée si le vendeur garderait moins de 0 F. */
export function commissionVenteFlash(lignes: LigneVendue[], palier: Palier, decouverte: boolean, pc: ParametresCommission, p: ParametresPublicite, baseFlash?: number): ResultatFlash {
  const r = calculerCommission(lignes, palier, decouverte, pc)
  const base = baseFlash === undefined ? r.prixArticles : baseFlash
  if (typeof base !== 'number' || !Number.isInteger(base) || base < 0 || base > r.prixArticles) throw new VenteInvalide(`part vendue en flash ${String(base)} hors de 0 F … ${ecrire(r.prixArticles)}`)
  const majoration = Dec.de(base).fois(p.flashPoints).sur(CENT)
  const commission = (r.reduite.cmp(r.plancher) >= 0 ? r.reduite : r.plancher).plus(majoration).francs()
  const tva = Dec.de(commission).fois(pc.tvaPourCent).sur(CENT).francs()
  const garde = r.prixArticles - commission - tva
  if (garde < 0) throw new OffreRefusee(`vente flash : le vendeur garderait ${ecrire(garde)} (DP-55, DP-59)`)
  const trace = [...r.trace, `Vente flash : + ${p.flashPoints.texte()} points × ${ecrire(base)} ⇒ commission ${ecrire(commission)} (VD-PUB-FLASH-MAJORATION)`]
  return { prixArticles: r.prixArticles, commissionNormale: r.commission, majoration, commission, tva, garde, trace }
}

// ── Boost ─────────────────────────────────────────────────────────────────────────────────────────────────

export type DureeBoost = '24h' | '7j'
export const HEURES_BOOST: Record<DureeBoost, number> = { '24h': 24, '7j': 168 }
export const prixBoost = (d: DureeBoost, p: ParametresPublicite) => (d === '24h' ? p.boost24h : p.boost7j)

/** Score de pertinence × le multiplicateur plafonné pendant un Boost : il remonte, sans écraser le mérite. */
export const scoreClassement = (score: Dec | number, booste: boolean, p: ParametresPublicite) => Dec.de(score).fois(booste ? p.boostPlafond : 1)

/** (clé, score, boosté) → clés rangées par score de classement décroissant, ordre d'origine à égalité. */
export function classer(elements: [string, Dec | number, boolean][], p: ParametresPublicite): string[] {
  return elements
    .map((e, i) => ({ c: e[0], s: scoreClassement(e[1], e[2], p), i }))
    .sort((a, b) => b.s.cmp(a.s) || a.i - b.i)
    .map((x) => x.c)
}

/** Part du forfait (Boost, emplacement) rendue au solde pour les heures non diffusées, au franc inférieur. */
export function remboursementNonDiffuse(prix: number, heuresPrevues: number, heuresDiffusees: number): number {
  montant('prix', prix)
  if (heuresPrevues <= 0 || !(heuresDiffusees >= 0 && heuresDiffusees <= heuresPrevues)) throw new AnnonceRefusee('heures diffusées hors de 0 … heures prévues')
  return inferieur(Dec.de(prix).fois(heuresPrevues - heuresDiffusees).sur(heuresPrevues))
}

// ── Solde publicitaire ────────────────────────────────────────────────────────────────────────────────────

/** Recharge Mobile Money confirmée : au moins la recharge minimale. */
export function recharger(solde: number, m: number, p: ParametresPublicite): number {
  montant('solde', solde)
  montant('recharge', m)
  if (m < p.rechargeMin) throw new AnnonceRefusee(`recharge ${ecrire(m)} : au moins ${ecrire(p.rechargeMin)} (VD-PUB-SOLDE)`)
  return solde + m
}

/** Débit d'un clic, d'un emplacement ou d'un Boost : jamais au-delà du solde (rien n'est pris sur les versements). */
export function debiter(solde: number, m: number): number {
  montant('solde', solde)
  montant('débit', m)
  if (m > solde) throw new AnnonceRefusee(`solde publicitaire ${ecrire(solde)} : ${ecrire(m)} demandés, rechargez (VD-PUB-SOLDE)`)
  return solde - m
}

// ── Facture ───────────────────────────────────────────────────────────────────────────────────────────────

export interface LigneFacture {
  libelle: string
  quantite: number
  prixUnitaire: number
}
export interface FacturePublicitaire {
  lignes: LigneFacture[]
  horsTaxe: number
  tva: number
  total: number
}
/** Facture d'une période : clics facturés, emplacements, Boost, moins les heures rendues (lignes négatives). */
export function facturePublicitaire(lignes: LigneFacture[], tvaPourCent: Dec): FacturePublicitaire {
  for (const l of lignes) {
    if (typeof l.quantite !== 'number' || !Number.isInteger(l.quantite) || l.quantite < 0) throw new VenteInvalide(`quantité invalide ${String(l.quantite)}`)
    if (typeof l.prixUnitaire !== 'number' || !Number.isInteger(l.prixUnitaire)) throw new VenteInvalide(`prix invalide ${String(l.prixUnitaire)}`)
  }
  const ht = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
  if (ht < 0) throw new VenteInvalide('facture négative')
  const tva = Dec.de(ht).fois(tvaPourCent).sur(CENT).francs()
  return { lignes, horsTaxe: ht, tva, total: ht + tva }
}

// ── Lectures pour l'écran (aucune règle nouvelle) ─────────────────────────────────────────────────────────

export const coutParVente = (depense: number, ventes: number): number | null => (ventes > 0 ? Dec.de(depense).sur(ventes).francs() : null)
/** Taux de clic en pour mille (affiché « 3,2 % ») : entier, sans virgule flottante. */
export const tauxDeClicPourMille = (clics: number, impressions: number): number => (impressions > 0 ? Dec.de(clics).fois(1000).sur(impressions).francs() : 0)
