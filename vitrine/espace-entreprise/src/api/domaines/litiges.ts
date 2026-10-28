// Domaine « litiges » branché sur le kit (backend-kit/apps/entreprise_argent) : dossiers DP-35, réponse préparée puis
// envoyée, complément, recours. Format de src/donnees/domaines/litiges.ts ; refus attendus : 200 { ok: false, raison }.
import type { ClientApi } from '@client/api/client'
import type { DomaineLitiges, Litige } from '../../donnees/domaines/litiges'
import type { SourceEntreprise } from '../../donnees/source'
import { appels, seg } from '../outils'

export function domaineLitiges(api: ClientApi): SourceEntreprise['litiges'] {
  const a = appels(api, 'litiges')
  const d: DomaineLitiges = {
    liste: (etape) => a.get<Litige[]>('/disputes', { query: { stage: etape } }),
    preparer: (id, genre, texte, piece) => a.post(`/disputes/${seg(id)}/draft`, { genre, texte, piece }),
    repondre: (id, genre, texte, piece) => a.post(`/disputes/${seg(id)}/response`, { genre, texte, piece }, { idempotence: true }),
    completer: (id, texte) => a.post(`/disputes/${seg(id)}/complement`, { texte }, { idempotence: true }),
    recours: (id, element) => a.post(`/disputes/${seg(id)}/appeal`, { element }, { idempotence: true }),
  }
  return d
}
