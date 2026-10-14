// Domaine « Listes d'envies » (CL-14 ; FF-LISTE-ENVIES) : toutes les occasions (anniversaire, mariage avec sa
// cagnotte, dot, naissance…), le statut WhatsApp, la page publique l/{code} et « offrir » depuis n'importe où.
//
// Vérifié (14 oct. 2026) contre le vrai backend, pas seulement contre CONNECTEURS.md (daté du 3 oct., écrit avant
// l'arrêt du rollout) : apps.wishlists, prévu par le kit backend-kit/apps/wishlists, n'existe PAS dans
// backend/apps/ (seuls apps.client_core, apps.otp, apps.client_accounts et apps.notifications_client du kit sont
// réellement dans INSTALLED_APPS — voir backend/relaya/settings/base.py). Aucune route /api/me/wishlists ni
// /api/wishlists/{code} n'existe côté serveur.
//
// Ce domaine ne définit donc AUCUNE des 14 méthodes « listes » : elles tombent sur le repli générique de
// src/api/source-api.ts, qui lève NonDisponible (route attendue lue dans src/api/routes.ts, toutes passées à
// l'état 'serveur'). L'écran affiche alors le message prévu pour ce cas (AvisErreurs.tsx, genre non_disponible :
// « Cette fonction arrive bientôt ») au lieu d'un 404 brut. Construire tout le sous-système (listes, cagnotte
// publique, cadeau payé par carte avec contrôle de cohérence diaspora, liens publics) est un gros morceau
// métier — pas une extension mécanique de serializer — donc pas improvisé ici ; voir le rapport de session pour
// la question à trancher avant de le construire.
import type { Source } from '../../donnees/source'
import type { ClientApi } from '../client'

export function domaineListes(_api: ClientApi) {
  return {} satisfies Partial<Source>
}
