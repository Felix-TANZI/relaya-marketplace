// Domaine « paquets » branché sur le kit (backend-kit/apps/livreur_tournee) : le paquet affecté par l'entreprise (le
// livreur n'accepte ni ne refuse rien), démarrer, « Je ne peux pas » avant le premier ramassage, téléchargement pour le
// hors connexion. 404 → null.
import type { ClientApi } from '@client/api/client'
import type { Instant } from '../../donnees/communs'
import type { DomainePaquets, Paquet } from '../../donnees/domaines/paquets'
import type { SourceLivreur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domainePaquets(api: ClientApi): SourceLivreur['paquets'] {
  const a = appels(api)
  const d: DomainePaquets = {
    paquet: (id) => ouNull(a.get<Paquet>(id ? `/packages/${seg(id)}` : '/packages/current')),
    marquerRelu: async (id, version) => void (await a.post<void>(`/packages/${seg(id)}/read`, { version })),
    demarrer: (id, origine) => a.geste(`/packages/${seg(id)}/start`, origine),
    impossible: (id, motif, origine) => a.geste(`/packages/${seg(id)}/cannot-do`, origine, { motif }),
    telecharger: (id) => a.get<{ ok: true; le: Instant }>(`/packages/${seg(id)}/offline-bundle`),
  }
  return d
}
