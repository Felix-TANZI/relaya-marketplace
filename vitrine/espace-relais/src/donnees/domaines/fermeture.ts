// Domaine « fermeture » (possédé par PR-07 Incidents) : prévenir BelivaY d'une fermeture pour que les colis et les
// clients soient pris en charge (FER-01 à FER-07, DP-42, ARL-20, PR-RC-24, CT03 « Fermeture »).
// - Fermeture IMPRÉVUE DU JOUR : aujourd'hui seulement, par le gérant ou par l'employé qui a le droit « Fermeture
//   imprévue du jour » (EQU-07) ; le relais est fermé jusqu'à sa prochaine ouverture (« rouvre demain »).
// - Fermeture PROGRAMMÉE (plusieurs jours, ou un jour à venir) : le gérant seul ; refusée à un employé.
// - Délais (FER-01) : congé PR-FER-CONGE-PREAVIS-H avant, sans justificatif ; maladie le jour même, justificatif sous
//   PR-FER-JUSTIF-MALADIE-H ; urgence familiale le jour même, justificatif sous PR-FER-JUSTIF-URGENCE-J ; force majeure
//   (coupure, inondation, sinistre) le jour même. Un congé déclaré trop tard est refusé avec un message clair.
// - Conséquence selon la durée (FER-02 à FER-04, ARL-20, DP-42) : moins de 24 h, rien ne bouge (colis gardés, « rouvre
//   demain », aucun livreur) ; au-delà, plus de nouveaux colis dès la veille, le client choisit gratuitement un autre
//   relais, sinon transfert automatique au relais ouvert le plus proche après RELAIS-FERME-TRANSFERT-H (nouveau code,
//   garde au jour 1) ; au-delà de PR-FER-MASQUE-J jours, relais masqué du choix des clients ; au-delà de
//   PR-FER-APPEL-J jours, BelivaY appelle le gérant. Jours fermés jamais facturés (GARDE-FERME) ; transfert gratuit
//   pour le relais. Une fermeture non déclarée constatée fait baisser la Ponctualité (FER-06, décision humaine).
import type { Instant, Jour, Origine, Photo, Resultat } from '../communs'

export type TypeFermeture = 'imprevue_jour' | 'programmee'
export type MotifFermeture = 'conge' | 'maladie' | 'urgence_familiale' | 'force_majeure'
export type DureeFermeture = 'moins_24h' | 'un_a_trois_jours' | 'plus_de_trois_jours'
export type RefusFermeture = 'droit_refuse' | 'chevauchement' | 'dates_invalides' | 'preavis_insuffisant' | 'motif_interdit'

export interface Fermeture {
  id: string
  type: TypeFermeture
  motif: MotifFermeture
  du: Jour
  au: Jour // inclus
  /** Réouverture (instant) ; pour une fermeture imprévue du jour, posée à la déclaration. */
  rouvreA: Instant | null
  duree: DureeFermeture
  /** Photo du justificatif, prise par l'application ; null tant qu'il manque. */
  justificatif: Photo | null
  /** Justificatif attendu avant (maladie, urgence familiale) ; null : aucun justificatif demandé. */
  justificatifAvant: Instant | null
  declareePar: string // initiales du membre
  declareeA: Instant
  statut: 'prevue' | 'en_cours' | 'terminee' | 'annulee'
  /** Colis au relais au moment de la lecture concernés par la fermeture (gardés, ou proposés à un autre relais). */
  colisConcernes: number
}

/** Ce que la fermeture choisie entraînerait, calculé par le serveur avant la déclaration. */
export interface ApercuFermeture {
  duree: DureeFermeture
  rouvreLe: Instant | null
  /** Colis au relais remettables (gardés si moins de 24 h, sinon proposés à un autre relais). */
  colisEnStock: number
  /** Colis annoncés pendant la fermeture (paquets republiés par l'entreprise de livraison). */
  colisAttendus: number
  transfert: boolean
  masque: boolean
  appelBelivay: boolean
  /** Plus de nouveaux colis à partir de ce jour (la veille), quand il y a transfert. */
  sansNouveauxColisDes: Jour | null
  justificatifAvant: Instant | null
  /** Ce qui empêcherait la déclaration (droit, préavis, dates, chevauchement). */
  refus: RefusFermeture | null
}

export interface DemandeFermeture {
  type: TypeFermeture
  motif: MotifFermeture
  du: Jour
  au: Jour
}

export interface DomaineFermeture {
  fermetures(): Promise<Fermeture[]>
  apercu(f: DemandeFermeture): Promise<ApercuFermeture>
  declarer(f: DemandeFermeture, o: Origine): Promise<Resultat<{ id: string; rouvreLe: Instant | null }, RefusFermeture>>
  /** Annule une fermeture qui n'a pas commencé (le gérant ; l'auteur d'une fermeture du jour). */
  annuler(id: string, o: Origine): Promise<Resultat<object, 'introuvable' | 'deja_commencee' | 'droit_refuse'>>
  /** Rouvre maintenant une fermeture imprévue du jour en cours (le relais reparaît ouvert aux clients). */
  rouvrir(id: string, o: Origine): Promise<Resultat<object, 'introuvable' | 'pas_en_cours' | 'droit_refuse'>>
  joindreJustificatif(id: string, photo: Photo, o: Origine): Promise<Resultat<object, 'introuvable' | 'non_demande'>>
}
