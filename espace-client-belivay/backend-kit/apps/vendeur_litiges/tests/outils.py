# Fabriques des tests des litiges vendeur : une vraie commande d'un client (routes du kit client), le colis remis au
# client au comptoir (pickup.evenements.remettre_au_client), puis un litige ouvert comme le client
# (apps.aftersales.services.ouvrir).
from datetime import timedelta

from apps.aftersales import services as apres_vente
from apps.aftersales.tests.fabriques import PNG_DATA_URL
from apps.pickup import evenements
from apps.pickup.models import GroupeRemise
from apps.pickup.services import code_de
from apps.vendeur_core import horloge
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_fiche, creer_offre

PHOTO = PNG_DATA_URL


def boutique_et_offre(stock=3):
    b = creer_boutique_vendeur()
    fiche = creer_fiche("iPhone 15 Pro Max", variantes=("256 Go",), dessin="flagship", prix_min=330000, prix_max=380000)
    o = creer_offre(b, fiche, variante="256 Go", prix=350000, stock=stock, reference="APL-15PM-256")
    return b, o


def commande_retiree(o) -> dict:
    """Commande payée, préparée, collectée, arrivée au relais et remise au client avec son code."""
    cmd = commande_client(o)
    c = CommandeVendeur.objects.get(order_id=cmd["order_id"], n=1)
    socle.avancer_colis(c, "parcel.collected")
    evenements.avancer(cmd["order_id"], "parcel.received")
    g = GroupeRemise.objects.get(order_id=cmd["order_id"])
    assert evenements.remettre_au_client(cmd["order_id"], code_de(g))["ok"]
    cmd["vendeur"] = c
    return cmd


def ouvrir_litige(cmd: dict, pb="pas-commande", description="J’ai commandé le 256 Go, la boîte indique 128 Go.", souhait="rembourse"):
    return apres_vente.ouvrir(cmd["client"], cmd["ref"], 1, pb, description, souhait, [PHOTO])


class Horloge:
    """Fait avancer l'heure de l'espace vendeur (vendeur_core.horloge.maintenant) dans un test."""

    def __init__(self, monkeypatch):
        self.decalage = timedelta(0)
        vrai = horloge.maintenant.__wrapped__ if hasattr(horloge.maintenant, "__wrapped__") else horloge.maintenant

        def maintenant():
            return vrai() + self.decalage

        monkeypatch.setattr(horloge, "maintenant", maintenant)

    def avancer(self, **kw):
        self.decalage += timedelta(**kw)
