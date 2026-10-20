// Domaine « Abonnement et cagnotte » (CL-14 ; FF-ABONNEMENT ; CAB-43, CAB-44 ; DP-54) : palier, prélèvements,
// cagnotte, parrainage, cadeau d'abonnement — CÔTÉ CLIENT (acheteur), un concept différent de l'abonnement vendeur.
//
// NON DISPONIBLE EN PRODUCTION — décision produit requise avant de construire quoi que ce soit ici :
// - Ces routes ne visent que `backend-kit/apps/subscriptions`, qui N'EST PAS dans `backend/apps/` (relaya-marketplace)
//   ni dans `INSTALLED_APPS` (voir `backend/relaya/settings/base.py`) : rien n'est installé, aucune route n'existe.
// - relaya a bien un système d'abonnement, mais c'est celui du VENDEUR (apps.vendors : SubscriptionPlan,
//   VendorSubscription, /api/vendors/plans/) : un concept produit entièrement différent de la « prime » client
//   (palier d'achat, cagnotte, parrainage) décrite ici. Aucun modèle côté client ne s'en approche.
// - `apps/client_accounts/services.py` a déjà le pont prévu pour le jour où `apps.subscriptions` existera
//   (`appeler('apps.subscriptions.services', 'cagnotte_en_attente', ...)`, `'abonnement_actif'`, etc.) : tant que
//   l'app n'est pas installée, ces valeurs restent à 0 / faux partout (compte, menu, suppression).
// Toutes les méthodes sont donc volontairement absentes d'ici : `source-api.ts` les fait lever NonDisponible (voir
// src/api/routes.ts, état « serveur »), l'écran le sait et dit quoi créer plutôt que d'appeler une route qui
// n'existera jamais tant que la décision produit n'est pas prise.
import type { ClientApi } from '../client'

export function domainePrime(_api: ClientApi) {
  return {}
}
