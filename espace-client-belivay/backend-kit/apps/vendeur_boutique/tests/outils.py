# Outils de test de l'application vendeur_boutique : codes SMS et e-mails envoyés, clés d'idempotence, une commande
# retirée et notée par le client (avis), valeurs du client à ne jamais voir côté vendeur (anonymat).
import itertools
import re
from datetime import timedelta

from django.core import mail
from django.utils import timezone

from apps.client_core import pont
from apps.otp.prestataires import SmsConsole
from apps.vendeur_core.models import CommandeVendeur
from apps.vendeur_core.tests.outils import commande_client, creer_offre

_n = itertools.count(1)


def cle() -> dict:
    return {"HTTP_IDEMPOTENCY_KEY": f"essai-boutique-{next(_n):06d}"}


def code_sms(numero: str) -> str:
    """Dernier code envoyé par SMS à ce numéro (9 chiffres ou formaté)."""
    n = re.sub(r"\D", "", numero)[-9:]
    envoi = next(e for e in reversed(SmsConsole.ENVOYES) if e["numero"].endswith(n))
    return re.search(r"\d{6}", envoi["texte"]).group(0)


def code_email(adresse: str) -> str:
    m = next(x for x in reversed(mail.outbox) if adresse in x.to)
    return re.search(r"\d{6}", m.body).group(0)


def commande_retiree(b, offre=None, il_y_a_jours=1) -> tuple[CommandeVendeur, dict]:
    """Une vraie commande du client, préparée, remise au livreur et retirée il y a `il_y_a_jours` jours."""
    from apps.pickup.models import SousCommande

    offre = offre or creer_offre(b)
    r = commande_client(offre)
    c = CommandeVendeur.objects.get(boutique=b, order_id=r["order_id"])
    retrait = timezone.now() - timedelta(days=il_y_a_jours)
    CommandeVendeur.objects.filter(pk=c.pk).update(
        prete_a=c.payee_a + timedelta(hours=1), remise_a=c.payee_a + timedelta(hours=2), photos_remise=["a", "b"]
    )
    SousCommande.objects.filter(order_id=c.order_id).update(etat="remise", remise_le=retrait)
    c.refresh_from_db()
    return c, r


def valeurs_du_client(r: dict) -> tuple[str, ...]:
    """Prénom, nom, e-mail, numéro et relais du client du test : jamais dans une réponse vendeur."""
    from apps.client_accounts.services import numero_verifie

    u = r["client"]
    commande = pont.commande(r["order_id"])
    relais = pont.relais(commande.relay_id) if commande and commande.relay_id else None
    valeurs = [u.first_name, u.last_name, u.email, u.username, numero_verifie(u) or ""]
    if relais is not None:
        valeurs += [relais.nom, relais.gerant]
    return tuple(v for v in valeurs if v and len(v) > 2)
