// Domaine « carte » (ENT-P13, carte de la flotte) : positions des livreurs EN MISSION ACTIVE seulement (du départ à la
// clôture : ENT-P13R-01, RG-R108), toutes les frequence_position_mission secondes en mouvement ; jamais hors mission,
// jamais exportée ni donnée à un tiers (RG-R104, RG-R105) ; exception SOS : position partagée duree_partage_position_sos
// minutes. Zones, relais et boutiques des tournées ; le client n'apparaît que par sa zone. Positions conservées
// conservation_positions_mission jours. API : GET /api/company/fleet/positions ; temps réel company:{id}:fleet.
import type { CodeZone, Instant } from '../communs'

export interface PositionLivreur {
  livreurId: string
  nom: string
  initiales: string
  lat: number
  lng: number
  le: Instant
  zone: CodeZone
  missionId: string
  paquetId: string
  etat: 'en_mouvement' | 'arret' | 'hors_connexion'
  cap: { lat: number; lng: number } | null // prochain arrêt
}

export interface LieuCarte {
  id: string
  type: 'relais' | 'boutique' | 'stockage'
  nom: string
  lat: number
  lng: number
  zone: CodeZone
}

export interface ZoneCarte {
  code: CodeZone
  nom: string
  lat: number
  lng: number
  rayonKm: number // rayon du disque de même superficie (cadrage de la carte)
  polygone: [number, number][] // [lat, lon], WGS 84 : la zone telle que la carte BelivaY la trace
}

export interface DomaineCarte {
  positions(): Promise<PositionLivreur[]>
  fond(): Promise<{ zones: ZoneCarte[]; lieux: LieuCarte[] }>
}
