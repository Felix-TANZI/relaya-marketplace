// Domaine « aide » branché sur le kit (relais_compte, relais_core/quotidien.py) : réponses éditées en console (AID-02,
// filtrées selon le rôle), fiches, registre papier d'une panne et saisie de ses lignes (colis sans montant seulement,
// PR-PAPIER-SAISIE-H, AID-04).
import type { ClientApi } from '@client/api/client'
import type { Aide, DomaineAide, FicheAide, RegistrePapier } from '../../donnees/domaines/aide'
import type { SourceRelais } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineAide(api: ClientApi): SourceRelais['aide'] {
  const a = appels(api)
  const d: DomaineAide = {
    aide: () => a.get<Aide>('/help'),
    fiche: (id) => ouNull(a.get<FicheAide>(`/help/sheets/${seg(id)}`)),
    registre: () => a.get<RegistrePapier>('/paper-register'),
    saisirLigne: (l, o) => a.geste<Awaited<ReturnType<DomaineAide['saisirLigne']>>>('/paper-register/lines', o, { ...l }),
  }
  return d
}
