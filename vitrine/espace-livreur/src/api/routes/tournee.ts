// Connecteurs du domaine « tournee » (backend-kit/apps/livreur_tournee) : ordre imposé, preuves, appels masqués.
import { c, type ConnecteursDe } from './types'

const D = 'Tournée'

export const ROUTES_TOURNEE: ConnecteursDe<'tournee'> = {
  'tournee.courante': c(D, 'branche', 'GET /api/courier/rounds/current', '→ Tournee ; 404 → null', 'lieu d’un domicile servi pour l’arrêt en cours seulement, effacé POSITION-CLIENT-EFFACEE-MIN après la remise'),
  'tournee.regles': c(D, 'branche', 'GET /api/courier/rounds/rules', '→ ReglesLivreur', 'paramètres du registre'),
  'tournee.itineraire': c(D, 'branche', 'GET /api/courier/stops/{id}/route', '→ Itineraire ; 404 → null', 'arrêt en cours seulement'),
  'tournee.arriver': c(D, 'branche', 'POST /api/courier/stops/{id}/arrive {confirme?, origine} (Idempotency-Key)', '→ Resultat {route} ordre_impose | ecart_position | colis_manquants ; 409 state_changed'),
  'tournee.signalerRoute': c(D, 'branche', 'POST /api/courier/road-reports {note, origine} (Idempotency-Key)', '→ Resultat {jusqua} note_trop_courte', 'visible des livreurs de la zone pendant ROUTE-COUPEE-H ; numéros et liens retirés'),
  'tournee.deposerPreuve': c(D, 'branche', 'POST /api/courier/media {nature, objet, octets, empreinte, nette, origine} (Idempotency-Key)', '→ Resultat {id} floue | trop_lourde ; 422 invalid', 'avant l’action qui la cite'),
  'tournee.joignables': c(D, 'branche', 'GET /api/courier/calls/contacts', '→ Joignable[]', 'parties de l’arrêt en cours, entreprise, support'),
  'tournee.appels': c(D, 'branche', 'GET /api/courier/calls', '→ Appel[]', 'métadonnées seulement, jamais un numéro'),
  'tournee.appeler': c(D, 'branche', 'POST /api/courier/calls {correspondant, mode, modele?, origine} (Idempotency-Key)', '→ Resultat {appel} hors_mission ; 422 invalid'),
  'tournee.raccrocher': c(D, 'branche', 'POST /api/courier/calls/{id}/hangup {origine} (Idempotency-Key)', '→ Resultat ; 404 not_found'),
  'tournee.prioriser': c(D, 'branche', 'POST /api/courier/stops/{id}/first {origine} (Idempotency-Key)', '→ Resultat {ordre} ramassage_avant | sur_place | deja_en_cours | termine & {avant?}', 'terrain : l’arrêt passe en cours, les autres suivent ; jamais une remise avant le ramassage de ses colis ; l’entreprise est prévenue (stop.reordered)'),
  'tournee.annoncerRetard': c(D, 'branche', 'POST /api/courier/stops/{id}/delay {minutes, origine} (Idempotency-Key)', '→ Resultat {arriveeEstimee} hors_mission ; 422 invalid', 'arrêt en cours seulement ; nouvelle heure au client (domicile), au vendeur et à l’entreprise (stop.delayed)'),
  'tournee.simulerValidationIncident': c(D, 'demo', 'portail de l’entreprise (incident.updated)', undefined, 'l’entreprise décide : POST /api/company/incidents/{id}/decision'),
}
