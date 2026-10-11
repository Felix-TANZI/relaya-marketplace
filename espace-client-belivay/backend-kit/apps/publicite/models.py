# backend/apps/publicite/models.py
# Revenus publicitaires (DP-59) : solde prépayé et ses mouvements, recharges Mobile Money, campagnes (clic, À la une,
# carrousel, vente flash sur sélection, Boost), clics. Montants en francs entiers ; calculs par belivay_moteurs.publicite.
from django.conf import settings
from django.db import models

from apps.vendeur_core.models import Boutique, Offre


class SoldePublicitaire(models.Model):
    """Solde prépayé d'une boutique : jamais retenu sur les versements sans accord (DP-59)."""

    boutique = models.OneToOneField(Boutique, on_delete=models.CASCADE, related_name="solde_publicitaire")
    solde = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Solde publicitaire"
        verbose_name_plural = "Soldes publicitaires"


class Campagne(models.Model):
    class Type(models.TextChoices):
        CLIC = "clic", "Produit sponsorisé (au clic)"
        A_LA_UNE = "a_la_une", "À la une"
        CARROUSEL = "carrousel", "Carrousel"
        FLASH = "flash", "Vente flash sur sélection"
        BOOST = "boost", "Boost"

    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente", "En attente (enchère de la semaine, sélection flash)"
        ACTIVE = "active", "Active"
        PAUSE = "pause", "En pause"
        TERMINEE = "terminee", "Terminée"
        REFUSEE = "refusee", "Refusée"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="campagnes_pub")
    offre = models.ForeignKey(Offre, on_delete=models.CASCADE, related_name="campagnes_pub")
    type = models.CharField(max_length=10, choices=Type.choices)  # noqa: A003
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.ACTIVE)
    cree_le = models.DateTimeField()
    # Clic : enchère par clic et budget du jour.
    enchere = models.PositiveIntegerField(null=True, blank=True, help_text="clic : F par clic ; emplacement : F la semaine")
    budget_quotidien = models.PositiveIntegerField(null=True, blank=True)
    lieu = models.CharField(max_length=10, blank=True, default="", help_text="clic : recherche | categorie ; vide : les deux")
    # Emplacement (semaine), Boost, flash : période et prix payé.
    mode = models.CharField(max_length=8, blank=True, default="", help_text="emplacement : fixe | enchere")
    semaine = models.DateField(null=True, blank=True, help_text="emplacement : lundi de la semaine")
    debut = models.DateTimeField(null=True, blank=True)
    fin = models.DateTimeField(null=True, blank=True)
    prix = models.PositiveIntegerField(default=0, help_text="forfait débité (emplacement, Boost)")
    rembourse = models.PositiveIntegerField(default=0, help_text="heures non diffusées rendues au solde")
    duree = models.CharField(max_length=4, blank=True, default="", help_text="Boost : 24h | 7j")
    titre = models.CharField(max_length=80, blank=True, default="", help_text="carrousel : titre de la diapo")
    sous_titre = models.CharField(max_length=120, blank=True, default="")
    # Vente flash sur sélection.
    prix_flash = models.PositiveIntegerField(null=True, blank=True)
    stock_flash = models.PositiveIntegerField(null=True, blank=True)
    offre_flash_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="extras.OffreFlash créée à la sélection")
    vente_flash_id = models.PositiveBigIntegerField(
        null=True, blank=True, help_text="vendeur_croissance.VenteFlash (Promotions, prix payé) créée à la sélection"
    )
    motif = models.CharField(max_length=200, blank=True, default="", help_text="refus, arrêt")
    impressions = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-cree_le", "-id"]
        verbose_name = "Campagne publicitaire"
        verbose_name_plural = "Campagnes publicitaires"


class Clic(models.Model):
    """Un clic par client, par annonce et par jour (anti-fraude) ; les suivants ne sont ni comptés ni facturés."""

    campagne = models.ForeignKey(Campagne, on_delete=models.CASCADE, related_name="clics")
    client = models.CharField(max_length=64, help_text="utilisateur (u:12) ou empreinte du visiteur (v:…)")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    jour = models.DateField()
    a = models.DateTimeField()
    cout = models.PositiveIntegerField(default=0)
    vente = models.BooleanField(default=False, help_text="commande payée du produit dans les 7 jours")
    repetitions = models.PositiveIntegerField(default=0, help_text="clics suivants du jour, jamais facturés")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["campagne", "client", "jour"], name="pub_un_clic_par_jour")]
        ordering = ["-a"]


class Mouvement(models.Model):
    class Type(models.TextChoices):
        RECHARGE = "recharge", "Recharge Mobile Money"
        CLIC = "clic", "Clic"
        EMPLACEMENT = "emplacement", "Emplacement"
        BOOST = "boost", "Boost"
        REMBOURSEMENT = "remboursement", "Heures non diffusées"

    class Statut(models.TextChoices):
        EN_ATTENTE = "en_attente"
        CONFIRME = "confirme"
        REFUSE = "refuse"

    boutique = models.ForeignKey(Boutique, on_delete=models.CASCADE, related_name="mouvements_pub")
    campagne = models.ForeignKey(Campagne, on_delete=models.SET_NULL, null=True, blank=True, related_name="mouvements")
    type = models.CharField(max_length=14, choices=Type.choices)  # noqa: A003
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.CONFIRME)
    montant = models.IntegerField(help_text="crédit > 0, débit < 0")
    libelle = models.CharField(max_length=160)
    a = models.DateTimeField()

    class Meta:
        ordering = ["-a", "-id"]


class Signalement(models.Model):
    """Annonce signalée par un client (« Signaler cette annonce ») : relue par la console ; l'annonce est aussitôt
    masquée pour ce client par le site."""

    class Motif(models.TextChoices):
        TROMPEUSE = "trompeuse", "Trompeuse ou prix faux"
        INAPPROPRIEE = "inappropriee", "Choquante ou inappropriée"
        INTERDIT = "interdit", "Produit interdit ou contrefait"
        REPETITIVE = "repetitive", "Trop souvent affichée"
        AUTRE = "autre", "Autre"

    campagne = models.ForeignKey(Campagne, on_delete=models.CASCADE, related_name="signalements")
    client = models.CharField(max_length=64)
    motif = models.CharField(max_length=14, choices=Motif.choices)
    a = models.DateTimeField()
    traite = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["campagne", "client"], name="pub_un_signalement_par_client")]
        ordering = ["-a"]
