// Connecteurs du domaine « carte » (backend-kit/apps/entreprise_operations).
import { c, type ConnecteursDe } from './types'

const D = 'Carte'

export const ROUTES_CARTE: ConnecteursDe<'carte'> = {
  'carte.positions': c(D, 'branche', 'GET /api/company/fleet/positions', '→ PositionLivreur[]', 'livreurs en mission active seulement (dernière position), jamais hors mission'),
  'carte.fond': c(D, 'branche', 'GET /api/company/fleet/map', '→ {zones, lieux}', 'zones déclarées (centre, rayon), relais et boutiques des paquets acceptés, point de stockage ; jamais le client'),
}
