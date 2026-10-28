// Domaine « Ventes flash » (FF-FLASH) : offres en cours (stock, fin de l'offre), ajout au panier au prix de l'offre.
// Routes du kit : backend-kit/apps/extras et backend-kit/apps/cart (réponses au format du site). L'alerte flash est
// un réglage des notifications (domaines/notifications.ts, alerteFlash).
import type { OffreFlash, Source } from '../../donnees/source'
import type { ClientApi } from '../client'

export function domaineFlash(api: ClientApi) {
  return {
    // GET /api/flash-deals → {offres, alerte, relais, maintenant} (publique ; connecté : alerte et relais du compte)
    ventesFlash: async () =>
      api.get<{ offres: OffreFlash[]; alerte: boolean; relais: string | null; maintenant: number }>('/flash-deals', { anonyme: !api.jetons.lire() }),

    // POST /api/cart/lines {produit, flash: true} → {ok} : ok si l'offre court encore et qu'il reste du stock
    ajouterFlash: async (p: string) => {
      const r = await api.post<{ ok: boolean }>('/cart/lines', { produit: p, flash: true })
      return { ok: r.ok }
    },
  } satisfies Partial<Source>
}
