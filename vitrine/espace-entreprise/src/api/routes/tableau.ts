// Connecteurs du domaine « tableau » (backend-kit/apps/entreprise_session).
import { c, type ConnecteursDe } from './types'

const D = 'Tableau'

export const ROUTES_TABLEAU: ConnecteursDe<'tableau'> = {
  'tableau.tableau': c(D, 'branche', 'GET /api/company/dashboard', '→ TableauDeBord', 'à faire trié par échéance selon le rôle (rien pour le comptable) ; genres DP-66/67 : depart, depart_echu, absence, kit_a_constater (préavis échu, kit pas constaté, délai pas passé ; échéance constatJusqua), versement_a_faire (propriétaire ; départ clos, vendredi du versement arrivé, pas marqué fait), route livreur {id} ; aVerserVendredi null pour le répartiteur (relevé du vendredi) ; guide d’activation en configuration'),
}
