// Domaine « historique » branché sur le kit (backend-kit/apps/livreur_journee).
import type { ClientApi } from '@client/api/client'
import type { DetailMission, DomaineHistorique, Historique, MissionResume } from '../../donnees/domaines/historique'
import type { SourceLivreur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineHistorique(api: ClientApi): SourceLivreur['historique'] {
  const a = appels(api)
  const d: DomaineHistorique = {
    liste: (de, jusqua) => a.get<Historique>('/history', { query: { from: de, to: jusqua } }),
    mission: (id) => ouNull(a.get<DetailMission>(`/history/${seg(id)}`)),
    rechercher: (saisie) => a.get<MissionResume[]>('/history/search', { query: { label: saisie } }),
  }
  return d
}
