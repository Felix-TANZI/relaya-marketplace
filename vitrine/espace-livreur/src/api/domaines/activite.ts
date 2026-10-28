// Domaine « activite » branché sur le kit (backend-kit/apps/livreur_journee).
import type { ClientApi } from '@client/api/client'
import type { Activite, Releves, DomaineActivite } from '../../donnees/domaines/activite'
import type { SourceLivreur } from '../../donnees/source'
import { appels } from '../outils'

export function domaineActivite(api: ClientApi): SourceLivreur['activite'] {
  const a = appels(api)
  const d: DomaineActivite = {
    activite: (periode) => a.get<Activite>('/activity', { query: { period: periode } }),
    releves: () => a.get<Releves>('/activity/statements'),
  }
  return d
}
