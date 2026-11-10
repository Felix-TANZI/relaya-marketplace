"""
Compte les lignes des tables d'activité — DEV-SRV-01, T02-6 :
« Compter les lignes des tables vendeurs, produits, commandes et utilisateurs. Terminé quand la capture du comptage
est transmise : tout est à zéro, hors comptes d'administration. »

    python manage.py compter_tables

Sortie : le tableau à capturer. Code 0 si tout est à zéro (hors administration), 1 sinon — utilisable comme contrôle
avant d'ouvrir les inscriptions (« On n'ouvre pas sur une base non vérifiée »).
Les produits supprimés « en douceur » sont comptés : ils restent dans la base.
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db.models import Q


def comptages() -> list[tuple[str, int]]:
    from apps.accounts.models import ComplianceDocument, CourierProfile, DeliveryOrganizationProfile, RelayPointProfile
    from apps.catalog.models import Product
    from apps.orders.models import Order
    from apps.payments.intents.models import PaymentIntent
    from apps.shipping.models import Shipment
    from apps.vendors.models import VendorProfile

    return [
        ("Utilisateurs (hors administration)", User.objects.filter(is_staff=False, is_superuser=False).count()),
        ("Vendeurs", VendorProfile.objects.count()),
        ("Produits", Product.all_objects.count()),
        ("Commandes", Order.objects.count()),
        ("Colis", Shipment.objects.count()),
        ("Paiements", PaymentIntent.objects.count()),
        ("Points relais", RelayPointProfile.objects.count()),
        ("Entreprises de livraison", DeliveryOrganizationProfile.objects.count()),
        ("Livreurs", CourierProfile.objects.count()),
        ("Pièces justificatives", ComplianceDocument.objects.count()),
    ]


class Command(BaseCommand):
    help = "Compte les tables d'activité : tout doit être à zéro sur une base neuve (DEV-SRV-01, T02)."

    def handle(self, *args, **options):
        lignes = comptages()
        admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).count()
        largeur = max(len(nom) for nom, _ in lignes)
        for nom, nombre in lignes:
            self.stdout.write(f"{nom:<{largeur}}  {nombre:>8}")
        self.stdout.write(f"{'Comptes d’administration (non comptés)':<{largeur}}  {admins:>8}")

        restantes = [nom for nom, nombre in lignes if nombre]
        if restantes:
            self.stdout.write(self.style.ERROR(f"\nBase NON vide : {', '.join(restantes)}."))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("\nBase vide de toute activité, hors comptes d’administration."))
