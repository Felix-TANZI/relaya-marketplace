// Domaine « notifications » branché sur le kit (backend-kit/apps/livreur_session).
import type { ClientApi } from '@client/api/client'
import type { DomaineNotifications, Notification } from '../../donnees/domaines/notifications'
import type { SourceLivreur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineNotifications(api: ClientApi): SourceLivreur['notifications'] {
  const a = appels(api)
  const d: DomaineNotifications = {
    liste: () => a.get<Notification[]>('/notifications'),
    marquerLue: async (id) => {
      await a.post(`/notifications/${seg(id)}/read`)
    },
    toutMarquerLu: async () => {
      await a.post('/notifications/read-all')
    },
  }
  return d
}
