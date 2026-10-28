// Source « api » de l'espace entreprise : la même interface que la démonstration (src/donnees/source.ts), servie par le
// serveur (relaya-marketplace avec les applications du kit backend-kit/apps/entreprise_* : routes /api/company/…), même
// patron que l'espace vendeur (espace-vendeur/src/api/source-api.ts) : une fabrique par domaine (src/api/domaines/), le
// client HTTP partagé du site (site/src/api/client.ts : jeton, rafraîchissement sur 401, nouvelles tentatives, délai).
// Les routes de chaque méthode sont dans src/api/routes.ts (CONNECTEURS-ENTREPRISE.md). Une méthode propre à la
// démonstration (changer de rôle, scénario de la console) lève NonDisponible.
import { clientDeLEnvironnement, type ClientApi } from '@client/api/client'
import type { SourceEntreprise } from '../donnees/source'
import { BRANCHES } from './domaines'

export function sourceApi(api: ClientApi | null = clientDeLEnvironnement()): SourceEntreprise {
  if (!api) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
  return BRANCHES(api)
}
