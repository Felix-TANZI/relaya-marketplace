// Domaine « remise » : remise au livreur avec le code à 6 chiffres (GEN-06, REM-01 à REM-09), reçu vendeur (RCU-01 à
// RCU-04), erreurs de remise (ERR-01 à ERR-04, VD06-R17 à R26). API : GET /orders/{id} (livreur du créneau),
// GET /orders/{id}/handover-code (au toucher seulement), GET /orders/{id}/receipt ; webhook handover.completed
// (photos[]) ; événement handover_code.viewed (VD-02 p12, VD-06).
// - Le code n'est JAMAIS dans la lecture de la remise : il est demandé au toucher de « Afficher le code » (REM-01) et
//   ce toucher est journalisé (VD06-R05). Il n'est jamais comparé dans l'application vendeur : c'est le livreur qui le
//   saisit dans son application (le serveur vérifie).
// - Trois codes faux bloquent la remise 24 h (VD06-R02) ; le vendeur demande lui-même un nouveau code, qui annule
//   l'ancien (DP-56, Q-20) ; l'échéance de préparation est suspendue jusqu'au nouveau passage (DP-57, P-7).
// - ANONYMAT (GEN-01, RCU-03) : ni nom, ni numéro, ni adresse du client, ni son point de retrait, ni ce qu'il a payé
//   au total. Le livreur, lui, est montré (nom, photo, entreprise, créneau : REM-02).
// - RÔLE : l'accès Préparation remet le colis (code, livreur) mais ne reçoit aucun montant (valeur, gardé, suites
//   d'argent : null) ; le reçu est réservé au propriétaire (ReserveAuProprietaire, comme le 403 owner_only).
import type { ArticleVendu, ClasseColis, Francs, Instant, Jour, Livreur, Palier, ReferenceCommande, Resultat } from '../communs'
import type { EtatArgent } from './commandes'

/** Les six cas de la carte d'erreur (VD06-R18 à R23). « reseau » est constaté par l'appareil, pas par le serveur. */
export type ErreurRemise = 'absent' | 'bloque' | 'annulee' | 'depasse' | 'reseau' | 'plafond'
/** Niveau de l'entreprise de livraison (plafond de valeur du colis, VD06-R03) — pas le palier du vendeur (Q-77). */
export type NiveauLivreur = 'Nouveau' | 'Confirme' | 'Or'
export type EtapeRemise = 'a_preparer' | 'prete' | 'remise' | 'annulee'
export type MoyenPaiement = 'momo' | 'carte' | 'apple' | 'google' | 'wallet' | 'usd' | 'eur' | 'comptoir'

export interface LivreurDuCreneau extends Livreur {
  photo: string // portrait : identifiant de dessin (démonstration) ou adresse de la photo (photo_url)
  debut: Instant // début du créneau en cours ou à venir
  fin: Instant
  niveau: NiveauLivreur
}

export interface PhotoRemise {
  type: 'decouvert' | 'scelle' // l'article à découvert, puis le colis fermé et étiqueté (REM-03)
  image: string // identifiant de dessin (démonstration) ou adresse (dossier de la commande)
  a: Instant // heure de la prise (pas de l'envoi : REFVD-R30)
  lieu: string // lieu de la prise (chez le vendeur)
}

