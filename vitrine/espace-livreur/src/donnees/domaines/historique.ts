// Domaine « historique » (LIV-P24 ; LIV-09-R01 à R13, LIV-P24R-01 à R04, LIV-RG-R186 à R190, DED-09, DED-13, DED-18).
// - Le livreur voit ses propres missions et leurs preuves pendant LIV-PREUVES-VISIBLES-J jours : étapes horodatées
//   (heure du téléphone, et heure du serveur dans le détail), photos, codes « validés » (jamais le code), incidents,
//   dossiers liés. Rien n'est effaçable ni remplaçable ; aucun export par le livreur (l'entreprise exporte).
// - Après la remise, plus aucune donnée du client : numéro de commande et zone seulement ; le nom de la boutique reste
//   (donnée de collecte, jamais une donnée client).
// - Recherche par étiquette : numéro complet ou ses 4 derniers chiffres, sur toute la période visible.
// - Hors connexion : les derniers jours (cache chiffré, history_offline_cache_days) restent consultables.
// - Une mission liée à un litige montre l'état du dossier et la décision, jamais l'identité du client.
// Les chiffres sont ceux des missions validées par le serveur : identiques à l'activité, au Trust Score, à la clôture
// et au portail de l'entreprise (LIV-09-R04).
import type { ClasseColis, Instant, Jour } from '../communs'

export type NatureMission = 'relais' | 'domicile' | 'retour'
export type StatutMission = 'termine' | 'en_cours' | 'dossier'
export interface MissionResume {
  id: string // paquet « PQ-Z1-261010-003 »
  jour: Jour
  heure: Instant
  nature: NatureMission
  zone: string
  arrets: number
  colis: number
  statut: StatutMission
  libelle: string // « Relais Bastos Carrefour », « Commande BLV-00041 »
  etiquettes: string[]
}
export interface Dossier {
  numero: string
  commande: string
  motif: string
  etat: 'en_cours' | 'decide'
  ouvertLe: Instant
  reponseEntrepriseAvant: Instant
  decision: string | null
  decideLe: Instant | null
  preuves: string[] // preuves versées automatiquement
}
export interface EtapeMission {
  quand: Instant // heure du téléphone (origine)
  recu: Instant // heure du serveur
  texte: string
  lieu: string | null
  preuve: 'photo' | 'code' | 'scan' | 'position' | null
}
export interface PhotoPreuve {
  id: string
  legende: string
  quand: Instant
}
export interface DetailMission extends MissionResume {
  classes: Partial<Record<ClasseColis, number>>
  etapes: EtapeMission[]
  photos: PhotoPreuve[]
  incidents: string[]
  dossier: Dossier | null
  visibleJusqua: Instant
}
export interface Historique {
  jours: { jour: Jour; missions: MissionResume[] }[]
  heros: { paquets: number; colisRamasses: number; photos: number; dossiersEnCours: number }
  aJourA: Instant
  visiblesJours: number // LIV-PREUVES-VISIBLES-J
  cacheJours: number // jours gardés sur le téléphone pour le hors connexion
}

export interface DomaineHistorique {
  liste(de: Jour, a: Jour): Promise<Historique>
  mission(id: string): Promise<DetailMission | null>
  rechercher(saisie: string): Promise<MissionResume[]>
}
