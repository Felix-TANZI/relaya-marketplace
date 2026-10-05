// Domaine « Commandes, retrait et modification » (CL-09, CL-12) : racheter, déléguer le retrait, aperçu et
// annulation d'une boutique (sous-commande), changement de relais, d'adresse ou transfert d'un colis arrivé.
// Routes du kit : backend-kit/apps/pickup (réponses au format de src/donnees/source.ts, adaptateur identité).
// La liste et le détail des commandes restent sur les routes de relaya (état « partiel »).
import type { ApercuAnnulation, Source } from '../../donnees/source'
import { idCommande, versCommande, type RCommande, type RPage } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurIntrouvable } from '../erreurs'

import { liste } from './session'

export function domaineCommandes(api: ClientApi) {
  return {
    // GET /api/orders/my-orders/ (relaya) → CommandeClient[]
    commandes: async () => {
      const r = await api.get<RCommande[] | RPage<RCommande>>('/orders/my-orders/')
      return { commandes: liste(r).map(versCommande), maintenant: Date.now() }
    },
    // GET /api/orders/{id}/ (relaya) → CommandeClient ; 404 → null
    commandeClient: async (ref: string) => {
      try {
        return { commande: versCommande(await api.get<RCommande>(`/orders/${idCommande(ref)}/`)), maintenant: Date.now() }
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },
    // POST /api/orders/{id}/confirm-receipt/ (relaya)
    confirmerRetrait: async (ref: string) => {
      await api.post(`/orders/${idCommande(ref)}/confirm-receipt/`)
    },

    // POST /api/orders/{id}/rebuy → nombre d'articles remis au panier
    racheter: async (ref: string) => api.post<number>(`/orders/${idCommande(ref)}/rebuy`),

    // PUT /api/orders/{id}/delegation {prenom, numero | null} → 204 ; numero null : délégation retirée
    deleguerRetrait: async (ref: string, prenom: string, numero: string | null) => {
      await api.put(`/orders/${idCommande(ref)}/delegation`, { prenom, numero })
    },

    // GET /api/orders/{id}/manage?n= → ApercuAnnulation ; 404 → null
    apercuAnnulation: async (ref: string, n: number) => {
      try {
        return await api.get<ApercuAnnulation>(`/orders/${idCommande(ref)}/manage`, { query: { n } })
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return null
        throw e
      }
    },

    // POST /api/suborders/{commande}-{n}/cancel {motif} (Idempotency-Key) → montant remboursé ; 409 state_changed
    annulerColis: async (ref: string, n: number, motif: string) =>
      api.post<number>(`/suborders/${idCommande(ref)}-${n}/cancel`, { motif }, { idempotence: `annuler-${idCommande(ref)}-${n}` }),

    // Relais : PUT /api/orders/{id}/relais {lieu, frais} (les colis déjà arrivés sont transférés par le serveur, transfert
    // et garde due compris ; 409 price_changed si le montant dû dépasse `frais`). Adresse : PUT /api/orders/{id}/address
    // {lieu, frais} (409 collected). L'écran donne le libellé « Nom · Quartier » de l'adresse : le serveur le reconnaît.
    changerLieu: async (ref: string, lieu: string, frais: number) => {
      const id = idCommande(ref)
      const mode = versCommande(await api.get<RCommande>(`/orders/${id}/`)).mode
      await api.put(`/orders/${id}/${mode === 'domicile' ? 'address' : 'relais'}`, { lieu, frais })
    },
  } satisfies Partial<Source>
}
