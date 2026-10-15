// Domaine « Commandes, retrait et modification » (CL-09, CL-12) : racheter, déléguer le retrait, aperçu et
// annulation d'une boutique (sous-commande), changement de relais, d'adresse ou transfert d'un colis arrivé.
//
// RÉALITÉ VÉRIFIÉE (14 oct. 2026, contre backend/ réel) : `commandes`, `commandeClient` et `confirmerRetrait`
// restent sur les vraies routes de relaya (apps/orders/urls.py), inchangées. En revanche OrderDetailSerializer n'a
// PAS de champ « espace_client » dans ce dépôt (le kit ne l'a jamais branché ici) : adaptateurs.ts::versCommande
// le sait déjà et calcule un repli honnête (un « colis » par OrderItem, sans boutique). Shipment EST pourtant déjà
// « un colis par vendeur et par commande » (règle mère, apps/shipping/models.py) — exposé par
// GET /api/orders/{id}/tracking/ (colis principal + other_shipments), mais pas encore relié ici : voir le rapport
// de session pour la question sous-commandes (non résolue, conforme à la consigne de ne pas deviner).
//
// racheter, deleguerRetrait, apercuAnnulation, annulerColis, changerLieu n'ont aucune route réelle côté relaya
// (routes du kit : /rebuy, /delegation, /manage, /suborders/*, /relais, /address) : NonDisponible, sans inventer
// de substitut (notamment pas d'annulation globale déguisée en annulation « par boutique »).
import type { ApercuAnnulation, Source } from '../../donnees/source'
import { idCommande, versCommande, type RCommande, type RPage } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurIntrouvable, NonDisponible } from '../erreurs'

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
    // POST /api/orders/{id}/confirm-receipt/ (relaya) : ConfirmReceiptView exige un `code` dans le corps dès que la
    // commande est au statut DELIVERED (code du livreur/relais) ; Source.confirmerRetrait(ref) n'a pas ce paramètre
    // (signature partagée par tout le site, non changée ici — voir routes.ts et le rapport de session). L'appel
    // réussit quand même tel quel pour reconfirmer une commande déjà au-delà de DELIVERED (idempotent côté serveur).
    confirmerRetrait: async (ref: string) => {
      await api.post(`/orders/${idCommande(ref)}/confirm-receipt/`)
    },

    // Route absente de apps/orders/urls.py (pas de /rebuy).
    racheter: async (): Promise<number> => {
      throw new NonDisponible('racheter', 'POST /api/orders/{id}/rebuy (inexistant)')
    },

    // Aucune route pour modifier authorized_pickup_name/phone après la création de la commande.
    deleguerRetrait: async (): Promise<void> => {
      throw new NonDisponible('deleguerRetrait', 'PUT /api/orders/{id}/delegation (inexistant)')
    },

    // Aucun aperçu d'annulation côté serveur.
    apercuAnnulation: async (): Promise<ApercuAnnulation | null> => {
      throw new NonDisponible('apercuAnnulation', 'GET /api/orders/{id}/manage (inexistant)')
    },

    // relaya n'a pas de sous-commande : seul POST /api/orders/{id}/cancel/ existe, et annule TOUTE la commande
    // (bloqué dès qu'un colis a été ramassé chez un vendeur). Le brancher ici reviendrait à annuler les articles
    // d'AUTRES boutiques que celle que le client a choisie — comportement incorrect, pas une simplification
    // acceptable. Signalé comme décision bloquante plutôt que deviné.
    annulerColis: async (): Promise<number> => {
      throw new NonDisponible('annulerColis', 'POST /api/suborders/{id}/cancel (inexistant ; seul POST /api/orders/{id}/cancel/ annule TOUTE la commande)')
    },

    // Aucune route pour changer le relais ou l'adresse d'une commande déjà passée.
    changerLieu: async (): Promise<void> => {
      throw new NonDisponible('changerLieu', 'PUT /api/orders/{id}/relais ou /address (inexistant)')
    },
  } satisfies Partial<Source>
}
