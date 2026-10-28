// Domaines des pages ajoutées AJ-A (DP-58) : stock et inventaire, promotions, questions des clients, livraison et
// colis. Même convention que src/donnees/domaines/* : montants en francs entiers calculés par le serveur (démonstration :
// src/calculs), null pour l'accès Préparation (403 owner_only) ; instants en millisecondes ; aucun champ qui porte
// l'identité, le numéro, le quartier, le relais ou le total payé du client (GEN-01, VD11-R10) : un client est « un
// client », jamais nommé.
// API proposée (vague 3, CONNECTEURS-VENDEUR.md) : GET /stock, GET /stock/movements, POST /stock/{offre}/adjust,
// PUT /stock/{offre}/threshold, GET /stock/export ; GET /promotions, GET /promotions/rules, GET /promotions/offers,
// POST /promotions/quote, POST /promotions, POST /promotions/{id}/stop ; GET /questions, POST /questions/filter,
// POST /questions/{id}/answer, POST /questions/{id}/report, GET·POST·DELETE /questions/templates ;
// GET·PUT /delivery-settings, PUT /offers/{id}/delivery, PUT /delivery-settings/slots/{id}, PUT /delivery-settings/relays/{id}.
import type { ClasseColis, Francs, Instant, Resultat } from '../../../donnees/communs'
import type { EtatOffre } from '../../../donnees/domaines/produits'

// ───────────────────────────── Stock et inventaire ─────────────────────────────

/** Un mouvement de stock, signé par son auteur (VD02-DR03 : chaque action est signée). */
export type TypeMouvement = 'vente' | 'retour' | 'reappro' | 'correction' | 'rupture' | 'annulation'
export interface Mouvement {
  id: string
  offreId: string
  titre: string
  variante: string
  type: TypeMouvement
  delta: number
  avant: number
  apres: number
  a: Instant
  auteur: string | null // « Franck P. », « Aïcha N. » ; null : une commande (ref) ou un autre écran
  ref: string | null // commande BLV-… pour une vente, un retour, une annulation
  note: string | null
}

export type AlerteStock = 'rupture' | 'sous_seuil' | null

export interface LigneStock {
  offreId: string
  titre: string
  variante: string
  dessin: string
  etat: EtatOffre
  stock: number
  seuil: number
  reserve: number // réservé par des commandes à préparer (vendu, pas encore remis)
  alerte: AlerteStock
  ventes30j: number
  joursRestants: number | null // au rythme des 30 derniers jours ; null : aucune vente
  conseilReappro: number // quantité proposée pour tenir l'horizon et repasser au-dessus du seuil (0 : rien à faire)
  prix: Francs | null // null : accès Préparation
  dernierMouvement: Instant | null
}

export interface Inventaire {
  lignes: LigneStock[] // ruptures, puis sous le seuil, puis le reste
  compteurs: { produits: number; enVente: number; unites: number; ruptures: number; sousSeuil: number }
  valeur: Francs | null // stock × prix de vente ; null : accès Préparation
  joursCouverture: number // horizon du conseil de réapprovisionnement
  luA: Instant
}

export interface DomaineStock {
  inventaire(): Promise<Inventaire>
  /** Historique : toute la boutique, ou une offre ; le plus récent d'abord. */
  mouvements(offreId?: string | null): Promise<Mouvement[]>
  /** Un geste sur le stock : +1 / −1, une saisie (nouveau total) ou un réapprovisionnement reçu. Accès Préparation compris. */
  ajuster(offreId: string, c: { nouveau: number; type: 'reappro' | 'correction'; note?: string | null }): Promise<Resultat<{ ligne: LigneStock; mouvement: Mouvement | null }, 'stock' | 'introuvable' | 'note'>>
  /** Seuil d'alerte (propriétaire, comme PUT /offers/{id}). */
  regler(offreId: string, seuil: number): Promise<Resultat<{ ligne: LigneStock }, 'seuil' | 'reserve'>>
  exporter(): Promise<string> // CSV ; sans prix pour l'accès Préparation
}

// ───────────────────────────── Promotions ─────────────────────────────

