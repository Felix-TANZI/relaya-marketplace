// Domaine « rapports » branché sur le kit (backend-kit/apps/entreprise_argent) : rapport d'une période, exports,
// rapport de fin de pilote. Format de src/donnees/domaines/rapports.ts.
import type { ClientApi } from '@client/api/client'
import type { DomaineRapports, FiltreRapport, ProgrammeRapport, Rapport } from '../../donnees/domaines/rapports'
import type { SourceEntreprise } from '../../donnees/source'
import { appels } from '../outils'

const query = (f: FiltreRapport) => ({ from: f.du, to: f.au, zone: f.zone, courier: f.livreur, type: f.type })

export function domaineRapports(api: ClientApi): SourceEntreprise['rapports'] {
  const a = appels(api, 'rapports')
  const d: DomaineRapports = {
    rapport: (f) => a.get<Rapport>('/reports', { query: query(f) }),
    exporter: (f, format) => a.get(`/reports.${format}`, { query: query(f) }),
    rapportPilote: () => a.get('/reports/pilot'),
    programme: () => a.get<ProgrammeRapport>('/reports/schedule'),
    programmer: (p) => a.put('/reports/schedule', { active: p.actif, hour: p.heure, format: p.format, recipient: p.destinataire }),
  }
  return d
}
