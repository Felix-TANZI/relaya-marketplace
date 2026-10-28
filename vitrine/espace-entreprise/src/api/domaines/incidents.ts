// Domaine « incidents » branché sur le kit (backend-kit/apps/entreprise_operations) : incidents des livreurs,
// décision, transfert à un autre livreur. Format de src/donnees/domaines/incidents.ts.
import type { ClientApi } from '@client/api/client'
import type { DomaineIncidents, Incident, Transfert } from '../../donnees/domaines/incidents'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineIncidents(api: ClientApi): SourceEntreprise['incidents'] {
  const a = appels(api, 'incidents')
  const d: DomaineIncidents = {
    liste: (statut) => a.get<Incident[]>('/incidents', { query: { status: statut } }),
    decider: (id, decision, motif) => a.post(`/incidents/${seg(id)}/decision`, { decision, motif }, { idempotence: true }),
    transferer: (paquetId, versLivreurId) => a.post(`/packages/${seg(paquetId)}/transfer`, { versLivreurId }, { idempotence: true }),
    transferts: () => a.get<Transfert[]>('/transfers'),
  }
  return d
}