/** Une promotion = une vente flash à remise vérifiée (OFR-05, VD12-R38, VD10-R40, DEC-17) : gratuite, jamais
 *  « Sponsorisé » (DP-14), remise réelle de FLASH-REMISE-MIN au moins sur un prix réellement pratiqué. */
export type EtatPromotion = 'en_verification' | 'programmee' | 'en_cours' | 'terminee' | 'arretee'
export type TypeRemise = 'pourcent' | 'montant'

export interface Promotion {
  id: string
  offreId: string
  titre: string
  variante: string
  dessin: string
  type: TypeRemise
  valeur: number
  prixReference: Francs // prix barré : le plus bas pratiqué sur les N derniers jours (price_history)
  prixPromo: Francs
  remisePourCent: number // remise réelle, une décimale
  gardeAvant: Francs
  gardePromo: Francs // la commission se calcule sur le prix payé (F9, VD08-R06)
  debut: Instant
  fin: Instant
  etat: EtatPromotion
  origine: 'vendeur' | 'merite' | 'selection' // merite : offerte (Se faire voir, P-3) ; selection : sélection BelivaY acceptée (Publicité, DP-59) ; même liste, mêmes règles
  creeeA: Instant
  relueAvant: Instant | null
  arreteeA: Instant | null
  vendues: number
}

export interface ReglesPromotion {
  ouvert: boolean // FF-FLASH
  remiseMin: number // FLASH-REMISE-MIN (%)
  relueAuDela: number // VD-VISIBILITE (P-3) : relue par la console au-delà
  dureeMaxHeures: number // FLASH-DUREE-MAX
  programmerJoursMax: number
  joursReference: number
  scoreMin: number // VIS-02, REFVD-R291
  trustScore: number
  prixMin: Francs // VD-PRIX-MIN
  relectureHeures: number
}

export interface OffrePromouvable {
  offreId: string
  titre: string
  variante: string
  dessin: string
  prix: Francs
  prixReference: Francs
  stock: number
  bloque: null | 'rupture' | 'etat' | 'promotion'
}

export type RefusPromotion = 'ferme' | 'remise_min' | 'remise_max' | 'garde_negatif' | 'prix_min' | 'dates' | 'duree' | 'trop_loin' | 'chevauche' | 'rupture' | 'etat' | 'score' | 'valeur'

export interface ApercuPromotion {
  prixReference: Francs
  prixPromo: Francs
  remisePourCent: number
  gardeAvant: Francs
  gardePromo: Francs | null // null : refusé (BelivaY ne perd jamais)
  commissionPromo: Francs | null
  plancherApplique: boolean
  relue: boolean
  refus: RefusPromotion | null
}

export interface ProjetPromotion {
  offreId: string
  type: TypeRemise
  valeur: number
  debut: Instant
  fin: Instant
}

export interface DomainePromotions {
  regles(): Promise<ReglesPromotion>
  liste(): Promise<Promotion[]>
  offres(): Promise<OffrePromouvable[]>
  apercu(p: ProjetPromotion): Promise<ApercuPromotion>
  creer(p: ProjetPromotion): Promise<Resultat<{ promotion: Promotion }, RefusPromotion>>
  arreter(id: string): Promise<Resultat<{ promotion: Promotion }, 'etat'>>
}

// ───────────────────────────── Questions des clients ─────────────────────────────

export type EtatQuestion = 'a_repondre' | 'repondue' | 'signalee'
export type MotifSignalement = 'coordonnees' | 'insulte' | 'hors_sujet' | 'concurrence' | 'autre'
export interface QuestionClient {
  id: string
  offreId: string
  titre: string
  variante: string
  dessin: string
  texte: string
  poseeA: Instant
  etat: EtatQuestion
  reponse: { texte: string; a: Instant; auteur: string } | null // auteur interne ; le client lit « Réponse du vendeur »
  signalement: { motif: MotifSignalement; a: Instant; relueAvant: Instant } | null
  utile: number
}

export interface ListeQuestions {
  questions: QuestionClient[]
  compteurs: { a_repondre: number; repondue: number; signalee: number; toutes: number }
  delaiMoyenMs: number | null
  objectifH: number
  plusAncienne: Instant | null
}

