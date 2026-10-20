// Domaine « argent » (propriétaire seulement) : où est l'argent (à verser, se libère, en cours, gelé), ce que le
// vendeur garde, ses gains, ses documents. Contrôle : en circulation = à verser + se libère + en cours + gelé
// (VD-D03.A04 ; VD09-R03 : l'écran refait la somme avant d'afficher). Le mot « commission » n'apparaît que dans la
// facture des commissions (Documents, VD09-R26) ; aucun type ne porte l'identité du client (GEN-01).
// API : GET /money/summary, /money/releasing, /money/frozen, /money/earnings, /documents (VD-02 p12, DP-57 T-1) ;
// 403 owner_only pour l'accès Préparation (ReserveAuProprietaire).
import type { Francs, Instant, Jour, Palier, ReferenceCommande } from '../communs'
import type { EtatArgent } from './commandes'

/** Article d'une vente, tel que le vendeur le voit (fiche BelivaY). */
export interface ArticleArgent {
  titre: string // « ITEL AC52 »
  variante: string // « noir »
  dessin: string // illustration ou photo remplaçable
}

export interface Mouvement {
  ref: ReferenceCommande
  etat: EtatArgent
  garde: Francs
  liberation: Instant | null
  vendredi: string | null // vendredi du versement (« 2026-09-25 »)
  progression: number | null // barre « Se libère », en %
  article: ArticleArgent
  prix: Francs // prix de vente de la sous-commande
  payeeA: Instant
}

export interface NumeroCourt {
  operateur: 'MTN' | 'Orange'
  masque: string // « ···· 4217 »
}

export interface ResumeArgent {
  aVerser: Francs
  seLibere: Francs
  enCours: Francs
  gele: Francs
  enCirculation: Francs // calculé par le serveur ; l'écran refait la somme (VD09-R03)
  verifications: { montant: Francs; nombre: number } // frozen.checks (GEL-02, Q-64), compris dans « gelé »
  prochainVersement: { vendredi: string; montant: Francs; numero: string; heureLimite: Instant } | null
  /** Une somme se libère avant l'arrêté du jeudi : « Passe à 35 680 F ce soir, quand BLV-00007 se libère » (ARG-06). */
  passeA: { montant: Francs; ref: ReferenceCommande; a: Instant } | null
  /** Phrases des quatre lignes (ARG-05). */
  lignes: {
    seLibere: { ref: ReferenceCommande; a: Instant; autres: number } | null
    enCours: { ref: ReferenceCommande; autres: number } | null
    gele: { litiges: number; retours: number; verifications: number }
  }
  gagneDepuisInscription: Francs
  gardeDuMois: Francs
  ventesDuMois: Francs
  /** « Sur une vente de 20 000 F, vous gardez 17 840 F » : l'offre la plus vendue, aux conditions du jour. */
  exemple: { prix: Francs; garde: Francs } | null
  numero: NumeroCourt & { enRevue: boolean }
  calculeA: Instant // heure du calcul (montrée hors connexion, VD09-R06)
  mouvements: Mouvement[]
}

/** Se libère (LIB-01, VD09-R12, R14) : une carte par commande, et celles pas encore retirées. */
export interface SeLibere {
  palier: Palier
  delais: { standard: number; or: number; carte: number } // jours après la fermeture du retour (VD-LIB-*)
  fenetreRetourJours: number
  numero: NumeroCourt
  cartes: {
    ref: ReferenceCommande
    article: ArticleArgent
    fermeture: Instant // « Tout est en ordre » ou retrait + 7 j
    liberation: Instant
    vendredi: string
    garde: Francs
    carte: boolean // paiement par carte : délai propre
  }[]
  enCours: { ref: ReferenceCommande; article: ArticleArgent; garde: Francs; payeeA: Instant }[]
}

export type TypeGel = 'litige' | 'retour' | 'verification'

/** Gelé (GEL-01 à GEL-03, VD09-R16, R17) : total = somme des cartes, triées par échéance. */
export interface Gele {
  total: Francs
  cartes: {
    type: TypeGel
    ref: ReferenceCommande
    garde: Francs
    article: ArticleArgent
    motif: string // litige : le motif du client ; retour : le motif ; vérification : « Vérification en cours » (Q-64)
    echeance: Instant | null // litige : répondre avant ; retour : inspecter avant ; vérification : aucune
    arrivee: Instant | null // retour : arrivée chez le vendeur
  }[]
  delais: { litigeHeures: number; inspectionHeures: number; verificationHeures: number }
  remboursementAuto: { standard: Francs; tresFiable: Francs } // VD07-R04 : BelivaY paie, le vendeur est payé
}

export interface LigneGain {
  type: 'vente' | 'reprise'
  ref: ReferenceCommande
  article: ArticleArgent
  prix: Francs // vente : prix de vente ; reprise : 0
  garde: Francs // reprise : négatif (GAI-03)
  liberation: Instant // vente : libérée le ; reprise : datée le
  motif: string | null // reprise : son motif
}

export interface Gains {
  mois: string // « 2026-09 »
  total: Francs // gardé du mois (VD09-R19)
  ventes: Francs // prix de vente des ventes libérées du mois
  parProduit: { titre: string; dessin: string; quantite: number; garde: Francs }[] // décroissant (GAI-02)
  lignes: LigneGain[]
  meilleurJour: { jour: Jour; garde: Francs } | null // REFVD-R80
  /** Tous les mois depuis la signature, du plus ancien au plus récent (graphique, choix du mois). */
  historique: { mois: string; garde: Francs; ventes: number }[]
  gagne: Francs // depuis l'inscription (ventes libérées, reprises déduites)
  ceSoir: { montant: Francs; refs: ReferenceCommande[]; a: Instant } | null // gagné + ce qui se libère aujourd'hui
  dejaVerses: Francs
  aVerser: { vendredi: string; montant: Francs } | null
  impayes: Francs // payé d'avance (REFVD-R80)
  transport: Francs // livraison gérée
}

export type StatutDocument = 'open' | 'issued' | 'pending'

export interface Documents {
  releves: { periode: string; statut: StatutDocument; emisLe: Jour | null; formats: ('pdf' | 'csv')[] }[] // plus récent d'abord
  recus: { nombre: number; refs: ReferenceCommande[] }
  factures: {
    commission: { periode: string; statut: StatutDocument; emisLe: Jour | null; disponibleLe: Jour | null }[]
    abonnement: { periode: string; emisLe: Jour; libelle: string }[]
    visibilite: { periode: string; emisLe: Jour; libelle: string }[]
  }
  entreprise: { rccm: boolean; niu: boolean } // facture complète dès RCCM et NIU (DOC-01)
  contrat: { signeLe: Jour }
}

/** Contenu d'un document à télécharger (même contenu en PDF et en CSV, DOC-02). Textes en français : l'écran les traduit. */
export interface ContenuDocument {
  titre: string
  sousTitre: string
  colonnes: string[]
  lignes: (string | number)[][]
  totaux: (string | number)[] | null
  mentions: string[]
}

export type DemandeDocument = { type: 'releve'; periode: string } | { type: 'facture'; periode: string } | { type: 'contrat' } | { type: 'versements'; periode: '3' | '12' | 'tout' }

export interface DomaineArgent {
  resume(): Promise<ResumeArgent>
  seLibere(): Promise<SeLibere>
  gele(): Promise<Gele>
  gains(mois: string): Promise<Gains>
  documents(): Promise<Documents>
  document(d: DemandeDocument): Promise<ContenuDocument>
}
