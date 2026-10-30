// Domaine « retours » : retours (À décider / En route / Clos), distincts des litiges ; inspection à la réception
// (constater, photographier, décider) sous RET-INSPECT-H (48 h après la remise réelle du retour, Q-72), sinon le
// client est remboursé automatiquement (VD07-R25) ; défaut confirmé : remplacer (expédié sous 72 h ouvrées,
// dimanche non compté, sinon remboursement automatique, VD07-R31) ou rembourser ; non conforme : preuves en
// médiation, BelivaY décide au plus tard 24 h après l'envoi des preuves (DP-57 L-4).
// API : GET /returns?state=, GET /returns/{id}, POST /returns/{id}/inspection, POST /returns/{id}/replacement
// (VD-02 p12, VD07-R22, VD07-R26, VD07-R29).
// Toujours un dépôt au relais pour S, M, L ; ramassage à domicile pour XL (DP-10, DP-56 Q-28). Trajet retour à la
// partie en tort (RET-04) ; vendeur en tort : trajet et livraison (Q-27). ANONYMAT : ni qui renvoie, ni d'où.
import type { ArticleVendu, Francs, Instant, Jour, ReferenceCommande, Resultat } from '../communs'
import type { PieceDossier } from './litiges'

export type EtatRetour = 'a_decider' | 'en_route' | 'clos'
export type Verdict = 'conforme' | 'non_conforme'
/** Les quatre catégories vendeur (RET-01) ; les cinq motifs du client s'y traduisent en base (DP-56 Q-29). */
export type CategorieRetour = 'non_conforme' | 'abime' | 'contrefacon' | 'defaut_cache'

/** Où en est le retour, pour le vendeur. */
export type Suite =
  | { type: 'en_route' }
  | { type: 'a_inspecter' }
  | { type: 'a_choisir' } // défaut confirmé : remplacer ou rembourser
  | { type: 'mediation'; decisionAvant: Instant } // non conforme : BelivaY décide (L-4)
  | { type: 'remplacement'; expedierAvant: Instant; pretA: Instant | null } // le choix « Être remplacé » vaut accord (Q-30)
  | { type: 'rembourse'; le: Instant; auto: boolean } // choisi, ou automatique (inspection ou remplacement en retard)

export interface Controles {
  scelle: boolean // « Scellé du retour intact »
  serie: boolean // « C'est bien l'article vendu (numéro de série) »
}

export interface Inspection {
  verdict: Verdict
  controles: Controles
  photos: PieceDossier[]
  a: Instant
  par: string
}

/** Inspection en cours, gardée sur l'appareil avec l'heure des photos (VD07-R28 : hors connexion). */
export interface BrouillonInspection {
  controles: Controles
  photos: PieceDossier[]
  verdict: Verdict | null
}

export type CodeEvenementRetour = 'retire' | 'signale' | 'depose' | 'recu' | 'photo' | 'inspecte' | 'mediation' | 'remplacement' | 'pret' | 'rembourse' | 'rembourse_auto'

export interface EvenementRetour {
  a: Instant
  code: CodeEvenementRetour
  auteur: string | null
  detail: string | null
}

export interface Retour {
  ref: ReferenceCommande
  etat: EtatRetour
  suite: Suite
  categorie: CategorieRetour
  motif: string // « défaut caché » (catégorie en mots, lue par l'accueil)
  phraseClient: string // « L'écran reste noir après une journée »
  article: ArticleVendu
  volumineux: boolean // XL : ramassage chez le client plutôt que dépôt au relais
  gele: Francs | null // gelé jusqu'à l'inspection ; null pour l'accès Préparation
  arrivee: { jour: Jour; creneau: [string, string] } | null
  recuA: Instant | null // remise réelle du retour au vendeur (Q-72) ; null tant qu'il est en route
  inspecterAvant: Instant | null
  retireA: Instant // retrait de la commande par le client
  signaleA: Instant
  /** Délai du signalement (défaut caché : 48 h après le retrait, RET-02) : heures écoulées et recevabilité. */
  signalement: { heures: number; limiteH: number; recevable: boolean }
  inspection: Inspection | null
  brouillon: BrouillonInspection | null
  /** Ce que coûte un défaut confirmé (RMP-03) ; null pour l'accès Préparation. */
  couts: { trajet: Francs; garde: Francs; livraisonRetour: Francs | null } | null
  /** L'article neuf proposé en remplacement (même offre) et son stock. */
  remplacement: { offreId: string; titre: string; variante: string; dessin: string; stock: number }
  journal: EvenementRetour[]
  /** Retour d'une commande passée par le pont, encore en route : code de réception à donner au livreur. */
  codeReception?: string | null
}

export interface CompteursRetours {
  a_decider: number
  en_route: number
  clos: number
}

export type RefusInspection = 'photos' | 'controles' | 'verdict' | 'delai_depasse' | 'deja_inspecte' | 'pas_recu' | 'introuvable'
export type RefusChoix = 'stock' | 'pas_conforme' | 'deja_choisi' | 'reserve_proprietaire' | 'introuvable'

export interface DomaineRetours {
  liste(etat?: EtatRetour): Promise<Retour[]>
  compteurs(): Promise<CompteursRetours>
  detail(ref: ReferenceCommande): Promise<Retour | null>
  /** Le livreur a remis le retour : l'heure réelle de la remise lance les 48 h d'inspection (Q-72). */
  recevoir(ref: ReferenceCommande): Promise<Resultat<{ inspecterAvant: Instant }, 'deja_recu' | 'introuvable'>>
  /** Photo d'inspection (heure et lieu de la prise conservés, INP-01) : propriétaire ou accès Préparation. */
  ajouterPhoto(ref: ReferenceCommande, photo: string): Promise<Resultat<{ piece: PieceDossier }, 'deja_inspecte' | 'introuvable'>>
  retirerPhoto(ref: ReferenceCommande, id: string): Promise<void>
  garderBrouillon(ref: ReferenceCommande, b: { controles: Controles; verdict: Verdict | null }): Promise<void>
  inspecter(ref: ReferenceCommande, verdict: Verdict, controles: Controles): Promise<Resultat<object, RefusInspection>>
  /** Défaut confirmé : remplacer (une unité du stock réservée) ou rembourser ; réservé au propriétaire (argent). */
  proposer(ref: ReferenceCommande, choix: 'remplacer' | 'rembourser'): Promise<Resultat<{ expedierAvant?: Instant }, RefusChoix>>
  /** Remplacement prêt : le livreur le ramasse au créneau habituel. */
  remplacementPret(ref: ReferenceCommande): Promise<Resultat<object, 'introuvable'>>
}
