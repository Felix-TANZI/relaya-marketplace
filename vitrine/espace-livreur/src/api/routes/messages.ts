// Connecteurs du domaine « messages » (backend-kit/apps/livreur_session) : fils (entreprise, support, parties des
// missions), masquage des numéros et liens par le serveur, appels masqués.
import { c, type ConnecteursDe } from './types'

const D = 'Messages'

export const ROUTES_MESSAGES: ConnecteursDe<'messages'> = {
  'messages.fils': c(D, 'branche', 'GET /api/courier/threads', '→ Fil[]', 'fils de mission fermés LIV-FIL-FERMETURE-H après la mission ; jamais un nom de client'),
  'messages.fil': c(D, 'branche', 'GET /api/courier/threads/{id}/messages', '→ FilOuvert ; 404 → null'),
  'messages.marquerLu': c(D, 'branche', 'POST /api/courier/threads/{id}/read', '→ 204'),
  'messages.envoyer': c(D, 'branche', 'POST /api/courier/threads/{id}/messages {texte, enLigne, origine} (Idempotency-Key)', '→ Resultat {masque} fil_ferme | vide ; 404 not_found', 'numéros et liens masqués par le serveur ; heure d’origine gardée hors connexion'),
  'messages.signaler': c(D, 'branche', 'POST /api/courier/threads/{id}/report {messageId, origine} (Idempotency-Key)', '→ Resultat deja_signale ; 404 not_found', 'revue du support'),
  'messages.appeler': c(D, 'branche', 'POST /api/courier/threads/{id}/call {origine} (Idempotency-Key)', '→ Resultat {appel} fil_ferme | pas_encore | hors_horaires | indisponible', '{id} : le fil, ou « entreprise » / « support » ; jamais un numéro'),
  'messages.raccrocher': c(D, 'branche', 'POST /api/courier/threads/calls/{id}/end {fin}', '→ 204'),
}
