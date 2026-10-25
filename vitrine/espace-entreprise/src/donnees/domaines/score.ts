// Domaine « score » (ENT-P20) : Trust Score de l'entreprise, fixé par BelivaY, en lecture seule (ENT-UIX-06). Il compte
// chaque mission de ses livreurs (pondéré par le volume) et ses événements propres : paquets rendus, délais
// d'acceptation et de ramassage, pertes non imputables à un livreur (ENT-P20R-04, calcul_score_entreprise) ; départ au
// neutre, poids décroissant avec l'âge, veto qui plafonne, baisse maximale par recalcul (ENT-TSC-01 à 04, src/calculs/
// ent07.ts). Palier : Confirmé et Or à leurs seuils tenus ENT-HYST-JOURS jours (Or : assurance et visite en plus) ;
// descente : ENT-HYST-POINTS sous le seuil pendant ENT-HYST-JOURS jours, puis validation humaine motivée, contestation
// une fois (ENT-PAL-02, ENT-P20R-02, ENT-TSC-06) ; une alerte précède chaque descente. Un litige en cours ne pèse pas
// (ENT-TSC-05). Aucune mission close : état « Nouveau », aucun score fictif (ENT-P20R-01).
// API : GET /api/company/trust?view=company|couriers|zones|events.
import type { CodeZone, Instant, LivreurCourt, PalierEntreprise } from '../communs'
import type { Gravite } from '../../calculs/ent07'

export interface EvenementScore {
  id: string
  le: Instant
  gravite: Gravite
  libelle: string // « Remise dans le délai », « Paquet rendu »
  propre: boolean // événement propre à l'entreprise (pas à un livreur)
  livreur: LivreurCourt | null
  zone: CodeZone
  missionId: string | null
  paquetId: string | null
}

export interface ScoreLivreur {
  livreur: LivreurCourt
  missions: number
  score: number | null // null : aucune mission close
  dansLeDelai: number | null // %
  preuvesCompletes: number | null // %
}

export interface ScoreZone {
  zone: CodeZone
  nom: string
  missions: number
  score: number | null
  dansLeDelai: number | null
}

export interface ScoreEntreprise {
  missionsCloses: number
  score: number | null
  precedent: number | null // score du recalcul précédent
  palier: PalierEntreprise
  plafond: number | null
  depuisLe: Instant // palier tenu depuis
  assuranceOr: boolean
  livreurs: ScoreLivreur[]
  zones: ScoreZone[]
  evenements: EvenementScore[]
  alerteDescente: { seuil: number; sousDepuis: Instant; echeance: Instant; livreur: LivreurCourt | null } | null
  calculeLe: Instant
}

export interface DomaineScore {
  score(): Promise<ScoreEntreprise>
}
