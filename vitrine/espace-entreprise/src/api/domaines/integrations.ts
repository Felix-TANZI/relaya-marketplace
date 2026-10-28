// Domaine « intégrations » branché sur le kit (backend-kit/apps/entreprise_session) : état et espace de test (clés,
// rappels, journal, débit) ; propriétaire seulement.
import type { ClientApi } from '@client/api/client'
import type { DomaineIntegrations, EspaceIntegrations, EtatIntegrations } from '../../donnees/domaines/integrations'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineIntegrations(api: ClientApi): SourceEntreprise['integrations'] {
  const a = appels(api, 'integrations')
  const d: DomaineIntegrations = {
    etat: () => a.get<EtatIntegrations>('/integrations'),
    espace: () => a.get<EspaceIntegrations>('/integrations/space'),
    creerCle: (env) => a.post('/integrations/keys', { env }),
    revelerCle: (id) => a.post(`/integrations/keys/${seg(id)}/reveal`, {}),
    regenererCle: (id) => a.post(`/integrations/keys/${seg(id)}/rotate`, {}),
    ajouterRappel: (url, evenements) => a.post('/integrations/webhooks', { url, events: evenements }),
    retirerRappel: (id) => a.supprimer(`/integrations/webhooks/${seg(id)}`),
    essayerRappel: (id) => a.post(`/integrations/webhooks/${seg(id)}/test`, {}),
    appelDeTest: (chemin) => a.post('/integrations/sandbox/call', { path: chemin }),
  }
  return d
}
