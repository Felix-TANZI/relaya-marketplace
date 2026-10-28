// Domaine « relevés » branché sur le kit (backend-kit/apps/entreprise_argent) : relevés de semaine et de mois,
// mentions, fichiers (refusés tant que provisoire), facture. Format de src/donnees/domaines/releves.ts.
import type { ClientApi } from '@client/api/client'
import type { DomaineReleves, MentionsReleve, Releve } from '../../donnees/domaines/releves'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineReleves(api: ClientApi): SourceEntreprise['releves'] {
  const a = appels(api, 'releves')
  const d: DomaineReleves = {
    liste: (periode) => a.get<Releve[]>('/statements', { query: { period: periode } }),
    mentions: () => a.get<MentionsReleve>('/statements/mentions'),
    fichier: (id, format) => a.get(`/statements/${seg(id)}.${format}`),
    televerserFacture: (id, fichier) => a.post(`/statements/${seg(id)}/invoice`, fichier, { idempotence: true }),
  }
  return d
}
