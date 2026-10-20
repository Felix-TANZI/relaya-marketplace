# backend/apps/client_core/management/commands/charger_parametres.py
# Charge le registre des paramètres (CCH-15) dans ParametreMetier, comme seed_financial_config pour la finance.
#
#     python manage.py charger_parametres                  # fichier de settings.BELIVAY_PARAMETRES_JSON
#     python manage.py charger_parametres --fichier x.json # autre fichier (même forme)
#     python manage.py charger_parametres --verifier       # lit tout avec les moteurs, n'écrit rien
#
# Idempotent : une valeur identique n'est pas réécrite ; une valeur changée l'est (et apparaît dans la sortie).
# Avant d'écrire, chaque famille est relue par les moteurs : une valeur mal écrite arrête tout (rien n'est écrit).

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.client_core.models import ParametreMetier

# Gouvernance N3 (deux personnes) : tout ce qui change un montant d'argent ; N2 pour le reste.
PREFIXES_N3 = ("LIV-", "PAY-", "LIT-AUTO", "WALLET-", "GARDE-", "TRANSFERT-", "ABO-", "COT-", "MDC-", "FAM-", "RET-TRAJET", "REMPL-")


class Command(BaseCommand):
    help = "Charge parametres-en-vigueur.json dans la table des paramètres métier (CCH-15)."

    def add_arguments(self, parser):
        parser.add_argument("--fichier", default=None)
        parser.add_argument("--verifier", action="store_true")

    def handle(self, *args, fichier=None, verifier=False, **opts):
        from belivay_moteurs import registre as r

        chemin = Path(fichier or settings.BELIVAY_PARAMETRES_JSON)
        if not chemin.exists():
            raise CommandError(f"Fichier introuvable : {chemin}")
        reg = r.charger_registre(chemin)
        for lire in (
            r.lire_livraison,
            r.lire_garde,
            r.lire_paiement,
            r.lire_litiges,
            r.lire_avis,
            r.lire_portefeuille,
            r.lire_bascule,
            r.lire_geo,
        ):
            try:
                lire(reg)
            except Exception as exc:
                raise CommandError(f"{lire.__name__} : {exc}") from exc
        self.stdout.write(f"Registre lisible par les moteurs (version {reg['#version']}).")
        if verifier:
            return

        donnees = json.loads(chemin.read_text(encoding="utf-8"))["parametres"]
        crees = changes = 0
        with transaction.atomic():
            for p in donnees:
                gouv = "N3" if p["code"].startswith(PREFIXES_N3) else "N2"
                obj, cree = ParametreMetier.objects.get_or_create(
                    code=p["code"],
                    defaults={"valeur": p["valeur"], "sens": p.get("sens", ""), "categorie": p.get("categorie", ""), "gouvernance": gouv},
                )
                if cree:
                    crees += 1
                elif obj.valeur != p["valeur"] or obj.sens != p.get("sens", ""):
                    self.stdout.write(f"  {p['code']} : « {obj.valeur} » → « {p['valeur']} »")
                    obj.valeur, obj.sens = p["valeur"], p.get("sens", "")
                    obj.save(update_fields=["valeur", "sens", "modifie_le"])
                    changes += 1
        self.stdout.write(self.style.SUCCESS(f"{crees} paramètre(s) créé(s), {changes} modifié(s)."))
