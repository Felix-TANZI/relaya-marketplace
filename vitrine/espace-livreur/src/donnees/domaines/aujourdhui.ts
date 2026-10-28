// Domaine « aujourdhui » (LIV-04, LIV-P04) : la journée en un coup d'œil. Règles :
// - rien n'est accepté ni refusé par le livreur : l'affectation vient de l'entreprise (LIV-P04R-02, LIV-MOD-04) ;
// - carte « Maintenant » : paquet en cours (nuit), ou paquet qui vient d'être affecté (orange), ou vide ; avancement =
//   colis ramassés ÷ colis du paquet ; reste = heure limite − maintenant (LIV-04-R05) ;
// - paquets du jour : affectés par heure limite croissante, puis terminés du plus récent au plus ancien (LIV-04-R01) ;
// - tuiles : paquets terminés, colis remis (relais + domicile, missions validées par le serveur), missions validées ou
//   gains si l'entreprise les affiche ; jamais un prix BelivaY → entreprise (LIV-04-R02 à R04, LIV-P25R-01/02) ;
// - alertes calculées le jour même : kit, pièce à J−30, certification à refaire (la batterie est lue sur le téléphone,
//   jamais transmise : LIV-P04R-05) ; aucune information commerciale (LIV-P04R-04).
import type { Instant, Jour, TypeArret } from '../communs'
import type { EtatDetaille, IdPiece } from './acces'
import type { FormatKit, Quantites } from './kit'
import type { TypePaquet } from './paquets'

/** Alerte calculée par le serveur ; l'écran la met en mots (et ajoute la batterie, lue sur le téléphone). */
export type Alerte =
  | { id: string; type: 'kit_insuffisant'; niveau: 'urgent'; paquetId: string; manque: Partial<Quantites>; route: 'kit' }
  | { id: string; type: 'kit_bas'; niveau: 'attention'; format: FormatKit; stock: number; seuil: number; route: 'kit' }
  | { id: string; type: 'piece'; niveau: 'attention' | 'urgent'; piece: IdPiece; expireLe: Instant; route: 'activation' }
  | { id: string; type: 'certification'; niveau: 'attention' | 'urgent'; expireLe: Instant; route: 'certification' }
  | { id: string; type: 'modules'; niveau: 'attention'; route: 'certification' }
export interface PaquetDuJour {
  id: string
  type: TypePaquet
  zone: string
  arrets: number
  colis: number
  heureLimite: Instant
  etat: 'affecte' | 'modifie' | 'en_cours' | 'termine' | 'clos' | 'rendu' | 'retire' | 'bloque'
  termineA: Instant | null
  destination: string // relais de dépôt ou « Remise à domicile »
}
export interface Maintenant {
  paquetId: string
  type: TypePaquet
  ton: 'en_cours' | 'nouveau' // nuit / orange
  heureLimite: Instant
  affecteA: Instant
  accepteA: Instant
  arret: { id: string; rang: number; total: number; type: TypeArret; nom: string; quartier: string; pretDepuis: Instant | null } | null
  colisRamasses: number
  colisTotal: number
  colisSurVous: number
  aRamasser: number
}
export interface Journee {
  jour: Jour
  prenom: string
  entreprise: string
  compte: { etat: EtatDetaille; niveau: number | null; finLe: Instant | null; plafondColis: number | null; domicile: boolean } // l'accueil d'un compte non actif ne garde que la garde
  maintenant: Maintenant | null
  paquets: PaquetDuJour[]
  tuiles: { paquetsTermines: number; paquetsTotal: number; colisRemis: number; colisRelais: number; colisDomicile: number; missionsValidees: number; enRevue: number; gains: number | null }
  colisSousGarde: number
  alertes: Alerte[]
  derniereSynchronisation: Instant | null
  cloturee: boolean
  regles: { batterieAlertePourcent: number; batterieEconomiePourcent: number }
}

export interface DomaineAujourdhui {
  journee(): Promise<Journee>
}
