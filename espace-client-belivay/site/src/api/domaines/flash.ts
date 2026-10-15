// Domaine « Ventes flash » (FF-FLASH) : offres en cours (stock, fin de l'offre), ajout au panier au prix de l'offre.
//
// RÉALITÉ VÉRIFIÉE (14 oct. 2026) : pas de /api/flash-deals (route du kit). relaya a un vrai système de campagnes
// promotionnelles (apps/catalog/models.py::PromotionCampaign, approuvées par la console) exposé en lecture par
// GET /api/catalog/promotions/active/?type=FLASH (ActivePromotionCampaignListView, public). `ajouterFlash` dépend
// du panier serveur (apps.cart) qui n'existe pas (voir domaines/panier.ts) : NonDisponible, même gap.
// `alerteFlash` reste PUT /api/me/notification-settings {flash} : apps.notifications_client est bien installée,
// route réelle, inchangée.
import type { OffreFlash, Source } from '../../donnees/source'
import { temps, type RPage } from '../adaptateurs'
import type { ClientApi } from '../client'
import { NonDisponible } from '../erreurs'
import { liste } from './session'

interface RCampagneFlash {
  product: number
  product_title: string
  promo_price_xaf: number
  reference_price_xaf: number
  starts_at: string
  ends_at: string
  remaining_stock: number
}

export function domaineFlash(api: ClientApi) {
  return {
    // GET /api/catalog/promotions/active/?type=FLASH (public) → PromotionCampaign[] (ou page DRF).
    ventesFlash: async () => {
      const r = await api.get<RCampagneFlash[] | RPage<RCampagneFlash>>('/catalog/promotions/active/', {
        query: { type: 'FLASH' },
        anonyme: !api.jetons.lire(),
      })
      const offres: OffreFlash[] = liste(r).map((c) => ({
        p: String(c.product),
        titre: c.product_title,
        dessin: '',
        univers: '', // non résolu : PromotionCampaignSerializer ne renvoie pas la catégorie
        prix: c.promo_price_xaf,
        avant: c.reference_price_xaf,
        debut: temps(c.starts_at),
        fin: temps(c.ends_at),
        stock: c.remaining_stock,
        livraison: 0, // non résolu : pas de frais de livraison sur ce serializer
      }))
      return { offres, alerte: false, relais: null, maintenant: Date.now() }
    },

    // apps.cart non installée (même gap que le domaine panier) : pas de panier serveur à alimenter.
    ajouterFlash: async (): Promise<{ ok: boolean }> => {
      throw new NonDisponible('ajouterFlash', 'POST /api/cart/lines (apps.cart non installée)')
    },

    // PUT /api/me/notification-settings {flash} : route réelle (apps.notifications_client), inchangée.
    alerteFlash: async (flash: boolean) => {
      await api.put('/me/notification-settings', { flash })
    },
  } satisfies Partial<Source>
}
