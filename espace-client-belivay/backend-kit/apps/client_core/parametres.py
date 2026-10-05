# backend/apps/client_core/parametres.py
# Registre des paramètres pour les moteurs (CCH-15).
#
#     from apps.client_core.parametres import registre, livraison
#     frais = belivay_moteurs.frais.calculer(panier, livraison())
#
# Source : la table ParametreMetier si elle est remplie (commande charger_parametres), sinon le fichier
# settings.BELIVAY_PARAMETRES_JSON (copie de logique-metier/parametres-en-vigueur.json livrée avec le kit).
# Le dictionnaire rendu a la forme attendue par belivay_moteurs.registre : code → valeur, « code#sens » → sens,
# « #version » → empreinte. Cette empreinte est figée sur chaque commande (version_parametres) pour qu'une
# commande se recalcule toujours avec les paramètres de son paiement.
#
# Mis en cache (django.core.cache) jusqu'à la prochaine modification d'un ParametreMetier.

import hashlib
import json
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import ParametreMetier

CLE_CACHE = "client_core:registre"


def _depuis_fichier(chemin: Path) -> dict[str, str]:
    from belivay_moteurs.registre import charger_registre

    return charger_registre(chemin)


def _depuis_base() -> dict[str, str] | None:
    lignes = list(ParametreMetier.objects.values_list("code", "valeur", "sens"))
    if not lignes:
        return None
    reg: dict[str, str] = {}
    for code, valeur, sens in lignes:
        reg[code] = valeur
        reg[f"{code}#sens"] = sens
    canon = json.dumps(sorted(lignes), ensure_ascii=False).encode("utf-8")
    reg["#version"] = "db-" + hashlib.sha256(canon).hexdigest()[:12]
    return reg


def registre() -> dict[str, str]:
    reg = cache.get(CLE_CACHE)
    if reg is None:
        reg = _depuis_base() or _depuis_fichier(Path(settings.BELIVAY_PARAMETRES_JSON))
        cache.set(CLE_CACHE, reg, timeout=None)
    return reg


def version() -> str:
    return registre().get("#version", "non versionné")


@receiver(post_save, sender=ParametreMetier)
@receiver(post_delete, sender=ParametreMetier)
def _oublier(**_):
    cache.delete(CLE_CACHE)


# Raccourcis : une lecture typée par famille de paramètres (belivay_moteurs.registre.lire_*).
def livraison():
    from belivay_moteurs.registre import lire_livraison

    return lire_livraison(registre())


def garde():
    from belivay_moteurs.registre import lire_garde

    return lire_garde(registre())


def paiement():
    from belivay_moteurs.registre import lire_paiement

    return lire_paiement(registre())


def litiges():
    from belivay_moteurs.registre import lire_litiges

    return lire_litiges(registre())


def avis():
    from belivay_moteurs.registre import lire_avis

    return lire_avis(registre())


def portefeuille():
    from belivay_moteurs.registre import lire_portefeuille

    return lire_portefeuille(registre())


def bascule():
    from belivay_moteurs.registre import lire_bascule

    return lire_bascule(registre())


def geo():
    from belivay_moteurs.registre import lire_geo

    return lire_geo(registre())


def nombres(code: str) -> list[int]:
    """Les nombres écrits dans la valeur d'un paramètre simple, dans l'ordre (« 60 s entre deux envois, 3 envois par
    heure » → [60, 3] ; « 30 000 F » → [30000]). Pour les paramètres sans lecture typée dans les moteurs (OTP,
    abonnement, modules CL-15). Paramètre absent : ParametreAbsent (503 parametres_indisponibles)."""
    import re

    from belivay_moteurs.erreurs import ParametreAbsent, ParametreIllisible

    v = registre().get(code)
    if v is None:
        raise ParametreAbsent(code)
    blanc = "[ \\u00a0\\u202f]"
    trouves = [int(re.sub(blanc, "", m)) for m in re.findall(r"\d{1,3}(?:" + blanc + r"\d{3})+(?!\d)|\d+", v)]
    if not trouves:
        raise ParametreIllisible(f"{code} : « {v} » sans nombre")
    return trouves


def entier(code: str) -> int:
    """Premier nombre d'un paramètre simple (« 10 minutes » → 10, « 30 000 F » → 30000)."""
    return nombres(code)[0]
