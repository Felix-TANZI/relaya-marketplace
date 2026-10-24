# Démonstration (serveur d'essai) : données du jeu d'essai, idempotentes, et anonymes côté vendeur.
import pytest

from apps.vendeur_boutique import demo, services
from apps.vendeur_boutique.models import AppareilVendeur, HistoriqueEquipe, MessageSupportVendeur
from apps.vendeur_core import demo as socle_demo
from apps.vendeur_core.anonymat import fuites
from apps.vendeur_core.models import FermetureBoutique, Membre, NotificationVendeur
from apps.vendeur_core.tests.outils import client_connecte

pytestmark = pytest.mark.django_db
V = "/api/vendors"


def test_demo_idempotente_et_anonyme():
    b = socle_demo.charger()
    demo.charger(b)
    compte = (
        FermetureBoutique.objects.count(),
        NotificationVendeur.objects.count(),
        MessageSupportVendeur.objects.count(),
        AppareilVendeur.objects.count(),
    )
    demo.charger(b)
    assert compte == (
        FermetureBoutique.objects.count(),
        NotificationVendeur.objects.count(),
        MessageSupportVendeur.objects.count(),
        AppareilVendeur.objects.count(),
    )
    assert HistoriqueEquipe.objects.filter(boutique=b, membre="Aïcha N.").count() == 1
    franck = Membre.objects.get(boutique=b, role="proprietaire")
    api = client_connecte(franck.user)
    avis = api.get(f"{V}/reviews").json()
    assert avis["nombre"] == 2 and avis["note"] == 4.0
    fils = api.get(f"{V}/threads").json()
    # BLV-00005 : « litige » quand l'application des litiges a chargé son dossier, « commande » sinon.
    assert len(fils) == 3 and any(f["type"] == "support" for f in fils)
    # Même client pour BLV-00008 et BLV-00009 (ITEL) : la conversation se rattache à la plus récente.
    itel = next(f for f in fils if f["ref"] in (socle_demo.REFS["BLV-00008"], socle_demo.REFS["BLV-00009"]))
    assert itel["nonLus"] == 1 and itel["commande"]["etape"] == "à préparer"
    assert services.messages_non_lus(b) == 2
    notifs = api.get(f"{V}/notifications").json()
    assert len(notifs) >= 12 and sum(not n["lu"] for n in notifs) >= 4
    commande = socle_demo.commande("BLV-00002")
    from apps.client_core import pont

    client = pont.commande(commande.order_id)
    from django.contrib.auth import get_user_model

    u = get_user_model().objects.get(pk=client.user_id)
    interdits = tuple(
        x for x in (u.first_name, u.last_name, u.email) if x and len(x) > 2 and x != "Client"
    )  # « Client Démo » : le mot « Client » est permis
    for r in (avis, fils, notifs, api.get(f"{V}/threads/{itel['id']}").json(), api.get(f"{V}/shop").json()):
        assert fuites(r, valeurs_interdites=interdits) == []
    assert any(f["nom"] == "Android · Chrome" for f in api.get(f"{V}/devices").json())
