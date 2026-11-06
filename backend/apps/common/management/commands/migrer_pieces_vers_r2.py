"""
Déplace sur R2 les pièces confidentielles restées sur le disque du serveur — DEV-SRV-01, règle R8.

Les pièces déposées avant R8 (CNI, selfie, documents de boutique) ont été écrites sur le disque par l'ancien
stockage. Elles restent lisibles (PiecesConfidentiellesStorage lit le disque en dernier recours), mais R8 veut
qu'il n'en reste aucune.

    python manage.py migrer_pieces_vers_r2              # dit seulement ce qui serait déplacé
    python manage.py migrer_pieces_vers_r2 --appliquer  # copie sur R2, vérifie la taille, puis efface le disque

Une copie dont la taille ne correspond pas n'efface rien. Sortie : code 1 s'il reste une pièce sur le disque.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import ComplianceDocument
from apps.common.storage import PiecesConfidentiellesStorage
from apps.vendors.models import ShopModificationDocument


class Command(BaseCommand):
    help = "Déplace sur R2 les pièces confidentielles encore présentes sur le disque du serveur (R8)."

    def add_arguments(self, parser):
        parser.add_argument("--appliquer", action="store_true", help="Déplacer pour de bon (sinon : simulation).")

    def handle(self, *args, **options):
        if not settings.R2_STORAGE_ENABLED:
            raise CommandError("R2 n'est pas configuré (USE_R2_STORAGE, AWS_*) : rien ne peut être déplacé.")
        stockage = PiecesConfidentiellesStorage()
        appliquer = options["appliquer"]

        noms = set()
        for modele in (ComplianceDocument, ShopModificationDocument):
            noms.update(n for n in modele.objects.exclude(file="").values_list("file", flat=True) if n)

        restants = deplaces = 0
        for nom in sorted(noms):
            if not stockage.local.exists(nom):
                continue
            if not appliquer:
                self.stdout.write(f"à déplacer : {nom}")
                restants += 1
                continue
            if not stockage.remote.exists(nom):
                with stockage.local.open(nom, "rb") as fichier:
                    # Même nom sur R2 : la fiche en base n'a pas à changer.
                    stockage.remote._save(nom, fichier)
            if stockage.remote.size(nom) != stockage.local.size(nom):
                self.stderr.write(f"taille différente sur R2, disque conservé : {nom}")
                restants += 1
                continue
            stockage.local.delete(nom)
            deplaces += 1
            self.stdout.write(f"déplacée : {nom}")

        if appliquer:
            self.stdout.write(f"{deplaces} pièce(s) déplacée(s) sur R2, {restants} restée(s) sur le disque.")
        else:
            self.stdout.write(f"Simulation : {restants} pièce(s) à déplacer. Relancer avec --appliquer.")
        if restants:
            raise SystemExit(1)
