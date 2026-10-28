// Domaine « tableau » branché sur le kit (backend-kit/apps/entreprise_session) : tout est calculé par le serveur.
import type { ClientApi } from '@client/api/client'
import type { DomaineTableau, TableauDeBord } from '../../donnees/domaines/tableau'
import type { SourceEntreprise } from '../../donnees/source'
import { appels } from '../outils'

export function domaineTableau(api: ClientApi): SourceEntreprise['tableau'] {
  const a = appels(api, 'tableau')
  const d: DomaineTableau = { tableau: () => a.get<TableauDeBord>('/dashboard') }
  return d
}
