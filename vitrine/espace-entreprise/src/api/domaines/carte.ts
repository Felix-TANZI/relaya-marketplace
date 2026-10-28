// Domaine « carte » branché sur le kit (backend-kit/apps/entreprise_operations) : positions des livreurs en mission et
// fond de carte. Format de src/donnees/domaines/carte.ts.
import type { ClientApi } from '@client/api/client'
import type { DomaineCarte, LieuCarte, PositionLivreur, ZoneCarte } from '../../donnees/domaines/carte'
import type { SourceEntreprise } from '../../donnees/source'
import { appels } from '../outils'

export function domaineCarte(api: ClientApi): SourceEntreprise['carte'] {
  const a = appels(api, 'carte')
  const d: DomaineCarte = {
    positions: () => a.get<PositionLivreur[]>('/fleet/positions'),
    fond: () => a.get<{ zones: ZoneCarte[]; lieux: LieuCarte[] }>('/fleet/map'),
  }
  return d
}
