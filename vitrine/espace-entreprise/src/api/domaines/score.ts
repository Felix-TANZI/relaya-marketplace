// Domaine « score » branché sur le kit (backend-kit/apps/entreprise_argent). Format de src/donnees/domaines/score.ts.
import type { ClientApi } from '@client/api/client'
import type { DomaineScore, ScoreEntreprise } from '../../donnees/domaines/score'
import type { SourceEntreprise } from '../../donnees/source'
import { appels } from '../outils'

export function domaineScore(api: ClientApi): SourceEntreprise['score'] {
  const a = appels(api, 'score')
  const d: DomaineScore = {
    score: () => a.get<ScoreEntreprise>('/trust'),
  }
  return d
}
