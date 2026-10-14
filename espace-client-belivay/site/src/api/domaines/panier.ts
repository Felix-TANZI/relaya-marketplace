// Domaine « Panier et panier partagé » (CL-07, CL-12 ; CAL-08, CAL-11, CAP-11, CAP-24).
//
// RÉALITÉ VÉRIFIÉE (14 oct. 2026, contre backend/ réel — pas le kit) : il n'existe AUCUNE application panier côté
// serveur. `apps.client_core.urls_api` prévoit bien une ligne pour `apps.cart`, mais cette application n'est pas
// dans INSTALLED_APPS (backend/relaya/settings/base.py) ni même présente sous backend/apps/ : /api/cart,
// /api/cart/lines/*, /api/carts/*, /api/gift-links/*, /api/gift-payments et /api/orders/{id}/replacement
// n'existent pas et renvoient 404. CONNECTEURS.md (3 oct.) les marquait « branché » parce qu'il avait été vérifié
// contre le serveur d'essai du kit (backend-kit/_essai), pas contre ce dépôt — c'est une lecture obsolète.
//
// Le vrai parcours d'achat (apps/orders/serializers.py::OrderCreateSerializer) prend tout le panier EN UNE SEULE
// fois à la commande : `POST /api/orders/ {cart_items: [{product_id, qty}], city, district, address,
// customer_phone, ...}`. Il n'y a jamais de panier persistant côté serveur à lire, modifier ligne à ligne ou
// recalculer : jusqu'au paiement, le panier ne peut vivre que côté site (état local), puis être envoyé en bloc.
//
// Conséquence : toutes les méthodes ci-dessous lèvent NonDisponible — aucune ne doit être inventée (pas de panier
// fictif, pas de mini-backend local maquillé en appel serveur). Voir le rapport de session pour la question
// bloquante (construire apps.cart et/ou changer la forme de passerCommande, ou garder le panier 100 % côté site
// jusqu'à /api/orders/).
import type { Source } from '../../donnees/source'
import type { ClientApi } from '../client'
import { NonDisponible } from '../erreurs'

export function domainePanier(_api: ClientApi) {
  const indisponible = (methode: string, attendu: string) => (): never => {
    throw new NonDisponible(methode, attendu)
  }

  return {
    panier: async () => indisponible('panier', 'GET /api/cart (apps.cart non installée)')(),
    verifierPanier: async () => indisponible('verifierPanier', 'GET /api/cart (apps.cart non installée)')(),
    accepterChangements: async () => indisponible('accepterChangements', 'POST /api/checkout/confirm (apps.cart non installée)')(),
    changerQuantite: async () => indisponible('changerQuantite', 'PATCH /api/cart/lines/{id} (apps.cart non installée)')(),
    retirerLigne: async () => indisponible('retirerLigne', 'DELETE /api/cart/lines/{id} (apps.cart non installée)')(),
    remettreLigne: async () => indisponible('remettreLigne', 'POST /api/cart/lines (apps.cart non installée)')(),
    mettreEnFavori: async () => indisponible('mettreEnFavori', 'POST /api/cart/lines/{id}/save (apps.cart non installée)')(),
    ajouterAuPanier: async () => indisponible('ajouterAuPanier', 'POST /api/cart/lines (apps.cart non installée)')(),
    changerOption: async () => indisponible('changerOption', 'PATCH /api/cart/lines/{id} (apps.cart non installée)')(),
    choisirVendeur: async () => indisponible('choisirVendeur', 'POST /api/cart/lines/{id}/swap-offer (apps.cart non installée)')(),
    choisirModePanier: async () => indisponible('choisirModePanier', 'PATCH /api/cart (apps.cart non installée)')(),

    // ——— Panier partagé (payé par un proche) : rien côté serveur (ni apps.cart, ni gift-links/gift-payments) ———
    partagerPanier: async () => indisponible('partagerPanier', 'POST /api/carts/me/share (inexistant)')(),
    panierPartage: async () => indisponible('panierPartage', 'GET /api/gift-links/{token} (inexistant)')(),
    paniersPartages: async () => indisponible('paniersPartages', 'GET /api/me/gift-links (inexistant)')(),
    payerPanierPartage: async () => indisponible('payerPanierPartage', 'POST /api/gift-payments (inexistant)')(),

    // POST /api/orders/{id}/replacement : absent de backend/apps/orders/urls.py.
    choisirRemplacement: async () => indisponible('choisirRemplacement', 'POST /api/orders/{id}/replacement (inexistant)')(),
  } satisfies Partial<Source>
}
