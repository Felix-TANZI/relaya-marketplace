// Domaine « notifications » (ENT-P23) : alertes de l'entreprise par priorité (critique, maintenant, à valider, info).
// Push, portail et e-mail par défaut (canaux_par_defaut) ; SMS seulement pour un litige ouvert et un versement refusé
// (types_sms), alertes verrouillées (alertes_verrouillees) ; aucune promotion par SMS (ENT-P23R-04) ; aucun code dans
// une notification (DED-19). Paquet publié dans une zone : notifié aux utilisateurs habilités, avec le délai
// d'acceptation (ENT-P23R-03). Vente flash sur sélection : préavis de volume (DED-11). Chaque ligne ouvre l'écran.
// API : GET /api/company/notifications ; POST …/{id}/read, …/read-all.
import type { Instant } from '../communs'
import type { Canal, TypeAlerte } from '../../calculs/ent08'

export interface Notification {
  id: string
  type: TypeAlerte
  priorite: 'critique' | 'maintenant' | 'a_valider' | 'info'
  titre: string
  texte: string
  le: Instant
  lue: boolean
  canaux: Canal[]
  route: string
  params: Record<string, string>
}

export interface DomaineNotifications {
  liste(): Promise<Notification[]>
  lire(id: string): Promise<void>
  marquerLues(): Promise<void>
}