export interface ModeleReponse {
  id: string
  titre: string
  texte: string
  propre: boolean
  remplace?: string // modèle de BelivaY que celui-ci personnalise (VAGUE n° 12)
}

export interface DomaineQuestions {
  liste(): Promise<ListeQuestions>
  /** Ce que le client verrait : numéros, e-mails, liens et réseaux retirés (même règle que la messagerie, VD11-R59). */
  filtrer(texte: string): Promise<{ propre: string; filtre: boolean }>
  repondre(id: string, texte: string): Promise<Resultat<{ question: QuestionClient }, 'court' | 'long' | 'coordonnees' | 'deja' | 'reserve'>>
  signaler(id: string, motif: MotifSignalement): Promise<Resultat<{ question: QuestionClient }, 'deja' | 'motif'>>
  modeles(): Promise<ModeleReponse[]>
  enregistrerModele(titre: string, texte: string): Promise<Resultat<{ modele: ModeleReponse }, 'titre' | 'court' | 'coordonnees' | 'max' | 'reserve'>>
  /** Modifier un modèle ; un modèle de BelivaY modifié devient celui du vendeur et le remplace (VAGUE n° 12). */
  modifierModele(id: string, titre: string, texte: string): Promise<Resultat<{ modele: ModeleReponse }, 'titre' | 'court' | 'coordonnees' | 'max' | 'reserve' | 'inconnu'>>
  /** Supprimer un de ses modèles ; un modèle de BelivaY personnalisé revient à son texte d'origine. */
  supprimerModele(id: string): Promise<void>
}

// ───────────────────────────── Livraison et colis ─────────────────────────────

export interface ClasseDeColis {
  classe: ClasseColis
  kg: number
  cm: number
}
export interface CreneauRamassage {
  id: string
  jours: string
  de: string
  a: string
  prefere: boolean
}
export interface RelaisProche {
  id: string
  nom: string
  quartier: string
  position: { lat: number; lon: number }
  distanceM: number
  horaires: string
  prefere: boolean
}
export interface ProduitLivraison {
  offreId: string
  titre: string
  variante: string
  dessin: string
  colis: ClasseColis
  colisFiche: ClasseColis
  poidsKg: number | null
  dimensionsCm: [number, number, number] | null
  delaiPreparationH: number
  paiementAuRetrait: boolean
}
export interface ReglagesLivraison {
  defauts: { colis: ClasseColis; delaiH: number; paiementAuRetrait: boolean }
  delaisH: number[]
  classes: ClasseDeColis[]
  mesures: { seuilKg: number; seuilCm: number; diviseur: number }
  creneaux: CreneauRamassage[]
  relais: RelaisProche[]
  relaisMax: number
  boutique: { position: { lat: number; lon: number }; quartier: string }
  produits: ProduitLivraison[]
  peutRegler: boolean // accès Préparation : lecture seule (VD02-DR05, DR10)
}

export interface DomaineLivraison {
  reglages(): Promise<ReglagesLivraison>
  regler(d: Partial<ReglagesLivraison['defauts']>): Promise<Resultat<{ reglages: ReglagesLivraison }, 'reserve' | 'delai'>>
  reglerProduit(
    offreId: string,
    c: { colis?: ClasseColis; poidsKg?: number | null; dimensionsCm?: [number, number, number] | null; delaiPreparationH?: number; paiementAuRetrait?: boolean },
  ): Promise<Resultat<{ produit: ProduitLivraison }, 'reserve' | 'mesures' | 'delai' | 'introuvable'>>
  creneau(id: string, prefere: boolean): Promise<Resultat<{ reglages: ReglagesLivraison }, 'reserve' | 'dernier'>>
  relais(id: string, prefere: boolean): Promise<Resultat<{ reglages: ReglagesLivraison }, 'reserve' | 'max'>>
}

export interface SourceAJA {
  stock: DomaineStock
  promotions: DomainePromotions
  questions: DomaineQuestions
  livraison: DomaineLivraison
}
