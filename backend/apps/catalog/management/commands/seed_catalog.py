from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.catalog.models import Category, Product, ProductMedia, Inventory


class Command(BaseCommand):
    help = "Seed initial catalog data (categories, products, media, inventory)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Seeding catalog..."))

        # Categories
        categories = [
            "Électronique",
            "Vêtements",
            "Chaussures",
            "Sport",
            "Alimentation",
            "Accessoires",
        ]

        category_objs = {}
        for name in categories:
            slug = slugify(name)
            cat, _ = Category.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "is_active": True},
            )
            category_objs[name] = cat

        # Products (simple examples)
        products = [
            ("Casque Bluetooth", "Électronique", 15000, "Casque audio sans fil, autonomie 20h."),
            ("T-shirt Premium", "Vêtements", 7000, "T-shirt coton, coupe moderne."),
            ("Baskets Running", "Chaussures", 25000, "Confortables, pour course et marche."),
            ("Ballon de Football", "Sport", 8000, "Ballon taille 5, usage extérieur."),
            ("Pack Riz 5kg", "Alimentation", 6500, "Riz de qualité, sac 5kg."),
            ("Montre Classique", "Accessoires", 12000, "Montre élégante, bracelet cuir."),
        ]

        for title, cat_name, price, desc in products:
            slug = slugify(title)
            category = category_objs[cat_name]

            p, created = Product.objects.get_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "description": desc,
                    "price_xaf": price,
                    "is_active": True,
                    "category": category,
                },
            )

            # Inventory
            Inventory.objects.get_or_create(product=p, defaults={"quantity": 30})

            # Media (placeholder)
            if created:
                ProductMedia.objects.create(
                    product=p,
                    url="https://via.placeholder.com/800x800.png?text=Relaya",
                    media_type="image",
                    sort_order=0,
                )

        self.stdout.write(self.style.SUCCESS("Catalog seeded successfully ✅"))
