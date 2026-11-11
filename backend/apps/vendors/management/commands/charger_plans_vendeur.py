"""
Crée les plans d'abonnement vendeur manquants — DEV-SRV-01, T02-5 / T05 : « aucune liste ni aucun montant n'est écrit
dans le code ». L'écran « Les plans » lisait ses prix dans le code alors que l'abonnement facture le prix de
SubscriptionPlan, vide sur une base neuve : ce qui était affiché pouvait différer de ce qui était payé.

    python manage.py charger_plans_vendeur

Valeurs de départ : apps/vendors/donnees/plans_vendeur.json (grille VD-10). Un plan qui existe déjà n'est jamais
modifié : une fois créé, son prix se règle dans l'admin, et c'est lui que lisent l'écran et la facturation.
Appelée par charger_reference.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.vendors.models import SubscriptionPlan

FICHIER = Path(__file__).resolve().parents[2] / "donnees" / "plans_vendeur.json"


class Command(BaseCommand):
    help = "Crée les plans d'abonnement vendeur manquants depuis donnees/plans_vendeur.json (DEV-SRV-01)."

    def handle(self, *args, **options):
        plans = json.loads(FICHIER.read_text(encoding="utf-8"))["plans"]
        for plan in plans:
            valeurs = {cle: plan[cle] for cle in ("name", "price_monthly_xaf", "price_annual_xaf", "display_order")}
            _objet, cree = SubscriptionPlan.objects.get_or_create(code=plan["code"], defaults=valeurs)
            etat = "créé" if cree else "existait, inchangé"
            self.stdout.write(f"Plan {plan['code']} ({plan['name']}) : {etat}.")
