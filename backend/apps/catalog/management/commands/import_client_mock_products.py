from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from apps.catalog.models import Category, Inventory, Product, ProductMedia
from apps.vendors.models import VendorProfile


CLIENT_MOCK_PRODUCTS = [
    {
        "title": "Casque audio Pro",
        "category": "Électronique",
        "price_xaf": 59000,
        "discount": 10,
        "stock_quantity": 15,
        "description": "Casque audio haute qualité avec réduction de bruit active.",
        "short_description": "Casque audio premium avec réduction de bruit.",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=1200&fit=crop",
    },
    {
        "title": "Sac à dos urbain",
        "category": "Mode",
        "price_xaf": 25000,
        "discount": 0,
        "stock_quantity": 30,
        "description": "Sac à dos tendance pour usage quotidien.",
        "short_description": "Sac à dos pratique pour la ville et le quotidien.",
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=1200&fit=crop",
    },
    {
        "title": "Lampe minimaliste",
        "category": "Maison & Bureau",
        "price_xaf": 18000,
        "discount": 5,
        "stock_quantity": 20,
        "description": "Lampe design pour décorer votre intérieur.",
        "short_description": "Lampe déco au style épuré.",
        "image_url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1200&h=1200&fit=crop",
    },
    {
        "title": "Montre classique",
        "category": "Accessoires",
        "price_xaf": 42000,
        "discount": 15,
        "stock_quantity": 10,
        "description": "Montre élégante pour homme et femme.",
        "short_description": "Montre élégante au bracelet raffiné.",
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=1200&fit=crop",
    },
    {
        "title": "Enceinte compacte",
        "category": "Électronique",
        "price_xaf": 36000,
        "discount": 0,
        "stock_quantity": 12,
        "description": "Enceinte Bluetooth portable avec son cristallin.",
        "short_description": "Enceinte Bluetooth compacte et portable.",
        "image_url": "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=1200&h=1200&fit=crop",
    },
]


class Command(BaseCommand):
    help = "Importe 5 produits mockés du client dans une boutique vendeur."

    def add_arguments(self, parser):
        parser.add_argument(
            "--shop",
            required=True,
            help="Nom exact de la boutique vendeur cible.",
        )

    def handle(self, *args, **options):
        shop_name = options["shop"].strip()

        try:
            vendor_profile = VendorProfile.objects.select_related("user").get(
                business_name=shop_name
            )
        except VendorProfile.DoesNotExist as exc:
            raise CommandError(f"Boutique introuvable: {shop_name}") from exc

        vendor_user: User = vendor_profile.user
        created_count = 0
        updated_count = 0

        self.stdout.write(
            self.style.WARNING(
                f"Import des produits mockés dans la boutique '{vendor_profile.business_name}'..."
            )
        )

        for item in CLIENT_MOCK_PRODUCTS:
            category_slug = slugify(item["category"])
            category, _ = Category.objects.get_or_create(
                slug=category_slug,
                defaults={
                    "name": item["category"],
                    "is_active": True,
                },
            )

            product = Product.objects.filter(
                vendor=vendor_user,
                title=item["title"],
            ).first()

            created = product is None
            if created:
                product = Product(
                    vendor=vendor_user,
                    slug=self._build_unique_slug(item["title"], vendor_profile.shop_slug),
                )

            product.title = item["title"]
            product.description = item["description"]
            product.short_description = item["short_description"]
            product.price_xaf = item["price_xaf"]
            product.discount = item["discount"]
            product.is_active = True
            product.category = category
            product.save()

            Inventory.objects.update_or_create(
                product=product,
                defaults={"quantity": item["stock_quantity"]},
            )

            ProductMedia.objects.update_or_create(
                product=product,
                url=item["image_url"],
                defaults={
                    "media_type": "image",
                    "sort_order": 0,
                },
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f" - {product.title} ({'créé' if created else 'mis à jour'})"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Terminé ✅ {created_count} créé(s), {updated_count} mis à jour pour {vendor_profile.business_name}."
            )
        )

    def _build_unique_slug(self, title: str, shop_slug: str) -> str:
        base_slug = slugify(f"{title}-{shop_slug}") or slugify(title) or "produit"
        slug = base_slug
        suffix = 1

        while Product.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{suffix}"
            suffix += 1

        return slug
