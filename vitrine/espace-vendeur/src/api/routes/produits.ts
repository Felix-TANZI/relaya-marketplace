// Connecteurs du domaine « produits » (backend-kit/apps/vendeur_catalogue).
import { c, type ConnecteursDe } from './types'

const D = 'Produits'

export const ROUTES_PRODUITS: ConnecteursDe<'produits'> = {
  'produits.liste': c(D, 'branche', 'GET /api/vendors/offers', '→ ListeProduits', 'tri PRD-02 ; gardé par vente du moteur (garde_par_vente) ; ventes, gardé et litiges du mois depuis les commandes ; montants null pour l’accès Préparation'),
  'produits.detail': c(D, 'branche', 'GET /api/vendors/offers/{id}', '→ Produit ; 404 → null', 'photos réelles {image, srcset}'),
  'produits.changerStock': c(D, 'branche', 'PUT /api/vendors/offers/{id}/stock {stock}', '→ Resultat<{produit}, stock>', 'accès Préparation compris ; Product de relaya mis à jour'),
  'produits.pause': c(D, 'branche', 'POST /api/vendors/offers/{id}/pause {enPause}', '→ Produit ; 404 → null ; 403 owner_only', 'Product de relaya inactif pendant la pause'),
  'produits.regler': c(D, 'branche', 'PUT /api/vendors/offers/{id} {paiementAuRetrait?, prixAuto?, plancherPrive?, seuilAlerte?}', '→ Resultat<{produit}, plancher|seuil|reserve>', 'Préparation : raison reserve'),
  'produits.dupliquer': c(D, 'branche', 'POST /api/vendors/offers/{id}/duplicate {variante} (Idempotency-Key)', '→ Resultat<{brouillonId, rattache}, variante|existe|fiche> ; 403 owner_only', 'photos prises pour « copie:<offre> » rattachées au brouillon'),
  'produits.supprimer': c(D, 'branche', 'DELETE /api/vendors/offers/{id}', '→ Resultat<{}, etat>', 'brouillon seulement ; annulable'),
  'produits.restaurer': c(D, 'branche', 'POST /api/vendors/offers/{id}/restore', '→ 204'),
  'produits.variantes': c(D, 'branche', 'GET /api/vendors/sheets/{id}/variants', '→ VarianteDeFiche[]'),
  'produits.exporter': c(D, 'branche', 'GET /api/vendors/offers/export', '→ text/csv', 'identifiant;produit;variante;etat;prix;stock;seuil (prix vide pour l’accès Préparation)'),
  'produits.importer': c(D, 'branche', 'POST /api/vendors/offers/import {csv}', '→ Resultat<{lignes, ignorees}, vide|format>', 'stock et seuil par identifiant'),
}
