// Connecteurs des domaines de ./types.ts (pages AJ-B, Votre activité, échanges) sur le kit (routes /api/vendors/…),
// même patron que src/api/domaines/* ; registre : src/api/routes/pages.ts.
import type { ClientApi } from '@client/api/client'
import type { Remise } from '../../donnees/domaines/remise'
import { appels, seg } from '../outils'
import type { SourcePages } from './types'

export function sourcePages(api: ClientApi): SourcePages {
  const a = appels(api, 'activité')
  return {
    centres: {
      liste: () => a.get('/hubs'),
    },
    apprendre: {
      faites: () => a.get('/learning/progress'),
      cocher: (fiche, etape, fait) => a.put(`/learning/progress/${seg(fiche)}`, { etape, fait }),
      recommencer: (fiche) => a.supprimer(`/learning/progress/${seg(fiche)}`),
    },
    profilAJB: {
      changerBio: (texte) => a.patch('/me', { bio: texte }),
    },
    recherche: {
      chercher: (q) => a.get('/search', { query: { q } }),
    },
    activite: {
      journal: () => a.get('/shop/activity'),
      ramassages: (de, fin) => a.get<Remise[]>('/pickups', { query: { from: de, to: fin } }),
      tableau: (periode) => a.get('/seller/activity', { query: { period: periode } }),
      objectif: () => a.get('/seller/goal'),
      fixerObjectif: (montant) => a.put('/seller/goal', { amount: montant }),
    },
    echanges: {
      evenements: (depuis) => a.get('/events', { query: { depuis: depuis ?? undefined } }),
      colisNonPret: (ref, raison) => a.post(`/orders/${seg(ref)}/not-ready`, { raison }),
    },
  }
}
