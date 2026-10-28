// Domaine « prix » branché sur le kit (backend-kit/apps/entreprise_argent) : grille d'achat (lecture seule), délais,
// suppléments, paliers, demande de révision (fil de messages). Format de src/donnees/domaines/prix.ts.
import type { ClientApi } from '@client/api/client'
import type { AlertesDelais, Delais, DomainePrix, Grille, Supplement } from '../../donnees/domaines/prix'
import type { SourceEntreprise } from '../../donnees/source'
import { appels } from '../outils'

export function domainePrix(api: ClientApi): SourceEntreprise['prix'] {
  const a = appels(api, 'prix')
  const d: DomainePrix = {
    grille: () => a.get<Grille>('/price-grid'),
    delais: () => a.get<Delais>('/sla'),
    supplements: () => a.get<Supplement[]>('/price-grid/supplements'),
    paliers: () => a.get('/price-grid/tiers'),
    demanderRevision: (texte) => a.post('/price-grid/revision-requests', { texte }, { idempotence: true }),
    alertesDelais: () => a.get<AlertesDelais>('/sla/alerts'),
    reglerAlertesDelais: (p) => a.put('/sla/alerts', p, { idempotence: true }),
  }
  return d
}
