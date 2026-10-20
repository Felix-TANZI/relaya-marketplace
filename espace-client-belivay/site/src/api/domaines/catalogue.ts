// Domaines « Catalogue, fiche et avis produit » et « Favoris » (CL-05, CL-06, CL-11).
// Produits et avis : vraies routes de relaya aujourd'hui (ProductViewSet, reviews), converties par
// src/api/adaptateurs.ts. Favoris : vraie route de relaya (apps.accounts : auth/favorites/) ; les alertes de favori
// et le relais habituel viennent du kit réellement installé (apps.client_accounts, voir src/api/domaines/relais.ts).
//
// `group_by_master=1` (Tâche D5, backend/apps/catalog/offers.py) : la grille demande une seule fiche par
// MasterProduct au lieu d'une par offre vendeur — résout une partie de la décision 8 de CONNECTEURS.md sans
// migrer vers /api/catalog/master-products/ (qui resterait l'étape suivante pour « autres offres » en fiche).
//
// voterAvis, ajouterProduit et favoriAuPanier restent NON branchés : aucune route POST /api/reviews/{id}/vote ni
// /api/cart/lines n'existe réellement (apps.aftersales et apps.cart, prévus par le kit, ne sont pas dans
// INSTALLED_APPS — seuls apps.client_core/otp/client_accounts/notifications_client le sont). Les appeler quand
// même renverrait un 404 brut au lieu du message « bientôt » attendu : on les laisse donc à l'état
// NonDisponible (src/api/routes.ts), comme le prévoit l'architecture (voir AvisErreurs.tsx, genre non_disponible).
// Panier réel chez relaya : GET/PUT /api/auth/cart/ (UserCart, tableau JSON sans recalcul serveur par ligne) —
// très différent du modèle « lignes » du kit ; brancher dessus est la décision du domaine panier (src/api/domaines/panier.ts),
// pas de ce fichier : une ligne ajoutée à la main ici recalculerait un prix côté client, ce que le projet interdit.
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
    // group_by_master=1 (Tâche D5) : une seule offre représentante par MasterProduct dans la grille, au lieu
    // d'une carte par offre vendeur (plusieurs vendeurs du même produit n'inondent plus le catalogue).
    produits: async () =>
      liste(await api.get<RProduit[] | RPage<RProduit>>('/catalog/products/', { query: { page_size: 100, group_by_master: 1 } })).map(versProduit),
    produit: async (p: string) => ouNull(api.get<RProduit>(`/catalog/products/${seg(p)}/`).then(versProduit)),
    avisProduit: async (p: string) =>
      ouNull(api.get<RAvis[]>(`/catalog/products/${seg(p)}/reviews/`).then((avis) => ({ repartition: repartition(avis), avis: avis.map(versAvisProduit) }))),
    // voterAvis, ajouterProduit : aucune route réelle (voir l'en-tête du fichier) → laissées à NonDisponible
    // (src/api/routes.ts), pas de double de ces méthodes ici.

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
    // PATCH /api/me/favorites/{id} {alertes: {prix?, stock?}} → 204 (apps.client_accounts, réellement installé)
    reglerAlerteFavori: async (id: string, k: 'prix' | 'stock', actif: boolean) => {
      await api.patch(`/me/favorites/${seg(id)}`, { alertes: { [k]: actif } })
    },
    // favoriAuPanier : aucune route réelle (voir l'en-tête du fichier) → NonDisponible.
  }
}
