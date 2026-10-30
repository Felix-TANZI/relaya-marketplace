// Domaine « Annonces sponsorisées » (DP-59) : annonces d'une recherche ou d'une catégorie, emplacements de
// l'accueil, clic enregistré. Le placement parmi les résultats et le Boost sont calculés par le site
// (donnees/annonces.ts) avec les règles renvoyées par le serveur.
import type { AnnoncesListe, EmplacementsAccueil, EmplacementVu, MotifSignalement, Source } from '../../donnees/source'
import type { ClientApi } from '../client'

export function domaineAnnonces(api: ClientApi) {
  return {
    // GET /api/sponsored/placements?ou=&q=&cat= → {annonces, boosts, regles} (publique)
    annoncesListe: async (ou: 'recherche' | 'categorie', q: string | null, cat: string | null) =>
      api.get<AnnoncesListe>('/sponsored/placements', { query: { ou, q, cat }, anonyme: !api.jetons.lire() }),

    // GET /api/sponsored/home → {aLaUne, carrousel, flash} (publique)
    emplacementsAccueil: async () => api.get<EmplacementsAccueil>('/sponsored/home', { anonyme: !api.jetons.lire() }),

    // POST /api/sponsored/clicks {annonce} → 204 (un clic facturé une fois par client et par jour)
    cliquerAnnonce: async (id: string) => {
      await api.post<void>('/sponsored/clicks', { annonce: id }, { anonyme: !api.jetons.lire() })
    },

    // POST /api/sponsored/impressions {annonce, emplacement, visite} → 204 (une par client, emplacement et visite)
    voirAnnonce: async (id: string, emplacement: EmplacementVu, visite: string) => {
      await api.post<void>('/sponsored/impressions', { annonce: id, emplacement, visite }, { anonyme: !api.jetons.lire() })
    },

    // POST /api/sponsored/reports {annonce, motif} → 204 (relu par la console)
    signalerAnnonce: async (id: string, motif: MotifSignalement) => {
      await api.post<void>('/sponsored/reports', { annonce: id, motif }, { anonyme: !api.jetons.lire() })
    },
  } satisfies Partial<Source>
}
