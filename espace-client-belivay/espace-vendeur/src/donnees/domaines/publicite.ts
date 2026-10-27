// Domaine « publicite » (DP-59) : solde publicitaire prépayé (Mobile Money, jamais pris sur les versements),
// campagnes (sponsorisé recherche / catégories au clic, « À la une » / carrousel à la semaine, Boost 24 h / 7 j,
// candidature à une vente flash sur sélection), statistiques, historique et factures. Réservé au propriétaire (droit
// argent.voir : 403 owner_only → ReserveAuProprietaire). Montants calculés par src/calculs/publicite.ts.
// API : GET /ads/dashboard, /ads/ledger, /ads/products, /ads/campaigns ; POST /ads/quote, /ads/campaigns/new,
// /ads/campaigns/{id}/pause|resume|stop|bid, /ads/top-up, GET et DELETE /ads/top-up/{id} (backend-kit/apps/publicite).
// ANONYMAT : aucune donnée de client (impressions, clics et ventes sont des compteurs).
import type { Francs, Instant, Resultat } from '../communs'

export type Emplacement = 'recherche' | 'categories' | 'une' | 'carrousel' | 'boost_24h' | 'boost_7j' | 'flash'
/** À la une / carrousel : tarif fixe (payé à la confirmation) ou enchère hebdomadaire (attribuée avant la semaine,
 *  meilleure enchère perdante + 1 F, jamais plus que la sienne ; perdue : rien n'est pris). */
export type ModeEmplacement = 'fixe' | 'enchere'
export type ProduitPub = 'sponsorise' | 'une' | 'boost' | 'flash'
export const PRODUIT_DE: Record<Emplacement, ProduitPub> = { recherche: 'sponsorise', categories: 'sponsorise', une: 'une', carrousel: 'une', boost_24h: 'boost', boost_7j: 'boost', flash: 'flash' }
export type RaisonInelegible = 'pas_en_vente' | 'rupture' | 'score' | 'litige'
export type RefusEnchere = 'sous_plancher' | 'budget_min'

/** Paramètres de console (registre VD-PUB-*), lus par src/calculs/publicite.ts, servis à l'écran. */
export interface ReglesPub {
  scoreMin: number // VD-PUB-ELIGIBILITE
  clicPlancher: number // VD-PUB-CLIC
  budgetJourMin: number // VD-PUB-BUDGET
  densiteMaxPourCent: number // VD-PUB-DENSITE
  annoncesMax: number
  fenetre: number
  uneSemaine: number // VD-PUB-A-LA-UNE (tarif fixe)
  unePlaces: number
  uneEnchereMin: number // enchère hebdomadaire : plancher de la semaine
  carrouselSemaine: number // VD-PUB-CARROUSEL
  carrouselPlaces: number
  carrouselEnchereMin: number
  flashMajorationPoints: number // VD-PUB-FLASH-MAJORATION
  flashRemiseMin: number // FLASH-REMISE-MIN
  boost24h: number // VD-PUB-BOOST
  boost7j: number
  boostPlafond: string // « 1,5 »
  rechargeMin: number // VD-PUB-SOLDE
  numero: { operateur: string; masque: string } // numéro Mobile Money de la boutique
}

export interface StatsPub {
  impressions: number
  clics: number
  clicsNonFactures: number // clics répétés du même client le même jour, ou au-delà du budget : 0 F
  ventes: number
  depense: Francs // payé (clics réels, heures diffusées, majoration flash)
  rembourse: Francs // heures non diffusées rendues au solde
}

export interface TableauPub {
  solde: Francs
  depensesJour: Francs
  depensesSemaine: Francs
  semaine: StatsPub
  coutParVente: Francs | null
  actives: number
  selectionsFlash: Instant[] // prochaines ventes flash sur sélection (BelivaY choisit le créneau)
  regles: ReglesPub
}

export type EtatCampagne = 'en_cours' | 'programmee' | 'en_pause' | 'candidature' | 'terminee' | 'refusee'

