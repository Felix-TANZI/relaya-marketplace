# backend/apps/contenus/models.py
# Photos et contenus remplaçables du site client (DP-54 : le prototype est le squelette, l'équipe change les photos
# et les textes sans toucher au code).
#
#   Media             — une photo téléversée (POST /api/admin/media, ou l'admin Django) ou une adresse externe (CDN) ;
#                       variantes de largeur (srcset) générées au téléversement quand Pillow est installé.
#   BandeauAccueil    — carrousel de l'accueil (h0-hero) : lien, titre, sous-catégories, nombre affiché, photo.
#   CategorieAccueil  — catégories mises en avant (h0-pills) ; la première est la catégorie active.
#   CarteConfiance    — bandeau « Pourquoi choisir BelivaY ? » (h0-why).
#   ReglagesAccueil   — une seule ligne : textes des ventes flash, titre du bandeau de confiance, fond d'arrivée.
#   PageContenu       — page éditoriale libre (GET /api/content/pages/{slug}) ; la FAQ et les textes légaux ont
#                       déjà leurs tables (apps.messaging ThemeFaq/QuestionFaq, apps.client_accounts textes légaux).
#
# Valeurs initiales : celles du site (donnees/accueil.json, copie de site/src/donnees/contenus.ts), chargées par la
# migration 0002 et par `manage.py charger_contenus`. Rubrique vide → la route sert le contenu de accueil.json.
# Les photos des produits, boutiques et relais restent chez relaya (ProductImage, ProductMedia…) : voir pont.image().

from django.db import models
from django.utils import timezone


class Media(models.Model):
    fichier = models.FileField(upload_to="contenus/%Y/%m/", blank=True, help_text="photo téléversée (JPEG, PNG, WebP, AVIF)")
    url_externe = models.URLField(blank=True, default="", help_text="ou adresse d'une photo déjà en ligne (CDN)")
    alt = models.CharField(max_length=200, blank=True, default="", help_text="texte alternatif (lecteurs d'écran)")
    largeur = models.PositiveIntegerField(null=True, blank=True)
    hauteur = models.PositiveIntegerField(null=True, blank=True)
    variantes = models.JSONField(default=list, blank=True, help_text="[[chemin, largeur], …] : srcset")
    par = models.PositiveBigIntegerField(null=True, blank=True, help_text="utilisateur (staff) qui l'a déposée")
    cree_le = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "photo"
        ordering = ("-cree_le",)

    def __str__(self):
        return self.alt or (self.fichier.name if self.fichier else self.url_externe) or f"photo {self.pk}"


class _Ordonne(models.Model):
    ordre = models.PositiveSmallIntegerField(default=0)
    actif = models.BooleanField(default=True)

    class Meta:
        abstract = True
        ordering = ("ordre", "id")


class BandeauAccueil(_Ordonne):
    lien = models.CharField(max_length=200, help_text="chemin du site : /liste?cat=femme&from=accueil")
    titre = models.CharField(max_length=80)
    sous = models.JSONField(default=list, blank=True, help_text='sous-catégories : ["Robes", "Pagnes & wax"]')
    produits = models.CharField(max_length=20, blank=True, default="", help_text="nombre affiché (« 283 »)")
    dessin = models.CharField(max_length=20, blank=True, default="", help_text="dessin du prototype (repli sans photo)")
    image = models.ForeignKey(Media, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta(_Ordonne.Meta):
        verbose_name = "bandeau du carrousel"
        verbose_name_plural = "carrousel de l'accueil"

    def __str__(self):
        return self.titre


class CategorieAccueil(_Ordonne):
    lien = models.CharField(max_length=200)
    titre = models.CharField(max_length=80)
    dessin = models.CharField(max_length=20, blank=True, default="")
    image = models.ForeignKey(Media, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta(_Ordonne.Meta):
        verbose_name = "catégorie mise en avant"
        verbose_name_plural = "catégories mises en avant"

    def __str__(self):
        return self.titre


class CarteConfiance(_Ordonne):
    class Ton(models.TextChoices):
        NEUTRE = "", "neutre"
        OR = "o", "or"

    lien = models.CharField(max_length=200)
    icone = models.CharField(max_length=40, help_text="nom d'icône Lucide : shield-check, map-pin, rotate-ccw…")
    ton = models.CharField(max_length=2, blank=True, default="", choices=Ton.choices)
    titre = models.CharField(max_length=80)
    texte = models.TextField()
    action = models.CharField(max_length=40, help_text="« En savoir plus »")

    class Meta(_Ordonne.Meta):
        verbose_name = "carte du bandeau de confiance"
        verbose_name_plural = "bandeau de confiance"

    def __str__(self):
        return self.titre


class ReglagesAccueil(models.Model):
    flash_titre = models.CharField(max_length=60, default="Flash Deals")
    flash_sous_titre = models.CharField(max_length=80, default="Vraie fin · vrai stock")
    confiance_question = models.CharField(max_length=60, default="Pourquoi choisir")
    confiance_marque = models.CharField(max_length=40, default="BelivaY")
    fond_arrivee = models.ForeignKey(
        Media, null=True, blank=True, on_delete=models.SET_NULL, related_name="+", help_text="photo de l'écran d'arrivée (grand écran)"
    )
    maj_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "réglages de l'accueil"
        verbose_name_plural = "réglages de l'accueil"

    def __str__(self):
        return "Réglages de l'accueil"

    @classmethod
    def courant(cls) -> "ReglagesAccueil":
        return cls.objects.order_by("id").first() or cls()


class PageContenu(models.Model):
    slug = models.SlugField(max_length=80, unique=True)
    langue = models.CharField(max_length=5, default="fr")
    titre = models.CharField(max_length=160)
    corps = models.TextField(help_text="Markdown")
    image = models.ForeignKey(Media, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    publie = models.BooleanField(default=True)
    maj_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "page de contenu"
        verbose_name_plural = "pages de contenu"

    def __str__(self):
        return self.slug
