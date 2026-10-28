// Connecteurs du domaine « notifications » (backend-kit/apps/vendeur_boutique ; NotificationVendeur du socle).
import { c, type ConnecteursDe } from './types'

const D = 'Notifications'

export const ROUTES_NOTIFICATIONS: ConnecteursDe<'notifications'> = {
  'notifications.liste': c(D, 'branche', 'GET /api/vendors/notifications?filter=', '→ Notification[]', 'tout | urgent | argent ; argent masquées pour l’accès Préparation ; 12 mois'),
  'notifications.compteurs': c(D, 'branche', 'GET /api/vendors/notifications/counts', '→ {tout, urgent, argent, nonLues}'),
  'notifications.nonLues': c(D, 'branche', 'GET /api/vendors/notifications/unread-count', '→ {nonLues}'),
  'notifications.marquerLue': c(D, 'branche', 'POST /api/vendors/notifications/{id}/read {lue?}', '→ 204 ; 404 not_found', 'lue par membre'),
  'notifications.toutMarquerLu': c(D, 'branche', 'POST /api/vendors/notifications/read-all', '→ 204'),
  'notifications.reglages': c(D, 'branche', 'GET /api/vendors/notifications/settings', '→ ReglagesNotifications'),
  'notifications.regler': c(D, 'branche', 'PUT /api/vendors/notifications/settings {versements?, avis?, conseils?, sonDistinct?}', '→ ReglagesNotifications', 'versements : propriétaire seulement'),
}
