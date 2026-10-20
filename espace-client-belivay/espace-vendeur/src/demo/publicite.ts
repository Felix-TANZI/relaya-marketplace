// DONNÉES DE DÉMONSTRATION — domaine « publicite » (DP-59). Le « serveur » de la démonstration : solde prépayé tenu
// comme un registre de mouvements (recharges, dépenses, remboursements), campagnes du jeu d'essai (trois sponsorisées,
// trois « À la une » / carrousel, trois Boost, trois ventes flash sur sélection), produits des offres de la boutique
// avec leur seuil de qualité (stock, Trust Score, litiges en cours, lus dans les autres domaines).
// Règles : src/calculs/publicite.ts (portage de publicite.py) — second prix + 1 F, clic facturé une fois par client
// et par jour dans le budget et le solde, placement (2 sur 10, jamais au-dessus d'une offre moins chère et mieux
// notée), places de la semaine, commission flash majorée, heures non diffusées rendues au franc inférieur.
// Données (pas des règles) : enchères des autres vendeurs, places déjà vendues, compteurs (vues, clics, ventes),
// intérêt de la fiche pour les estimations. Une campagne dont le produit perd l'éligibilité (rupture, litige) est
// suspendue d'office et ses heures non diffusées reviennent au solde. Réservé au propriétaire (argent.voir).
// À la une / carrousel à l'enchère hebdomadaire : déposée pour la semaine suivante, attribuée au début de la semaine
// par attribuerEmplacements (meilleure enchère perdante + 1 F, débitée alors ; perdue : rien n'est pris).
// Vente flash sur sélection : BelivaY répond 24 h avant le créneau ; acceptée, elle rejoint les ventes flash de
// Promotions (src/demo/ventes-flash.ts, origine « selection », une seule notion) et change le prix payé par le client.
import type { Campagne, DemandeCampagne, DomainePublicite, Emplacement, Estimation, EtatCampagne, ModeEmplacement, MouvementPub, ProduitAnnoncable, RaisonInelegible, Recharge, RefusCampagne, ReglesPub, StatsPub } from '../donnees/domaines/publicite'
import { PRODUIT_DE } from '../donnees/domaines/publicite'
import { ReserveAuProprietaire } from '../donnees/communs'
import { Dec } from '../calculs/argent'
import { decouverteActive, familleDe } from '../calculs/commission'
import { OffreRefusee } from '../calculs/erreurs'
import {
  AnnonceRefusee, attribuerEmplacements, classer, clicFacture, commissionVenteFlash, coutParVente, debiter, encheresAuClic, HEURES_BOOST, motifsIneligibilite,
  PARAMETRES_PUBLICITE, placerAnnonces, prixBoost, recharger, remboursementNonDiffuse, verifierEnchereClic, verifierRemiseFlash, type ResultatAffiche,
} from '../calculs/publicite'
import { PARAMETRES } from '../calculs/registre'
import { debutDuJour, HEURE, JOUR, jourDe, jourSemaine, yaounde } from '../calculs/temps'
import { commandesComptees } from './commandes'
import { maintenant } from './horloge'
import { BOUTIQUE } from './jeu-essai'
import { litigesEnCours } from './litiges'
import { etatOffres, ficheDe, gardeOuNull, vue } from './produits'
import { aLeDroit } from './session'
import { magasin, repondre } from './stockage'
import { ajouterPromo, etatPromos } from './ventes-flash'

const P = PARAMETRES_PUBLICITE
const SANS_LIMITE = Number.MAX_SAFE_INTEGER

function proprietaire(quoi: string) {
  if (!aLeDroit('argent.voir')) throw new ReserveAuProprietaire(quoi)
}

const regles = (): ReglesPub => ({
  scoreMin: P.trustMin,
  clicPlancher: P.clicPlancher,
  budgetJourMin: P.budgetMin,
  densiteMaxPourCent: P.partMaxPourCent.francs(),
  annoncesMax: P.maxParFenetre,
  fenetre: P.fenetre,
  uneSemaine: P.aLaUne.tarifSemaine,
  unePlaces: P.aLaUne.places,
  uneEnchereMin: P.aLaUne.enchereMin,
  carrouselSemaine: P.carrousel.tarifSemaine,
  carrouselPlaces: P.carrousel.places,
  carrouselEnchereMin: P.carrousel.enchereMin,
  flashMajorationPoints: Number(P.flashPoints.texte()),
  flashRemiseMin: Number(P.flashRemiseMinPourCent.texte()),
  boost24h: P.boost24h,
  boost7j: P.boost7j,
  boostPlafond: P.boostPlafond.texte().replace('.', ','),
  rechargeMin: P.rechargeMin,
  numero: { operateur: BOUTIQUE.numeroVersement.operateur, masque: BOUTIQUE.numeroVersement.masque },
})

// ── Données du marché (démonstration) ─────────────────────────────────────────────────────────────────────

const NOTES: Record<string, string> = { 'itel-noir': '4.5', 'itel-bleu': '4.5', iphone: '4.7' }
const noteDe = (id: string) => NOTES[id] ?? '4.2'
/** Enchères des autres vendeurs sur le même emplacement (F par clic). */
const AUTRES_ENCHERES: Partial<Record<Emplacement, number[]>> = { recherche: [35, 22], categories: [30, 26, 25] }
/** Places de la semaine déjà vendues à d'autres boutiques. */
const PLACES_VENDUES: Partial<Record<Emplacement, number>> = { une: 2, carrousel: 2 }
/** Enchères hebdomadaires des autres boutiques sur les places qui restent (F la semaine). */
const AUTRES_ENCHERES_SEMAINE: Partial<Record<Emplacement, number[]>> = { une: [13500, 11000, 10000], carrousel: [22000] }
const accueilDe = (e: Emplacement) => (e === 'carrousel' ? 'carrousel' : 'a_la_une') as 'a_la_une' | 'carrousel'
const regleDe = (e: Emplacement) => (e === 'carrousel' ? P.carrousel : P.aLaUne)
/** Lundi 00 h (Yaoundé) de la semaine suivante : l'enchère se dépose avant le début de la semaine. */
export function lundiSuivant(t = maintenant()): number {
  const j = jourDe(t)
  return debutDuJour(j) + (7 - jourSemaine(j)) * JOUR
}

