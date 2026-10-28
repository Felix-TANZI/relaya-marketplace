"""
Dit si le catalogue est présentable — tâche D29.

    « Vérifier que chaque fiche a sa photo, son prix et sa catégorie. »
    « Retirer les produits et les données de démonstration de la version en
      ligne. »
    « N'afficher que les catégories assez remplies. »

    python manage.py verifier_catalogue

Cette commande ne corrige rien : elle regarde ce qu'un visiteur verrait et
dit ce qui cloche. Sortie en code 1 s'il reste quelque chose à régler, pour
servir de contrôle avant la mise en ligne de belivay.com (D30).
"""

from django.core.management.base import BaseCommand

from apps.catalog.models import Category, ModerationStatus, Product
from apps.catalog.vitrine import categories_trop_vides, seuil_minimum


class Command(BaseCommand):
    help = "Verifie que le catalogue servi au public est presentable (D29)."

    def handle(self, *args, **options):
        publiees = Product.objects.filter(
            is_active=True, moderation_status=ModerationStatus.APPROVED,
        )
        total = publiees.count()
        problemes = 0

        self.stdout.write(f"Offres publiees : {total}")
        self.stdout.write("")

        # ── « chaque fiche a sa photo, son prix et sa catégorie » ───────────
        sans_photo = publiees.filter(images__isnull=True).distinct()
        sans_prix = publiees.filter(price_xaf__lte=0)
        sans_categorie = publiees.filter(category__isnull=True)

        for libelle, jeu in (
            ("sans photo", sans_photo),
            ("sans prix", sans_prix),
            ("sans categorie", sans_categorie),
        ):
            nombre = jeu.count()
            if not nombre:
                self.stdout.write(self.style.SUCCESS(f"  [ok] aucune offre {libelle}"))
                continue
            problemes += nombre
            self.stdout.write(self.style.ERROR(f"  [!] {nombre} offre(s) {libelle} :"))
            for produit in jeu[:10]:
                self.stdout.write(f"        #{produit.id} {produit.title[:60]}")
            if nombre > 10:
                self.stdout.write(f"        ... et {nombre - 10} autre(s)")

        # ── « retirer les produits de démonstration » ───────────────────────
        # Les jeux de demonstration nomment leurs vendeurs avec « demo ».
        demo = publiees.filter(vendor__username__contains="demo")
        nombre_demo = demo.count()
        if nombre_demo:
            problemes += nombre_demo
            self.stdout.write(self.style.ERROR(
                f"  [!] {nombre_demo} offre(s) appartiennent a un compte de "
                f"demonstration :"
            ))
            for produit in demo[:10]:
                self.stdout.write(
                    f"        #{produit.id} {produit.title[:48]} "
                    f"({produit.vendor.username})"
                )
        else:
            self.stdout.write(self.style.SUCCESS(
                "  [ok] aucune offre de demonstration"
            ))

        # ── « n'afficher que les catégories assez remplies » ────────────────
        seuil = seuil_minimum()
        masquees = categories_trop_vides(seuil)
        visibles = Category.objects.filter(is_active=True).exclude(id__in=masquees)
        self.stdout.write("")
        self.stdout.write(
            f"Categories visibles : {visibles.count()} "
            f"({len(masquees)} masquee(s), seuil = {seuil} offre(s))"
        )

        self.stdout.write("")
        if problemes:
            self.stdout.write(self.style.ERROR(
                f"{problemes} point(s) a regler avant d'ouvrir le site (D29)."
            ))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS(
            "Le catalogue est presentable."
        ))
