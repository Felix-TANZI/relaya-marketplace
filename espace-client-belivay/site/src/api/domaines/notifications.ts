// Domaine « Notifications » (CL-10 ; CAP-17) : réglages (catégories, canal de repli, heures calmes), abonnement
// push de l'appareil. Routes du kit : backend-kit/apps/notifications_client (réponses au format du site).
// La liste et la lecture des notifications restent sur les routes de relaya (accounts.UserNotification).
import type { AbonnementPush, ChoixNotifications, ReglagesNotifications, Source } from '../../donnees/source'
import { versNotification, type RNotification, type RPage } from '../adaptateurs'
import type { ClientApi } from '../client'
import { liste } from './session'

// Adresse Web Push enregistrée par cet appareil : le serveur retire l'abonnement par le sha256 de cette adresse
// (DELETE /api/devices/{sha256}), le site ne garde pas d'identifiant serveur.
const CLE_PUSH = 'blv_api_push'
function lirePush(): string | null {
  try {
    return localStorage.getItem(CLE_PUSH)
  } catch {
    return null
  }
}
function ecrirePush(endpoint: string | null) {
  try {
    if (endpoint) localStorage.setItem(CLE_PUSH, endpoint)
    else localStorage.removeItem(CLE_PUSH)
  } catch {
    /* stockage refusé */
  }
}
async function sha256(texte: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte))
  return Array.from(new Uint8Array(h), (o) => o.toString(16).padStart(2, '0')).join('')
}

export function domaineNotifications(api: ClientApi) {
  const regler = (corps: Record<string, unknown>) => api.put<ChoixNotifications>('/me/notification-settings', corps)

  return {
    // GET /api/auth/notifications/ (relaya) → NotificationClient[]
    notificationsClient: async () => {
      const r = await api.get<RNotification[] | RPage<RNotification>>('/auth/notifications/')
      return { notifications: liste(r).map(versNotification), maintenant: Date.now() }
    },
    // POST /api/auth/notifications/{id}/read/ ou /read-all/ (relaya)
    lireNotification: async (id: string) => {
      await api.post(id === 'toutes' ? '/auth/notifications/read-all/' : `/auth/notifications/${encodeURIComponent(id)}/read/`)
    },

    // GET /api/me/notification-settings → ReglagesNotifications
    notifications: async () => api.get<ReglagesNotifications>('/me/notification-settings'),

    // PUT {cle, actif} → choix ; 422 category_locked (Commande, Retrait, Incident, Paiement)
    reglerNotification: async (cle: keyof ChoixNotifications, actif: boolean) => regler({ cle, actif }),

    // WhatsApp : POST /api/me/consents {canal} (accord horodaté) puis PUT {canal} ; SMS : PUT {canal}
    reglerCanal: async (canal: 'sms' | 'whatsapp') => {
      if (canal === 'whatsapp') await api.post('/me/consents', { canal })
      await regler({ canal })
    },

    // PUT {calme: {actif, debut, fin}}
    reglerCalme: async (c: { actif: boolean; debut: number; fin: number }) => {
      await regler({ calme: c })
    },

    // PUT {flash} (FF-FLASH ; 422 module_ferme)
    alerteFlash: async (actif: boolean) => {
      await regler({ flash: actif })
    },

    // POST /api/devices {type: 'webpush', abonnement} → {ok} ; null : DELETE /api/devices/{sha256(adresse)} → {ok}
    enregistrerAbonnementPush: async (abonnement: AbonnementPush | null) => {
      if (abonnement) {
        const r = await api.post<{ ok: boolean }>('/devices', { type: 'webpush', abonnement })
        if (r.ok) ecrirePush(abonnement.endpoint)
        return r
      }
      const endpoint = lirePush()
      if (!endpoint) return { ok: true }
      const r = await api.supprimer<{ ok: boolean }>(`/devices/${await sha256(endpoint)}`)
      ecrirePush(null)
      return r
    },
  } satisfies Partial<Source>
}