const forfaitDe = (e: Emplacement, semaines: number) => (e === 'une' ? P.aLaUne.tarifSemaine * semaines : e === 'carrousel' ? P.carrousel.tarifSemaine * semaines : e === 'boost_24h' ? prixBoost('24h', P) : e === 'boost_7j' ? prixBoost('7j', P) : 0)
const heuresDe = (e: Emplacement, semaines: number) => (e === 'boost_24h' ? HEURES_BOOST['24h'] : e === 'boost_7j' ? HEURES_BOOST['7j'] : 7 * 24 * semaines)

/** Coût du clic au second prix, sur les places d'annonce d'une page (2 sur 10) ; null : l'annonce n'y entre pas. */
function coutClic(e: Emplacement, enchere: number): number | null {
  const autres = (AUTRES_ENCHERES[e] ?? []).map((m, i) => ({ campagne: `autre-${i}`, montant: m, ordre: i + 1 }))
  return encheresAuClic([{ campagne: 'nous', montant: enchere, ordre: 0 }, ...autres], P.maxParFenetre, P).find((g) => g.campagne === 'nous')?.cout ?? null
}
/** Dépense d'une journée : chaque clic réel passe par clicFacture (doublons à 0 F, budget du jour, solde). */
function depenseDuJour(clics: number, doublons: number, cout: number | null, budget: number, solde = SANS_LIMITE): { depense: number; factures: number } {
  if (cout === null) return { depense: 0, factures: 0 }
  let depense = 0
  let factures = 0
  for (let i = 0; i < clics + doublons; i++) {
    const m = clicFacture(cout, i >= clics, depense, budget, solde - depense)
    depense += m
    if (m > 0) factures++
  }
  return { depense, factures }
}

/** Palier et offre de découverte du jour (comme « Vous gardez » des produits). */
function contexteCommission() {
  const pc = PARAMETRES.commission
  return { pc, palier: BOUTIQUE.palier, decouverte: decouverteActive(BOUTIQUE.premiereCommandePayee, jourDe(maintenant()), commandesComptees(), pc) }
}
type Flash = { prixPromo: number; remiseAffichee: number; commissionNormale: number; majoration: number; commission: number; gardeAvant: number; gardeFlash: number; refus: 'remise_min' | 'garde_negatif' | null }
function flashDe(prix: number, remisePourCent: number, categorie: string): Flash {
  const prixPromo = Math.max(1, Math.floor((prix * (100 - Math.max(0, Math.min(99, remisePourCent)))) / 100))
  const gardeAvant = gardeOuNull(prix, categorie, false) ?? 0
  const vide: Flash = { prixPromo, remiseAffichee: remisePourCent, commissionNormale: 0, majoration: 0, commission: 0, gardeAvant, gardeFlash: 0, refus: null }
  let remiseAffichee: number
  try {
    remiseAffichee = verifierRemiseFlash(prix, prixPromo, P)
  } catch (e) {
    if (e instanceof AnnonceRefusee) return { ...vide, refus: 'remise_min' }
    throw e
  }
  const { pc, palier, decouverte } = contexteCommission()
  try {
    const f = commissionVenteFlash([{ famille: familleDe(categorie, pc), prixUnitaire: prixPromo }], palier, decouverte, pc, P)
    return { prixPromo, remiseAffichee, commissionNormale: f.commissionNormale, majoration: f.commission - f.commissionNormale, commission: f.commission, gardeAvant, gardeFlash: f.garde, refus: null }
  } catch (e) {
    if (e instanceof OffreRefusee) return { ...vide, remiseAffichee, refus: 'garde_negatif' }
    throw e
  }
}

// ── Magasin ───────────────────────────────────────────────────────────────────────────────────────────────

interface Jour {
  impressions: number
  clics: number
  doublons: number // clics répétés du même client le même jour : 0 F
  ventes: number
}
interface CampagneEtat {
  id: string
  emplacement: Emplacement
  offreId: string
  debut: number
  fin: number | null
  enchere: number | null
  budgetJour: number | null
  mode: ModeEmplacement | null // À la une / carrousel
  semaines: number | null
  forfait: number | null
  remisePourCent: number | null
  prixAuDepot: number // prix de l'offre à la création (vente flash : prix de référence)
  jours: Jour[] // sponsorisé : un par jour écoulé, le dernier = aujourd'hui
  stats: { impressions: number; clics: number; ventes: number } // forfaits et flash
  pauseA: number | null
  arreteeA: number | null
  heuresCoupees: number // heures non diffusées déjà constatées (suspension d'office terminée)
  rembourse: number
  motif: string | null
  decision: 'acceptee' | 'refusee' | null // vente flash : réponse de BelivaY ; enchère hebdomadaire : attribution
  promoId: string | null // vente flash acceptée : sa vente flash dans Promotions (ventes-flash.ts)
}
interface Etat {
  campagnes: CampagneEtat[]
  mouvements: MouvementPub[]
  recharges: Record<string, Recharge>
  n: number
  factures: number
}

const T = (j: number, h = 0, m = 0) => yaounde(2026, 9, j, h, m)
const jr = (impressions: number, clics: number, ventes = 0, doublons = 0): Jour => ({ impressions, clics, ventes, doublons })
const sp = (o: Partial<CampagneEtat> & Pick<CampagneEtat, 'id' | 'emplacement' | 'offreId' | 'debut' | 'prixAuDepot'>): CampagneEtat => ({
  fin: null, enchere: null, budgetJour: null, mode: null, semaines: null, forfait: null, remisePourCent: null, jours: [], stats: { impressions: 0, clics: 0, ventes: 0 }, pauseA: null, arreteeA: null, heuresCoupees: 0, rembourse: 0, motif: null, decision: null, promoId: null, ...o,
})
const coupees = (prix: number, prevues: number, h: number) => remboursementNonDiffuse(prix, prevues, prevues - h)

