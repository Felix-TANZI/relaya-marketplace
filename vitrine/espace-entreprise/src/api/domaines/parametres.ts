// Domaine « paramètres » branché sur le kit (backend-kit/apps/entreprise_session) : utilisateurs internes, réglages,
// appareils, mot de passe, mes notifications, export de mes données (code SMS, jamais rendu par le serveur).
import type { ClientApi } from '@client/api/client'
import type { Resultat } from '../../donnees/communs'
import type { Appareil, DomaineParametres, PreferencesNotifications, RefusParametres, ReglagesEntreprise, UtilisateurInterne } from '../../donnees/domaines/parametres'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineParametres(api: ClientApi): SourceEntreprise['parametres'] {
  const a = appels(api, 'parametres')
  const d: DomaineParametres = {
    utilisateurs: () => a.get<UtilisateurInterne[]>('/users'),
    inviter: (p) => a.post('/users', p, { idempotence: true }),
    retirer: (id) => a.supprimer<Resultat<object, RefusParametres>>(`/users/${seg(id)}`),
    reglages: () => a.get<ReglagesEntreprise>('/settings'),
    modifierStockage: (adresse, consignes) => a.put('/settings/storage', { adresse, consignes }),
    appareils: () => a.get<Appareil[]>('/me/devices'),
    deconnecterAppareil: async (id) => {
      await a.supprimer(`/me/devices/${seg(id)}`)
    },
    changerMotDePasse: (actuel, nouveau) => a.post('/me/password', { actuel, nouveau }),
    notifications: () => a.get<PreferencesNotifications>('/notification-preferences'),
    reglerNotifications: (p) => a.put('/notification-preferences', p),
    demanderExport: () => a.post('/me/export', {}),
    exporter: (defi, code) => a.post('/me/export/confirm', { defi, code }),
  }
  return d
}
