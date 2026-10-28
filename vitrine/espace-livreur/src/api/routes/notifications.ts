// Connecteurs du domaine « notifications » (backend-kit/apps/livreur_session).
import { c, type ConnecteursDe } from './types'

const D = 'Notifications'

export const ROUTES_NOTIFICATIONS: ConnecteursDe<'notifications'> = {
  'notifications.liste': c(D, 'branche', 'GET /api/courier/notifications', '→ Notification[]', 'rubriques dans l’ordre fixe sécurité, tournée, compte, messages ; jamais un code ni un numéro'),
  'notifications.marquerLue': c(D, 'branche', 'POST /api/courier/notifications/{id}/read', '→ 204', 'accusé de lecture vu par l’entreprise'),
  'notifications.toutMarquerLu': c(D, 'branche', 'POST /api/courier/notifications/read-all', '→ 204'),
}
