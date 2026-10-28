// Domaine « emballages » branché sur le kit (backend-kit/apps/entreprise_flotte).
import type { ClientApi } from '@client/api/client'
import type { DomaineEmballages, EtatEmballages } from '../../donnees/domaines/emballages'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineEmballages(api: ClientApi): SourceEntreprise['emballages'] {
  const a = appels(api, 'emballages')
  const d: DomaineEmballages = {
    etat: () => a.get<EtatEmballages>('/packaging'),
    remettre: (p) => a.post('/packaging/handovers', p, { idempotence: true }),
    commander: (p) => a.post('/packaging/orders', p, { idempotence: true }),
    justifier: (p) => a.post('/packaging/discrepancies', p, { idempotence: true }),
    declarerPlagePerdue: (id) => a.post(`/label-ranges/${seg(id)}/invalidate`, {}),
  }
  return d
}
