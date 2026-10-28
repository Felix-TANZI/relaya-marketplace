// Domaine « véhicules » branché sur le kit (backend-kit/apps/entreprise_flotte).
import type { ClientApi } from '@client/api/client'
import type { DomaineVehicules, Vehicule } from '../../donnees/domaines/vehicules'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineVehicules(api: ClientApi): SourceEntreprise['vehicules'] {
  const a = appels(api, 'vehicules')
  const v = (id: string) => `/vehicles/${seg(id)}`
  const d: DomaineVehicules = {
    liste: () => a.get<Vehicule[]>('/vehicles'),
    declarer: (x) => a.post('/vehicles', x, { idempotence: true }),
    rattacher: (id, livreurId) => a.put(`${v(id)}/rider`, { livreurId }),
    mettreAJour: (id, document, jusqua) => a.put(`${v(id)}/documents/${seg(document)}`, { jusqua }),
    indisponible: (id, panne, motif) => a.put(`${v(id)}/availability`, { panne, motif: motif ?? '' }),
  }
  return d
}