function initial(): Etat {
  const une = P.aLaUne.tarifSemaine
  const c: CampagneEtat[] = [
    // Sponsorisé au clic (coût au second prix, budget du jour)
    sp({ id: 'cp-1', emplacement: 'recherche', offreId: 'itel-noir', debut: T(14, 8), enchere: 40, budgetJour: 1000, prixAuDepot: 20000, jours: [jr(610, 18, 1, 2), jr(700, 22, 1), jr(980, 31, 1, 3), jr(760, 25), jr(590, 19, 1, 1), jr(820, 27, 1), jr(930, 30, 1, 2), jr(260, 9)] }),
    sp({ id: 'cp-2', emplacement: 'categories', offreId: 'iphone', debut: T(10, 8), enchere: 120, budgetJour: 3000, prixAuDepot: 345000, jours: [jr(300, 12), jr(380, 15, 1), jr(240, 9), jr(290, 11, 0, 1), jr(350, 14), jr(310, 12), jr(400, 16, 1), jr(270, 10), jr(330, 13)], pauseA: T(18, 21, 30) }),
    sp({ id: 'cp-3', emplacement: 'categories', offreId: 'itel-noir', debut: T(1, 8), fin: T(8, 8), enchere: 30, budgetJour: 600, prixAuDepot: 20000, jours: [jr(500, 21, 1), jr(450, 17), jr(520, 20, 1, 2), jr(480, 19), jr(610, 24, 1), jr(400, 15), jr(430, 18)] }),
    // À la une / carrousel (payés à la confirmation, au tarif fixe de la semaine)
    sp({ id: 'cp-4', emplacement: 'carrousel', offreId: 'itel-noir', mode: 'fixe', debut: T(28, 0), fin: T(28, 0) + 7 * JOUR, semaines: 1, forfait: P.carrousel.tarifSemaine, prixAuDepot: 20000 }),
    sp({ id: 'cp-5', emplacement: 'une', offreId: 'iphone', mode: 'fixe', debut: T(17, 0), fin: T(24, 0), semaines: 1, forfait: une, prixAuDepot: 345000, stats: { impressions: 5200, clics: 140, ventes: 1 } }),
    sp({ id: 'cp-6', emplacement: 'une', offreId: 'itel-noir', mode: 'fixe', debut: yaounde(2026, 8, 31, 0), fin: T(7, 0), semaines: 1, forfait: une, prixAuDepot: 20000, stats: { impressions: 8400, clics: 260, ventes: 4 }, heuresCoupees: 6, rembourse: coupees(une, 168, 6), motif: 'stock' }),
    // Boost
    sp({ id: 'cp-7', emplacement: 'boost_24h', offreId: 'itel-noir', debut: T(21, 8), fin: T(22, 8), forfait: prixBoost('24h', P), prixAuDepot: 20000, stats: { impressions: 420, clics: 15, ventes: 0 } }),
    sp({ id: 'cp-8', emplacement: 'boost_7j', offreId: 'iphone', debut: T(1, 9), fin: T(8, 9), forfait: prixBoost('7j', P), prixAuDepot: 345000, stats: { impressions: 2900, clics: 88, ventes: 1 }, heuresCoupees: 30, rembourse: coupees(prixBoost('7j', P), 168, 30), motif: 'litige' }),
    sp({ id: 'cp-9', emplacement: 'boost_24h', offreId: 'itel-noir', debut: T(10, 7), fin: T(11, 7), forfait: prixBoost('24h', P), prixAuDepot: 20000, stats: { impressions: 510, clics: 19, ventes: 1 } }),
    // Ventes flash sur sélection BelivaY (rien sur le solde : commission majorée sur les ventes)
    sp({ id: 'cp-10', emplacement: 'flash', offreId: 'itel-noir', debut: T(26, 8), fin: T(27, 8), remisePourCent: 15, prixAuDepot: 20000 }),
    sp({ id: 'cp-11', emplacement: 'flash', offreId: 'itel-noir', debut: T(19, 8), fin: T(20, 8), remisePourCent: 12, prixAuDepot: 20000, decision: 'acceptee', promoId: 'pr-5', stats: { impressions: 4300, clics: 210, ventes: 3 } }),
    sp({ id: 'cp-12', emplacement: 'flash', offreId: 'iphone', debut: T(12, 8), fin: T(13, 8), remisePourCent: 10, prixAuDepot: 345000, decision: 'acceptee', promoId: 'pr-6', stats: { impressions: 3100, clics: 120, ventes: 2 } }),
  ]
  const mvt = (id: string, le: number, type: MouvementPub['type'], montant: number, libelle: string, facture: string): MouvementPub => ({ id, le, type, montant, libelle, facture })
  // Clics des jours clos (débités chaque soir ; regroupés ici par campagne).
  const clicsPasses = (x: CampagneEtat) => {
    const cout = coutClic(x.emplacement, x.enchere!)
    return x.jours.slice(0, x.fin && x.fin <= T(21, 9) ? undefined : -1).reduce((s, j) => s + depenseDuJour(j.clics, j.doublons, cout, x.budgetJour!).depense, 0)
  }
  const mouvements: MouvementPub[] = [
    mvt('m-1', T(1, 7, 40), 'recharge', 25000, 'Recharge Mobile Money', 'FP-2026-0031'),
    mvt('m-2', yaounde(2026, 8, 31, 0), 'depense', -une, 'À la une · ITEL AC52 noir · 1 semaine', 'FP-2026-0032'),
    mvt('m-3', T(1, 9), 'depense', -prixBoost('7j', P), 'Boost 7 jours · iPhone 15 Pro Max', 'FP-2026-0033'),
    mvt('m-4', T(7, 0, 5), 'remboursement', c[5].rembourse, '6 h non diffusées (stock épuisé) · À la une', 'FP-2026-0034'),
    mvt('m-5', T(8, 9, 5), 'remboursement', c[7].rembourse, '30 h non diffusées (litige en cours) · Boost 7 jours', 'FP-2026-0035'),
    mvt('m-6', T(8, 9, 10), 'depense', -clicsPasses(c[2]), 'Clics sponsorisés · catégories · 1–7 sept.', 'FP-2026-0036'),
    mvt('m-7', T(10, 7), 'depense', -prixBoost('24h', P), 'Boost 24 h · ITEL AC52 noir', 'FP-2026-0037'),
    mvt('m-8', T(14, 7, 30), 'recharge', 75000, 'Recharge Mobile Money', 'FP-2026-0038'),
    mvt('m-9', T(17, 0), 'depense', -une, 'À la une · iPhone 15 Pro Max · 1 semaine', 'FP-2026-0039'),
    mvt('m-10', T(20, 23, 59), 'depense', -clicsPasses(c[1]), 'Clics sponsorisés · catégories · iPhone · 10–18 sept.', 'FP-2026-0040'),
    mvt('m-11', T(20, 23, 59), 'depense', -clicsPasses(c[0]), 'Clics sponsorisés · recherche · ITEL · 14–20 sept.', 'FP-2026-0041'),
    mvt('m-12', T(21, 8), 'depense', -prixBoost('24h', P), 'Boost 24 h · ITEL AC52 noir', 'FP-2026-0042'),
    mvt('m-13', T(21, 8, 30), 'depense', -P.carrousel.tarifSemaine, 'Carrousel de l’accueil · ITEL AC52 noir · 1 semaine', 'FP-2026-0043'),
  ]
  return { campagnes: c, mouvements, recharges: {}, n: 13, factures: 43 }
}

