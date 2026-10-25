// Source « api » de l'espace livreur : la même interface que la démonstration (src/donnees/source.ts), servie par le
// serveur (relaya-marketplace avec les applications du kit backend-kit/apps/livreur_* : routes /api/courier/…), même
// patron que l'espace vendeur : une fabrique par domaine (src/api/domaines/), le client HTTP partagé du site
// (site/src/api/client.ts). Les routes de chaque méthode : src/api/routes.ts (CONNECTEURS-LIVREUR.md). Une méthode
// propre à la démonstration (geste d'une autre interface : relais, client, agrégateur, entreprise) lève NonDisponible.
import { clientDeLEnvironnement, type ClientApi } from '@client/api/client'
import type { SourceLivreur } from '../donnees/source'
import { BRANCHES } from './domaines'

export function sourceApi(api: ClientApi | null = clientDeLEnvironnement()): SourceLivreur {
  if (!api) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
  return BRANCHES(api)
}
