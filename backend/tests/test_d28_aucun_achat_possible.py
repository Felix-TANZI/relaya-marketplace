# backend/tests/test_d28_aucun_achat_possible.py
# Tache D28 — « Afficher "Bientot disponible" au moment de commander ».
#
# L'affichage est du front. La puce qui nous revient est la derniere :
#
#   « Verifier qu'aucun parcours n'aboutit a une commande ou a un paiement ;
#     cote serveur, l'API les refuse deja (D2, fait). »
#
# D2 a ferme les deux portes connues, et tests/test_purchases_closed.py les
# couvre. Ce fichier-ci couvre autre chose : l'EXHAUSTIVITE. Il ne verifie pas
# que les portes fermees le restent, il verifie qu'il n'en existe pas
# d'autres — c'est la seule facon de tenir la promesse « aucun parcours ».
#
# Inventaire etabli le 16 octobre 2026 sur la branche dev :
#
#   POST /api/orders/                              verrou D2
#   POST /api/payments/v2/me/payments/<ref>/pay/   verrou D2
#   PaymentInitView (paiement « mock_v1 »)         plus aucune route
#   PaymentSimulateSuccessView / ...FailureView    plus aucune route
#   apps.payments.bridge.checkout                  hors du chemin vivant
#   webhook CamPay                                 signature verifiee, et
#                                                  l'etat est reinterroge
#                                                  chez CamPay au lieu d'etre
#                                                  cru sur parole
#
# Les autres routes de commande (annulation, reception, litiges, retours)
# agissent sur une commande EXISTANTE. Aucune ne peut naitre, donc aucune ne
# s'applique.

import pytest
from django.urls import get_resolver

from apps.payments.views import (
    PaymentInitView,
    PaymentSimulateFailureView,
    PaymentSimulateSuccessView,
)

pytestmark = pytest.mark.django_db


# Ces vues existent encore dans views.py — leur code n'a pas ete supprime,
# c'est leur ACCES qui l'a ete (apps/payments/urls.py l'explique). Elles
# marquaient un paiement reussi sans qu'un franc ne bouge : il suffisait de
# connaitre un identifiant de transaction.
VUES_INTERDITES = {
    PaymentInitView: "initie un paiement simule (mock_v1)",
    PaymentSimulateSuccessView: "marque un paiement reussi sans encaissement",
    PaymentSimulateFailureView: "marque un paiement echoue sans encaissement",
}


def _toutes_les_vues_routees():
    """{classe de vue: chemin} pour tout ce que le serveur expose."""
    trouvees = {}

    def parcourir(patterns, prefixe=""):
        for p in patterns:
            motif = str(getattr(p.pattern, "_route", "") or p.pattern)
            if hasattr(p, "url_patterns"):
                parcourir(p.url_patterns, prefixe + motif)
            else:
                vue = getattr(p.callback, "cls", None) or getattr(p.callback, "view_class", None)
                if vue is not None:
                    trouvees.setdefault(vue, "/" + (prefixe + motif).lstrip("/"))

    parcourir(get_resolver().url_patterns)
    return trouvees


def test_aucune_vue_de_paiement_simule_n_est_joignable():
    """
    Le test qui compte. Si quelqu'un reroute une de ces vues — par
    inadvertance, en reprenant un ancien fichier d'URL, ou pour « tester
    vite » — ce test tombe avant la mise en ligne.
    """
    routees = _toutes_les_vues_routees()

    fautives = [
        f"{vue.__name__} ({raison}) est joignable sur {routees[vue]}"
        for vue, raison in VUES_INTERDITES.items()
        if vue in routees
    ]

    assert not fautives, (
        "Des vues de paiement simule sont de nouveau exposees :\n  "
        + "\n  ".join(fautives)
    )


def test_une_seule_route_peut_creer_une_commande():
    """
    `OrderCreateView` doit rester l'unique porte d'entree. Une seconde porte
    echapperait au verrou D2, qui est pose dans sa methode `create()` et nulle
    part ailleurs.
    """
    from apps.orders.views import OrderCreateView

    createurs = [
        vue for vue in _toutes_les_vues_routees()
        if getattr(vue, "serializer_class", None) is not None
        and getattr(vue.serializer_class, "__name__", "") == "OrderCreateSerializer"
    ]

    assert createurs == [OrderCreateView], (
        f"Attendu la seule OrderCreateView, trouve : "
        f"{[v.__name__ for v in createurs]}"
    )


def test_le_verrou_est_bien_pose_avant_toute_ecriture():
    """
    Le verrou doit etre la PREMIERE instruction de `create()`. Pose plus bas,
    la commande serait validee — et du stock reserve — avant d'etre refusee.
    """
    import inspect

    from apps.orders.views import OrderCreateView

    corps = [
        ligne.strip()
        for ligne in inspect.getsource(OrderCreateView.create).splitlines()
        if ligne.strip() and not ligne.strip().startswith(("#", '"""', "def "))
    ]

    assert corps[0].startswith("from apps.common.purchases import")
    assert corps[1] == "assert_purchases_open(request.user)"


@pytest.mark.parametrize("methode", ["get", "put"])
def test_sans_compte_le_panier_reste_sur_l_appareil(api_client, methode):
    """
    « Garder "+ Panier" et les favoris : le visiteur prepare son panier. Sans
    compte, le panier et les favoris restent sur son appareil. »

    Il existe bien un panier cote serveur (`/api/auth/cart/`), mais il est
    indexe sur l'utilisateur et demande une authentification : un visiteur
    anonyme n'en a aucun, donc le sien ne peut etre que local. Le module
    `cart` du kit, lui, n'est pas installe — il n'y a pas d'autre panier.
    """
    from apps.accounts.models import UserCart

    reponse = getattr(api_client, methode)("/api/auth/cart/", {}, format="json")

    assert reponse.status_code in (401, 403)
    assert UserCart.objects.count() == 0


def test_le_webhook_ne_croit_pas_la_charge_utile_sur_parole():
    """
    Un webhook est une URL publique sans authentification : c'est la porte
    qu'on oublie. Celle-ci verifie la signature, puis reinterroge CamPay pour
    l'etat reel. Un faux appel ne peut donc pas faire naitre un paiement.

    On lit le code plutot que d'appeler l'endpoint : l'appeler exigerait de
    simuler CamPay, et c'est justement ce qu'on ne doit pas toucher.
    """
    import inspect

    from apps.payments.webhooks import receiver

    # `handle` controle la signature puis delegue les couches 6 et 7 a
    # `process`, qui est l'endroit ou l'etat reel est demande au fournisseur.
    assert "verify_signature" in inspect.getsource(receiver.handle), (
        "La signature n'est plus verifiee."
    )

    traitement = inspect.getsource(receiver.process)
    assert "get_transaction" in traitement, (
        "Le fournisseur n'est plus interroge : l'etat viendrait du corps de "
        "la requete, donc de l'appelant."
    )
    assert "verified_status" in traitement, (
        "Le statut retenu n'est plus celui verifie aupres du fournisseur."
    )