const etat = magasin<Etat>('publicite', initial)

// ── Vues ──────────────────────────────────────────────────────────────────────────────────────────────────

function produitsAnnoncables(): ProduitAnnoncable[] {
  const litiges = litigesEnCours()
  return etatOffres
    .lire()
    .offres.filter((o) => o.etat !== 'brouillon')
    .map((o) => {
      const v = vue(o)
      const nLitiges = litiges.filter((l) => l.article.offreId === o.id).length
      const raisons: RaisonInelegible[] = [...(o.etat === 'en_vente' ? [] : ['pas_en_vente' as const]), ...motifsIneligibilite(o.stock, Dec.de(String(BOUTIQUE.trustScore)), nLitiges, P)]
      return { offreId: o.id, titre: v.titre, variante: v.variante, dessin: v.dessin, rayon: v.rayon, prix: o.prix ?? 0, stock: o.stock, trustScore: BOUTIQUE.trustScore, litiges: nLitiges, note: Number(noteDe(o.id)), raisons }
    })
}
const raisonsDe = (offreId: string, l = produitsAnnoncables()): RaisonInelegible[] => l.find((p) => p.offreId === offreId)?.raisons ?? ['pas_en_vente']
const debutSuspension = (offreId: string) => {
  const t = litigesEnCours().filter((l) => l.article.offreId === offreId).map((l) => l.ouvertA)
  return t.length ? Math.min(...t) : maintenant()
}
const categorieDe = (offreId: string) => {
  const o = etatOffres.lire().offres.find((y) => y.id === offreId)
  return ficheDe(o?.ficheId ?? null)?.categorie ?? o?.demande?.categorie ?? 'Électronique'
}

/** Vente flash acceptée : sa vente flash de Promotions (arrêtée là, elle s'arrête ici aussi). */
const promoDe = (x: CampagneEtat) => (x.promoId ? (etatPromos.lire().promos.find((p) => p.id === x.promoId) ?? null) : null)
/** Fin réelle : arrêt de la campagne, arrêt de sa vente flash dans Promotions, sinon la fin prévue. */
const finDe = (x: CampagneEtat) => x.arreteeA ?? promoDe(x)?.arreteeA ?? x.fin

function etatDe(x: CampagneEtat, raisons: RaisonInelegible[]): EtatCampagne {
  const t = maintenant()
  const fin = finDe(x)
  if (x.emplacement === 'flash') {
    if (x.decision === 'refusee') return 'refusee'
    if (x.arreteeA || (fin && fin <= t)) return 'terminee'
    if (!x.decision) return 'candidature'
    return x.debut <= t ? 'en_cours' : 'programmee'
  }
  if (x.mode === 'enchere' && x.decision !== 'acceptee') return x.decision === 'refusee' ? 'refusee' : x.arreteeA ? 'terminee' : 'candidature'
  if (x.arreteeA || (x.fin && x.fin <= t)) return 'terminee'
  if (x.debut > t) return 'programmee'
  if (x.pauseA || raisons.length) return 'en_pause'
  return 'en_cours'
}

/** Heures diffusées d'un forfait : du début à maintenant (ou la fin, l'arrêt, la suspension), moins les heures coupées. */
function heuresDiffusees(x: CampagneEtat, e: EtatCampagne): number {
  const prevues = heuresDe(x.emplacement, x.semaines ?? 1)
  const t = maintenant()
  if (x.debut > t) return 0
  const bout = Math.min(x.arreteeA ?? Infinity, x.fin ?? Infinity, e === 'en_pause' ? debutSuspension(x.offreId) : Infinity, t)
  return Math.max(0, Math.min(prevues, Math.floor((bout - x.debut) / HEURE)) - x.heuresCoupees)
}

