// Domaine « affectation » branché sur le kit (backend-kit/apps/entreprise_operations) : livreurs éligibles et
// affectation (seule l'entreprise affecte, DP-63). Format de src/donnees/domaines/affectation.ts.
import type { ClientApi } from '@client/api/client'
import type { DomaineAffectation, Eligibilite } from '../../donnees/domaines/affectation'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineAffectation(api: ClientApi): SourceEntreprise['affectation'] {
  const a = appels(api, 'affectation')
  const d: DomaineAffectation = {
    eligibles: (paquetId) => a.get<Eligibilite>(`/packages/${seg(paquetId)}/eligible-couriers`),
    affecter: (paquetId, livreurId) => a.post(`/packages/${seg(paquetId)}/assign`, { livreurId }, { idempotence: true }),
  }
  return d
}
