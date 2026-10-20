# backend/apps/cart/models.py
# Panier serveur (CL-07) : recalculé depuis zéro à chaque lecture par le moteur de frais (belivay_moteurs.frais),
# jamais à partir de prix envoyés par le site. Remplace accounts.UserCart de relaya, qui garde les lignes en JSON
# avec les prix écrits par le client (CORRESPONDANCE-RELAYA.md § 4).
#
#   FicheLogistique — classe de colis d'un produit (S, M, L, XL, hors gabarit) : relaya n'a ni classe, ni poids,
#                     ni dimensions (CORRESPONDANCE § 1.4) ; la remise, l'interdiction du XL en relais et le
#                     supplément XL en ont besoin dès le panier.
#   Panier, LignePanier — une ligne = un produit (une offre d'une boutique), une variante, une quantité ; prix_vu =
#                     le prix que le client a vu, pour signaler une hausse au paiement (CAL-11).
#   PanierPartage   — panier figé dans un lien, payé par un proche à l'étranger par carte (CL-12).

from django.conf import settings
from django.db import models


class FicheLogistique(models.Model):
    class Classe(models.TextChoices):
        S = "S", "S"
        M = "M", "M"
        L = "L", "L"
        XL = "XL", "XL (domicile seulement)"
        HG = "HG", "Hors gabarit (domicile seulement)"

    product_id = models.PositiveBigIntegerField(unique=True, help_text="catalog.Product de relaya")
    classe = models.CharField(max_length=2, choices=Classe.choices)
    poids_g = models.PositiveIntegerField(null=True, blank=True)
    gros = models.BooleanField(default=False, help_text="carton C1 ou C2 : garde majorée (GARDE-GROS-AJOUT)")

    class Meta:
        verbose_name = "Fiche logistique d'un produit"
        verbose_name_plural = "Fiches logistiques des produits"

    def __str__(self):
        return f"produit {self.product_id} · {self.classe}"


class Panier(models.Model):
    class Mode(models.TextChoices):
        RELAIS = "relais", "Retrait au relais"
        DOMICILE = "domicile", "Livraison à domicile"

    client = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="panier_client")
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.RELAIS)
    relay_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="vide : le relais habituel du compte")
    adresse_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="client_accounts.Adresse ; vide : l'adresse principale")
    mis_a_jour = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Panier"
        verbose_name_plural = "Paniers"

    def __str__(self):
        return f"Panier de {self.client}"


class LignePanier(models.Model):
    panier = models.ForeignKey(Panier, on_delete=models.CASCADE, related_name="lignes")
    product_id = models.PositiveBigIntegerField(help_text="l'offre choisie (un Product de relaya = une offre d'une boutique)")
    vendor_id = models.PositiveBigIntegerField(null=True, blank=True)
    variante = models.CharField(max_length=160, blank=True, default="")
    options = models.JSONField(default=dict, blank=True, help_text="{nom: valeur} : couleur, capacité, taille")
    qte = models.PositiveIntegerField(default=1)
    prix_vu = models.PositiveIntegerField(help_text="prix affiché au client à l'ajout ou à sa dernière acceptation")
    flash = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    retiree_le = models.DateTimeField(null=True, blank=True, help_text="retrait annulable (« Annuler »)")
    reservee_pour = models.PositiveBigIntegerField(null=True, blank=True, help_text="commande en attente de paiement")
    ajoutee_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = "Ligne de panier"
        verbose_name_plural = "Lignes de panier"

    def __str__(self):
        return f"{self.qte} × produit {self.product_id}"


class PanierPartage(models.Model):
    token = models.CharField(max_length=16, unique=True, help_text="8 caractères base32 majuscules (CAP-11, LIEN-COURT-LONG)")
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="paniers_partages")
    mode = models.CharField(max_length=10, default="relais")
    relay_id = models.PositiveBigIntegerField(null=True, blank=True)
    lignes = models.JSONField(help_text="lignes figées : titre, dessin, qte, prix, boutique, product_id, classe, zone")
    sous_total = models.PositiveIntegerField()
    livraison = models.PositiveIntegerField()
    frais = models.PositiveIntegerField(help_text="frais de service carte (PAY-CARTE-FRAIS)")
    total = models.PositiveIntegerField()
    version_parametres = models.CharField(max_length=40)
    order_id = models.PositiveBigIntegerField(null=True, blank=True)
    payeur = models.JSONField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le"]
        verbose_name = "Panier partagé"
        verbose_name_plural = "Paniers partagés"

    def __str__(self):
        return f"{self.token} · {self.total} F"
