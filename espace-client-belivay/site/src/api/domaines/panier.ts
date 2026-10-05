// Domaine « Panier et panier partagé » (CL-07, CL-12 ; CAL-08, CAL-11, CAP-11, CAP-24).
// Routes du kit : backend-kit/apps/cart (panier recalculé par le serveur : lignes, boutiques, frais du moteur,
// éligibilité au comptoir, changements de prix) ; remplacement : apps/aftersales. Réponses au format du site.
// Les favoris montrés sous le panier viennent de la route de relaya (le kit rend une liste vide).
import type { CarteJeton, ChangementPanier, DonneesPanier, LignePanier, PanierPartage } from '../../donnees/source'
import { versFavori, type RFavori, type RPage } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurIntrouvable } from '../erreurs'
import { jetonCarte, seg, suivreRedirection } from './refus'
import { liste } from './session'

// Le kit ajoute au panier ce que l'écran n'affiche pas (frais détaillés, comptoir, changements) : retiré ici.
type PanierServeur = DonneesPanier & { changements?: ChangementPanier[]; frais?: unknown; comptoir?: unknown }

export function domainePanier(api: ClientApi) {
  const lire = () => api.get<PanierServeur>('/cart')

  return {
    // GET /api/cart → panier recalculé depuis zéro
    panier: async (): Promise<DonneesPanier> => {
      const [p, favoris] = await Promise.all([lire(), api.get<RFavori[] | RPage<RFavori>>('/auth/favorites/').catch(() => [] as RFavori[])])
      const { changements: _c, frais: _f, comptoir: _k, ...panier } = p
      return { ...panier, favoris: panier.favoris?.length ? panier.favoris : liste(favoris).map(versFavori) }
    },
    // GET /api/cart → changements[] (baisses déjà appliquées par le serveur ; hausses, retraits et pris à accepter)
    verifierPanier: async () => (await lire()).changements ?? [],
    // POST /api/checkout/confirm → 204
    accepterChangements: async () => {
      await api.post('/checkout/confirm')
    },
    // PATCH /api/cart/lines/{id} {qte} → 204 ; 422 stock
    changerQuantite: async (id: string, qte: number) => {
      await api.patch(`/cart/lines/${seg(id)}`, { qte })
    },
    // DELETE /api/cart/lines/{id} (retrait annulable) → 204
    retirerLigne: async (id: string) => {
      await api.supprimer(`/cart/lines/${seg(id)}`)
    },
    // POST /api/cart/lines {ligne, position} : annuler un retrait
    remettreLigne: async (l: LignePanier, index: number) => {
      await api.post('/cart/lines', { ligne: l.id, position: index })
    },
    // POST /api/cart/lines/{id}/save : la ligne quitte le panier pour les favoris
    mettreEnFavori: async (id: string) => {
      await api.post(`/cart/lines/${seg(id)}/save`)
    },
    // POST /api/cart/lines {produit, boutique} (suggestion d'une boutique du panier)
    ajouterAuPanier: async (boutique: string, p: string) => {
      await api.post('/cart/lines', { produit: p, boutique })
    },
    // PATCH /api/cart/lines/{id} {nom, valeur}
    changerOption: async (id: string, nom: string, valeur: string) => {
      await api.patch(`/cart/lines/${seg(id)}`, { nom, valeur })
    },
    // POST /api/cart/lines/{id}/swap-offer {boutique} → 204 ; 409 no_gain (le gain n'est plus positif, CAL-08)
    choisirVendeur: async (id: string, boutique: string) => {
      await api.post(`/cart/lines/${seg(id)}/swap-offer`, { boutique })
    },
    // PATCH /api/cart {mode} → 204
    choisirModePanier: async (mode: 'relais' | 'domicile') => {
      await api.patch('/cart', { mode })
    },

    // ——— Panier partagé (payé par un proche, CAP-11) ———
    // POST /api/carts/me/share {lignes?} → PanierPartage
    partagerPanier: async (lignes?: string[]) => api.post<PanierPartage>('/carts/me/share', lignes ? { lignes } : {}),
    // GET /api/gift-links/{token} (public : sans adresse ni numéro) ; 404 → null
    panierPartage: async (id: string) => {
      try {
        return await api.get<PanierPartage>(`/gift-links/${seg(id)}`, { anonyme: true })
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },
    paniersPartages: async () => api.get<PanierPartage[]>('/me/gift-links'),
    // POST /api/gift-payments {token, prenom, email, carte (jeton), devise} (Idempotency-Key) → PanierPartage ;
    // 3-D Secure si le serveur renvoie une adresse ; 402 card_declined, 422 over_cap
    payerPanierPartage: async (id: string, p: { prenom: string; email: string; carte: CarteJeton; devise: 'EUR' | 'USD' }) =>
      suivreRedirection(
        await api.post<PanierPartage>(
          '/gift-payments',
          { token: id, prenom: p.prenom, email: p.email, carte: jetonCarte(p.carte), devise: p.devise },
          { anonyme: true, idempotence: `panier-partage-${id}-${jetonCarte(p.carte)}` },
        ),
      ),

    // POST /api/orders/{id}/replacement {autre_vendeur} : le vendeur n'a plus l'article
    choisirRemplacement: async (id: string, autreVendeur: boolean) => {
      await api.post(`/orders/${seg(id)}/replacement`, { autre_vendeur: autreVendeur })
    },
  }
}
