// Domaine « règlements » branché sur le kit (backend-kit/apps/entreprise_argent) : versement du vendredi, historique,
// indicateurs, moyen de règlement et son changement (code SMS au propriétaire). Format de
// src/donnees/domaines/reglements.ts ; 403 role_forbidden → AccesRefuse.
import type { ClientApi } from '@client/api/client'
import type { DomaineReglements, IndicateursArgent, MoyenReglement, Versement, VersementPrevu } from '../../donnees/domaines/reglements'
import type { SourceEntreprise } from '../../donnees/source'
import { appels } from '../outils'

export function domaineReglements(api: ClientApi): SourceEntreprise['reglements'] {
  const a = appels(api, 'reglements')
  const d: DomaineReglements = {
    prochain: () => a.get<VersementPrevu>('/payouts/next'),
    historique: () => a.get<Versement[]>('/payouts'),
    indicateurs: () => a.get<IndicateursArgent>('/payouts/indicators'),
    moyen: () => a.get<MoyenReglement>('/payment-method'),
    demanderCode: () => a.post('/payment-method/code', {}),
    changerMoyen: (p) => a.post('/payment-method', p, { idempotence: true }),
  }
  return d
}
