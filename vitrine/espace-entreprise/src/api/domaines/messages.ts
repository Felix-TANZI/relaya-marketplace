// Domaine « messages » branché sur le kit (backend-kit/apps/entreprise_session) : fils côté entreprise, lecture, envoi
// (masquage par le serveur), nouveau fil du support rattaché à un dossier.
import type { ClientApi } from '@client/api/client'
import type { DomaineMessages, Fil } from '../../donnees/domaines/messages'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineMessages(api: ClientApi): SourceEntreprise['messages'] {
  const a = appels(api, 'messages')
  const d: DomaineMessages = {
    fils: (groupe) => a.get<Fil[]>('/threads', groupe ? { query: { group: groupe } } : undefined),
    lire: async (id) => {
      await a.post(`/threads/${seg(id)}/read`, {})
    },
    envoyer: (id, texte, piece) => a.post(`/threads/${seg(id)}/messages`, { texte, piece }, { idempotence: true }),
    nouveauSupport: (sujet, ref, texte) => a.post('/threads', { sujet, ref, texte }, { idempotence: true }),
  }
  return d
}
