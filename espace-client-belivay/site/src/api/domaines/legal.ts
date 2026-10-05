// Domaine « Légal » (CAP-23) : textes en vigueur et version acceptée par le compte, acceptation horodatée.
// Routes du kit : backend-kit/apps/client_accounts (réponse au format DonneesLegal, adaptateur identité).
import type { DonneesLegal, Source } from '../../donnees/source'
import type { ClientApi } from '../client'

export function domaineLegal(api: ClientApi) {
  return {
    // Connecté : GET /api/me/legal (avec la version acceptée) ; sinon GET /api/legal/tout?lang= (publique).
    legal: async () =>
      api.jetons.lire()
        ? api.get<DonneesLegal>('/me/legal')
        : api.get<DonneesLegal>('/legal/tout', { anonyme: true }),

    // POST /api/me/legal/accept {doc: 'tout', version} → 204 : chaque document « à accepter » de la version
    accepterConditions: async (version: string) => {
      await api.post('/me/legal/accept', { doc: 'tout', version })
    },
  } satisfies Partial<Source>
}
