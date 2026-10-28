// Domaine « flotte » branché sur le kit (backend-kit/apps/entreprise_flotte) : vue d'ensemble, invitations de livreurs.
import type { ClientApi } from '@client/api/client'
import type { DomaineFlotte, Invitation, ResumeFlotte } from '../../donnees/domaines/flotte'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineFlotte(api: ClientApi): SourceEntreprise['flotte'] {
  const a = appels(api, 'flotte')
  const d: DomaineFlotte = {
    resume: () => a.get<ResumeFlotte>('/fleet'),
    invitations: () => a.get<Invitation[]>('/courier-invitations'),
    inviter: (nom, telephone, details) => a.post('/courier-invitations', { nom, telephone, ...(details ? { details } : {}) }, { idempotence: true }),
    renvoyer: (id) => a.post(`/courier-invitations/${seg(id)}/resend`, {}),
    abandonner: (id) => a.post(`/courier-invitations/${seg(id)}/cancel`, {}),
    approuver: (id) => a.post(`/courier-invitations/${seg(id)}/approve`, {}),
  }
  return d
}
