# backend/apps/shipping/appels.py
# Appel client-livreur avec numéro masqué — feuille de route D33 (« contrat opérateur »).
#
# Le serveur demande à un opérateur d'appeler les deux personnes et de les relier : ni le client ni le livreur ne
# voit le numéro de l'autre. L'opérateur se branche par BELIVAY_APPELS (chemin d'une classe), sans toucher au code,
# à la signature du contrat. Par défaut, AppelConsole journalise sans appeler.
#
# Tant qu'aucun vrai opérateur n'est branché, les numéros restent visibles comme aujourd'hui (sinon plus personne ne
# pourrait se joindre) ; dès qu'il l'est, masque_actif() les masque dans les écrans du client et du livreur.

import logging
from dataclasses import dataclass

from django.conf import settings
from django.utils.module_loading import import_string

logger = logging.getLogger("apps.shipping")

CONSOLE = "apps.shipping.appels.AppelConsole"
# Le livreur peut appeler pendant la course ; le client, dès qu'un livreur est assigné.
STATUTS_OUVERTS = ("ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "INCIDENT")


@dataclass
class Resultat:
    ok: bool
    reference: str = ""
    message: str = ""


class PrestataireAppel:
    """Un opérateur d'appel masqué : il appelle `appelant`, puis le relie à `appele` sans montrer les numéros."""

    nom = "abstrait"

    def relier(self, appelant: str, appele: str, reference: str) -> Resultat:
        raise NotImplementedError


class AppelConsole(PrestataireAppel):
    """Sans opérateur : rien n'est composé. DP-61 (« jamais le vrai numéro ») : le journal ne garde que les numéros
    masqués, jamais en clair, même en mémoire."""

    nom = "console"
    APPELS: list[dict] = []

    def relier(self, appelant, appele, reference):
        from apps.client_core.masquage import masquer_numero

        AppelConsole.APPELS.append({"appelant": masquer_numero(appelant), "appele": masquer_numero(appele),
                                    "reference": reference})
        logger.info("Appel masqué (console) %s : aucun opérateur branché, rien n'est composé.", reference)
        return Resultat(True, f"console-{reference}", "Simulation : aucun opérateur d'appel n'est encore branché.")


def prestataire() -> PrestataireAppel:
    return import_string(getattr(settings, "BELIVAY_APPELS", CONSOLE))()


def masque_actif() -> bool:
    return getattr(settings, "BELIVAY_APPELS", CONSOLE) != CONSOLE


def appeler(shipment, user):
    """Le client (acheteur) appelle le livreur assigné, ou le livreur assigné appelle le client. Lève PermissionError
    si la personne n'est ni l'un ni l'autre, ValueError si l'appel n'est pas ouvert pour ce colis."""
    from .models import AppelMasque

    courier = shipment.courier
    if courier is None or shipment.status not in STATUTS_OUVERTS:
        raise ValueError("L'appel s'ouvre quand un livreur est en route avec ce colis.")
    client_numero = shipment.order.authorized_pickup_phone or shipment.order.customer_phone
    if user.pk == shipment.order.user_id:
        sens, appelant, appele = AppelMasque.Sens.CLIENT_VERS_LIVREUR, client_numero, courier.phone
    elif user.pk == courier.user_id:
        sens, appelant, appele = AppelMasque.Sens.LIVREUR_VERS_CLIENT, courier.phone, client_numero
    else:
        raise PermissionError("Seuls le client et le livreur de ce colis peuvent s'appeler.")
    if not appelant or not appele:
        raise ValueError("Un des deux numéros manque.")
    p = prestataire()
    journal = AppelMasque.objects.create(shipment=shipment, sens=sens, demande_par=user, prestataire=p.nom)
    try:
        r = p.relier(appelant, appele, f"colis-{shipment.pk}-{journal.pk}")
    except Exception as exc:  # l'opérateur ne répond pas : on le dit, on ne bloque rien
        logger.exception("Appel masqué impossible pour le colis #%s.", shipment.pk)
        r = Resultat(False, "", f"Opérateur indisponible : {type(exc).__name__}")
    journal.ok, journal.reference, journal.message = r.ok, r.reference[:120], r.message[:255]
    journal.save(update_fields=["ok", "reference", "message"])
    return journal


def appels_au_client(shipment) -> int:
    """R51.1 : nombre d'appels du livreur au client pour ce colis (preuve avant de constater une absence). Un appel
    du mode console n'a pas été composé : il ne prouve rien (DP-61)."""
    return shipment.appels_masques.filter(sens="LIVREUR_CLIENT", ok=True).exclude(prestataire=AppelConsole.nom).count()


# DP-61 : un opérateur d'appel masqué est obligatoire avant la mise en service de main 2. `manage.py check --deploy`
# (avant chaque déploiement) le signale tant que la console est branchée.
from django.core import checks  # noqa: E402


@checks.register(checks.Tags.security, deploy=True)
def operateur_d_appel_branche(app_configs=None, **kwargs):
    if masque_actif():
        return []
    return [checks.Error(
        "Aucun opérateur d'appel masqué n'est branché (BELIVAY_APPELS) : les numéros restent visibles entre client "
        "et livreur.", hint="DP-61 : brancher l'opérateur sous contrat avant la mise en service de main 2.",
        id="shipping.E061")]
