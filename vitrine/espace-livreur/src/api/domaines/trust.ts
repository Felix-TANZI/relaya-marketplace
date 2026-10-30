// Domaine « trust » branché sur le kit (backend-kit/apps/livreur_journee).
import type { ClientApi } from '@client/api/client'
import type { DomaineTrust, TrustLivreur } from '../../donnees/domaines/trust'
import type { SourceLivreur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineTrust(api: ClientApi): SourceLivreur['trust'] {
  const a = appels(api)
  const d: DomaineTrust = {
    trust: () => a.get<TrustLivreur>('/trust'),
    contester: (evenementId, motif, note, origine, enLigne) => a.geste(`/trust/events/${seg(evenementId)}/contest`, origine, { motif, note, enLigne }),
  }
  return d
}
