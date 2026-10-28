// Domaine « compte » branché sur le kit (backend-kit/apps/entreprise_session) : état du compte (décidé par BelivaY),
// recours une fois (propriétaire), activité de l'équipe (journal signé). Le scénario de la console est propre à la
// démonstration.
import type { ClientApi } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type { DomaineCompte, EtatDuCompte, LigneActivite } from '../../donnees/domaines/compte'
import type { SourceEntreprise } from '../../donnees/source'
import { appels } from '../outils'

export function domaineCompte(api: ClientApi): SourceEntreprise['compte'] {
  const a = appels(api, 'compte')
  const d: DomaineCompte = {
    etat: () => a.get<EtatDuCompte>('/account/state'),
    activite: () => a.get<LigneActivite[]>('/activity'),
    faireRecours: (texte) => a.post('/account/appeal', { texte }, { idempotence: true }),
    scenario: () => Promise.reject(new NonDisponible('compte.scenario', 'démonstration seulement')),
  }
  return d
}
