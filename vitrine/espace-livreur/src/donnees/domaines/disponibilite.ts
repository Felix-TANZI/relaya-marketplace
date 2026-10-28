// Domaine « disponibilite » (LIV-P05) : trois statuts seulement, mêmes mots dans l'application, le portail et la console
// (LIV-04-R15) : Disponible (reçoit des paquets), En pause (termine ses paquets, n'en reçoit plus), Hors service (fin de
// journée). Visible par l'entreprise en moins de 5 s (LIV-04-R17) ; une information pour l'entreprise, jamais une
// obligation envers BelivaY (LIV-P05R-02). « Hors service » est refusé tant qu'un colis est sous la garde du livreur
// (LIV-P05R-01, 409 custody_not_empty) ; rappel de pause après 10 h disponible d'affilée, jamais un blocage (LIV-P05R-03).
import type { Disponibilite, Instant, Jour, Origine, Resultat } from '../communs'

export interface EtatDisponibilite {
  statut: Disponibilite
  depuis: Instant
  motifPause: string | null
  finPausePrevue: Instant | null
  entreprise: string
  zones: string[] // zones du jour déclarées par l'entreprise
  colisSousGarde: number
  preavisJusqua: Instant | null // départ demandé en cours (DP-67) : « hors service » sans aucun point de Trust Score perdu
  regles: { rappelPauseHeures: number; motifsPause: string[]; dureesPauseMin: number[]; delaiPortailSecondes: number }
}

/** Planning (DP-66) : les créneaux sont décidés par l'entreprise ; le livreur les VOIT et peut seulement prévenir d'une
 * absence — une demande que l'entreprise voit, jamais une modification du planning. DP-67 (moteurs/belivay_moteurs/
 * absence.py) : absence prévue au moins PLANNING-PREVENIR-H avant le premier créneau du premier jour ; imprévu
 * (maladie, deuil ou famille, panne de moto) le jour même, sans pénalité avant le premier créneau (après : acceptée,
 * marquée « apresDebut ») ; motif de la liste, texte facultatif (texteMax) ; ABSENCE-MAX-J jours au plus ; hors
 * connexion, mise en file, datée à la saisie (origine.heure) : le serveur juge le délai sur l'heure de saisie. */
export type MotifAbsence = 'maladie' | 'deuil_famille' | 'panne_moto' | 'demarches' | 'autre'
export interface JourPlanning {
  jour: Jour
  horaire: { de: string; a: string } | null // horaire de travail prévu par l'entreprise (« 07:30 »), null : repos
  absence: string | null // identifiant de l'absence prévenue qui couvre ce jour
}
export interface Absence {
  id: string
  du: Jour
  au: Jour // inclus ; égal à « du » pour un seul jour
  motif: MotifAbsence
  texte: string | null // facultatif, texteMax caractères au plus
  imprevu: boolean // prévenue dans le délai court (motif imprévu)
  apresDebut: boolean // prévenue après le début du premier créneau : acceptée, marquée pour l'entreprise
  prevenueLe: Instant
  vueLe: Instant | null // l'entreprise l'a vue
}
export interface Planning {
  entreprise: string
  jours: JourPlanning[] // aujourd'hui et les 13 jours suivants
  absences: Absence[] // à venir ou en cours
  regles: { prevenirH: number; maxJours: number; texteMax: number; imprevus: MotifAbsence[] } // PLANNING-PREVENIR-H, ABSENCE-MAX-J
}

export interface DomaineDisponibilite {
  /** Planning des deux semaines (lecture) : horaires prévus par l'entreprise et absences prévenues. */
  planning(): Promise<Planning>
  /** Prévenir d'une absence (DP-66, DP-67) : du … au … (inclus), motif de la liste, texte facultatif ; l'entreprise est
   * prévenue. Hors connexion : mise en file, datée à la saisie. */
  prevenirAbsence(d: { du: Jour; au: Jour; motif: MotifAbsence; texte: string | null }, origine: Origine): Promise<Resultat<{ id: string; imprevu: boolean; apresDebut: boolean }, 'date_passee' | 'dates_inversees' | 'motif' | 'trop_longue' | 'delai' | 'chevauche'>>
  /** Retirer une absence prévenue qui n'a pas commencé. */
  annulerAbsence(id: string, origine: Origine): Promise<Resultat<object, 'inconnue' | 'commencee'>>
  lire(): Promise<EtatDisponibilite>
  changer(statut: Disponibilite, origine: Origine, pause?: { motif: string | null; minutes: number | null }): Promise<Resultat<object, 'colis_sous_garde' | 'compte_non_actif'> & { nombre?: number }>
}
