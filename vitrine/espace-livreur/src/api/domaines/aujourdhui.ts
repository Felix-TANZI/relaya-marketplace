// Domaine « aujourdhui » branché sur le kit (backend-kit/apps/livreur_tournee) : la journée en un coup d'œil, calculée
// par le serveur (jamais un prix BelivaY → entreprise ; la batterie est lue sur le téléphone par l'écran).
import type { ClientApi } from '@client/api/client'
import type { Journee } from '../../donnees/domaines/aujourdhui'
import type { SourceLivreur } from '../../donnees/source'
import { appels } from '../outils'

export function domaineAujourdhui(api: ClientApi): SourceLivreur['aujourdhui'] {
  const a = appels(api)
  return { journee: () => a.get<Journee>('/today') }
}
