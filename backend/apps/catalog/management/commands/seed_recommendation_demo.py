from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import TrustScoreProfile
from apps.catalog.models import Category, Inventory, MasterProduct, Product, ProductReview
from apps.vendors.models import VendorLocation, VendorProfile

# Reference : agence BelivaY a Akwa, Douala (centre-ville).
REFERENCE_LAT, REFERENCE_LON = 4.0483, 9.7043

VENDORS = [
    {
        "username": "demo_vendor_techstore",
        "business_name": "TechStore Douala",
        "phone": "+237690000001",
        "trust": "GOOD",
        "location": (4.0511, 9.7679),  # Bonanjo, ~6 km -> le plus proche
        "reviews": [5, 5, 4, 5],
    },
    {
        "username": "demo_vendor_phoneworld",
        "business_name": "PhoneWorld Yaounde",
        "phone": "+237690000002",
        "trust": "THROTTLED",
        "location": (3.8480, 11.5021),  # Yaounde, ~210 km -> loin
        "reviews": [4, 3],
    },
    {
        "username": "demo_vendor_electroplus",
        "business_name": "ElectroPlus CM (sanctionne)",
        "phone": "+237690000003",
        "trust": "VETO",
        "location": (4.0500, 9.7000),  # tout pres, ne doit jamais apparaitre
        "reviews": [5, 5],
    },
    {
        "username": "demo_vendor_audiomax",
        "business_name": "AudioMax Douala",
        "phone": "+237690000004",
        "trust": "GOOD",
        "location": (4.0450, 9.7100),  # tres proche, vend un produit complementaire
        "reviews": [5, 4, 5],
    },
]


class Command(BaseCommand):
    help = (
        "Cree un scenario de demo coherent pour verifier Bay Box, Trust Score, "
        "sanctions vendeur (veto/throttling), rotation, produits lies et "
        "recommandations panier/proximite. Idempotent : peut etre relance sans "
        "creer de doublons."
    )

    def handle(self, *args, **options):
        cat_audio, _ = Category.objects.get_or_create(
            slug="audio-demo-recommandations",
            defaults={"name": "Audio (demo recommandations)", "is_active": True},
        )

        vendor_users = {}
        for spec in VENDORS:
            user, _ = User.objects.get_or_create(
                username=spec["username"],
                defaults={"email": f"{spec['username']}@belivay.demo"},
            )
            user.set_password("DemoTest2026!")
            user.save()

            VendorProfile.objects.update_or_create(
                user=user,
                defaults={
                    "business_name": spec["business_name"],
                    "phone": spec["phone"],
                    "city": "Douala",
                    "address": "Adresse demo",
                    "status": "APPROVED",
                },
            )
            lat, lon = spec["location"]
            VendorLocation.objects.update_or_create(
                vendor=user.vendor_profile,
                name=spec["business_name"],
                defaults={
                    "address": "Adresse demo",
                    "phone": spec["phone"],
                    "representative_name": spec["business_name"],
                    "representative_phone": spec["phone"],
                    "latitude": lat,
                    "longitude": lon,
                    "is_active": True,
                    "is_main": True,
                },
            )

            TrustScoreProfile.objects.filter(user=user, role="VENDOR").delete()
            if spec["trust"] == "VETO":
                TrustScoreProfile.objects.create(user=user, role="VENDOR", veto_active=True)
            elif spec["trust"] == "THROTTLED":
                TrustScoreProfile.objects.create(
                    user=user, role="VENDOR", throttled_until=timezone.now() + timedelta(days=10)
                )
            else:
                TrustScoreProfile.objects.create(user=user, role="VENDOR")

            vendor_users[spec["username"]] = (user, spec)

        # ------------------------------------------------------------------
        # Bay Box : un MasterProduct, trois offres (une par vendeur demo).
        # ------------------------------------------------------------------
        master, _ = MasterProduct.objects.update_or_create(
            slug="demo-casque-bluetooth-baywatch",
            defaults={
                "title": "Casque Bluetooth Demo BayBox",
                "description": "Casque sans fil utilise pour demontrer la selection Bay Box entre plusieurs vendeurs.",
                "category": cat_audio,
                "moderation_status": "APPROVED",
            },
        )

        offers = {}
        for spec in VENDORS:
            if spec["username"] == "demo_vendor_audiomax":
                continue  # AudioMax ne vend que le produit complementaire, pas le casque.
            user, _ = vendor_users[spec["username"]]
            slug = f"demo-casque-{slugify(spec['username'])}"
            product, _ = Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": f"Casque Bluetooth Demo — {spec['business_name']}",
                    "description": "Offre de demonstration pour le guide de test des recommandations.",
                    "price_xaf": 15000,
                    "category": cat_audio,
                    "vendor": user,
                    "master": master,
                    "moderation_status": "APPROVED",
                    "is_active": True,
                },
            )
            Inventory.objects.update_or_create(product=product, defaults={"quantity": 25})
            offers[spec["username"]] = product
            ProductReview.objects.filter(product=product, comment__startswith="[DEMO]").delete()
            for i, rating in enumerate(spec["reviews"]):
                ProductReview.objects.create(
                    product=product,
                    user=user,
                    rating=rating,
                    title="Avis demo",
                    comment=f"[DEMO] Avis de test #{i + 1}",
                    is_verified_purchase=True,
                    is_approved=True,
                )

        # ------------------------------------------------------------------
        # Produit "recommandation panier" : MEME categorie que le panier
        # (audio, comme le filtre category_id__in de get_cart_recommendations
        # l'exige reellement), mais vendeur different de ceux du master en
        # cart -- sinon il est exclu par la regle vendor_id__in=cart_vendors.
        # ------------------------------------------------------------------
        audiomax_user, _ = vendor_users["demo_vendor_audiomax"]
        master2, _ = MasterProduct.objects.update_or_create(
            slug="demo-enceinte-bluetooth-baywatch",
            defaults={
                "title": "Enceinte Bluetooth Demo (recommandation panier)",
                "description": "Produit complementaire pour demontrer recommandations panier / produits lies.",
                "category": cat_audio,
                "moderation_status": "APPROVED",
            },
        )
        enceinte, _ = Product.objects.update_or_create(
            slug="demo-enceinte-audiomax",
            defaults={
                "title": "Enceinte Bluetooth Demo — AudioMax Douala",
                "description": "Produit de demonstration.",
                "price_xaf": 9000,
                "category": cat_audio,
                "vendor": audiomax_user,
                "master": master2,
                "moderation_status": "APPROVED",
                "is_active": True,
            },
        )
        Inventory.objects.update_or_create(product=enceinte, defaults={"quantity": 25})

        self.stdout.write(self.style.SUCCESS("Scenario de demo cree/mis a jour :"))
        self.stdout.write(f"  MasterProduct Bay Box : {master.slug} (3 offres)")
        for spec in VENDORS:
            self.stdout.write(f"    - {spec['business_name']} : {spec['trust']}")
        self.stdout.write(f"  Produit complementaire : {master2.slug}")
        self.stdout.write("  Point de reference GPS acheteur suggere pour les tests : "
                           f"lat={REFERENCE_LAT} lon={REFERENCE_LON} (Akwa, Douala)")