function vueCampagne(x: CampagneEtat, l: ProduitAnnoncable[]): Campagne {
  const p = l.find((o) => o.offreId === x.offreId)
  const raisons = raisonsDe(x.offreId, l)
  const e = etatDe(x, raisons)
  const prix = p?.prix ?? x.prixAuDepot
  let stats: StatsPub = { ...x.stats, clicsNonFactures: 0, depense: 0, rembourse: x.rembourse }
  let depenseJour: number | null = null
  let cout: number | null = null
  let heures: number | null = null
  let fl: Pick<Campagne, 'prixPromo' | 'gardeFlash' | 'gardeAvant'> = { prixPromo: null, gardeFlash: null, gardeAvant: null }
  if (PRODUIT_DE[x.emplacement] === 'sponsorise') {
    cout = coutClic(x.emplacement, x.enchere!)
    const jours = x.jours.map((j) => depenseDuJour(j.clics, j.doublons, cout, x.budgetJour!))
    const clics = x.jours.reduce((s, j) => s + j.clics + j.doublons, 0)
    stats = {
      impressions: x.jours.reduce((s, j) => s + j.impressions, 0),
      clics,
      clicsNonFactures: clics - jours.reduce((s, j) => s + j.factures, 0),
      ventes: x.jours.reduce((s, j) => s + j.ventes, 0),
      depense: jours.reduce((s, j) => s + j.depense, 0),
      rembourse: 0,
    }
    depenseJour = e === 'terminee' ? null : (jours.at(-1)?.depense ?? 0)
  } else if (x.emplacement === 'flash') {
    const f = flashDe(x.prixAuDepot, x.remisePourCent ?? 0, categorieDe(x.offreId))
    fl = { prixPromo: f.prixPromo, gardeAvant: f.gardeAvant, gardeFlash: f.gardeFlash }
    stats.depense = f.majoration * x.stats.ventes // la majoration, prise sur les ventes faites pendant la vente
  } else {
    heures = heuresDiffusees(x, e)
    const prevues = heuresDe(x.emplacement, x.semaines ?? 1)
    stats.depense = (x.forfait ?? 0) - x.rembourse
    // Suspendue d'office : ce qui n'aura pas été diffusé est rendu au solde.
    if (e === 'en_pause' && x.forfait) stats.rembourse = remboursementNonDiffuse(x.forfait, prevues, heures)
  }
  const motif = x.motif ?? (e === 'en_pause' && !x.pauseA ? (raisons[0] ?? null) : null)
  return {
    id: x.id, emplacement: x.emplacement, offreId: x.offreId, titre: p?.titre ?? x.offreId, variante: p?.variante ?? '', dessin: p?.dessin ?? 'itel', prix, etat: e,
    debut: x.debut, fin: finDe(x), enchere: x.enchere, mode: x.mode, budgetJour: x.budgetJour, depenseJour, coutClic: cout, semaines: x.semaines, forfait: x.forfait,
    heuresPrevues: x.forfait !== null ? heuresDe(x.emplacement, x.semaines ?? 1) : null, heuresDiffusees: heures, remisePourCent: x.remisePourCent, ...fl, stats, motif,
  }
}

const soldeBrut = (e: Etat) => e.mouvements.reduce((s, m) => s + m.montant, 0)
/** Nos places au tarif fixe sur la semaine qui commence à `debut`. */
const nosPlacesFixes = (e: Etat, em: Emplacement, debut: number) => e.campagnes.filter((x) => x.emplacement === em && x.mode !== 'enchere' && !x.arreteeA && x.fin && x.fin > debut && x.debut < debut + 7 * JOUR).length

/** Réponses dues (démonstration ; côté serveur : console et tâche du dimanche). Vente flash : 24 h avant le créneau,
 *  acceptée si le produit reste éligible et la remise valable ; elle rejoint alors les ventes flash de Promotions.
 *  Enchère hebdomadaire : au début de la semaine, attribuerEmplacements sur les places qui restent avec les enchères
 *  des autres boutiques ; gagnée, la meilleure enchère perdante + 1 F est débitée ; perdue, rien n'est pris. */
function decider() {
  const t = maintenant()
  const dues = etat.lire().campagnes.filter((x) => !x.decision && !x.arreteeA && ((x.emplacement === 'flash' && x.debut - 24 * HEURE <= t) || (x.mode === 'enchere' && x.debut <= t)))
  if (!dues.length) return
  const l = produitsAnnoncables()
  etat.ecrire((e) => {
    for (const d of dues) {
      const x = e.campagnes.find((y) => y.id === d.id)!
      const raisons = raisonsDe(x.offreId, l)
      if (x.emplacement === 'flash') {
        const f = flashDe(x.prixAuDepot, x.remisePourCent ?? 0, categorieDe(x.offreId))
        if (raisons.length || f.refus) {
          x.decision = 'refusee'
          x.motif = raisons[0] ?? f.refus
          continue
        }
        x.decision = 'acceptee'
        x.promoId = ajouterPromo({ offreId: x.offreId, origine: 'selection', type: 'pourcent', valeur: x.remisePourCent ?? 0, prixReference: x.prixAuDepot, prixPromo: f.prixPromo, debut: x.debut, fin: x.fin ?? x.debut + 24 * HEURE, relue: false })
        continue
      }
      const autres = (AUTRES_ENCHERES_SEMAINE[x.emplacement] ?? []).map((m, i) => ({ campagne: `autre-${i}`, montant: m, ordre: i + 1 }))
      const places = regleDe(x.emplacement).places - (PLACES_VENDUES[x.emplacement] ?? 0) - nosPlacesFixes(e, x.emplacement, x.debut)
      const g = raisons.length ? undefined : attribuerEmplacements(accueilDe(x.emplacement), 'enchere', [{ campagne: x.id, montant: x.enchere ?? 0, ordre: 0 }, ...autres], P, places).find((y) => y.campagne === x.id)
      if (!g || soldeBrut(e) < g.cout) {
        x.decision = 'refusee'
        x.motif = raisons[0] ?? (g ? 'solde' : 'enchere_depassee')
        continue
      }
      x.decision = 'acceptee'
      x.forfait = g.cout
      const p = l.find((o) => o.offreId === x.offreId)
      e.mouvements.push({ id: 'm-' + x.id, le: x.debut, type: 'depense', montant: -g.cout, libelle: `${LIBELLE[x.emplacement]} · ${p?.titre ?? x.offreId} · enchère de la semaine`, facture: facture(e) })
    }
  })
}

function toutes(): Campagne[] {
  decider()
  const l = produitsAnnoncables()
  return etat.lire().campagnes.map((x) => vueCampagne(x, l)).sort((a, b) => b.debut - a.debut)
}
/** Solde disponible : les clics du jour en cours, débités le soir, sont déjà réservés. */
const solde = (c = toutes()) => soldeBrut(etat.lire()) - c.reduce((s, x) => s + (x.depenseJour ?? 0), 0)

