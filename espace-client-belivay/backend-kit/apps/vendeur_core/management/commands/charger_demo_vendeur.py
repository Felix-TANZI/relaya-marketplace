# Jeu de démonstration de l'espace vendeur (serveur d'essai, PAS pour la production) : la boutique du jeu d'essai du
# paquet (apps.vendeur_core.demo), puis les données de chaque application vendeur installée (apps.vendeur_*.demo.charger).
# Idempotente. Appelée par charger_demo du serveur d'essai (après le catalogue, les relais et les comptes du client).
import importlib

from django.apps import apps
from django.core.management import BaseCommand

from apps.vendeur_core import demo
from apps.vendeur_core.urls import APPLICATIONS


class Command(BaseCommand):
    help = "Charge la boutique de démonstration du paquet vendeur (Tonton PG, @Penga12) et ses données."

    def handle(self, *args, **o):
        b = demo.charger()
        faites = []
        for a in APPLICATIONS:
            if not apps.is_installed(f"apps.{a}"):
                continue
            try:
                module = importlib.import_module(f"apps.{a}.demo")
            except ModuleNotFoundError:
                continue
            module.charger(b)
            faites.append(a)
        self.stdout.write(
            self.style.SUCCESS(
                f"Démo vendeur chargée : {b} ({demo.EMAIL_PROPRIETAIRE}, {demo.EMAIL_PREPARATION}) ; {', '.join(faites) or 'socle seul'}."
            )
        )
