# Outils des tests de l'argent : horloge d'essai posée à une heure de Yaoundé, retrait du client, litige.
import itertools
from datetime import datetime, time, timedelta

from django.utils import timezone

from apps.client_core.temps import YAOUNDE
from apps.vendeur_core import horloge
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import commande_client, creer_boutique_vendeur, creer_offre

_cle = itertools.count(1)


def cle() -> str:
    return f"cle-argent-{next(_cle):06d}"


def aller(t: datetime) -> None:
    """Pose l'horloge d'essai à t (BELIVAY_ESSAI_ROUTES doit être vrai)."""
    horloge.regler(int((t - timezone.now()).total_seconds()))


def lundi_prochain(heure=10) -> datetime:
    """Un lundi à `heure` (Yaoundé), au moins 2 jours après maintenant."""
    j = (timezone.now() + timedelta(days=2)).astimezone(YAOUNDE).date()
    j += timedelta(days=(7 - j.weekday()) % 7)
    return datetime.combine(j, time(heure), YAOUNDE)


def retirer(c: CommandeVendeur, a: datetime, tout_en_ordre: datetime | None = None) -> None:
    """Le client retire le colis au relais à l'instant a (pickup.SousCommande.remise_le)."""
    from apps.pickup.models import MontantsCommande, SousCommande

    SousCommande.objects.filter(order_id=c.order_id, n=c.n).update(etat="remise", remise_le=a)
    CommandeVendeur.objects.filter(pk=c.pk).update(prete_a=a - timedelta(hours=20))
    if tout_en_ordre:
        MontantsCommande.objects.filter(order_id=c.order_id).update(tout_en_ordre_le=tout_en_ordre)


def litige(c: CommandeVendeur, client, ouvert: datetime, **champs):
    from apps.aftersales.models import Litige

    return Litige.objects.create(
        client=client,
        order_id=c.order_id,
        colis=c.n,
        produit="ITEL AC52",
        pb="abime",
        probleme="Abîmé",
        souhait="rembourse",
        montant=c.prix,
        ouvert_le=ouvert,
        echeance_vendeur=ouvert + timedelta(hours=48),
        decision_au_plus_tard=ouvert + timedelta(hours=72),
        **champs,
    )


def boutique_et_commande(prix=20000, **kw):
    b = creer_boutique_vendeur(**kw)
    o = creer_offre(b, prix=prix, stock=10)
    cc = commande_client(o)
    return b, o, cc, CommandeVendeur.objects.get(ref=cc["ref"])
