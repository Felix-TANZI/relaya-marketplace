// Domaine « accueil » branché sur le kit (backend-kit/apps/vendeur_argent) : à faire (la plus urgente d'abord),
// alerte avant un seuil, « Rien à faire », premier jour, suspension, file des gestes faits hors connexion (72 h,
// rejouée dans l'ordre). Montants null pour l'accès Préparation. Réponses au format de src/donnees/domaines/accueil.ts.
import type { ClientApi } from '@client/api/client'
import type { ActionEnFile, Aujourdhui, Calme, DomaineAccueil, FileHorsLigne, PremierJour, Suspension } from '../../donnees/domaines/accueil'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineAccueil(api: ClientApi): SourceVendeur['accueil'] {
  const a = appels(api, 'accueil')
  const d: DomaineAccueil = {
    aujourdhui: () => a.get<Aujourdhui>('/seller/today'),
    masquerAlerte: async () => {
      await a.post<void>('/seller/today/hide-alert')
    },
    calme: () => a.get<Calme>('/seller/calm'),
    premierJour: () => a.get<PremierJour>('/seller/onboarding'),
    suspension: (o) => ouNull(a.get<Suspension>('/seller/suspension', { query: { example: o?.exemple ? 1 : undefined } })),
    file: () => a.get<FileHorsLigne>('/offline-queue'),
    noterReseau: async (horsLigneDepuis) => {
      await a.put<void>('/offline-queue/network', { horsLigneDepuis })
    },
    mettreEnFile: ({ type, objet, detail }) =>
      a.post<ActionEnFile>('/offline-queue', { type, objet, detail: detail ?? null, origine: Date.now() }, { idempotence: true }),
    envoyerFile: () => a.post<NonNullable<FileHorsLigne['dernierEnvoi']>>('/offline-queue/send', {}, { idempotence: true }),
    retirer: async (id) => {
      await a.supprimer(`/offline-queue/${seg(id)}`)
    },
  }
  return d
}
