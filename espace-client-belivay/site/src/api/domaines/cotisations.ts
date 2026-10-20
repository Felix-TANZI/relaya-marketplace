// Domaine « Cotisations » (CL-15 ; FF-EX02) : un cadeau payé à plusieurs, lien public c/{code}, noms discrets
// masqués, hausse de prix à compléter ou rembourser.
//
// NON DISPONIBLE EN PRODUCTION — décision produit requise avant de construire quoi que ce soit ici : ces routes ne
// visent que `backend-kit/apps/extras` (POST /api/me/pools, etc.), qui N'EST PAS dans `backend/apps/`
// (relaya-marketplace) ni dans `INSTALLED_APPS` (voir `backend/relaya/settings/base.py`). Aucun modèle backend
// (cotisation, contribution, hausse de prix) n'existe nulle part dans le dépôt de production : ce n'est pas une
// route à corriger, c'est un système entier (modèle de données, paiement partagé, lien public, règle de hausse) à
// concevoir avant de pouvoir l'écrire.
// Toutes les méthodes sont donc volontairement absentes d'ici : `source-api.ts` les fait lever NonDisponible (voir
// src/api/routes.ts, état « serveur »), l'écran le sait et dit quoi créer plutôt que d'appeler une route qui
// n'existera jamais tant que la décision produit n'est pas prise.
import type { ClientApi } from '../client'

export function domaineCotisations(_api: ClientApi) {
  return {}
}
