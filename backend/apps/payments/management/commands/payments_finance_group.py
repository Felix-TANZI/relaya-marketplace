# backend/apps/payments/management/commands/payments_finance_group.py
# Gestion du groupe d'habilitation financiere.
#
#   python manage.py payments_finance_group --list
#   python manage.py payments_finance_group --add alice --add bob
#   python manage.py payments_finance_group --remove bob
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI UN GROUPE DEDIE
#
# `is_staff` donne acces a l'administration Django. Ce n'est pas la meme
# chose qu'etre habilite a valider un versement de 400 000 FCFA.
#
# Jusqu'ici, le seul obstacle etait l'inconfort de l'interface. Une interface
# soignee supprime cet obstacle — il faut donc un vrai controle AVANT de la
# construire.
# ─────────────────────────────────────────────────────────────────────────────

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.payments.api.admin.permissions import FINANCE_GROUP, ensure_finance_group


class Command(BaseCommand):
    help = "Gere le groupe d'habilitation financiere."

    def add_arguments(self, parser):
        parser.add_argument("--list", action="store_true")
        parser.add_argument("--add", action="append", default=[],
                            metavar="USERNAME")
        parser.add_argument("--remove", action="append", default=[],
                            metavar="USERNAME")

    def handle(self, *args, **options):
        groupe = ensure_finance_group()

        for nom in options["add"]:
            utilisateur = User.objects.filter(username=nom).first()
            if utilisateur is None:
                self.stdout.write(self.style.ERROR(
                    f"  Utilisateur introuvable : {nom}"))
                continue
            utilisateur.groups.add(groupe)
            self.stdout.write(self.style.SUCCESS(f"  {nom} habilite"))

        for nom in options["remove"]:
            utilisateur = User.objects.filter(username=nom).first()
            if utilisateur is None:
                self.stdout.write(self.style.ERROR(
                    f"  Utilisateur introuvable : {nom}"))
                continue
            utilisateur.groups.remove(groupe)
            self.stdout.write(self.style.WARNING(f"  {nom} retire"))

        membres = list(groupe.user_set.order_by("username"))
        self.stdout.write(self.style.HTTP_INFO(
            f"\n── Groupe « {FINANCE_GROUP} » — {len(membres)} membre(s) ──"))
        for utilisateur in membres:
            self.stdout.write(f"  {utilisateur.username}")

        superutilisateurs = User.objects.filter(
            is_superuser=True, is_active=True).order_by("username")
        if superutilisateurs:
            self.stdout.write(self.style.HTTP_INFO(
                "\n── Superutilisateurs (acces permanent) ──"))
            for utilisateur in superutilisateurs:
                self.stdout.write(f"  {utilisateur.username}")
            self.stdout.write(
                "\n  Un superutilisateur passe toujours : sans cette porte,\n"
                "  personne ne pourrait creer le groupe le jour du "
                "deploiement.")

        if not membres:
            self.stdout.write(self.style.WARNING(
                "\n  Aucun membre habilite. Seuls les superutilisateurs\n"
                "  accedent a l'espace financier."))