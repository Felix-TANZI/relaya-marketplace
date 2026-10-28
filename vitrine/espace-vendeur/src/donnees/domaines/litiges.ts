// Domaine « litiges » : litiges reçus (À répondre / En médiation / Clos), réponse (j'accepte / je conteste avec
// preuves / arrangement de 40 caractères au moins), dossier de preuves, fil chronologique, décision et recours.
// API : GET /disputes?state=, GET /disputes/{id}, POST /disputes/{id}/answer, POST /disputes/{id}/evidence,
// POST /disputes/{id}/appeal (VD-02 p12, VD07-R01, VD07-R10 ; REFVD-R157).
// Règles (registre-vendeur.json, décisions du porteur) :
// - le vendeur répond sous LIT-VENDEUR-H (48 h) ; sans réponse, BelivaY décide en partant de ce que dit le client,
//   au plus tard LIT-DECISION-H (24 h) après l'échéance : décision HUMAINE motivée, jamais d'arbitrage ni de
//   remboursement automatique à l'échéance (DP-35, VD07-R08) ;
// - une réponse envoyée ne se modifie plus (REP-02) ; « J'accepte » clôt aussitôt (VD07-R13) : le client est
//   remboursé après réception et inspection de l'article, 48 h au plus, sinon d'office (R68, DP-69) ; le vendeur paie seulement le
//   trajet retour et la livraison (DP-56 Q-27) ;
// - chaque partie a un recours, une fois, sous LIT-RECOURS-H (48 h) après la décision, examiné par une autre
//   personne ; l'argent reste gelé jusqu'à la fin du délai de recours ou la réponse (DP-56 Q-26, DCS-03) ;
// - accès Préparation : ajoute des preuves, ne répond pas (DP-56 Q-17) ; ne voit aucun montant (DP-55).
// ANONYMAT (GEN-01) : le vendeur lit ce que dit le client et ses photos, jamais qui il est ni où il retire ; le
// palier du client n'est jamais montré (VD07-R04).
import type { ArticleVendu, Francs, Instant, Jour, ReferenceCommande, Resultat } from '../communs'

export type Posture = 'accepte' | 'conteste' | 'arrangement'
export type Arrangement = 'remplacement' | 'remise'
export type EtatLitige = 'a_repondre' | 'en_mediation' | 'clos'
export type Issue = 'attente' | 'gagne' | 'perdu' | 'accepte'
/** Ce que le client attend (assistant de litige du client, 4e écran : « Que veux-tu ? », PBL-05). */
export type AttenteClient = 'remboursement' | 'remplacement' | 'signal'
/** Ouvert dans l'application du client, ou au comptoir du relais avec les photos du gérant (VD07-R03). */
export type OrigineLitige = 'application' | 'comptoir'
/** Effet sur le Trust Score (DCS-02) : aucun (gagné) ; perdu : g1 « échec léger », g3 en cas de faute avérée. */
export type EffetScore = 'aucun' | 'g1' | 'g3'

/** Une pièce du dossier : photo horodatée (illustration nommée ou vraie photo, remplaçable). */
export interface PieceDossier {
  id: string
  photo: string // nom d'une photo dessinée (counter, box, relay, cracked) ou vraie photo (data:, adresse)
  quoi: 'ramassage' | 'scelle' | 'client' | 'comptoir' | 'vendeur'
  a: Instant
  ajouteePar: string | null // membre de l'équipe qui l'a ajoutée (journal signé, GEN-09) ; null : versée d'office
  retirable: boolean // ajoutée par la boutique et réponse pas encore envoyée
}

export type CodeEvenement = 'ouvert' | 'photos_client' | 'preuves_versees' | 'preuve_ajoutee' | 'preuve_retiree' | 'reponse' | 'echeance' | 'decision' | 'recours' | 'clos'

/** Une ligne du fil chronologique du dossier (le plus ancien d'abord). */
export interface EvenementLitige {
  a: Instant
  code: CodeEvenement
  auteur: string | null // « Aïcha N. », « Médiation BelivaY » ; null : le client ou le système
  detail: string | null
}

export interface Reponse {
  posture: Posture
  arrangement: Arrangement | null
  texte: string
  envoyeeA: Instant
  par: string
}

export interface Decision {
  a: Instant
  issue: 'gagne' | 'perdu'
  motif: string // motif écrit, toujours (REFPROD-R27)
  par: string // « Médiation BelivaY »
  effetScore: EffetScore
  /** Gagné : libération = max(date prévue avant le litige ; fin du gel du recours) (Q-60, Q-26) ; null pour l'accès Préparation. */
  liberation: Instant | null
  versement: Jour | null
  versementVers: string | null // « MTN ···· 4217 » ; null pour l'accès Préparation
}

