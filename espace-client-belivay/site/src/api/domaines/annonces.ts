// Domaine « Annonces sponsorisées » (DP-59) : annonces d'une recherche ou d'une catégorie, emplacements de
// l'accueil, clic enregistré. Le placement parmi les résultats et le Boost sont calculés par le site
// (donnees/annonces.ts) avec les règles renvoyées par le serveur.
//
// RÉALITÉ VÉRIFIÉE (14 oct. 2026, contre backend/ réel) : AUCUNE trace de « sponsored » dans backend/apps (grep
// vide). DP-59 (enchère, budget, Boost, éligibilité VD-PUB-*) n'existe pas même en ébauche côté serveur réel —
// contrairement à CONNECTEURS.md (3 oct.), qui avait été vérifié contre le serveur d'essai du kit, pas ce dépôt.
// Ce domaine est donc intégralement « à créer côté serveur » : rien n'est inventé ici (pas de fausse mécanique de
// placement ni de règles de densité par défaut qui donneraient l'illusion que le serveur en décide).
import type { AnnoncesListe, EmplacementsAccueil, Source } from '../../donnees/source'
import type { ClientApi } from '../client'
import { NonDisponible } from '../erreurs'

export function domaineAnnonces(_api: ClientApi) {
  return {
    annoncesListe: async (): Promise<AnnoncesListe> => {
      throw new NonDisponible('annoncesListe', 'GET /api/sponsored/placements (aucune app « sponsored » dans backend/apps)')
    },
    emplacementsAccueil: async (): Promise<EmplacementsAccueil> => {
      throw new NonDisponible('emplacementsAccueil', 'GET /api/sponsored/home (aucune app « sponsored » dans backend/apps)')
    },
    cliquerAnnonce: async (): Promise<void> => {
      throw new NonDisponible('cliquerAnnonce', 'POST /api/sponsored/clicks (aucune app « sponsored » dans backend/apps)')
    },
    voirAnnonce: async (): Promise<void> => {
      throw new NonDisponible('voirAnnonce', 'POST /api/sponsored/impressions (aucune app « sponsored » dans backend/apps)')
    },
    signalerAnnonce: async (): Promise<void> => {
      throw new NonDisponible('signalerAnnonce', 'POST /api/sponsored/reports (aucune app « sponsored » dans backend/apps)')
    },
  } satisfies Partial<Source>
}
