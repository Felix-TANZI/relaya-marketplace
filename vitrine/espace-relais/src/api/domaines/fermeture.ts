// Domaine « fermeture » branché sur le kit (relais_guichet, relais_core/fermetures.py) : fermetures déclarées, aperçu
// de la conséquence selon la durée (ARL-20, DP-42), déclaration, annulation avant le début, réouverture, justificatif.
import type { ClientApi } from '@client/api/client'
import type { ApercuFermeture, DomaineFermeture, Fermeture } from '../../donnees/domaines/fermeture'
import type { SourceRelais } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineFermeture(api: ClientApi): SourceRelais['fermeture'] {
  const a = appels(api)
  type R<K extends keyof DomaineFermeture> = Awaited<ReturnType<DomaineFermeture[K]>>
  const d: DomaineFermeture = {
    fermetures: () => a.get<Fermeture[]>('/closures'),
    apercu: (f) => a.post<ApercuFermeture>('/closures/preview', { ...f }),
    declarer: (f, o) => a.geste<R<'declarer'>>('/closures', o, { ...f }),
    annuler: (id, o) => a.supprimer<R<'annuler'>>(`/closures/${seg(id)}`, o),
    rouvrir: (id, o) => a.geste<R<'rouvrir'>>(`/closures/${seg(id)}/reopen`, o),
    joindreJustificatif: (id, photo, o) => a.geste<R<'joindreJustificatif'>>(`/closures/${seg(id)}/proof`, o, { photo }),
  }
  return d
}
