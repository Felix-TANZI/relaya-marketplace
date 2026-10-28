// Connecteurs du domaine « emballages » (backend-kit/apps/entreprise_flotte). Application du livreur :
// emballages.confirmer_remise ; console : emballages.avancer_emballages, recevoir_commande, creer_plage.
import { c, type ConnecteursDe } from './types'

const D = 'Emballages'

export const ROUTES_EMBALLAGES: ConnecteursDe<'emballages'> = {
  'emballages.etat': c(D, 'branche', 'GET /api/company/packaging', '→ EtatEmballages', 'stock calculé depuis les mouvements ; écart du mois (ENT-EMB-ECART-MOIS)'),
  'emballages.remettre': c(D, 'branche', 'POST /api/company/packaging/handovers {livreurId, items, plage} (Idempotency-Key)', '→ Resultat<object, quantite|plage|chevauchement> ; 403 role_forbidden', 'en attente jusqu’à la confirmation du livreur ; la plage est coupée dans un rouleau du stockage'),
  'emballages.commander': c(D, 'branche', 'POST /api/company/packaging/orders {format, n, livraison} (Idempotency-Key)', '→ Resultat<object, au_dessus_du_seuil|quantite>', 'seulement au seuil ENT-EMB-REAPPRO'),
  'emballages.justifier': c(D, 'branche', 'POST /api/company/packaging/discrepancies {format, n, motif, photo} (Idempotency-Key)', '→ Resultat<object, quantite|motif|photo>'),
  'emballages.declarerPlagePerdue': c(D, 'branche', 'POST /api/company/label-ranges/{id}/invalidate', '→ Resultat<object, plage>', 'plage invalidée : plus aucune étiquette liée'),
}
