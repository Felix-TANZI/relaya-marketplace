# backend/apps/orders/management/commands/rentabilite_hebdomadaire.py
# R92.5 : chaque semaine, reste_b par univers et par palier, boutiques sous l'objectif, alerte de l'équipe finance dès
# qu'un reste_b est négatif. Lit les commissions figées des sous-commandes (A8, apps/orders/commission.py).
#
#     python manage.py rentabilite_hebdomadaire            # les 7 derniers jours
#     python manage.py rentabilite_hebdomadaire --jours 30
#
# À programmer une fois par semaine (tâche planifiée du serveur).

import logging
from collections import defaultdict
from datetime import timedelta
from fractions import Fraction

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.orders.models import CommissionSousCommande

logger = logging.getLogger(__name__)


def univers_de(c) -> str:
    u = sorted({a.get("univers_i") or "?" for a in c.articles})
    return u[0] if len(u) == 1 else "mixte"


def rapport(depuis) -> dict:
    lignes = CommissionSousCommande.objects.filter(created_at__gte=depuis).exclude(reste_b="").select_related("vendor")
    groupes = defaultdict(lambda: {"n": 0, "reste": Fraction(0), "sous_objectif": 0, "negatifs": 0})
    sous_objectif, negatifs = [], []
    for c in lignes:
        g = groupes[(univers_de(c), c.palier)]
        g["n"] += 1
        g["reste"] += Fraction(c.reste_b)
        if c.objectif is False:
            g["sous_objectif"] += 1
            sous_objectif.append(c)
        if c.exigence is False:
            g["negatifs"] += 1
            negatifs.append(c)
    return {"groupes": dict(groupes), "sous_objectif": sous_objectif, "negatifs": negatifs}


class Command(BaseCommand):
    help = "Contrôle de rentabilité de la semaine (R92.5) : reste_b par univers et palier, alertes."

    def add_arguments(self, parser):
        parser.add_argument("--jours", type=int, default=7)

    def handle(self, *args, jours=7, **opts):
        r = rapport(timezone.now() - timedelta(days=jours))
        self.stdout.write(f"Rentabilité des {jours} derniers jours (R92.5)")
        for (univers, palier), g in sorted(r["groupes"].items()):
            self.stdout.write(f"  {univers:6} {palier:8} {g['n']:5} sous-commandes · reste {float(g['reste']):>12,.0f} F"
                              f" · sous l'objectif {g['sous_objectif']} · négatives {g['negatifs']}")
        boutiques = sorted({c.vendor.username for c in r["sous_objectif"]})
        if boutiques:
            self.stdout.write("Boutiques sous l'objectif : " + ", ".join(boutiques))
        if r["negatifs"]:
            self._alerter(r["negatifs"])
        self.stdout.write(self.style.SUCCESS("Terminé."))

    def _alerter(self, negatifs):
        """R92.4 : BelivaY ne perd jamais ; un reste_b négatif est signalé à l'équipe finance (console)."""
        from apps.accounts.models import UserNotification

        detail = ", ".join(f"#{c.order_id} ({c.vendor.username} : {float(Fraction(c.reste_b)):,.0f} F)" for c in negatifs[:20])
        message = f"{len(negatifs)} sous-commande(s) à perte cette semaine (R92.4) : {detail}."
        logger.error("Rentabilité : %s", message)
        for admin in User.objects.filter(is_staff=True, is_active=True):
            UserNotification.objects.create(
                user=admin, title="Rentabilité : sous-commandes à perte", message=message,
                notification_type=UserNotification.NotificationType.PAYMENT, action_url="/admin/finances",
            )
        self.stdout.write(self.style.ERROR(message))
