// Domaine « missions » branché sur le kit (backend-kit/apps/entreprise_operations) : missions par onglet, compteurs,
// appels masqués vers le livreur, relances. Format de src/donnees/domaines/missions.ts ; mission inconnue : 404 → null.
import type { ClientApi } from '@client/api/client'
import type { Appel, DomaineMissions, Mission, OngletMissions } from '../../donnees/domaines/missions'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineMissions(api: ClientApi): SourceEntreprise['missions'] {
  const a = appels(api, 'missions')
  const d: DomaineMissions = {
    liste: (onglet) => a.get<Mission[]>('/missions', { query: { tab: onglet } }),
    mission: (id) => ouNull(a.get<Mission>(`/missions/${seg(id)}`)),
    compteurs: () => a.get<Record<OngletMissions, number>>('/missions/counts'),
    appeler: (missionId, canal) => a.post(`/missions/${seg(missionId)}/calls`, { canal }, { idempotence: true }),
    raccrocher: async (appelId) => {
      await a.post<void>(`/calls/${seg(appelId)}/hangup`, {})
    },
    noterAppel: async (appelId, note) => {
      await a.post<void>(`/calls/${seg(appelId)}/note`, { note })
    },
    appels: (missionId) => a.get<Appel[]>(`/missions/${seg(missionId)}/calls`),
    relancer: (missionId, sujet) => a.post(`/missions/${seg(missionId)}/remind`, { sujet }),
  }
  return d
}
