// Domaines « Catalogue, fiche et avis produit » et « Favoris » (CL-05, CL-06, CL-11).
// Produits, avis et favoris : routes de relaya (ProductSerializer, reviews, favorites), converties par
// src/api/adaptateurs.ts ; votes sur un avis, alertes d'un favori et ajout au panier depuis la fiche : routes du kit
// (backend-kit/apps/aftersales, client_accounts, cart).
import type { Favori } from '../../donnees/source'
import { repartition, versAvisProduit, versFavori, versProduit, type RAvis, type RFavori, type RPage, type RProduit } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurIntrouvable } from '../erreurs'
import { liste } from './session'
import { seg } from './refus'

async function ouNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch (e) {
    if (e instanceof ErreurIntrouvable) return null
    throw e
  }
}

export function domaineCatalogue(api: ClientApi) {
  const favorisBruts = async () => liste(await api.get<RFavori[] | RPage<RFavori>>('/auth/favorites/'))

  return {
    // ——— Catalogue ———
    produits: async () => liste(await api.get<RProduit[] | RPage<RProduit>>('/catalog/products/', { query: { page_size: 100 } })).map(versProduit),
    produit: async (p: string) => ouNull(api.get<RProduit>(`/catalog/products/${seg(p)}/`).then(versProduit)),
    avisProduit: async (p: string) =>
      ouNull(api.get<RAvis[]>(`/catalog/products/${seg(p)}/reviews/`).then((avis) => ({ repartition: repartition(avis), avis: avis.map(versAvisProduit) }))),
    // POST /api/reviews/{id}/vote {action: utile|signaler} → 204
    voterAvis: async (_p: string, id: string, action: 'utile' | 'signaler') => {
      await api.post(`/reviews/${seg(id)}/vote`, { action })
    },
    // POST /api/cart/lines {produit, options, qte, boutique?} → panier recalculé par le serveur (offre, frais)
    ajouterProduit: async (p: string, choix: Record<string, string>, qte: number, boutique?: string) => {
      await api.post('/cart/lines', { produit: p, options: choix ?? {}, qte, ...(boutique ? { boutique } : {}) })
    },

    // ——— Favoris ———
    favoris: async () => ({ favoris: (await favorisBruts()).map(versFavori), verifieLe: Date.now() }),
    basculerFavori: async (p: string) => {
      const f = (await favorisBruts()).find((x) => String(x.product.id) === p)
      if (f) {
        await api.supprimer(`/auth/favorites/${f.id}/`)
        return false
      }
      await api.post('/auth/favorites/', { product_id: Number(p) })
      return true
    },
    retirerFavori: async (id: string) => {
      await api.supprimer(`/auth/favorites/${seg(id)}/`)
    },
    remettreFavori: async (f: Favori) => {
      await api.post('/auth/favorites/', { product_id: Number(f.p) })
    },
    // PATCH /api/me/favorites/{id} {alertes: {prix?, stock?}} → 204
    reglerAlerteFavori: async (id: string, k: 'prix' | 'stock', actif: boolean) => {
      await api.patch(`/me/favorites/${seg(id)}`, { alertes: { [k]: actif } })
    },
    // POST /api/cart/lines {favori} : le favori passe au panier
    favoriAuPanier: async (id: string) => {
      await api.post('/cart/lines', { favori: id })
    },
  }
}
