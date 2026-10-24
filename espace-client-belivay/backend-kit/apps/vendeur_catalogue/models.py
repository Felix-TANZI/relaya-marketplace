# backend/apps/vendeur_catalogue/models.py
# Catalogue du vendeur (VD-08) : ce que l'application ajoute au socle (vendeur_core.FicheCatalogue et Offre).
#
#   PhotoOffre          — photo RÉELLE de l'article vendu (PHO-01 à PHO-03) : fichier, heure et lieu de la prise,
#                         taille, poids avant/après l'allègement sur le téléphone, variantes WebP 320/640/960/1600
#                         (mêmes variantes que les photos du client, apps.contenus) ; rattachée à une offre, ou en
#                         attente d'un brouillon à venir (cible « demande », « copie:<offre> »).
#   DemandeFiche        — fiche demandée à BelivaY (FCH-02, Q-96) : le brouillon de la demande (un par boutique), puis
#                         la demande envoyée (prioritaire ou non), rattachée à l'offre brouillon qu'elle a créée.
#   RechercheCatalogue  — recherches du catalogue par zone (« cherché N fois près de chez vous », Q-96).
#   PublicationOffre    — dernière publication d'une offre (écran « Offre envoyée » : réponse avant, hors connexion).
# Aucune donnée du client (GEN-01).
from django.db import models

from apps.vendeur_core.models import Boutique, FicheCatalogue, Offre


class PhotoOffre(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="photos_offres")
    offre = models.ForeignKey(Offre, on_delete=models.CASCADE, null=True, blank=True, related_name="photos_reelles")
    cible = models.CharField(max_length=40, blank=True, default="", help_text="sans offre : « demande » ou « copie:<offre> »")
    fichier = models.FileField(upload_to="vendeur/offres/%Y/%m/", blank=True)
    url_externe = models.URLField(blank=True, default="", help_text="photo déjà en ligne (CDN)")
    alt = models.CharField(max_length=200, blank=True, default="")
    largeur = models.PositiveIntegerField(default=0)
    hauteur = models.PositiveIntegerField(default=0)
    variantes = models.JSONField(default=list, blank=True, help_text="[[chemin, largeur], …] : srcset")
    prise = models.DateTimeField(help_text="heure de la prise, pas de l'envoi")
    lieu = models.CharField(max_length=80, blank=True, default="", help_text="quartier de la prise, en mots")
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    octets_avant = models.PositiveIntegerField(null=True, blank=True)
    octets_apres = models.PositiveIntegerField(null=True, blank=True)
    cree_le = models.DateTimeField()
    rang = models.PositiveSmallIntegerField(default=0, help_text="ordre des photos ; la première est la principale")

    class Meta:
        ordering = ["rang", "cree_le", "id"]
        verbose_name = "Photo réelle d'une offre"
        verbose_name_plural = "Photos réelles des offres"

    def __str__(self):
        return f"photo {self.pk} · {self.offre_id or self.cible}"


class DemandeFiche(models.Model):
    class Statut(models.TextChoices):
        BROUILLON = "brouillon"
        ENVOYEE = "envoyee"
        RATTACHEE = "rattachee"  # doublon : l'offre est rattachée à une fiche existante
        ECRITE = "ecrite"  # fiche écrite par BelivaY
        REFUSEE = "refusee"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="demandes_fiche")
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.BROUILLON)
    recherche = models.CharField(max_length=200, blank=True, default="")
    marque = models.CharField(max_length=80, blank=True, default="")
    categorie = models.CharField(max_length=80, blank=True, default="", help_text="famille du barème")
    description = models.TextField(blank=True, default="")
    prioritaire = models.BooleanField(default=False)
    envoyee_a = models.DateTimeField(null=True, blank=True)
    reponse_avant = models.DateTimeField(null=True, blank=True)
    en_file = models.BooleanField(default=False, help_text="envoyée hors connexion (REC-02)")
    offre = models.ForeignKey(Offre, on_delete=models.SET_NULL, null=True, blank=True, related_name="demandes_fiche")
    rattachee_a = models.ForeignKey(FicheCatalogue, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    maj_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]
        verbose_name = "Demande de fiche"
        verbose_name_plural = "Demandes de fiche"

    def __str__(self):
        return f"{self.recherche or '(vide)'} · {self.statut}"


class RechercheCatalogue(models.Model):
    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="recherches_catalogue")
    zone = models.CharField(max_length=20, blank=True, default="", db_index=True)
    q = models.CharField(max_length=200, help_text="recherche normalisée (minuscules, sans accents)")
    exacts = models.PositiveIntegerField(default=0)
    a = models.DateTimeField()

    class Meta:
        verbose_name = "Recherche du catalogue"
        verbose_name_plural = "Recherches du catalogue"


class PublicationOffre(models.Model):
    offre = models.OneToOneField(Offre, on_delete=models.CASCADE, related_name="publication")
    a = models.DateTimeField()
    reponse_avant = models.DateTimeField()
    en_file = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Publication d'une offre"
        verbose_name_plural = "Publications des offres"


class MouvementStock(models.Model):
    """Mouvement de stock signé (VD02-DR03, AJ-A Stock) : réception, correction, rupture ; les ventes, retours et
    annulations se lisent dans les commandes. Avant et après gardés : l'historique ne se recalcule pas."""

    class Type(models.TextChoices):
        REAPPRO = "reappro"
        CORRECTION = "correction"
        RUPTURE = "rupture"

    offre = models.ForeignKey(Offre, on_delete=models.CASCADE, related_name="mouvements")
    membre = models.ForeignKey("vendeur_core.Membre", on_delete=models.SET_NULL, null=True, blank=True, related_name="mouvements_stock")
    auteur = models.CharField(max_length=80, help_text="« Aïcha N. » (signature, GEN-09)")
    type = models.CharField(max_length=10, choices=Type.choices)
    avant = models.PositiveIntegerField()
    apres = models.PositiveIntegerField()
    note = models.CharField(max_length=120, blank=True, default="")
    a = models.DateTimeField()

    class Meta:
        ordering = ["-a", "-id"]
        verbose_name = "Mouvement de stock"
        verbose_name_plural = "Mouvements de stock"


class ReglagesLivraison(models.Model):
    """Livraison et colis (AJ-A) : défauts appliqués à toute offre créée (délai, colis, paiement au retrait, OFR-02),
    créneaux de ramassage préférés et relais préférés (retours et dépôts)."""

    boutique = models.OneToOneField(Boutique, on_delete=models.CASCADE, related_name="reglages_livraison")
    colis = models.CharField(max_length=3, default="S")
    delai_h = models.PositiveIntegerField(null=True, blank=True, help_text="None : délai par défaut du registre")
    paiement_au_retrait = models.BooleanField(default=True)
    creneaux = models.JSONField(default=list, blank=True, help_text="identifiants des créneaux préférés")
    relais = models.JSONField(default=list, blank=True, help_text="identifiants des relais préférés")

    class Meta:
        verbose_name = "Réglages de livraison"
        verbose_name_plural = "Réglages de livraison"
