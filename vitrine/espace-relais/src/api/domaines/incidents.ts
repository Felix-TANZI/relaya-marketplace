// Domaine « incidents » branché sur le kit (relais_guichet, relais_core/incidents.py) : constats (ouverts au PIN,
// délais calculés par le serveur depuis la réception, OFF-01), photos demandées, fil du dossier, contestation (gérant
// seul, 403 owner_only → droit_refuse), retours attendus et dépôt d'un retour validé (LIT-05).
import type { ClientApi } from '@client/api/client'
import type { ColisPourConstat, DomaineIncidents, Dossier, RetourVu } from '../../donnees/domaines/incidents'
import type { SourceRelais } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineIncidents(api: ClientApi): SourceRelais['incidents'] {
  const a = appels(api)
  type R<K extends keyof DomaineIncidents> = Awaited<ReturnType<DomaineIncidents[K]>>
  const dos = (id: string, suite: string) => `/claims/${seg(id)}/${suite}`
  const d: DomaineIncidents = {
    dossiers: () => a.get<Dossier[]>('/claims'),
    dossier: (id) => ouNull(a.get<Dossier>(`/claims/${seg(id)}`)),
    colisPourConstat: (reference) => ouNull(a.get<ColisPourConstat>('/claims/parcel', { query: { ref: reference } })),
    ouvrirConstat: (c, o) => a.geste<R<'ouvrirConstat'>>('/claims', o, { ...c }),
    ajouterPhotos: (id, photos, o) => a.geste<R<'ajouterPhotos'>>(dos(id, 'photos'), o, { photos }),
    ecrire: (id, texte, photos, o) => a.geste<R<'ecrire'>>(dos(id, 'messages'), o, { texte, photos }),
    contester: (id, motif, o) => a.geste<R<'contester'>>(dos(id, 'contest'), o, { motif }),
    retours: () => a.get<RetourVu[]>('/returns'),
    async verifierRetour(reference) {
      const r = await ouNull(a.get<R<'verifierRetour'>>(`/returns/${seg(reference)}`))
      return r ?? { ok: false, raison: 'introuvable' }
    },
    deposerRetour: (x, o) => a.geste<R<'deposerRetour'>>('/returns/drop', o, { ...x }),
  }
  return d
}
