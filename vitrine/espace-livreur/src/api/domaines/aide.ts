// Domaine « aide » branché sur le kit (backend-kit/apps/livreur_session) : fiches, numéros d'urgence, SOS.
import type { ClientApi } from '@client/api/client'
import type { Aide, DomaineAide, EtatSOS } from '../../donnees/domaines/aide'
import type { SourceLivreur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineAide(api: ClientApi): SourceLivreur['aide'] {
  const a = appels(api)
  const d: DomaineAide = {
    aide: () => a.get<Aide>('/help/articles'),
    sosEnCours: () => ouNull(a.get<EtatSOS>('/sos')),
    sos: (origine, enLigne) => a.geste('/sos', origine, { enLigne }),
    positionSOS: async (id, p) => {
      await a.post(`/sos/${seg(id)}/position`, { lat: p.lat, lng: p.lng, precisionM: p.precisionM })
    },
    arreterSOS: (id, origine) => a.geste(`/sos/${seg(id)}/stop`, origine),
  }
  return d
}
