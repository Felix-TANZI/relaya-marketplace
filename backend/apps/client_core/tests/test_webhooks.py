# backend/apps/client_core/tests/test_webhooks.py
# Webhooks d'argent de relaya → applications du kit (apps.client_core.webhooks.confirmer_paiement_externe).
#
# Ce test exerce le parcours panier → paiement → webhook, donc dépend de apps.cart/
# apps.pickup/apps.wallet. Lors d'une installation partielle du kit (rollout par
# phases, voir backend-kit/REPRISE-BACKEND.md §5), ces apps peuvent être absentes :
# le module se saute alors proprement plutôt que de faire planter toute la collecte
# pytest (ModuleNotFoundError non récupérable autrement).
import pytest

pytest.importorskip("apps.cart")
pytest.importorskip("apps.pickup")
pytest.importorskip("apps.wallet")

from apps.cart import services as cart_services
from apps.cart.models import FicheLogistique
from apps.client_core import pont
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit, creer_relais
from apps.client_core.webhooks import confirmer_paiement_externe
from apps.pickup.models import MontantsCommande
from apps.pickup.tests.test_commande_retrait import isoler  # noqa: F401 - numéro vérifié simulé
from apps.wallet.prestataires import MobileMoneyConsole

pytestmark = pytest.mark.django_db


def _commande(cle: str) -> tuple[int, str]:
    user = creer_client()
    c = client_connecte(user)
    p = creer_produit(creer_boutique("Boutique A"), "Robe", prix=12_000)
    FicheLogistique.objects.create(product_id=p.pk, classe="S")
    panier = cart_services.panier_de(user)
    panier.relay_id = creer_relais().pk
    panier.save()
    c.post("/api/cart/lines", {"produit": str(p.pk)}, format="json")
    MobileMoneyConsole.DEMANDES.clear()
    corps = {"mode": "relais", "moyen": "mtn", "comptoir": False, "numero": None, "livraison": 900, "frais": 0}
    r = c.post("/api/checkout", corps, format="json", HTTP_IDEMPOTENCY_KEY=cle)
    assert r.status_code == 200, r.content
    return pont.id_commande(r.json()["ref"]), MobileMoneyConsole.DEMANDES[-1]["reference"]


def test_commande_payee_par_le_webhook(isoler):  # noqa: F811
    order_id, reference = _commande("webhook-1")
    assert reference.startswith(f"BLV-{order_id}-")
    assert MontantsCommande.objects.get(order_id=order_id).etat_paiement == "attente"
    assert confirmer_paiement_externe(reference) == "commande"
    assert MontantsCommande.objects.get(order_id=order_id).etat_paiement == "payee"
    assert pont.commande(order_id).payee is True
    assert confirmer_paiement_externe(reference) == "commande"  # rejoué : sans effet
    assert confirmer_paiement_externe(reference, reussi=False) == "commande"
    assert MontantsCommande.objects.get(order_id=order_id).etat_paiement == "payee"


def test_commande_refusee_par_le_webhook(isoler):  # noqa: F811
    order_id, reference = _commande("webhook-2")
    assert confirmer_paiement_externe(reference, reussi=False, cause="expire") == "commande"
    m = MontantsCommande.objects.get(order_id=order_id)
    assert (m.etat_paiement, m.cause_echec) == ("echec", "expire")


def test_reference_inconnue():
    assert confirmer_paiement_externe("") is None
    assert confirmer_paiement_externe("CAMPAY-123") is None
    assert confirmer_paiement_externe("BLV-999999-1") is None
