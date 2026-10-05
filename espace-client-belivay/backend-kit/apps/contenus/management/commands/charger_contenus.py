# backend/apps/contenus/management/commands/charger_contenus.py
# Valeurs initiales des contenus de l'accueil (donnees/accueil.json = contenu actuel du site).
#   python manage.py charger_contenus               # remplit les rubriques vides
#   python manage.py charger_contenus --remplacer   # revient au contenu du site (efface les modifications)
from django.core.management.base import BaseCommand

from apps.contenus.services import charger_contenus


class Command(BaseCommand):
    help = "Charge les contenus de l'accueil (carrousel, catégories, bandeau de confiance, textes flash)."

    def add_arguments(self, parser):
        parser.add_argument("--remplacer", action="store_true", help="remplace les contenus existants")

    def handle(self, *args, remplacer=False, **options):
        n = charger_contenus(remplacer=remplacer)
        self.stdout.write(
            self.style.SUCCESS(f"Contenus : {n['carrousel']} bandeaux, {n['categories']} catégories, {n['confiance']} cartes.")
        )
