// Connecteurs du domaine « aide » (backend-kit/apps/livreur_session) : fiches, numéros d'urgence, SOS.
import { c, type ConnecteursDe } from './types'

const D = 'Aide'

export const ROUTES_AIDE: ConnecteursDe<'aide'> = {
  'aide.aide': c(D, 'branche', 'GET /api/courier/help/articles', '→ Aide', 'numéros d’urgence du pays (emergency_numbers) ; support : SUP-WA, SUP-HORAIRES, SUP-DELAI'),
  'aide.sosEnCours': c(D, 'branche', 'GET /api/courier/sos', '→ EtatSOS ; 404 → null', 'arrêt automatique à la fin du partage (LIV-SOS-POSITION-MIN)'),
  'aide.sos': c(D, 'branche', 'POST /api/courier/sos {enLigne, origine} (Idempotency-Key)', '→ Resultat {id} deja_en_cours', 'entreprise appelée puis le support ; entreprise prévenue en priorité critique'),
  'aide.positionSOS': c(D, 'branche', 'POST /api/courier/sos/{id}/position {lat, lng, precisionM}', '→ 204 ; 404 not_found', 'une position toutes les SOS-POSITION-S secondes'),
  'aide.arreterSOS': c(D, 'branche', 'POST /api/courier/sos/{id}/stop {origine} (Idempotency-Key)', '→ Resultat deja_arrete ; 404 not_found'),
}
