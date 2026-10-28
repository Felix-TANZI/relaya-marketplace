// Domaine « preuves » branché sur le kit (backend-kit/apps/entreprise_operations) : chaîne de preuves par mission,
// signalement, complément, export journalisé, relance. Format de src/donnees/domaines/preuves.ts ; 404 → null.
import type { ClientApi } from '@client/api/client'
import type { DomainePreuves, DossierPreuves, ResumePreuves } from '../../donnees/domaines/preuves'
import type { Instant } from '../../donnees/communs'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domainePreuves(api: ClientApi): SourceEntreprise['preuves'] {
  const a = appels(api, 'preuves')
  const d: DomainePreuves = {
    resume: () => a.get<ResumePreuves>('/proofs/summary'),
    dossier: (paquetId) => ouNull(a.get<DossierPreuves>('/proofs', { query: { package: paquetId } })),
    signaler: (id, commentaire) => a.post(`/proofs/${seg(id)}/flag`, { commentaire }, { idempotence: true }),
    completer: (id, commentaire, photos) => a.post(`/proofs/${seg(id)}/complement`, { commentaire, photos }, { idempotence: true }),
    exporter: (paquetId) => a.post<{ le: Instant; par: string }>('/proofs/export', { paquetId }),
    relancer: (paquetId) => a.post<{ envoyeLe: Instant }>('/proofs/remind', { paquetId }),
  }
  return d
}