export interface Remise {
  ref: ReferenceCommande
  article: ArticleVendu
  quantite: number
  colis: ClasseColis
  payableAuRetrait: boolean
  etape: EtapeRemise
  echeance: Instant | null // prête avant (à préparer)
  preteA: Instant | null // « C'est prêt » touché
  livreur: LivreurDuCreneau | null // jamais de code sans nom ni photo du livreur (REM-02)
  essaisFaux: number // codes faux saisis par le livreur depuis le dernier code
  essaisMax: number // 3 (CODE-ESSAIS, REM_ESSAIS_MAX)
  blocageHeures: number // 24 (REM_BLOCAGE_H)
  bloqueJusqua: Instant | null // remise bloquée jusqu'à (t du 3e code faux + 24 h)
  nouveauCodeDemande: boolean // après un blocage, l'ancien code est annulé (DP-56)
  remiseA: Instant | null // handover.completed
  photos: PhotoRemise[] // versées au dossier par le livreur à la remise (REM-06)
  erreur: Exclude<ErreurRemise, 'reseau'> | null // incident en cours, le plus grave d'abord
  creneauManque: { debut: Instant; fin: Instant } | null // livreur absent : le créneau manqué
  valeurColis: Francs | null // propriétaire seulement (carte « Colis de valeur »)
  niveauRequis: NiveauLivreur // selon la valeur du colis (VD06-R03)
  plafonds: { nouveau: Francs; confirme: Francs } // TRANSP-PLAFOND
  fileHeures: number // une action hors connexion attend au plus 72 h (VD06-R22)
  garde: Francs | null // « Vous gardez », figé au paiement (VD06-R11) ; propriétaire seulement
  suite: { palier: Palier; liberationJours: number; confirmationJours: number; numero: string } | null // frise de Remis (REM-07, VD06-R13)
  autresPourCeLivreur: ReferenceCommande[] // autres colis prêts pour le même passage
}

export interface Recu {
  ref: ReferenceCommande
  encaisseA: Instant | null // payable au retrait : null tant que le client n'a pas payé au comptoir
  article: ArticleVendu
  quantite: number
  colis: ClasseColis
  prix: Francs // prix de vente
  garde: Francs // « Vous gardez · versés sans frais », figé au paiement
  moyen: MoyenPaiement
  fraisPayesParLeClient: boolean // carte (2 %) et cartes étrangères : frais payés par le client
  argent: { etat: EtatArgent; liberation: Instant | null; vendredi: Jour | null }
}

export interface RecuResume {
  ref: ReferenceCommande
  encaisseA: Instant | null
  titre: string // « ITEL AC52 · noir »
  dessin: string
  prix: Francs
  garde: Francs
}

export interface DomaineRemise {
  /** État de la remise d'une commande (sans le code). null : commande inconnue. */
  remise(ref: ReferenceCommande): Promise<Remise | null>
  /** Remises à faire : commandes prêtes, pas encore remises (accueil, « En attente du livreur »). */
  aRemettre(): Promise<Remise[]>
  /** La remise de chaque commande reçue, la plus récente d'abord (incidents en cours, exemples des cas d'erreur). */
  toutes(): Promise<Remise[]>
  /** GET /orders/{id}/handover-code, au toucher seulement ; journalise handover_code.viewed (auteur, heure). */
  afficherCode(ref: ReferenceCommande): Promise<Resultat<{ code: string }, 'pas_prete' | 'bloquee' | 'remise' | 'annulee' | 'introuvable'>>
  /** Après un blocage : un nouveau code, qui annule l'ancien (DP-56, Q-20) ; il marche dès le déblocage. */
  nouveauCode(ref: ReferenceCommande): Promise<Resultat<{ marcheA: Instant }, 'pas_bloquee' | 'introuvable'>>
  /** Démonstration (application du livreur) : le livreur saisit le code ; en production, son application l'envoie. */
  saisieLivreur(ref: ReferenceCommande, code: string): Promise<{ ok: boolean; essaisRestants: number; bloqueJusqua: Instant | null }>
  /** Démonstration (autres interfaces) : le livreur manque son créneau ; le client annule avant le ramassage. */
  simuler(ref: ReferenceCommande, quoi: 'livreur_absent' | 'annulation_client'): Promise<void>
  /** Reçu vendeur (propriétaire seulement : ReserveAuProprietaire sinon). null : pas de reçu pour cette commande. */
  recu(ref: ReferenceCommande): Promise<Recu | null>
  /** Tous les reçus, le plus récent d'abord (propriétaire seulement). */
  recus(): Promise<RecuResume[]>
}
