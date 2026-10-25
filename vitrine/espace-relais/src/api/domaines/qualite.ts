// Domaine « qualité » branché sur le kit (relais_compte, relais_core/qualite.py) : Trust Score (critères, tenue,
// alerte de seuil, journal), avis anonymes (GEN-01), réponse privée (DP-39), signalement (AVI-04), paliers,
// contestation d'un événement (une fois, TRU-07).
import type { ClientApi } from '@client/api/client'
import type { Avis, DomaineQualite, Palier, Trust } from '../../donnees/domaines/qualite'
import type { SourceRelais } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineQualite(api: ClientApi): SourceRelais['qualite'] {
  const a = appels(api)
  type R<K extends keyof DomaineQualite> = Awaited<ReturnType<DomaineQualite[K]>>
  const d: DomaineQualite = {
    trust: () => a.get<Trust>('/trust'),
    avis: () => a.get<Avis[]>('/reviews'),
    repondreAvis: (id, texte, o) => a.geste<R<'repondreAvis'>>(`/reviews/${seg(id)}/reply`, o, { texte }),
    signalerAvis: (id, motif, o) => a.geste<R<'signalerAvis'>>(`/reviews/${seg(id)}/report`, o, { motif }),
    paliers: () => a.get<Palier[]>('/tiers'),
    contester: (id, texte, o) => a.geste<R<'contester'>>(`/trust/${seg(id)}/contest`, o, { texte }),
  }
  return d
}
