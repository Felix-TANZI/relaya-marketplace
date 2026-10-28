// Domaine « Contenus et photos » : contenus éditoriaux de l'accueil, servis par le kit (backend-kit/apps/contenus,
// GET /api/content/home, public, au format de src/donnees/contenus.ts : adaptateur identité). Si la route échoue
// (serveur injoignable, module pas encore installé), le site garde le contenu par défaut : l'accueil ne casse pas.
import { CONTENU_ACCUEIL, type ContenuAccueil } from '../../donnees/contenus'
import type { Source } from '../../donnees/source'
import type { ClientApi } from '../client'

export function domaineContenus(api: ClientApi) {
  return {
    contenuAccueil: async () => {
      try {
        const c = await api.get<Partial<ContenuAccueil>>('/content/home')
        // Une rubrique vide ou absente côté serveur garde celle par défaut.
        return {
          carrousel: c.carrousel?.length ? c.carrousel : CONTENU_ACCUEIL.carrousel,
          categories: c.categories?.length ? c.categories : CONTENU_ACCUEIL.categories,
          flash: c.flash ?? CONTENU_ACCUEIL.flash,
          confiance: c.confiance?.cartes?.length ? c.confiance : CONTENU_ACCUEIL.confiance,
          fondArrivee: c.fondArrivee ?? null,
        }
      } catch {
        return CONTENU_ACCUEIL
      }
    },
  } satisfies Partial<Source>
}
