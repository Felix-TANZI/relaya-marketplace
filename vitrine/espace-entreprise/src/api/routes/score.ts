// Connecteurs du domaine « score » (backend-kit/apps/entreprise_argent).
import { c, type ConnecteursDe } from './types'

const D = 'Score'

export const ROUTES_SCORE: ConnecteursDe<'score'> = {
  'score.score': c(D, 'branche', 'GET /api/company/trust', '→ ScoreEntreprise', 'Trust Score fixé par BelivaY (lecture seule) ; par livreur, par zone, événements, alerte de descente ; aucune mission close : score null'),
}
