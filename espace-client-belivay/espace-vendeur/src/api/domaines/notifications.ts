// Domaine « notifications » branché sur le kit (backend-kit/apps/vendeur_boutique) : centre de la boutique lu par
// membre, « Urgent » vivant, aucune notification d'argent pour l'accès Préparation, réglages push du membre.
import type { ClientApi } from '@client/api/client'
import type { DomaineNotifications, Notification, ReglagesNotifications } from '../../donnees/domaines/notifications'
import type { SourceVendeur } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineNotifications(api: ClientApi): SourceVendeur['notifications'] {
  const a = appels(api, 'notifications')
  const d: DomaineNotifications = {
    liste: (filtre) => a.get<Notification[]>('/notifications', { query: { filter: filtre } }),
    compteurs: () => a.get<{ tout: number; urgent: number; argent: number; nonLues: number }>('/notifications/counts'),
    nonLues: async () => (await a.get<{ nonLues: number }>('/notifications/unread-count')).nonLues,
    marquerLue: async (id, lue = true) => {
      await a.post<void>(`/notifications/${seg(id)}/read`, { lue })
    },
    toutMarquerLu: async () => {
      await a.post<void>('/notifications/read-all', {})
    },
    reglages: () => a.get<ReglagesNotifications>('/notifications/settings'),
    regler: (champs) => a.put<ReglagesNotifications>('/notifications/settings', champs),
  }
  return d
}
