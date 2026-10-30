// Domaine « compte » (ENT-P27, bandeau d'état) : sept états décidés par BelivaY (ENT-03-R27), source unique
// account.state ; motif, niveau, dates, effets, recours (une fois), journal immuable. L'entreprise lit ; elle ne change
// aucun état. Elle peut faire un recours une fois quand l'état le permet (ENT-03-R32 : jamais de suspension sans motif,
// niveau et recours) ; le recours part à la console et ouvre un fil avec BelivaY (ENT-P22).
// API : GET /api/company/account/state (même donnée dans /me) ; POST /api/company/account/appeal ; temps réel
// account.state_changed.
import type { CodeZone, Instant, Resultat, Role } from '../communs'

export type EtatCompte = 'configuration' | 'pilote' | 'actif' | 'restreint' | 'suspendu' | 'preavis' | 'resilie'
export const ETATS_COMPTE: EtatCompte[] = ['configuration', 'pilote', 'actif', 'restreint', 'suspendu', 'preavis', 'resilie']

export interface EvenementCompte {
  le: Instant
  etat: EtatCompte
  motif: string
  par: string // « Console BelivaY · Aureon » ou « tâche automatique »
}

export interface EtatDuCompte {
  etat: EtatCompte
  motif: string | null
  niveau: string | null
  depuis: Instant
  jusqua: Instant | null
  decidePar: string | null
  recours: { permis: boolean; utilise: boolean; envoyeLe?: Instant | null; texte?: string | null }
  effets: { zones: CodeZone[]; plafond: number | null; publication: boolean }
  pilote: { jour: number; duree: number } | null
  journal: EvenementCompte[]
  /** Pilote : date du bilan conjoint écrit (jour de fin du pilote). */
  bilanLe?: Instant | null
  /** Préavis de résiliation : fin à 23 h 59 (notification + préavis), jour courant sur la durée du préavis. */
  preavis?: { fin: Instant; jour: number; duree: number; dernierVersement: Instant } | null
  /** Résilié : fin de la lecture seule (fin du contrat + lecture_apres_resiliation). */
  lectureJusqua?: Instant | null
  /** Suspendu ou résilié : colis encore sous garde à terminer ou déposer (DED-29). */
  aTerminer?: { colis: number; relais: string; avant: Instant } | null
  /** Restreint : ce qui est réduit (zones retirées, capacité, plafond). */
  restriction?: string | null
  /** Jour de pluie forte décidé par la console (délai saisonnier, ENT-P04R-07). */
  pluie?: boolean
}

/**
 * Une ligne de l'activité de l'équipe (journal signé des gestes de l'entreprise, DED-17, DED-18) : qui (nominatif, son
 * rôle), quand, quoi, sur quel objet — prise et affectation des paquets, flotte, litiges, utilisateurs et réglages.
 * Ajout seul : aucune ligne ne se modifie ni ne s'efface. Aucun montant (lisible par chaque rôle).
 */
export interface LigneActivite {
  id: string
  le: Instant
  par: string // « Serge Mbarga »
  role: Role | null // null : BelivaY ou un système
  genre: 'paquets' | 'flotte' | 'litiges' | 'equipe'
  quoi: string // texte français du geste (traduit par l'écran)
  objet: string | null // « PQ-Z3-261013-009 », « LT-031 », « Z6 »…
  lien: { route: string; id?: string } | null
}

export interface DomaineCompte {
  etat(): Promise<EtatDuCompte>
  /** Recours, une fois, quand l'état le permet ; le texte explique pourquoi la décision est contestée. */
  faireRecours(texte: string): Promise<Resultat<object, 'non_permis' | 'deja_utilise' | 'texte'>>
  /** Activité de l'équipe, la plus récente d'abord (page Activité, AJ-E). */
  activite(): Promise<LigneActivite[]>
  /** Démonstration seulement : voir l'espace dans un autre état décidé par la console, ou un jour de pluie forte. */
  scenario(s: { etat?: EtatCompte; pluie?: boolean }): Promise<void>
}
