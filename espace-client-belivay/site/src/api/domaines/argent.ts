// Domaine « Portefeuille, moyens de paiement, factures » (CL-13 ; CWL-01 à CWL-12, CCO-07, CCO-14, CCO-15, CCO-20 ;
// DP-23, DP-48 ; CAP-21, CAP-24).
//
// NON DISPONIBLE EN PRODUCTION — décision produit requise avant de construire quoi que ce soit ici :
// - Ces routes ne visent que `backend-kit/apps/wallet`, qui N'EST PAS dans `backend/apps/` (relaya-marketplace) :
//   voir `backend/relaya/settings/base.py`, commentaire d'INSTALLED_APPS : « wallet volontairement exclu (en
//   attente de confirmation CEO : le référentiel verrouillé interdit tout solde/jeton stocké côté client) ».
//   C'est un désaccord direct avec le Référentiel unique verrouillé (pas de dépôt, pas de jeton, plafond 3,5 % GMV).
// - relaya a un système de paiement réel (apps.payments : EscrowHold, SettlementBatch, PayoutRequest), mais il ne
//   sert aujourd'hui que l'acheteur en lecture (historique : GET /api/payments/v2/me/payments/,
//   GET /api/payments/v2/me/refunds/) et le partenaire (relais/vendeur) côté versement. Aucun solde, aucune
//   recharge, aucun retrait, aucun numéro Mobile Money ni carte enregistrés côté client n'existe.
// - PDF des factures : aucune bibliothèque PDF côté serveur (CONNECTEURS.md § 4) ; `GET /api/orders/{id}/invoice.pdf`
//   n'existe pas non plus.
// Toutes les méthodes sont donc volontairement absentes d'ici : `source-api.ts` les fait lever NonDisponible (voir
// src/api/routes.ts, état « serveur »), l'écran le sait et dit quoi créer plutôt que d'appeler une route qui
// n'existera jamais tant que la décision CEO n'est pas prise.
import type { ClientApi } from '../client'

export function domaineArgent(_api: ClientApi) {
  return {}
}
