// Connecteurs des pages ajoutées (./source.ts) en mode API ; null en démonstration (les écrans gardent alors leur
// lecture de la démonstration). Même choix que src/donnees/source.ts (VITE_SOURCE).
import { clientDeLEnvironnement } from '@client/api/client'
import { env } from '@client/config/env'
import { sourcePages } from './source'
import type { SourcePages } from './types'

function choisir(): SourcePages | null {
  if (env.source !== 'api') return null
  const api = clientDeLEnvironnement()
  if (!api) throw new Error('VITE_SOURCE=api demande VITE_API_URL')
  return sourcePages(api)
}

export const pagesApi: SourcePages | null = choisir()