function facture(e: Etat) {
  e.factures++
  return `FP-2026-${String(e.factures).padStart(4, '0')}`
}
const LIBELLE: Record<Emplacement, string> = { recherche: 'Sponsorisé · recherche', categories: 'Sponsorisé · catégories', une: 'À la une', carrousel: 'Carrousel de l’accueil', boost_24h: 'Boost 24 h', boost_7j: 'Boost 7 jours', flash: 'Vente flash sur sélection' }

/** Prochaines ventes flash sur sélection : BelivaY choisit le créneau (le samedi, 08 h, pour 24 h) ; une candidature
 *  se dépose au moins 24 h avant (relecture). Les deux prochains samedis possibles. */
export function selectionsFlash(): number[] {
  const t = maintenant()
  const out: number[] = []
  for (let j = 1; out.length < 2 && j < 30; j++) {
    const jour = jourDe(t + j * JOUR)
    const [a, m, d] = jour.split('-').map(Number)
    const debut = yaounde(a, m, d, 8)
    if (jourSemaine(jour) === 5 && debut - t >= 24 * HEURE) out.push(debut)
  }
  return out
}

// ── Estimation (même calcul que la confirmation) ──────────────────────────────────────────────────────────

/** Liste vue par le client : les autres offres de la fiche (anonymes) et des produits voisins ; l'annonce placée par
 *  placerAnnonces (Boost : remontée par classer). */
function apercu(d: DemandeCampagne, prixVu: number): Estimation['apercu'] {
  const o = etatOffres.lire().offres.find((y) => y.id === d.offreId)
  const f = ficheDe(o?.ficheId ?? null)
  const fiche = f?.id ?? d.offreId
  const memes: ResultatAffiche[] = (f?.marche.offres ?? []).map((prix, i) => ({ cle: `m${i}`, produit: fiche, prix, note: Dec.de(['4.6', '4.3', '4.1'][i % 3]) }))
  const voisins: ResultatAffiche[] = Array.from({ length: 10 - memes.length }, (_, i) => ({ cle: `v${i}`, produit: `voisin-${i}`, prix: Math.round((prixVu * (80 + i * 7)) / 10000) * 100, note: Dec.de(['4.4', '4.0', '4.2', '3.9', '4.5', '4.1', '3.8'][i % 7]) }))
  const organiques = [...memes, ...voisins]
  const nous: ResultatAffiche = { cle: 'nous', produit: fiche, prix: prixVu, note: Dec.de(noteDe(d.offreId)) }
  let pos: { r: ResultatAffiche; sponsorise: boolean }[]
  if (PRODUIT_DE[d.emplacement] === 'boost') {
    // Score de pertinence (démonstration) décroissant dans la liste ; la nôtre, × le plafond du Boost.
    const tous = [...organiques, nous]
    const scores: [string, number, boolean][] = tous.map((r, i) => [r.cle, r.cle === 'nous' ? 12 : 20 - i, r.cle === 'nous'])
    pos = classer(scores, P).map((cle) => ({ r: tous.find((x) => x.cle === cle)!, sponsorise: cle === 'nous' }))
  } else pos = placerAnnonces(organiques, [nous], P).map((x) => ({ r: x.resultat, sponsorise: x.sponsorise }))
  return pos.slice(0, 8).map((x) => ({ nous: x.r.cle === 'nous', sponsorise: x.sponsorise, prix: x.r.prix, note: Number(x.r.note.texte()), memeProduit: x.r.produit === fiche }))
}

