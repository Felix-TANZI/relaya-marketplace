// Domaine « zones » branché sur le kit (backend-kit/apps/entreprise_flotte).
import type { ClientApi } from '@client/api/client'
import type { DomaineZones, Quartier, ZoneCarte, ZoneEntreprise } from '../../donnees/domaines/zones'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineZones(api: ClientApi): SourceEntreprise['zones'] {
  const a = appels(api, 'zones')
  const d: DomaineZones = {
    zones: () => a.get<ZoneEntreprise[]>('/zones'),
    carte: () => a.get<ZoneCarte[]>('/zones/map'),
    quartiers: () => a.get<Quartier[]>('/zones/neighbourhoods'),
    declarer: (code, z) => a.post('/zones', { code, ...z }, { idempotence: true }),
    modifier: (code, z) => a.patch(`/zones/${seg(code)}`, z),
    mettreEnPause: (code, pause) => a.post(`/zones/${seg(code)}/pause`, { pause }),
  }
  return d
}
