# -*- coding: utf-8 -*-
"""
Remet le point relais a NEUF, pour juger l'ecran de bienvenue.

L'etat « relais neuf » se declenche sur `lifetimeParcels === 0` : aucun colis
jamais passe. On ne peut donc pas le voir sans vider le relais.

Cette commande retire les colis, retours et litiges POSES PAR LES AUTRES
COMMANDES DE DEMONSTRATION — elle ne touche a rien d'autre. Relancer un des
jeux precedents remet l'activite.
"""
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import RelayPointProfile
from apps.orders.models import Order

# Les marqueurs des commandes de demonstration existantes.
MARQUEURS = ["[demo-sortie]", "[demo-comptoir]", "[demo-historique]"]


class Command(BaseCommand):
    help = "Vide le point relais de son activite de demonstration."

    def add_arguments(self, parser):
        parser.add_argument("--relay", default=None, help="Nom d'utilisateur du point relais.")
        parser.add_argument(
            "--tout", action="store_true",
            help="Retire AUSSI les colis hors demonstration. Base de developpement uniquement.",
        )

    def handle(self, *args, **options):
        qs = RelayPointProfile.objects.filter(
            status=RelayPointProfile.Status.APPROVED, is_active=True,
        )
        username = options.get("relay")
        if username:
            relay_point = qs.filter(user__username=username).first()
            if not relay_point:
                raise CommandError(f"Aucun point relais approuve pour « {username} ».")
        else:
            if qs.count() != 1:
                raise CommandError(
                    f"{qs.count()} points relais approuves : precisez lequel avec --relay."
                )
            relay_point = qs.first()

        total = 0
        for marqueur in MARQUEURS:
            commandes = Order.objects.filter(
                address__startswith=marqueur,
                shipments__relay_parcel__relay_point=relay_point,
            ).distinct()
            total += commandes.count()
            # Colis, retours et litiges tombent en cascade avec la commande.
            commandes.delete()

        if options["tout"]:
            # Les colis poses par `seed_relay_demo` ne portent aucun marqueur :
            # seul un retrait explicite les enleve. Reserve au developpement —
            # sur une base reelle, ce serait effacer l'activite d'un gerant.
            autres = Order.objects.filter(
                shipments__relay_parcel__relay_point=relay_point,
            ).distinct()
            total += autres.count()
            autres.delete()

        restants = relay_point.parcels.count()
        self.stdout.write(self.style.SUCCESS(
            f"{total} commandes de demonstration retirees. Colis restants : {restants}."
        ))
        if restants:
            self.stdout.write(
                "Des colis reels subsistent : l'ecran de bienvenue ne s'affichera pas."
            )