function estimer(d: DemandeCampagne): Estimation {
  const l = produitsAnnoncables()
  const p = l.find((x) => x.offreId === d.offreId)
  const c = toutes()
  const s = solde(c)
  const base: Estimation = { refus: null, aPayer: 0, plafondJour: null, clicsJourMax: null, impressionsEstimees: [0, 0], clicsEstimes: [0, 0], flash: null, solde: s, coutClic: null, placesRestantes: null, enchereMax: null, apercu: [] }
  if (!p) return { ...base, refus: 'pas_en_vente' }
  const prod = PRODUIT_DE[d.emplacement]
  const o = etatOffres.lire().offres.find((y) => y.id === d.offreId)
  const interet = ficheDe(o?.ficheId ?? null)?.marche.clientsSemaine ?? 100 // intérêt de la fiche cette semaine (donnée)
  const debutFlash = d.debut ?? selectionsFlash()[0]
  // Une campagne active du même type sur ce produit (vente flash : sur la même sélection).
  const actif = etat.lire().campagnes.some((x) => x.offreId === d.offreId && x.emplacement === d.emplacement && (d.emplacement !== 'flash' || x.debut === debutFlash) && ['en_cours', 'programmee', 'en_pause', 'candidature'].includes(etatDe(x, p.raisons)))
  const qualite = (r: Estimation): Estimation => (r.refus ? r : p.raisons.length ? { ...r, refus: p.raisons[0] } : actif ? { ...r, refus: 'deja_active' } : r)

  if (prod === 'sponsorise') {
    const enchere = d.enchere ?? 0
    const budget = d.budgetJour ?? 0
    const cout = enchere > 0 ? coutClic(d.emplacement, enchere) : null
    const max = cout ? Math.floor(budget / cout) : 0
    const r: Estimation = { ...base, coutClic: cout, plafondJour: budget, clicsJourMax: max, clicsEstimes: [Math.min(max, Math.round(interet / 25)), Math.min(max, Math.round(interet / 10))], impressionsEstimees: [Math.round(interet * 1.5), interet * 4], apercu: apercu(d, p.prix) }
    try {
      verifierEnchereClic(enchere, budget, P)
    } catch (e) {
      if (e instanceof AnnonceRefusee) return { ...r, refus: !Number.isInteger(enchere) || enchere < P.clicPlancher ? 'sous_plancher' : 'budget_min' }
      throw e
    }
    const v = qualite(r)
    return v.refus ? v : s < (cout ?? enchere) ? { ...v, refus: 'solde_insuffisant' } : v
  }
  if (prod === 'flash') {
    const { refus, ...flash } = flashDe(p.prix, d.remisePourCent ?? 0, categorieDe(d.offreId))
    const r: Estimation = { ...base, impressionsEstimees: [interet * 6, interet * 12], clicsEstimes: [Math.round(interet / 2), interet], flash, apercu: apercu(d, flash.prixPromo) }
    return refus ? { ...r, refus } : qualite(r)
  }
  const semaines = prod === 'une' ? (d.semaines ?? 1) : 1
  const aPayer = forfaitDe(d.emplacement, semaines)
  const facteur = d.emplacement === 'carrousel' ? 20 : d.emplacement === 'une' ? 12 : d.emplacement === 'boost_7j' ? 5 : 1.2
  const r: Estimation = {
    ...base,
    aPayer,
    impressionsEstimees: [Math.round(interet * facteur * semaines * 0.7), Math.round(interet * facteur * semaines * 1.3)],
    clicsEstimes: [Math.round(interet * facteur * semaines * 0.02), Math.round(interet * facteur * semaines * 0.04)],
    apercu: prod === 'boost' ? apercu(d, p.prix) : [],
  }
  if (prod === 'une' && d.mode === 'enchere') {
    // Enchère hebdomadaire : semaine suivante, une semaine ; rien n'est pris maintenant, au plus l'enchère si elle gagne.
    const lundi = lundiSuivant()
    const restantes = Math.max(0, regleDe(d.emplacement).places - (PLACES_VENDUES[d.emplacement] ?? 0) - nosPlacesFixes(etat.lire(), d.emplacement, lundi))
    const enchere = d.enchere ?? 0
    const v = qualite({ ...r, aPayer: 0, enchereMax: enchere, placesRestantes: restantes })
    if (!Number.isInteger(enchere) || enchere < regleDe(d.emplacement).enchereMin) return { ...v, refus: 'enchere_min' }
    if (v.refus) return v
    if (restantes === 0) return { ...v, refus: 'complet' }
    return s < enchere ? { ...v, refus: 'solde_insuffisant' } : v
  }
  if (prod === 'une') {
    if (!Number.isInteger(semaines) || semaines < 1 || semaines > 4) return { ...r, refus: 'semaines' }
    const debut = d.debut ?? maintenant()
    const nos = etat.lire().campagnes.filter((x) => x.emplacement === d.emplacement && !x.arreteeA && x.fin && x.fin > debut && x.debut < debut + 7 * JOUR).length
    const restantes = Math.max(0, (d.emplacement === 'une' ? P.aLaUne.places : P.carrousel.places) - (PLACES_VENDUES[d.emplacement] ?? 0) - nos)
    const v = qualite({ ...r, placesRestantes: restantes })
    if (v.refus) return v
    if (restantes === 0) return { ...v, refus: 'complet' }
    return s < aPayer ? { ...v, refus: 'solde_insuffisant' } : v
  }
  const v = qualite(r)
  return v.refus ? v : s < aPayer ? { ...v, refus: 'solde_insuffisant' } : v
}

// ── Source ────────────────────────────────────────────────────────────────────────────────────────────────

