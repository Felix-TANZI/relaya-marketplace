# backend/apps/client_core/models.py
# Trois tables transverses :
#
#   ParametreMetier   — le registre CCH-15 (aucune valeur métier dans le code) : un code, sa valeur telle
#                       qu'écrite dans logique-metier/parametres-en-vigueur.json, son sens. Les moteurs relisent la
#                       valeur avec une forme attendue stricte (belivay_moteurs.registre) : une valeur mal écrite
#                       arrête le calcul au lieu de deviner un montant.
#                       À terme : sous le contrôle à quatre yeux de payments/config (ConfigChangeRequest), voir
#                       REPRISE-BACKEND.md, décision D5. Ici : modification par l'admin Django, journalisée.
#   Interrupteur      — FF-* (CFS-01, CAP-13) : un module fermé répond 404 sur toutes ses routes.
#   CleIdempotence    — CAP-03 : la même clé rejoue la même réponse pendant 24 h.

from django.conf import settings
from django.db import models


class ParametreMetier(models.Model):
    class Gouvernance(models.TextChoices):
        N2 = "N2", "N2 · délais et textes (un responsable)"
        N3 = "N3", "N3 · argent (deux personnes)"

    code = models.CharField(max_length=60, unique=True)
    valeur = models.TextField(help_text="Telle qu'écrite au registre, ex. « 500 F » ; la forme est vérifiée par le moteur.")
    sens = models.TextField(blank=True, default="")
    categorie = models.CharField(max_length=160, blank=True, default="")
    gouvernance = models.CharField(max_length=2, choices=Gouvernance.choices, default=Gouvernance.N2)
    modifie_le = models.DateTimeField(auto_now=True)
    modifie_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        ordering = ["code"]
        verbose_name = "Paramètre métier"
        verbose_name_plural = "Paramètres métier"

    def __str__(self):
        return f"{self.code} = {self.valeur}"


class Interrupteur(models.Model):
    code = models.CharField(max_length=40, unique=True, help_text="FF-WALLET, FF-ABONNEMENT…")
    ouvert = models.BooleanField(default=False)
    note = models.CharField(max_length=255, blank=True, default="")
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        verbose_name = "Interrupteur de module"
        verbose_name_plural = "Interrupteurs de module"

    def __str__(self):
        return f"{self.code} ({'ouvert' if self.ouvert else 'fermé'})"


class CleIdempotence(models.Model):
    """Réponse gardée d'une action protégée par Idempotency-Key (CAP-03)."""

    cle = models.CharField(max_length=120)
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="+")
    # Sans compte (payeur à l'étranger, cadeau) : l'appareil ou l'adresse IP tient lieu d'auteur.
    auteur = models.CharField(max_length=120, blank=True, default="")
    methode = models.CharField(max_length=8)
    chemin = models.CharField(max_length=255)
    empreinte = models.CharField(max_length=64, help_text="sha256 du corps de la requête")
    statut = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Vide tant que l'action est en cours")
    reponse = models.JSONField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["utilisateur", "auteur", "cle"], name="client_core_cle_idempotence_unique")]
        indexes = [models.Index(fields=["cree_le"])]
        verbose_name = "Clé d'idempotence"
        verbose_name_plural = "Clés d'idempotence"

    def __str__(self):
        return f"{self.methode} {self.chemin} · {self.cle}"
