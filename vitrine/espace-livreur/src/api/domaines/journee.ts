// Domaine « journee » branché sur le kit (backend-kit/apps/livreur_journee) : contrôle de clôture, clôture, dépôt au
// point de stockage.
import type { ClientApi } from '@client/api/client'
import type { ControleCloture, DomaineJournee } from '../../donnees/domaines/journee'
import type { SourceLivreur } from '../../donnees/source'
import { appels } from '../outils'

export function domaineJournee(api: ClientApi): SourceLivreur['journee'] {
  const a = appels(api)
  const d: DomaineJournee = {
    controle: () => a.get<ControleCloture>('/day/closure-check'),
    cloturer: (kit, origine, enLigne) => a.geste('/day/close', origine, { kit, enLigne }),
    deposerAuStockage: (origine) => a.geste('/custody/storage-drop', origine),
  }
  return d
}
