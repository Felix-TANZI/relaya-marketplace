// Connecteurs du domaine « activite » (backend-kit/apps/livreur_journee).
import { c, type ConnecteursDe } from './types'

const D = 'Activité'

export const ROUTES_ACTIVITE: ConnecteursDe<'activite'> = {
  'activite.activite': c(D, 'branche', 'GET /api/courier/activity?period=', '→ Activite', 'gains = tarif par mission de l’entreprise s’il est fixé, sinon le compteur ; jamais le prix BelivaY → entreprise'),
  'activite.releves': c(D, 'branche', 'GET /api/courier/activity/statements', '→ Releves', 'semaines du samedi au vendredi (8 au plus), missions validées seulement ; gains seulement si l’entreprise affiche son tarif'),
}