export interface Campagne {
  id: string
  emplacement: Emplacement
  offreId: string
  titre: string
  variante: string
  dessin: string
  prix: Francs
  etat: EtatCampagne
  debut: Instant
  fin: Instant | null // null : sponsorisé sans fin (jusqu'à la pause ou l'arrêt)
  enchere: Francs | null // sponsorisé : F par clic ; À la une / carrousel à l'enchère : F la semaine
  mode: ModeEmplacement | null // À la une / carrousel : tarif fixe ou enchère hebdomadaire
  budgetJour: Francs | null
  depenseJour: Francs | null
  coutClic: Francs | null // sponsorisé : second prix + 1 F, jamais au-dessus de l'enchère ; null : pas montrée
  semaines: number | null
  forfait: Francs | null
  heuresPrevues: number | null
  heuresDiffusees: number | null
  remisePourCent: number | null
  prixPromo: Francs | null
  gardeFlash: Francs | null
  gardeAvant: Francs | null
  stats: StatsPub
  motif: string | null // fin anticipée, refus (« Stock épuisé : diffusion arrêtée, heures restantes remboursées »)
}

export interface ProduitAnnoncable {
  offreId: string
  titre: string
  variante: string
  dessin: string
  rayon: string
  prix: Francs
  stock: number
  trustScore: number
  litiges: number
  note: number
  raisons: RaisonInelegible[] // vide : éligible
}

export interface MouvementPub {
  id: string
  le: Instant
  type: 'recharge' | 'depense' | 'remboursement'
  montant: Francs // signé : + recharge et remboursement, − dépense
  libelle: string
  facture: string | null // « FP-2026-0012 » (facture publicitaire)
}

export interface DemandeCampagne {
  emplacement: Emplacement
  offreId: string
  enchere?: number // sponsorisé : F par clic ; À la une / carrousel en mode « enchere » : F la semaine
  budgetJour?: number
  mode?: ModeEmplacement // À la une / carrousel ; absent : fixe
  semaines?: number
  debut?: Instant
  remisePourCent?: number
}

export type RefusCampagne = RefusEnchere | RaisonInelegible | 'solde_insuffisant' | 'remise_min' | 'garde_negatif' | 'deja_active' | 'semaines' | 'complet' | 'enchere_min' | 'etat'

export interface Estimation {
  refus: RefusCampagne | null
  aPayer: Francs // retenu sur le solde à la confirmation (forfait) ; 0 au clic (payé clic par clic)
  plafondJour: Francs | null // sponsorisé : budget quotidien
  clicsJourMax: number | null
  impressionsEstimees: [number, number] // fourchette sur la durée (ou par jour au clic)
  clicsEstimes: [number, number]
  solde: Francs
  coutClic: Francs | null // sponsorisé : coût du clic estimé (second prix + 1 F)
  placesRestantes: number | null // À la une, carrousel : places de la semaine encore libres
  enchereMax: Francs | null // enchère hebdomadaire : le plus qui puisse être pris si elle gagne (rien si elle perd)
  /** Aperçu de la liste côté client (placerAnnonces : 2 annonces au plus sur 10, jamais au-dessus d'une offre moins
   *  chère et mieux notée du même produit). Autres vendeurs anonymes. Vide : pas une liste (accueil). */
  apercu: { nous: boolean; sponsorise: boolean; prix: Francs; note: number; memeProduit: boolean }[]
  flash: { prixPromo: Francs; remiseAffichee: number; commissionNormale: Francs; majoration: Francs; commission: Francs; gardeAvant: Francs; gardeFlash: Francs } | null
}

export interface Recharge {
  id: string
  montant: Francs
  envoyeeA: Instant
  statut: 'en_attente' | 'confirme' | 'refuse'
}

export interface DomainePublicite {
  tableau(): Promise<TableauPub>
  campagnes(): Promise<Campagne[]>
  produits(): Promise<ProduitAnnoncable[]>
  mouvements(): Promise<MouvementPub[]>
  estimer(d: DemandeCampagne): Promise<Estimation>
  creer(d: DemandeCampagne): Promise<Resultat<{ campagne: Campagne }, RefusCampagne>>
  pause(id: string): Promise<Resultat<object, 'etat'>>
  reprendre(id: string): Promise<Resultat<object, 'etat' | RaisonInelegible | 'solde_insuffisant'>>
  arreter(id: string): Promise<Resultat<{ rembourse: Francs }, 'etat'>>
  enchere(id: string, enchere: number, budgetJour: number): Promise<Resultat<object, 'etat' | RefusEnchere>>
  recharger(montant: number): Promise<Resultat<{ demande: Recharge }, 'montant'>>
  recharge(id: string): Promise<Recharge | null>
  annulerRecharge(id: string): Promise<void>
}