export const demoPublicite: DomainePublicite = {
  async tableau() {
    proprietaire('publicité')
    const c = toutes()
    const t = maintenant()
    const mv = etat.lire().mouvements
    // Dépenses nettes : débits moins heures non diffusées rendues, plus les clics du jour en cours.
    const jourEnCours = c.reduce((s, x) => s + (x.depenseJour ?? 0), 0)
    const depensesDepuis = (d: number) => -mv.filter((m) => m.type !== 'recharge' && m.le >= d).reduce((s, m) => s + m.montant, 0) + jourEnCours
    const semaine = c.filter((x) => (x.fin ?? Infinity) >= t - 7 * JOUR && x.debut <= t)
    const st = semaine.reduce<StatsPub>((s, x) => ({ impressions: s.impressions + x.stats.impressions, clics: s.clics + x.stats.clics, clicsNonFactures: s.clicsNonFactures + x.stats.clicsNonFactures, ventes: s.ventes + x.stats.ventes, depense: s.depense + x.stats.depense, rembourse: s.rembourse + x.stats.rembourse }), { impressions: 0, clics: 0, clicsNonFactures: 0, ventes: 0, depense: 0, rembourse: 0 })
    return repondre({
      solde: solde(c),
      depensesJour: depensesDepuis(debutDuJour(jourDe(t))),
      depensesSemaine: depensesDepuis(t - 7 * JOUR),
      semaine: st,
      coutParVente: coutParVente(st.depense, st.ventes),
      actives: c.filter((x) => ['en_cours', 'programmee', 'candidature'].includes(x.etat)).length,
      selectionsFlash: selectionsFlash(),
      regles: regles(),
    })
  },
  campagnes: async () => (proprietaire('publicité'), repondre(toutes())),
  produits: async () => (proprietaire('publicité'), repondre(produitsAnnoncables())),
  mouvements: async () => (proprietaire('publicité'), decider(), repondre([...etat.lire().mouvements].sort((a, b) => b.le - a.le))),
  estimer: async (d) => (proprietaire('publicité'), repondre(estimer(d))),
  async creer(d) {
    proprietaire('publicité')
    const est = estimer(d)
    if (est.refus) return { ok: false, raison: est.refus as RefusCampagne }
    const p = produitsAnnoncables().find((x) => x.offreId === d.offreId)!
    const t = maintenant()
    let id = ''
    etat.ecrire((e) => {
      e.n++
      id = `cp-${e.n}-${t.toString(36)}`
      const prod = PRODUIT_DE[d.emplacement]
      const mode: ModeEmplacement | null = prod === 'une' ? (d.mode ?? 'fixe') : null
      const debut = prod === 'flash' ? (d.debut ?? selectionsFlash()[0]) : mode === 'enchere' ? lundiSuivant(t) : Math.max(t, d.debut ?? t)
      const semaines = prod === 'une' ? (mode === 'enchere' ? 1 : (d.semaines ?? 1)) : null
      const fin = prod === 'sponsorise' ? null : debut + (prod === 'flash' ? 24 : heuresDe(d.emplacement, semaines ?? 1)) * HEURE
      e.campagnes.push(sp({ id, emplacement: d.emplacement, offreId: d.offreId, debut, fin, prixAuDepot: p.prix, enchere: d.enchere ?? null, budgetJour: d.budgetJour ?? null, mode, semaines, forfait: est.aPayer || null, remisePourCent: d.remisePourCent ?? null, jours: prod === 'sponsorise' ? [jr(0, 0)] : [] }))
      if (est.aPayer > 0) {
        debiter(soldeBrut(e), est.aPayer) // jamais au-delà du solde (l'estimation l'a vérifié ; sinon AnnonceRefusee)
        e.mouvements.push({ id: 'm-' + id, le: t, type: 'depense', montant: -est.aPayer, libelle: `${LIBELLE[d.emplacement]} · ${p.titre} ${p.variante}${semaines ? ` · ${semaines} sem.` : ''}`, facture: facture(e) })
      }
    })
    return { ok: true, campagne: toutes().find((c) => c.id === id)! }
  },
  async pause(id) {
    proprietaire('publicité')
    const c = toutes().find((x) => x.id === id)
    if (!c || c.etat !== 'en_cours' || PRODUIT_DE[c.emplacement] !== 'sponsorise') return { ok: false, raison: 'etat' }
    etat.ecrire((e) => {
      e.campagnes.find((x) => x.id === id)!.pauseA = maintenant()
    })
    return { ok: true }
  },
  async reprendre(id) {
    proprietaire('publicité')
    const c = toutes().find((x) => x.id === id)
    if (!c || c.etat !== 'en_pause' || PRODUIT_DE[c.emplacement] !== 'sponsorise') return { ok: false, raison: 'etat' }
    const r = raisonsDe(c.offreId)
    if (r.length) return { ok: false, raison: r[0] }
    if (solde() < (c.coutClic ?? c.enchere ?? 0)) return { ok: false, raison: 'solde_insuffisant' }
    etat.ecrire((e) => {
      e.campagnes.find((x) => x.id === id)!.pauseA = null
    })
    return { ok: true }
  },
  async arreter(id) {
    proprietaire('publicité')
    const c = toutes().find((x) => x.id === id)
    if (!c || c.etat === 'terminee' || c.etat === 'refusee') return { ok: false, raison: 'etat' }
    const t = maintenant()
    const rembourse = c.forfait && c.heuresPrevues ? remboursementNonDiffuse(c.forfait, c.heuresPrevues, c.etat === 'programmee' ? 0 : (c.heuresDiffusees ?? 0)) : 0
    etat.ecrire((e) => {
      const x = e.campagnes.find((y) => y.id === id)!
      x.arreteeA = t
      x.rembourse = rembourse
      if (c.emplacement === 'flash' || (x.mode === 'enchere' && !x.decision)) {
        if (!x.decision) x.decision = 'refusee'
        x.motif = 'retiree'
      }
      // Vente flash acceptée : sa vente flash de Promotions s'arrête aussi (le prix payé redevient le prix normal).
      if (x.promoId)
        etatPromos.ecrire((v) => {
          const pr = v.promos.find((y) => y.id === x.promoId)
          if (pr && !pr.arreteeA && pr.fin > t) pr.arreteeA = t
        })
      if (rembourse > 0) e.mouvements.push({ id: 'm-r-' + id, le: t, type: 'remboursement', montant: rembourse, libelle: `Heures non diffusées · ${LIBELLE[c.emplacement]} · ${c.titre}`, facture: facture(e) })
      // Clics du jour : débités à l'arrêt.
      if (c.depenseJour) e.mouvements.push({ id: 'm-c-' + id, le: t, type: 'depense', montant: -c.depenseJour, libelle: `Clics sponsorisés du jour · ${c.titre}`, facture: facture(e) })
    })
    return { ok: true, rembourse }
  },
  async enchere(id, enchere, budgetJour) {
    proprietaire('publicité')
    const c = toutes().find((x) => x.id === id)
    if (!c || PRODUIT_DE[c.emplacement] !== 'sponsorise' || c.etat === 'terminee') return { ok: false, raison: 'etat' }
    try {
      verifierEnchereClic(enchere, budgetJour, P)
    } catch (e) {
      if (e instanceof AnnonceRefusee) return { ok: false, raison: !Number.isInteger(enchere) || enchere < P.clicPlancher ? 'sous_plancher' : 'budget_min' }
      throw e
    }
    etat.ecrire((e) => {
      const x = e.campagnes.find((y) => y.id === id)!
      x.enchere = enchere
      x.budgetJour = budgetJour
    })
    return { ok: true }
  },
  async recharger(m) {
    proprietaire('publicité')
    try {
      recharger(0, m, P)
    } catch (e) {
      if (e instanceof AnnonceRefusee) return { ok: false, raison: 'montant' }
      throw e
    }
    let demande: Recharge | null = null
    etat.ecrire((e) => {
      e.n++
      demande = { id: 'rc-' + e.n + '-' + maintenant().toString(36), montant: m, envoyeeA: maintenant(), statut: 'en_attente' }
      e.recharges[demande.id] = demande
    })
    return { ok: true, demande: demande! }
  },
  async recharge(id) {
    proprietaire('publicité')
    const r = etat.lire().recharges[id]
    if (!r) return null
    if (r.statut === 'en_attente')
      // Démonstration : le vendeur a confirmé dans le menu de son opérateur (payment.confirmed).
      etat.ecrire((e) => {
        e.recharges[id].statut = 'confirme'
        e.mouvements.push({ id: 'm-' + id, le: maintenant(), type: 'recharge', montant: recharger(soldeBrut(e), r.montant, P) - soldeBrut(e), libelle: 'Recharge Mobile Money', facture: facture(e) })
      })
    return repondre(etat.lire().recharges[id])
  },
  async annulerRecharge(id) {
    etat.ecrire((e) => {
      const r = e.recharges[id]
      if (r && r.statut === 'en_attente') r.statut = 'refuse'
    })
  },
}
