// Domaine « départs » branché sur le kit (relais_guichet, relais_core/sorties.py) : collectes du jour (retours au
// vendeur, transferts, renvois), scan de chaque colis qui part, absent avec motif, validation (photo et PIN). Pendant
// côté livreur : POST /api/courier/stops/{id}/departures/{colis}/confirm puis /departures/confirm.
import type { ClientApi } from '@client/api/client'
import type { Departs, DomaineDeparts, ReglesDeparts } from '../../donnees/domaines/departs'
import type { SourceRelais } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineDeparts(api: ClientApi): SourceRelais['departs'] {
  const a = appels(api)
  type R<K extends keyof DomaineDeparts> = Awaited<ReturnType<DomaineDeparts[K]>>
  const c = (id: string, suite: string) => `/departures/${seg(id)}/${suite}`
  const d: DomaineDeparts = {
    departs: () => a.get<Departs>('/departures'),
    regles: () => a.get<ReglesDeparts>('/config', { query: { scope: 'departures' } }),
    scanner: (id, colis, o) => a.geste<R<'scanner'>>(c(id, 'scan'), o, { colis }),
    annulerScan: (id, colis, o) => a.supprimer<R<'annulerScan'>>(c(id, `scan/${seg(colis)}`), o),
    marquerAbsent: (id, colis, motif, o) => a.geste<R<'marquerAbsent'>>(c(id, 'scan'), o, { colis, absent: motif }),
    annulerAbsent: (id, colis, o) => a.supprimer<R<'annulerAbsent'>>(c(id, `absent/${seg(colis)}`), o),
    valider: (id, photo, pin, o) => a.geste<R<'valider'>>(c(id, 'validate'), o, { photo, pin }),
  }
  return d
}
