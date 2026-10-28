// Domaine « messages » branché sur le kit (relais_compte, relais_core/quotidien.py) : fils (logistique, support,
// dossiers), réponses rapides (seule écriture du fil logistique, MSG-06), écrire au support, rappel, appels masqués
// (jamais le vrai numéro, DP-61 : livreur pendant sa mission, support pendant ses heures).
import type { ClientApi } from '@client/api/client'
import type { Appel, DomaineMessages, Fil, Joignable, Support } from '../../donnees/domaines/messages'
import type { SourceRelais } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineMessages(api: ClientApi): SourceRelais['messages'] {
  const a = appels(api)
  type R<K extends keyof DomaineMessages> = Awaited<ReturnType<DomaineMessages[K]>>
  const d: DomaineMessages = {
    fils: () => a.get<Fil[]>('/threads'),
    fil: (id) => ouNull(a.get<Fil>(`/threads/${seg(id)}`)),
    envoyer: (fil, texte, pieces, o) => a.geste<R<'envoyer'>>(`/threads/${seg(fil)}/messages`, o, { texte, pieces }),
    repondreVite: (fil, n, o) => a.geste<R<'repondreVite'>>(`/threads/${seg(fil)}/quick-replies/${n}`, o),
    ecrireAuSupport: (x, o) => a.geste<R<'ecrireAuSupport'>>('/support/requests', o, { ...x }),
    support: () => a.get<Support>('/support'),
    demanderRappel: (motif, o) => a.geste<R<'demanderRappel'>>('/support/callback', o, { motif }),
    joignables: () => a.get<Joignable[]>('/calls/reachable'),
    appels: () => a.get<Appel[]>('/calls'),
    appeler: (cible, o) => a.geste<R<'appeler'>>('/calls', o, { cible }),
    raccrocher: (id, o) => a.geste<R<'raccrocher'>>(`/calls/${seg(id)}/end`, o),
  }
  return d
}
