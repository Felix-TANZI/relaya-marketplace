// Domaine « rapports » (ENT-P25) : indicateurs d'une période (zone, livreur, type), comparaison avec la période
// précédente ; mêmes définitions que la console et le Trust Score (ENT-P25R-03) ; remplissage moyen = colis par
// tournée relais, objectif ENT-OBJECTIF-TOURNEE (ENT-P25R-02) ; aucune donnée personnelle de client (ENT-P25R-01).
// Données parlantes et exports (CSV, PDF, journalisés) dès ENT-RAPPORT-MIN-MISSIONS missions ; rapport de fin de pilote
// au dernier jour du pilote (409 PILOT_NOT_FINISHED avant : ENT-P25R-04). Le répartiteur ne voit aucun montant.
// Rapport programmé (M6, M15) : chaque vendredi à l'heure choisie, la semaine écoulée en PDF ou CSV, envoyé par e-mail
// aux adresses des accès internes (propriétaire et comptable : montants ; répartiteur : sans montant). Réglé par le
// propriétaire et le comptable ; le répartiteur le lit.
// API : GET /api/company/reports?from=&to=&zone=&courier=&type= ; /reports/pilot ; reports.csv | .pdf ;
// GET · PUT /api/company/reports/schedule.
import type { CodeZone, Francs, Instant, Jour, Resultat } from '../communs'

export interface FiltreRapport {
  du: Jour
  au: Jour
  zone?: CodeZone
  livreur?: string
  type?: 'relais' | 'domicile'
}

export interface Indicateurs {
  paquets: number
  colis: number
  missions: number
  prestations: Francs | null // null pour le répartiteur
  dansLeDelai: number | null // %
  remplissage: number | null // colis par tournée relais
  preuvesCompletes: number | null // %
  litiges: number
  rendus: number
}

export interface Rapport {
  filtre: FiltreRapport
  indicateurs: Indicateurs
  precedent: Indicateurs // période précédente de même durée
  parJour: { jour: Jour; colis: number; prestations: Francs | null }[]
  parZone: { zone: CodeZone; nom: string; colis: number }[]
  parType: { type: 'relais' | 'domicile'; colis: number }[]
  parLivreur: { id: string; nom: string; colis: number; dansLeDelai: number | null; preuvesCompletes: number | null; prestations: Francs | null }[]
  parlant: boolean
  pilote: { debut: Instant; fin: Instant; disponible: boolean }
}

export interface ProgrammeRapport {
  actif: boolean
  jour: number // 5 = vendredi (jour de paiement)
  heure: number // 6 à 22
  format: 'pdf' | 'csv'
  destinataire: string // e-mail d'un accès interne
  prochain: Instant | null // prochain envoi, calculé par le serveur
  dernierEnvoi: Instant | null
  modifieLe: Instant | null
  par: string | null
}

export type RefusProgramme = 'heure' | 'destinataire' | 'role'

export interface DomaineRapports {
  rapport(filtre: FiltreRapport): Promise<Rapport>
  exporter(filtre: FiltreRapport, format: 'csv' | 'pdf'): Promise<Resultat<{ nom: string; contenu: string; type: string }, 'peu_de_donnees'>>
  rapportPilote(): Promise<Resultat<{ nom: string; contenu: string; type: string }, 'pilote_en_cours'>>
  /** Rapport programmé chaque vendredi. */
  programme(): Promise<ProgrammeRapport>
  programmer(p: Pick<ProgrammeRapport, 'actif' | 'heure' | 'format' | 'destinataire'>): Promise<Resultat<{ prochain: Instant | null }, RefusProgramme>>
}
