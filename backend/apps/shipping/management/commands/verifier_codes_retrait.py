# backend/apps/shipping/management/commands/verifier_codes_retrait.py
# Revue du 29/10 (E2) : preuve de l'essai de la migration shipping 0032 (DP-02) sur une copie de la production.
#
#   python manage.py verifier_codes_retrait --codes avant_0032.csv
#
# avant_0032.csv : les codes en clair relevés sur la COPIE juste avant la migration (procédure dans
# PROCEDURE_MIGRATION_0032.md), une ligne « id,code » par colis. Après la migration, chaque colis doit :
#   - avoir son code chiffré, qui se relit à l'identique (ce que voit le client) ;
#   - accepter ce code au comptoir (RelayParcel.code_correct, celui de apps.shipping.retrait) ;
# Sans --codes, la commande vérifie seulement la cohérence chiffré / empreinte de chaque colis.
#
# Lecture seule : rien n'est modifié. Sortie 0 si tout passe, 1 sinon. Ne jamais garder le fichier des codes
# après l'essai (codes en clair) : le supprimer de la copie comme du poste.

import csv

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.shipping.models import RelayParcel


class Command(BaseCommand):
    help = "Vérifie, après la migration 0032, que chaque code de retrait existant est toujours accepté au comptoir."

    def add_arguments(self, parser):
        parser.add_argument("--codes", help="CSV id,code relevé sur la copie avant la migration")

    def handle(self, *args, **options):
        if not getattr(settings, "PAYMENTS_FINGERPRINT_SALT", ""):
            # A4 : sans sel, l'empreinte retombe sur SECRET_KEY ; poser le sel ensuite rendrait tous les codes faux.
            raise CommandError("PAYMENTS_FINGERPRINT_SALT est vide : le poser AVANT la migration 0032 (E2, A4).")

        attendus = {}
        if options.get("codes"):
            with open(options["codes"], newline="", encoding="utf-8") as f:
                for ligne in csv.reader(f):
                    if len(ligne) >= 2 and ligne[0].strip().isdigit():
                        attendus[int(ligne[0])] = ligne[1].strip()

        echecs, verifies = [], 0
        colis = RelayParcel.objects.exclude(pickup_code_empreinte="").only(
            "id", "pickup_code_chiffre", "pickup_code_empreinte")
        for parcel in colis.iterator():
            relu = parcel.pickup_code
            if not relu or not parcel.code_correct(relu):
                echecs.append(f"colis {parcel.pk} : chiffré et empreinte ne concordent pas")
            verifies += 1
        for pk, code in attendus.items():
            parcel = RelayParcel.objects.filter(pk=pk).first()
            if parcel is None:
                echecs.append(f"colis {pk} : absent après la migration")
            elif parcel.pickup_code != code.upper() or not parcel.code_correct(code):
                echecs.append(f"colis {pk} : le code d'avant la migration n'est plus accepté au comptoir")

        self.stdout.write(f"{verifies} colis vérifiés, {len(attendus)} codes d'avant la migration rejoués.")
        for ligne in echecs[:50]:
            self.stdout.write(self.style.ERROR(ligne))
        if echecs:
            self.stdout.write(self.style.ERROR(f"ÉCHEC : {len(echecs)} anomalie(s). Ne pas migrer la production."))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("OK : chaque code existant est toujours accepté au comptoir."))
