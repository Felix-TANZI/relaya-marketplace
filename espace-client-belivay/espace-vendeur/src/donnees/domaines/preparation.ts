// Domaine « preparation » : les gestes sur une commande à préparer : « C'est prêt » (seule confirmation, PRE-01,
// VD05-R09 ; hors connexion, l'action part en file avec son heure d'origine), rupture (remplace l'annulation : vendeur
// suivant, au plus 2 tentatives, sinon remboursement, DP-01, VD05-R12), plus de temps (une fois, jamais au-delà de
// l'échéance absolue, DEL-01…04 ; le ramassage passe au créneau suivant si besoin, P-6), bon de préparation (BON-01,
// BON-02, VD05-R14 : quatre cases, aucune donnée du client, jamais le code de remise), vérification de la référence
// (scan ou saisie). API : POST /orders/{id}/ready · /stockout · /extend ; GET /orders/{id}/slip (VD-02 p12).
//
// CALENDRIER (VD05-R02, VD11-R13, REFVD-R134, DP-56 Q-38 et Q-53) : la préparation se compte en heures d'ouverture de
// la boutique (ses horaires, « Fermer aujourd'hui », ses fermetures programmées). Les fonctions pures vivent dans
// src/calculs/ouverture.ts (réexportées ici pour les écrans et la source).
import type { Francs, Instant, ReferenceCommande, Resultat } from '../communs'

export { ajouterOuvertes, heuresOuvertes, optionsDeDelai, ouverteA, ouvertureDuJourSuivant, ouvertureSuivante, passageSuivant, plageDuJour } from '../../calculs/ouverture'
export type { CalendrierBoutique, ChoixDelai, OptionDelai } from '../../calculs/ouverture'
import type { ChoixDelai, OptionDelai } from '../../calculs/ouverture'

export interface OptionsDelai {
  ref: ReferenceCommande
  echeance: Instant
  absolue: Instant
  prolongee: boolean
  aPreparer: boolean
  ramassage: { debut: Instant; fin: Instant }
  options: OptionDelai[]
}

/** Les quatre vérifications du bon (VD05-R14), dans l'ordre ; le texte est écrit par l'écran (FR / EN). */
export type Verification = 'modele' | 'etat' | 'accessoires' | 'boite'

export interface BonPreparation {
  ref: ReferenceCommande
  colis: string
  payeeA: Instant
  payableAuRetrait: boolean
  echeance: Instant | null
  lignes: { titre: string; variante: string; etat: string; dessin: string; reference: string; quantite: number; aMettreDeCote: string[] }[]
  aVerifier: { cle: Verification; fait: boolean; par: string | null }[] // par : qui a coché (journal)
  ramassage: { debut: Instant; fin: Instant; livreur: string; photo: string } | null
  garde: Francs | null // null pour l'accès Préparation
  liberationJours: number
  aPreparer: boolean
}

/** Une action « C'est prêt » gardée hors connexion (Q-93 : en file 72 h, envoyée avec son heure d'origine). */
export interface ActionEnFile {
  ref: ReferenceCommande
  a: Instant
}

export interface DomainePreparation {
  /** « C'est prêt » ; `a` : heure d'origine d'une action gardée hors connexion. */
  cestPret(ref: ReferenceCommande, a?: Instant): Promise<Resultat<{ preteA: Instant }, 'deja_prete' | 'annulee' | 'introuvable'>>
  signalerRupture(ref: ReferenceCommande, stockAZero: boolean): Promise<Resultat<object, 'introuvable' | 'deja_prete'>>
  optionsDelai(ref: ReferenceCommande): Promise<OptionsDelai | null>
  demanderDelai(ref: ReferenceCommande, choix: ChoixDelai): Promise<Resultat<{ echeance: Instant }, 'deja_prolongee' | 'au_dela_de_24h' | 'deja_prete' | 'introuvable'>>
  bon(ref: ReferenceCommande): Promise<BonPreparation | null>
  /** Ouvre le bon : une ligne « Bon de préparation ouvert » au journal (une fois par membre et par jour). */
  ouvrirBon(ref: ReferenceCommande): Promise<void>
  cocher(ref: ReferenceCommande, i: number, fait: boolean): Promise<BonPreparation | null>
  /** Référence scannée ou tapée : la bonne coche « Bon modèle et bonne couleur ». */
  verifierReference(ref: ReferenceCommande, lu: string): Promise<Resultat<{ bon: BonPreparation }, 'autre_reference' | 'introuvable'>>
}
