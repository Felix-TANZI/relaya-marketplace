// Source « api » (vague 3) : la même interface que la démonstration (src/donnees/source.ts), servie par le serveur
// (relaya-marketplace avec les applications vendeur du kit backend-kit/apps/vendeur_*), même patron que le client
// (site/src/api/source-api.ts) : une fabrique par domaine, dans src/api/domaines/<domaine>.ts, qui appelle le contrat
// (backend-kit/openapi.yaml, routes /api/vendors/…) par le client HTTP partagé (site/src/api/client.ts : jeton,
// rafraîchissement sur 401, nouvelles tentatives, délai). Le client HTTP et les erreurs sont ceux du client.
// Les routes de chaque méthode sont dans src/api/routes.ts (CONNECTEURS-VENDEUR.md). Une méthode propre à la
// démonstration (geste d'une autre interface : livreur, prestataire, client) lève NonDisponible.
import { clientDeLEnvironnement, type ClientApi } from '@client/api/client'
import type { SourceVendeur } from '../donnees/source'
import { BRANCHES } from './domaines'

export function sourceApi(api: ClientApi | null = clientDeLEnvironnement()): SourceVendeur {
  if (!api) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
  return BRANCHES(api)
}
