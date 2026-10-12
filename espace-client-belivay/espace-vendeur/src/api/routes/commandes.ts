// Connecteurs du domaine « commandes » (backend-kit/apps/vendeur_commandes).
import { c, type ConnecteursDe } from './types'

const D = 'Commandes'

export const ROUTES_COMMANDES: ConnecteursDe<'commandes'> = {
  'commandes.vue': c(D, 'branche', 'GET /api/vendors/orders?state=', '→ VueCommandes ; 422 invalid', 'prep | cours | fin | pb ; compteurs, detail et items de la même lecture (CMD-02) ; montants null pour l’accès Préparation'),
  'commandes.liste': c(D, 'branche', 'GET /api/vendors/orders?state=', '→ VueCommandes.items'),
  'commandes.compteurs': c(D, 'branche', 'GET /api/vendors/orders?state=prep', '→ VueCommandes.compteurs'),
  'commandes.detail': c(D, 'branche', 'GET /api/vendors/orders/{id}', '→ Commande ; 404 → null', 'statut et argent dérivés des faits (retrait, Tout est en ordre, litige, retour, recours) ; versé : référence BLV-VS'),
  'commandes.journal': c(D, 'branche', 'GET /api/vendors/orders/{id}/journal', '→ EntreeJournal[] ; 404 not_found', 'du plus récent au plus ancien (JRN-02)'),
}
