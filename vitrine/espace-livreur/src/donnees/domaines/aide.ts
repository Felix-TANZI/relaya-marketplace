// Domaine « aide » (LIV-P30 ; LIV-10-R34 à R40, LIV-P30R-01 à R05, LIV-08-R19, CONNEXIONS 20, S-07, O-11).
// - Fiches courtes par sujet (étapes, interdit, conséquence, action), versionnées, disponibles hors connexion, avec
//   lecture vocale dans la langue choisie ; une fiche d'incident ouvre la déclaration correspondante.
// - SOS : appui long (LIV-SOS-APPUI-S), sans autre confirmation ; appelle l'entreprise, puis le support BelivaY ;
//   position partagée à l'entreprise et au support (LIV-SOS-POSITION-MIN minutes, une position toutes les
//   SOS-POSITION-S secondes), puis arrêt automatique ; dossier Sécurité ouvert à la console ; « Arrêter le SOS » en un
//   geste, l'entreprise est prévenue de l'annulation. Le SOS appelle aussi par le réseau téléphonique, sans données.
// - Accident avec blessé : les numéros d'urgence du pays d'abord (servis par le pays, jamais écrits dans l'écran).
// - Support WhatsApp : aide seulement (jamais une preuve, jamais un code) ; numéro publié par BelivaY (SUP-WA).
import type { Instant, Origine, Position, Resultat } from '../communs'

export type SujetFiche = 'tournee' | 'incidents' | 'interdits' | 'securite' | 'sans_reseau' | 'zero_espece'
export interface Fiche {
  id: string
  sujet: SujetFiche
  titre: string
  etapes: string[]
  interdit: string | null
  consequence: string | null
  action: { route: string; libelle: string; params?: Record<string, string> } | null
  regle: string // règle expliquée (console : ADM-P29R-06)
}
export interface Aide {
  fiches: Fiche[]
  misesAJourLe: Instant
  urgences: { numero: string; service: string }[]
  entreprise: string
  whatsappSupport: string | null // null : numéro pas encore publié
  horairesSupport: string // SUP-HORAIRES
  delaiSupport: string // SUP-DELAI
  sos: { appuiS: number; partageMin: number; intervalleS: number }
}
export interface EtatSOS {
  id: string
  depuis: Instant
  partageJusqua: Instant
  appels: { vers: 'entreprise' | 'support'; etat: 'en_cours' | 'sans_reponse' | 'a_venir' }[]
  positions: number // positions envoyées
  derniere: Position | null
  arreteA: Instant | null
  arret: 'livreur' | 'automatique' | null
  horsLigne: boolean // déclenché sans données : appel par le réseau téléphonique, positions en file
}

export interface DomaineAide {
  aide(): Promise<Aide>
  /** SOS actif (ou le dernier, arrêté) ; null si aucun aujourd'hui. */
  sosEnCours(): Promise<EtatSOS | null>
  sos(origine: Origine, enLigne: boolean): Promise<Resultat<{ id: string }, 'deja_en_cours'>>
  positionSOS(id: string, p: Position): Promise<void>
  arreterSOS(id: string, origine: Origine): Promise<Resultat<object, 'deja_arrete'>>
}
