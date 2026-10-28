// Domaine « notifications » branché sur le kit (relais_compte, relais_core/quotidien.py) : notifications du membre
// (filtrées selon son rôle, les plus récentes d'abord), centre (résumé du matin, réglages), lu, tout lu, réglages
// (jamais avant PR-NTF-RESUME-H, NTF-01).
import type { ClientApi } from '@client/api/client'
import type { CentreNotifications, DomaineNotifications, Notification } from '../../donnees/domaines/notifications'
import type { SourceRelais } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineNotifications(api: ClientApi): SourceRelais['notifications'] {
  const a = appels(api)
  const d: DomaineNotifications = {
    notifications: () => a.get<Notification[]>('/notifications'),
    centre: () => a.get<CentreNotifications>('/notifications/center'),
    lire: async (id) => void (await a.ecrire(`/notifications/${seg(id)}/read`)),
    toutLire: async () => void (await a.ecrire('/notifications/read-all')),
    regler: (r, o) => a.put<Awaited<ReturnType<DomaineNotifications['regler']>>>('/notifications/settings', { ...r, origine: o }),
  }
  return d
}
