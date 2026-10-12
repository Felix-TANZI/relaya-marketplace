// Connecteurs du domaine « publicite » (DP-59, backend-kit/apps/publicite : espace.py pour les types de l'écran,
// services.py pour les gestes). Recharge : demande Mobile Money confirmée par le webhook de l'agrégateur ; rien n'est
// crédité avant. Réservé au propriétaire : 403 owner_only → Réservé.
import { c, type ConnecteursDe } from './types'

const D = 'Publicité'
const B = 'branche' as const
export const ROUTES_PUBLICITE: ConnecteursDe<'publicite'> = {
  'publicite.tableau': c(D, B, 'GET /api/vendors/ads/dashboard', '→ TableauPub ; 403 owner_only', 'sélections flash : deux prochains samedis 08 h (au moins 24 h avant) ; règles VD-PUB-* du registre'),
  'publicite.campagnes': c(D, B, 'GET /api/vendors/ads/campaigns', '→ Campagne[] ; 403 owner_only', 'coût du clic au second prix face aux autres boutiques ; enchère hebdomadaire en attente : candidature'),
  'publicite.produits': c(D, B, 'GET /api/vendors/ads/products', '→ ProduitAnnoncable[] (seuil de qualité)'),
  'publicite.mouvements': c(D, B, 'GET /api/vendors/ads/ledger', '→ MouvementPub[] (solde prépayé, facture du mois)'),
  'publicite.estimer': c(D, B, 'POST /api/vendors/ads/quote {emplacement, offreId, enchere?, budgetJour?, mode?, semaines?, debut?, remisePourCent?}', '→ Estimation', 'même calcul que la confirmation ; fourchettes d’audience à brancher sur les statistiques de recherche'),
  'publicite.creer': c(D, B, 'POST /api/vendors/ads/campaigns/new {emplacement, offreId, enchere?, budgetJour?, mode?, semaines?, debut?, remisePourCent?} (Idempotency-Key)', '→ Resultat<{campagne}, RefusCampagne>', 'forfait débité à la confirmation ; enchère hebdomadaire : rien avant l’attribution (services.attribuer_semaine) ; candidature flash : acceptée par la console (selectionner_flash), elle rejoint Promotions'),
  'publicite.pause': c(D, B, 'POST /api/vendors/ads/campaigns/{id}/pause {pause: true}', '→ Campagne du kit ; 422 state_changed → Resultat etat'),
  'publicite.reprendre': c(D, B, 'POST /api/vendors/ads/campaigns/{id}/resume', '→ Resultat<object, etat|RaisonInelegible|solde_insuffisant>'),
  'publicite.arreter': c(D, B, 'POST /api/vendors/ads/campaigns/{id}/stop (Idempotency-Key)', '→ { rembourse } ; 422 state_changed → Resultat etat', 'heures non diffusées rendues au solde ; vente flash sélectionnée : sa vente flash de Promotions s’arrête'),
  'publicite.enchere': c(D, B, 'POST /api/vendors/ads/campaigns/{id}/bid {enchere, budgetJour}', '→ Resultat<object, etat|sous_plancher|budget_min>'),
  'publicite.recharger': c(D, B, 'POST /api/vendors/ads/top-up {montant} (Idempotency-Key)', '→ Mouvement { id, montant, a, statut } ; 422 annonce_refusee → Resultat montant'),
  'publicite.recharge': c(D, B, 'GET /api/vendors/ads/top-up/{id}', '→ Recharge ; 404 → null'),
  'publicite.annulerRecharge': c(D, B, 'DELETE /api/vendors/ads/top-up/{id}', '→ 204'),
}
