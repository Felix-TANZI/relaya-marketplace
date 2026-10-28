// Domaine « equipe » (l'entreprise employeur de ses livreurs, DP-66, DP-67) : registre du personnel, dossier d'emploi,
// essai, avertissements, horaires et zones de travail, congés, casier judiciaire, fin de contrat, attestation. Routes du
// kit /api/company/staff… (backend-kit/apps/entreprise_flotte/equipe.py ; registre : src/api/routes/equipe.ts).
import type { ClientApi } from '@client/api/client'
import type { DomaineEquipe, DossierEmploi, LigneEquipe } from '../../donnees/domaines/equipe'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineEquipe(api: ClientApi): SourceEntreprise['equipe'] {
  const a = appels(api, 'equipe')
  const p = (id: string) => `/staff/${seg(id)}`
  const d: DomaineEquipe = {
    registre: () => a.get<LigneEquipe[]>('/staff'),
    dossier: (id) => ouNull(a.get<DossierEmploi>(p(id))),
    conclureEssai: (id, decision, motif) => a.post(`${p(id)}/probation`, { decision, motif }, { idempotence: true }),
    avertir: (id, motif) => a.post(`${p(id)}/warnings`, { motif }, { idempotence: true }),
    fixerHoraires: (id, creneaux) => a.put(`${p(id)}/schedule`, { creneaux }),
    fixerZones: (id, zones, motif) => a.put(`${p(id)}/zones`, { zones, motif }),
    accorderConge: (id, c) => a.post(`${p(id)}/leaves`, c, { idempotence: true }),
    annulerConge: (id, congeId) => a.post(`${p(id)}/leaves/${seg(congeId)}/cancel`, {}),
    casier: (id, etat) => a.put(`${p(id)}/record-check`, { etat }),
    finContrat: (id, motif) => a.post(`${p(id)}/termination`, { motif }, { idempotence: true }),
    annulerFinContrat: (id, motif) => a.post(`${p(id)}/termination/cancel`, { motif }),
    attestation: (id) => a.get(`${p(id)}/certificate`),
  }
  return d
}
