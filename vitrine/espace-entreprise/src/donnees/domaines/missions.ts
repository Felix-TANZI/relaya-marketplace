// Domaine « missions » (ENT-P13) : missions par onglet de la machine à états (à affecter, affectées, en cours,
// déposées, closes, incidents : ENT-02-R23), avancement, colis sous garde, ce qui se passe, heure limite, heure
// estimée et marge (seuil_marge_ambre, seuil_alerte_marge), livreur hors connexion (dernier état connu, ENT-RG-R103),
// montant et versement des missions closes (montants masqués au répartiteur). Appel masqué (DP-61, DED-14) : ligne
// ouverte pendant la mission seulement, jamais le vrai numéro, journalisé sans contenu ; relance du livreur (push).
// API : GET /api/company/missions?tab= ; POST /api/company/calls ; temps réel company.{id}.missions.
import type { CodeZone, Francs, Instant, LivreurCourt, Resultat } from '../communs'
import type { GenrePaquet } from './paquets'

export type OngletMissions = 'a_affecter' | 'affectees' | 'en_cours' | 'deposees' | 'closes' | 'incidents'
export type MomentMission = 'non_parti' | 'vers_boutique' | 'chez_boutique' | 'vers_relais' | 'au_relais' | 'vers_client' | 'arret' | 'depose' | 'clos' | 'a_affecter'

export interface PointRoute {
  lat: number
  lng: number
  type: 'boutique' | 'relais' | 'domicile'
  nom: string
  fait: boolean
}

export interface Mission {
  id: string
  paquetId: string
  genre: GenrePaquet
  zone: CodeZone
  onglet: OngletMissions
  livreur: LivreurCourt | null
  etape: number
  etapes: number
  colisSousGarde: number
  colisTotal: number
  moment: MomentMission
  lieu: string | null // lieu du moment (« Relais Melen »)
  heureLimite: Instant
  eta: Instant | null
  margeMin: number | null
  creneau: { debut: Instant; fin: Instant } | null
  horsConnexionDepuis: Instant | null
  misAJour: Instant
  incidentId: string | null
  montant: Francs | null
  versementLe: Instant | null
  closLe: Instant | null
  itineraire: PointRoute[]
}

export interface Appel {
  id: string
  missionId: string
  livreur: string
  debut: Instant
  dureeS: number | null
  canal: 'application' | 'numero_masque' | 'sms_masque'
  ligne: string | null // numéro de la ligne BelivaY à composer (numéro masqué) ; jamais le vrai numéro du livreur
  note?: string | null // note de l'entreprise sur l'appel (ce qu'elle retient), jamais le contenu de la conversation
}

export interface DomaineMissions {
  liste(onglet: OngletMissions): Promise<Mission[]>
  mission(id: string): Promise<Mission | null>
  compteurs(): Promise<Record<OngletMissions, number>>
  appeler(missionId: string, canal: Appel['canal']): Promise<Resultat<{ appel: Appel }, 'ligne_fermee'>>
  raccrocher(appelId: string): Promise<void>
  /** Note de l'entreprise sur un appel (panneau d'appel flottant) ; la dernière remplace la précédente. */
  noterAppel(appelId: string, note: string): Promise<void>
  appels(missionId: string): Promise<Appel[]>
  relancer(missionId: string, sujet: 'preuves' | 'position' | 'depart'): Promise<Resultat<{ envoyeLe: Instant }, 'trop_tot'>>
}
