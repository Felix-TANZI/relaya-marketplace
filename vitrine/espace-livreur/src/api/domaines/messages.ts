// Domaine « messages » branché sur le kit (backend-kit/apps/livreur_session) : fils, messages masqués par le serveur,
// signalement, appels masqués (jamais un numéro).
import type { ClientApi } from '@client/api/client'
import type { DomaineMessages, Fil, FilOuvert } from '../../donnees/domaines/messages'
import type { SourceLivreur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineMessages(api: ClientApi): SourceLivreur['messages'] {
  const a = appels(api)
  const d: DomaineMessages = {
    fils: () => a.get<Fil[]>('/threads'),
    fil: (id) => ouNull(a.get<FilOuvert>(`/threads/${seg(id)}/messages`)),
    marquerLu: async (id) => {
      await a.post(`/threads/${seg(id)}/read`)
    },
    envoyer: (filId, texte, origine, enLigne) => a.geste(`/threads/${seg(filId)}/messages`, origine, { texte, enLigne }),
    signaler: (filId, messageId, origine) => a.geste(`/threads/${seg(filId)}/report`, origine, { messageId }),
    appeler: (cible, origine) => a.geste(`/threads/${seg(cible)}/call`, origine),
    raccrocher: async (appelId, fin) => {
      await a.post(`/threads/calls/${seg(appelId)}/end`, { fin })
    },
  }
  return d
}
