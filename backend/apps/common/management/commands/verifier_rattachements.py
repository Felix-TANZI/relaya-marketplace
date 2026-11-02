# backend/apps/common/management/commands/verifier_rattachements.py
# Revue du 29/10 (E3) : à lancer la veille du déploiement, puis juste avant le premier vendredi.
#
#   python manage.py verifier_rattachements
#
# Depuis A2 et l'étape 19, un membre du personnel (is_staff) sans groupe ne voit plus ses écrans, et depuis DP-42
# aucun versement ne se valide sans un valideur « finance-comptable » ET un valideur « direction ». Cette commande
# liste ce qui manque. Lecture seule : elle ne rattache personne (le porteur décide qui va où).
# Sortie 0 si tout est en place, 1 sinon.

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.common.droits import PARTIES
from apps.payments.settlements.dp42 import GROUPES as GROUPES_DP42


class Command(BaseCommand):
    help = "Liste le personnel sans groupe et vérifie les valideurs DP-42 avant le déploiement (E3)."

    def handle(self, *args, **options):
        groupes = set(PARTIES.values()) | set(GROUPES_DP42.values())
        manque = []

        for role, groupe in GROUPES_DP42.items():
            if not User.objects.filter(is_active=True, groups__name=groupe).exists():
                manque.append(f"Aucun membre actif dans « {groupe} » : aucun versement ne pourra être validé (DP-42).")

        sans_groupe = (User.objects.filter(is_active=True, is_staff=True, is_superuser=False)
                       .exclude(groups__name__in=groupes).order_by("username"))
        for user in sans_groupe:
            manque.append(f"{user.username} ({user.email or 'sans e-mail'}) : personnel sans groupe, il perdra "
                          f"ses écrans.")

        for ligne in manque:
            self.stdout.write(self.style.ERROR(ligne))
        if manque:
            self.stdout.write("Groupes : " + ", ".join(sorted(groupes)))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("OK : chaque membre du personnel a son groupe ; les valideurs DP-42 "
                                             "sont en place."))
