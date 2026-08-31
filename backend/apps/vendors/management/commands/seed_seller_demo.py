"""Jeu de demonstration du portail vendeur.

Recree un compte vendeur approuve, sa boutique et un petit catalogue, pour que
la vue mobile du portail puisse etre parcourue avec des donnees realistes sans
toucher aux boutiques reelles.
"""

from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.catalog.models import Category, Product
from apps.vendors.models import VendorProfile

DEMO_PASSWORD = "Demo12345!"
DEMO_SELLER = "vendeur_demo"

DEMO_SHOP = {
    "business_name": "Boutique Mama Ngo",
    "business_description": (
        "Pret-a-porter et accessoires selectionnes a Douala. Livraison BelivaY "
        "en 24 h sur Douala et Yaounde, retrait possible en point relais."
    ),
    "phone": "+237690112233",
    "whatsapp_phone": "+237690112233",
    "address": "Marche Central, rue Joss, Akwa",
    "city": "Douala",
}

# Catalogue de demonstration : (titre, prix FCFA, prix barre, stock, description courte).
DEMO_PRODUCTS = [
    ("Robe wax ceinturee", 18500, 24000, 12, "Coupe cintree, wax authentique, tailles 36 a 44."),
    ("Chemise lin homme", 15000, None, 8, "Lin leger, coupe droite, ideal saison chaude."),
    ("Sac cabas cuir", 32000, 39000, 4, "Cuir pleine fleur, doublure coton, bandouliere amovible."),
    ("Sandales cuir tresse", 12500, None, 15, "Semelle gomme, cuir tanne vegetal, du 38 au 45."),
    ("Foulard soie imprime", 8000, 11000, 22, "Soie 100 %, impression exclusive, 90 x 90 cm."),
    ("Ensemble pagne enfant", 9500, None, 0, "Coton wax, 2 pieces, de 2 a 10 ans."),
]


class Command(BaseCommand):
    help = (
        "Remet a zero le jeu de demonstration du portail vendeur : recree le compte, "
        "sa boutique approuvee et un petit catalogue."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--products",
            type=int,
            default=len(DEMO_PRODUCTS),
            help="Nombre de produits a generer (defaut %d)." % len(DEMO_PRODUCTS),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        wanted = max(1, min(options["products"], len(DEMO_PRODUCTS)))

        user = self._account()
        vendor = self._shop(user)
        removed, created = self._catalog(vendor, wanted)

        self.stdout.write(self.style.SUCCESS("Jeu de demonstration remis a zero pour %s." % vendor.business_name))
        self.stdout.write("  anciens produits de demo supprimes : %d" % removed)
        for title, price, stock in created:
            self.stdout.write("  %-28s %8d FCFA  stock %d" % (title, price, stock))
        self.stdout.write("")
        self.stdout.write("  Portail vendeur : http://localhost:5176/seller/dashboard")
        self.stdout.write("  Identifiants    : %s / %s" % (DEMO_SELLER, DEMO_PASSWORD))
        self.stdout.write("  Boutique publique : /boutique/%s" % vendor.shop_slug)

    def _account(self):
        user, _ = User.objects.get_or_create(
            username=DEMO_SELLER,
            defaults={"email": "vendeur.demo@belivay.com"},
        )
        user.email = "vendeur.demo@belivay.com"
        user.first_name = "Ngo"
        user.last_name = "Bassong"
        user.is_active = True
        user.set_password(DEMO_PASSWORD)
        user.save()
        return user

    def _shop(self, user):
        vendor, _ = VendorProfile.objects.get_or_create(user=user, defaults=DEMO_SHOP)
        for field, value in DEMO_SHOP.items():
            setattr(vendor, field, value)
        # Approuve : sans ce statut le portail bascule en mode « dossier en
        # attente » et masque la majorite des ecrans.
        vendor.status = VendorProfile.Status.APPROVED
        vendor.approved_at = vendor.approved_at or timezone.now()
        vendor.is_online = True
        vendor.certification_tier = VendorProfile.CertificationTier.SILVER
        vendor.total_points = 240
        vendor.default_withdrawal_operator = "MTN_MOMO"
        vendor.default_withdrawal_phone = DEMO_SHOP["phone"]
        vendor.save()
        return vendor

    def _catalog(self, vendor, wanted):
        # Product.vendor pointe vers le User, pas vers le VendorProfile.
        owner = vendor.user
        # On ne touche qu'aux produits de demonstration, reperes par leur slug :
        # le catalogue reel d'un autre vendeur n'est jamais supprime.
        demo = Product.all_objects.filter(vendor=owner, slug__startswith="demo-vendeur-")
        removed = demo.count()
        demo.delete()

        category = Category.objects.filter(is_active=True).order_by("id").first()
        if category is None:
            category = Category.objects.create(name="Divers", slug="divers")

        created = []
        for index, (title, price, compare, stock, short) in enumerate(DEMO_PRODUCTS[:wanted]):
            product = Product.objects.create(
                title=title,
                slug="demo-vendeur-%s" % slugify(title),
                description=short,
                short_description=short[:160],
                price_xaf=price,
                compare_at_price=compare,
                discount=int(round((1 - Decimal(price) / Decimal(compare)) * 100)) if compare else 0,
                sku="DEMO-%03d" % (index + 1),
                stock_threshold=stock,
                is_active=True,
                category=category,
                vendor=owner,
                moderation_status="APPROVED",
                moderated_at=timezone.now(),
            )
            created.append((product.title, product.price_xaf, stock))
        return removed, created
