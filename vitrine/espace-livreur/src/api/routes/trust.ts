// Connecteurs du domaine « trust » (backend-kit/apps/livreur_journee).
import { c, type ConnecteursDe } from './types'

const D = 'Trust Score'

export const ROUTES_TRUST: ConnecteursDe<'trust'> = {
  'trust.trust': c(D, 'branche', 'GET /api/courier/trust', '→ TrustLivreur', 'jamais le score d’un autre livreur'),
  'trust.contester': c(D, 'branche', 'POST /api/courier/trust/events/{id}/contest {motif, note, enLigne, origine} (Idempotency-Key)', '→ Resultat hors_delai | deja_conteste | note_trop_courte | non_contestable ; 422 motif', 'une fois, sous LIV-TSC-CONTESTATION-J jours ; effet suspendu dès la réception'),
}
