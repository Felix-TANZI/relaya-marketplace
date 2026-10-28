// Source « api » de la console : la même interface que la démonstration (src/donnees/source.ts), servie par le kit
// (relaya-marketplace avec backend-kit/apps/console : routes /api/console/…), même patron que l'entreprise
// (espace-entreprise/src/api/source-api.ts) : une fabrique par domaine (src/api/domaines/), le client HTTP partagé du
// site (site/src/api/client.ts : jeton, rafraîchissement sur 401, nouvelles tentatives, délai). Routes et refus :
// src/api/routes.ts et CONNECTEURS-ADMIN.md.
import type { ClientApi } from '@client/api/client'
import type { SourceAdmin } from '../donnees/source'
import { clientConsole } from './client-console'
import { BRANCHES } from './domaines'

export function sourceApi(api: ClientApi | null = clientConsole()): SourceAdmin {
  if (!api) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
  return BRANCHES(api)
}
