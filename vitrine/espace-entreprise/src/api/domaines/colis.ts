// Domaine « colis » branché sur le kit (backend-kit/apps/entreprise_operations) : files de colis, compteurs, relance.
// Format de src/donnees/domaines/colis.ts.
import type { ClientApi } from '@client/api/client'
import type { Colis, DomaineColis, FileColis } from '../../donnees/domaines/colis'
import type { Instant } from '../../donnees/communs'
import type { SourceEntreprise } from '../../donnees/source'
import { appels } from '../outils'

export function domaineColis(api: ClientApi): SourceEntreprise['colis'] {
  const a = appels(api, 'colis')
  const d: DomaineColis = {
    file: (file) => a.get<Colis[]>('/parcels', { query: { queue: file } }),
    compteurs: () => a.get<Record<FileColis, number>>('/parcels/counts'),
    relancer: (cle) => a.post<{ envoyeLe: Instant }>('/parcels/remind', { cle }),
  }
  return d
}
