// Domaine « produits » branché sur le kit (backend-kit/apps/vendeur_catalogue) : mes offres (tri « ce qui demande
// attention d'abord », ventes et gardé du mois, concurrents), stock rapide (accès Préparation compris), pause, réglages,
// copie d'une variante, brouillon supprimé puis restauré, variantes d'une fiche, export et import CSV.
// Réponses au format de src/donnees/domaines/produits.ts, rendues telles quelles ; un refus attendu par l'écran est un
// 200 { ok: false, raison } ; offre inconnue : 404 → null ; accès Préparation : montants null, 403 owner_only → ReserveAuProprietaire.
import type { ClientApi } from '@client/api/client'
import type { DomaineProduits, ListeProduits, Produit, VarianteDeFiche } from '../../donnees/domaines/produits'
import type { Resultat } from '../../donnees/communs'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

export function domaineProduits(api: ClientApi): SourceVendeur['produits'] {
  const a = appels(api, 'produits')
  const d: DomaineProduits = {
    liste: () => a.get<ListeProduits>('/offers'),
    detail: (id) => ouNull(a.get<Produit>(`/offers/${seg(id)}`)),
    changerStock: (id, stock) => a.put<Resultat<{ produit: Produit }, 'stock'>>(`/offers/${seg(id)}/stock`, { stock }),
    pause: (id, enPause) => ouNull(a.post<Produit>(`/offers/${seg(id)}/pause`, { enPause })),
    regler: (id, champs) => a.put<Resultat<{ produit: Produit }, 'plancher' | 'seuil' | 'reserve'>>(`/offers/${seg(id)}`, champs),
    dupliquer: (id, variante) =>
      a.post<Resultat<{ brouillonId: string; rattache: boolean }, 'variante' | 'existe' | 'fiche'>>(`/offers/${seg(id)}/duplicate`, { variante }, { idempotence: true }),
    supprimer: (id) => a.supprimer<Resultat<object, 'etat'>>(`/offers/${seg(id)}`),
    restaurer: async (id) => {
      await a.post<void>(`/offers/${seg(id)}/restore`)
    },
    variantes: (ficheId) => a.get<VarianteDeFiche[]>(`/sheets/${seg(ficheId)}/variants`),
    exporter: () => a.get<string>('/offers/export'),
    importer: (csv) => a.post<Resultat<{ lignes: number; ignorees: number }, 'vide' | 'format'>>('/offers/import', { csv }),
  }
  return d
}
