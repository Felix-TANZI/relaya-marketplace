# backend/apps/vendeur_commandes/demo.py
# Démonstration (serveur d'essai) : les commandes de « Tonton PG » sont créées par le socle
# (apps.vendeur_core.demo.charger). Ce module n'ajoute que ce qui manque, de façon idempotente : les annulations du
# client constatées, et un code de remise (chiffré) pour toute commande prête pas encore remise.
from apps.client_core.chiffrement import chiffrer
from apps.vendeur_core.models import Boutique, CommandeVendeur

from . import services


def charger(boutique: Boutique) -> None:
    services.preparer_lecture(boutique)
    for c in CommandeVendeur.objects.filter(
        boutique=boutique, prete_a__isnull=False, remise_a__isnull=True, annulee_a__isnull=True, code_chiffre__isnull=True
    ):
        c.code_chiffre = chiffrer(services.nouveau_code())
        c.save(update_fields=["code_chiffre"])
