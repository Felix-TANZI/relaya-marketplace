// Domaine « notifications » branché sur le kit (backend-kit/apps/entreprise_session) : les notifications du membre.
import type { ClientApi } from '@client/api/client'
import type { DomaineNotifications, Notification } from '../../donnees/domaines/notifications'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineNotifications(api: ClientApi): SourceEntreprise['notifications'] {
  const a = appels(api, 'notifications')
  const d: DomaineNotifications = {
    liste: () => a.get<Notification[]>('/notifications'),
    lire: async (id) => {
      await a.post(`/notifications/${seg(id)}/read`, {})
    },
    marquerLues: async () => {
      await a.post('/notifications/read-all', {})
    },
  }
  return d
}
