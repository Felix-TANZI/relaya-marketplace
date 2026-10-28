# backend/apps/regles/services.py
# Point d'entrée unique des règles v2.1 pour le reste du serveur.
#
#     from apps.regles import services as regles
#     regles.reglage("r_seuil_relais")    # 30000
#     regles.moteur().paiement(mode, destination, boutiques)
#     regles.empreinte()                  # à figer sur une commande pour la recalculer avec ses propres réglages
#
# Les valeurs viennent de la base (admin). Base vide (tests sans migrations) : valeurs de lancement de BV-DEV-07.
# Mis en cache jusqu'à la prochaine modification d'un réglage ou d'une table.

import hashlib
import json

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Reglage, TableReglee
from .moteur_reference import Moteur
from .reference import donnees_reference

CLE_CACHE = "regles:donnees"


class ReglageAbsent(LookupError):
    """Un r_… ou une t_… demandé n'existe pas : nom mal écrit ou base incomplète."""


def _depuis_base() -> dict | None:
    reglages = {nom: {"valeur": v, "exact": e, "unite": u} for nom, v, e, u in Reglage.objects.values_list("nom", "valeur", "exact", "unite")}
    if not reglages:
        return None
    tables = dict(TableReglee.objects.values_list("nom", "lignes"))
    return {"reglages": reglages, "tables": tables}


def _depuis_reference() -> dict:
    ref = donnees_reference()
    return {"reglages": ref["reglages"], "tables": ref["tables"]}


def donnees() -> dict:
    """Réglages et tables en vigueur, sous la forme lue par le moteur : {"reglages": {r_…: {"valeur": …}}, "tables": {…}}."""
    d = cache.get(CLE_CACHE)
    if d is None:
        d = _depuis_base() or _depuis_reference()
        canon = json.dumps([d["reglages"], d["tables"]], sort_keys=True, ensure_ascii=False).encode("utf-8")
        d["empreinte"] = hashlib.sha256(canon).hexdigest()[:16]
        cache.set(CLE_CACHE, d, timeout=None)
    return d


def reglage(nom: str):
    try:
        return donnees()["reglages"][nom]["valeur"]
    except KeyError:
        raise ReglageAbsent(nom) from None


def table(nom: str):
    try:
        return donnees()["tables"][nom]
    except KeyError:
        raise ReglageAbsent(nom) from None


def empreinte() -> str:
    return donnees()["empreinte"]


def moteur() -> Moteur:
    """Moteur de référence BV-DEV-09 nourri des réglages et tables de l'admin."""
    return Moteur(donnees())


@receiver(post_save, sender=Reglage)
@receiver(post_delete, sender=Reglage)
@receiver(post_save, sender=TableReglee)
@receiver(post_delete, sender=TableReglee)
def _oublier(**_):
    cache.delete(CLE_CACHE)