export interface Recours {
  jusqua: Instant | null // fin du délai de recours (décision + 48 h) ; null tant qu'aucune décision
  possible: boolean // perdu, propriétaire, dans le délai, pas encore utilisé
  deposeA: Instant | null
  texte: string | null
}

/** Réponse en cours de rédaction, gardée sur l'appareil 24 h (LIT-BROUILLON-H ; REP-04 hors connexion). */
export interface Brouillon {
  posture: Posture
  arrangement: Arrangement
  texte: string
  gardeA: Instant
}

export interface Litige {
  ref: ReferenceCommande
  etat: EtatLitige
  issue: Issue
  origine: OrigineLitige
  ouvertA: Instant
  echeance: Instant // réponse du vendeur avant
  decisionAvant: Instant // BelivaY décide au plus tard (échéance + 24 h)
  motif: string // « Ce n'est pas le bon produit »
  ceQueDitLeClient: string
  attente: AttenteClient
  article: ArticleVendu
  photosClient: PieceDossier[]
  preuves: PieceDossier[] // photos du ramassage et du scellé versées d'office, puis celles de la boutique
  gele: Francs | null // gelé jusqu'à la décision ; null pour l'accès Préparation
  trajetRetour: Francs | null // ce que coûte le trajet retour à la partie en tort ; null pour l'accès Préparation
  livraisonRetour: Francs | null // part de livraison du colis remboursée si le vendeur est en tort (serveur : moteur des frais)
  reponse: Reponse | null
  decision: Decision | null
  recours: Recours
  brouillon: Brouillon | null
  journal: EvenementLitige[]
}

export interface CompteursLitiges {
  a_repondre: number
  en_mediation: number
  clos: number
  gele: Francs | null // total gelé des litiges en cours ; null pour l'accès Préparation
}

/** Délais et seuils en vigueur (registre de paramètres, GET /config) : aucun n'est écrit dans un écran. */
export interface ReglesLitiges {
  reponseH: number // LIT-VENDEUR-H
  decisionH: number // LIT-DECISION-H
  recoursH: number // LIT-RECOURS-H
  arrangementMin: number // LIT-ARRANG-MIN
  arrangementReponseJ: number // LIT-ARRANG-REPONSE-J
  brouillonH: number // LIT-BROUILLON-H
  seuilStandard: Francs // LIT-AUTO-STD
  seuilEleve: Francs // LIT-AUTO-ELEVE
  trajet: Francs // RET-TRAJET
  remplacementH: number // RET-REMPL-DELAI (heures ouvrées, dimanche non compté)
  viceJ: number // RET-VICE
  defautH: number // RET-DEFAUT-H
  fenetreJ: number // RET-FENETRE
  inspectionH: number // RET-INSPECT-H
}

export type RefusReponse = 'trop_court' | 'constat_vide' | 'deja_repondu' | 'delai_depasse' | 'reserve_proprietaire' | 'introuvable'
export type RefusRecours = 'deja_contestee' | 'trop_court' | 'delai_depasse' | 'non_contestable' | 'reserve_proprietaire'

export interface DomaineLitiges {
  regles(): Promise<ReglesLitiges>
  /** Dossiers triés par échéance croissante (VD07-R01). */
  liste(etat?: EtatLitige): Promise<Litige[]>
  compteurs(): Promise<CompteursLitiges>
  detail(ref: ReferenceCommande): Promise<Litige | null>
  /** Ajoute une photo au dossier (propriétaire ou accès Préparation, Q-17) ; jamais une capture WhatsApp (REP-03). */
  ajouterPreuve(ref: ReferenceCommande, photo: string): Promise<Resultat<{ piece: PieceDossier }, 'clos' | 'introuvable'>>
  retirerPreuve(ref: ReferenceCommande, id: string): Promise<Resultat<object, 'deja_repondu' | 'introuvable'>>
  garderBrouillon(ref: ReferenceCommande, b: Omit<Brouillon, 'gardeA'> | null): Promise<void>
  repondre(ref: ReferenceCommande, posture: Posture, texte: string, arrangement: Arrangement | null): Promise<Resultat<{ issue: Issue }, RefusReponse>>
  /** Recours du vendeur sur un litige perdu : une fois, sous 48 h (DP-56 Q-26). */
  contester(ref: ReferenceCommande, texte: string): Promise<Resultat<object, RefusRecours>>
}
