// Connecteurs du domaine « aujourdhui » (backend-kit/apps/livreur_tournee).
import { c, type ConnecteursDe } from './types'

const D = 'Aujourd’hui'

export const ROUTES_AUJOURDHUI: ConnecteursDe<'aujourdhui'> = {
  'aujourdhui.journee': c(D, 'branche', 'GET /api/courier/today', '→ Journee ; 403 not_courier', 'maintenant, paquets du jour, tuiles (missions validées ; jamais un prix BelivaY → entreprise), alertes kit, pièces, certification ; la batterie est lue sur le téléphone'),
}
