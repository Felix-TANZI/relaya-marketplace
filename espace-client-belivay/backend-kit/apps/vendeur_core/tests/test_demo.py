# Jeu de démonstration du socle : la boutique du paquet, ses offres et les neuf commandes, idempotent.
import pytest
from django.core.management import call_command

from apps.vendeur_core import demo
from apps.vendeur_core.models import Boutique, CommandeVendeur, Membre, Offre

pytestmark = pytest.mark.django_db


@pytest.fixture
def catalogue_client():
    """Ce que charger_demo du serveur d'essai a déjà fait : un relais (le reste est facultatif pour le socle)."""
    from apps.client_core.tests.outils import creer_relais

    creer_relais()


def test_boutique_offres_et_commandes_du_jeu_d_essai(catalogue_client):
    b = demo.charger()
    assert (b.nom, b.palier, str(b.trust_score), b.plan) == ("Tonton PG", "Bronze", "62.7", "Free")
    assert {m.role for m in Membre.objects.filter(boutique=b)} == {"proprietaire", "preparation"}
    offres = {o.variante: o for o in Offre.objects.filter(boutique=b)}
    assert (offres["noir"].etat, offres["noir"].stock, offres["bleu"].etat, offres["256 Go"].stock) == ("en_vente", 3, "en_verification", 2)
    commandes = {c.ref: c for c in CommandeVendeur.objects.filter(boutique=b)}
    assert set(commandes) == set(demo.REFS.values())
    c8 = demo.commande("BLV-00008")
    assert c8.prete_a is None and c8.garde == 17840 and not c8.payable_au_retrait
    assert demo.commande("BLV-00009").payable_au_retrait
    assert demo.commande("BLV-00001").remise_a is not None
    # Idempotent.
    demo.charger()
    assert CommandeVendeur.objects.filter(boutique=b).count() == 9 and Boutique.objects.filter(identifiant="@Penga12").count() == 1


def test_commande_de_chargement(catalogue_client, capsys):
    call_command("charger_demo_vendeur")
    assert "Tonton PG" in capsys.readouterr().out
