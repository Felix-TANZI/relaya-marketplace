// Connecteurs du domaine « notifications » (backend-kit/apps/entreprise_session).
import { c, type ConnecteursDe } from './types'

const D = 'Notifications'

export const ROUTES_NOTIFICATIONS: ConnecteursDe<'notifications'> = {
  'notifications.liste': c(D, 'branche', 'GET /api/company/notifications', '→ Notification[]', 'celles de l’utilisateur connecté, les plus récentes d’abord'),
  'notifications.lire': c(D, 'branche', 'POST /api/company/notifications/{id}/read', '→ {ok} ; 404'),
  'notifications.marquerLues': c(D, 'branche', 'POST /api/company/notifications/read-all', '→ {ok}'),
}
